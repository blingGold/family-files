# 前端镜像：Node 构建静态产物 → Nginx 托管并反向代理 /api 到后端
# 基础镜像走国内加速源（极空间/国内网络直连 Docker Hub 常超时）
FROM docker.m.daocloud.io/library/node:22-bookworm-slim AS builder

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com \
    && npm config set fetch-timeout 120000 \
    && npm config set fetch-retries 5 \
    && echo "==> npm ci 开始（下载中，请观察 http 请求行）" \
    && npm ci --no-audit --no-fund --loglevel=http

COPY . .
RUN npm run build

# ---------- 运行阶段 ----------
FROM docker.m.daocloud.io/library/nginx:1.27-alpine

COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
