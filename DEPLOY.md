# 部署指南（Docker）

家庭病历档案管理系统支持 Docker 一键部署。首次部署为**空数据库**（自动建表 + 创建初始管理员），之后升级镜像**历史数据自动保留**（数据存在 Docker 卷中，与容器/镜像生命周期完全解耦）。

---

## 一、首次部署（空数据起步）

前置要求：目标机器已安装 Docker 与 Docker Compose 插件（`docker compose version` 可用）。

```bash
# 1. 获取代码（GitHub 私有仓库，或直接拷贝本项目目录）
git clone <你的仓库地址> family-files
cd family-files

# 2. 生成环境变量并填写
cp .env.example .env
# 必须修改的三处：
#   JWT_SECRET            → 运行 openssl rand -hex 32 生成并粘贴
#   OCR_API_KEY           → 填入你的 DeepSeek API Key（用于病历图片识别）
#   SEED_ADMIN_PASSWORD   → 初始管理员密码（登录用户名固定为 admin）
# 可选：WEB_PORT 默认 8080，如需 80 端口改为 80

# 3. 构建并启动（首次构建约 5-10 分钟）
docker compose up -d --build

# 4. 查看状态（两个服务都应为 healthy）
docker compose ps

# 5. 访问
#   http://服务器IP:8080    用 admin / 你设置的密码 登录
```

> 首次启动时后端容器会自动执行：`prisma migrate deploy`（建表）→ seed（创建 admin 账号）→ 启动服务。

---

## 二、版本升级（历史数据保留）

升级时**不需要**动数据——数据库与附件都在卷里，镜像重建不影响：

```bash
# 1. 拉取最新代码
git pull

# 2.（可选）改镜像标签以区分版本
#   在 .env 中设置 TAG=v1.1.0

# 3. 重新构建并滚动更新（旧容器会优雅替换）
docker compose up -d --build

# 4. 确认新版本生效
docker compose ps
```

**数据保留原理**：`docker-compose.yml` 中声明了 `dbdata`（SQLite 数据库）与 `uploads`（病历图片）两个命名卷。卷独立于容器存在，容器删除/重建/镜像升级都不影响卷内数据。

---

## 三、数据备份与恢复

```bash
# ---- 备份（建议每周一次）----
mkdir -p ~/backups && cd ~/backups
docker run --rm -v family-files_dbdata:/data/db -v family-files_uploads:/data/uploads \
  -v "$(pwd)":/backup alpine sh -c \
  "tar czf /backup/family-files-backup-$(date +%Y%m%d).tar.gz /data/db /data/uploads"

# ---- 恢复 ----
cd ~/backups
docker compose down
docker run --rm -v family-files_dbdata:/data/db -v family-files_uploads:/data/uploads \
  -v "$(pwd)":/backup alpine sh -c \
  "tar xzf family-files-backup-<日期>.tar.gz -C /"
docker compose up -d
```

> 卷名称以 `docker volume ls` 实际输出为准（本示例项目名为 `family-files`，前缀为 `family-files_`）。

---

## 四、数据在磁盘上的位置

```bash
docker volume inspect family-files_dbdata    # 数据库 dev.db
docker volume inspect family-files_uploads   # 上传的病历图片
```

如需在宿主机直接查看卷内容：
```bash
docker run --rm -it -v family-files_dbdata:/data alpine ls -la /data
```

---

## 五、常用运维命令

```bash
docker compose ps                # 服务状态
docker compose logs -f backend   # 后端日志
docker compose logs -f frontend  # 前端/nginx 日志
docker compose restart backend   # 单独重启后端
docker compose down              # 停止（数据保留）
docker compose down -v           # ⚠️ 停止并删除数据卷（数据永久丢失，慎用！）
```

---

## 六、架构速览

```
浏览器 ──> 前端容器(nginx:80/8080) ──/api──> 后端容器(node:3000)
                                              ├── 卷 dbdata   (SQLite)
                                              └── 卷 uploads  (病历图片)
后端 ──> DeepSeek API（OCR 图片识别，需外网）
```

- 数据库：SQLite（单文件），部署后位于 `dbdata` 卷的 `dev.db`
- 上传附件：`uploads` 卷，经 `/api/attachments/:id` 鉴权后访问
- OCR：调用 DeepSeek 大模型识别图片内容（每次识别消耗 API 额度）

【镜像清理（v12.5 起）】
- 镜像 tag 固定 latest，重新构建会覆盖旧镜像，不再产生 v12.x 历史版本堆积；
- 每次重建后，旧镜像会变成 <none> 悬空镜像（不占用的历史层），
  可在极空间 Docker → 镜像 页面用【清理】功能一键清除，仅保留 family-files-backend:latest 和 family-files-frontend:latest；
- 版本辨识：docker-compose.yml 顶部注释 + 镜像 label（version=v12.5）。
