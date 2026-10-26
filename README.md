# XilerMusic

一个自托管的网页音乐播放器，支持在线搜索、播放、歌词与歌单。

---

## 快速开始

需要 Docker 和 Docker Compose。

```bash
git clone https://github.com/5566-maker/xilermusic.git
cd xilermusic/dockerimg
cp .env.example .env
```

编辑 `.env`，设置访问密码：

```env
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=改成你自己的强密码
```

启动：

```bash
docker compose up -d
```

打开 `http://服务器IP:8080`，输入刚才设置的用户名密码即可。

---

## 不使用 Compose

```bash
docker run -d \
  --name xiler-music \
  -p 8080:8080 \
  -e BASIC_AUTH_USER=admin \
  -e BASIC_AUTH_PASS=你的密码 \
  --restart unless-stopped \
  ghcr.io/5566-maker/xiler-music-web:latest
```

---

## 配置项

| 环境变量 | 说明 | 默认值 |
|---|---|---|
| `PORT` | 对外端口 | `8080` |
| `BASIC_AUTH_USER` | 访问用户名 | 空（不启用认证） |
| `BASIC_AUTH_PASS` | 访问密码 | 空（不启用认证） |
| `TZ` | 时区 | `Asia/Tokyo` |

**公网部署一定要设置 `BASIC_AUTH_USER` 和 `BASIC_AUTH_PASS`，两个都设才生效。** 不设的话任何人都能用你的音源接口。

---

## 绑定域名与 HTTPS

用 Caddy 自动签发证书：

1. 把域名解析到服务器 IP
2. 修改 `dockerimg/Caddyfile` 里的 `xiler.example.com` 为你的域名
3. 把 `docker-compose.yml` 里 `xiler-music` 的端口改成 `127.0.0.1:8080:8080`
4. 取消 `docker-compose.yml` 底部 caddy 段的注释
5. `docker compose up -d`

---

## 更新

```bash
cd xilermusic/dockerimg
docker compose pull
docker compose up -d
```

---

## 本地运行（不用 Docker）

需要 Node.js 22+。

```bash
cd xilermusic/resource
npm install --ignore-scripts
node server.js
```

打开 `http://127.0.0.1:8080`。

依赖装在 `xilermusic/node_modules`（仓库根），不是 `resource/` 里，这是刻意的，别挪。

---

## 自己构建镜像

```bash
cd xilermusic/dockerimg
docker compose up -d --build
```

首次构建需要下载依赖并编译前端，大约 10–20 分钟。

---

## 常见问题

**打开是白屏**

强制刷新（Ctrl+Shift+R）。浏览器可能缓存了旧的 Service Worker。

**搜到歌但播放没声音**

换一首试试。部分版权歌曲需要可用的音源解析，个别歌曲解析不出来是正常的。

**端口被占用**

改 `docker-compose.yml` 里的 `"8080:8080"`，比如改成 `"9000:8080"`。

---

## 目录结构

```
xilermusic/
├── resource/       源码
├── dockerimg/      Dockerfile、docker-compose.yml、Caddyfile
└── .github/        自动构建镜像的工作流
```
