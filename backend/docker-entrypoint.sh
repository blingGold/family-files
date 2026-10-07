#!/bin/sh
# 后端容器入口脚本
# 职责：建目录 → 数据库迁移 → seed 初始账号（幂等）→ 启动服务
# 数据位置由环境变量决定（DATABASE_URL / UPLOAD_DIR），容器重建不丢数据
set -e

# 解析 DATABASE_URL 的 file: 路径并确保目录存在（SQLite 不会自动建目录）
DB_PATH="${DATABASE_URL#file:}"
DB_DIR="$(dirname "$DB_PATH")"
if [ -n "$DB_DIR" ] && [ "$DB_DIR" != "." ]; then
  echo ">> 确保数据库目录存在: $DB_DIR"
  mkdir -p "$DB_DIR"
fi

echo ">> 执行数据库迁移 (prisma migrate deploy)"
npx prisma migrate deploy

echo ">> 初始化 admin 账号 (seed, 幂等)"
node dist/prisma/seed.js

echo ">> 启动后端服务"
exec node dist/src/main.js
