# 家庭病历档案管理系统 - 后端镜像
# 多阶段构建：builder 完成依赖安装/Prisma 生成/编译，runner 精简运行
# 设计要点：
#   - 复制完整 node_modules（含 devDeps），保证 bcrypt 原生二进制与 Prisma 引擎在
#     构建/运行环境一致，避免 prune 造成运行时缺失
#   - 数据（SQLite + uploads）全部走 Docker volume，容器重建不丢数据
#   - 启动入口 docker-entrypoint.sh：迁移 → seed（幂等）→ 启动

# ---------- 构建阶段 ----------
# 基础镜像走国内加速源（极空间/国内网络直连 Docker Hub 常超时）
FROM docker.m.daocloud.io/library/node:22-bookworm-slim AS builder

WORKDIR /build

# 先装依赖（利用层缓存；npm 走国内镜像 + 加固超时）
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com \
    && npm config set fetch-timeout 600000 \
    && npm config set fetch-retries 5 \
    && npm ci --no-audit --no-fund

# 再拷源码并构建（Prisma 引擎下载走国内镜像，避免无声卡死）
COPY . .
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
RUN npx prisma generate
RUN npm run build

# ---------- 运行阶段 ----------
FROM docker.m.daocloud.io/library/node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# 复制构建产物与运行依赖
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./package.json
COPY --from=builder /build/prisma ./prisma

# 启动脚本
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
