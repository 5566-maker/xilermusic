# ─────────────────────────────────────────────────────────────
# XilerMusic Web 版 Docker 镜像
#
# 目录结构：
#   xilermusic/
#   ├── resource/      源码（package.json、src、server.js…）
#   ├── dockerimg/     本文件、docker-compose.yml、Caddyfile
#   └── .dockerignore  必须在构建上下文根目录
#
# 构建（构建上下文是 xilermusic/，不是 dockerimg/）：
#   cd dockerimg && docker compose up -d --build
# 或手动：
#   cd xilermusic
#   docker build -f dockerimg/Dockerfile -t xiler-music-web .
#   docker run -d -p 8080:8080 --name xiler-music xiler-music-web
#
# 架构说明：单容器单端口。容器内 server.js 同时拉起
#   1) 音源 API（127.0.0.1:30488，仅容器内部可见）
#   2) 对外 HTTP 服务（0.0.0.0:8080），把 /api/* 反向代理到音源 API
# 前端构建时 VITE_API=/api，因此同源、无跨域问题。
# ─────────────────────────────────────────────────────────────

# ============ 阶段 1：构建前端 ============
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# 先只拷贝依赖清单，最大化利用 Docker 层缓存
COPY resource/package.json ./
# --ignore-scripts 跳过 electron-builder 的 postinstall（Web 构建用不到 Electron）
RUN npm install --ignore-scripts --no-audit --no-fund

# 拷贝全部源码（上下文根是 xilermusic/，所以前缀是 resource/）
COPY resource/ ./

# 强制覆盖为相对路径，走同端口反代（不依赖任何外部地址）
RUN printf 'VITE_API = /api\n' > src/renderer/.env.production

RUN npx vite build

# ============ 阶段 2：运行 ============
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    API_PORT=30488 \
    TZ=Asia/Tokyo

# 运行期只需要音源 API 这一个依赖（含其传递依赖）
# 版本锁定，避免上游更新导致行为漂移
RUN npm init -y >/dev/null 2>&1 \
    && npm install netease-cloud-music-api-alger@4.32.0 --omit=dev --no-audit --no-fund \
    && npm cache clean --force \
    && rm -rf /tmp/*

# 前端产物
COPY --from=builder /app/src/renderer/dist ./public

# 生产服务器（静态托管 + /api 反代 + 可选 Basic 认证）
COPY --from=builder --chown=node:node /app/server.js ./

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
