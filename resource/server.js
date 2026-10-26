/**
 * XilerMusic Web 生产服务器（零外部依赖）
 *
 * 一个进程同时负责：
 *   1. 在 127.0.0.1:30488 拉起网易云音源 API（内部，不对外暴露）
 *   2. 对外提供静态页面，并把 /api/* 反向代理到内部音源 API
 *   3. 可选 HTTP Basic 认证（设置 BASIC_AUTH_USER / BASIC_AUTH_PASS 生效）
 *
 * 环境变量：
 *   PORT              对外端口，默认 8080
 *   API_PORT          内部音源 API 端口，默认 30488
 *   BASIC_AUTH_USER   Basic 认证用户名（与 PASS 同时设置才生效）
 *   BASIC_AUTH_PASS   Basic 认证密码
 */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const API_PORT = Number(process.env.API_PORT) || 30488;
const API_HOST = '127.0.0.1';
// 优先用 public/（Docker 镜像内），回退到源码构建目录（本地开发）
const ROOT = fs.existsSync(path.join(__dirname, 'public', 'index.html'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, 'src', 'renderer', 'dist');

const AUTH_USER = process.env.BASIC_AUTH_USER || '';
const AUTH_PASS = process.env.BASIC_AUTH_PASS || '';
const AUTH_ENABLED = Boolean(AUTH_USER && AUTH_PASS);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.map': 'application/json; charset=utf-8'
};

// ─── 1. 拉起音源 API ────────────────────────────────────────────────────
// 包在加载时会 readFileSync 临时目录下的 anonymous_token，必须先创建
const tokenPath = path.resolve(os.tmpdir(), 'anonymous_token');
if (!fs.existsSync(tokenPath)) {
  fs.writeFileSync(tokenPath, '', 'utf-8');
}

function startMusicApi() {
  const { serveNcmApi } = require('netease-cloud-music-api-alger/server');
  return serveNcmApi({ port: API_PORT, host: API_HOST })
    .then(() => console.log(`[api] 音源服务已就绪 → http://${API_HOST}:${API_PORT}`))
    .catch((err) => {
      console.error('[api] 音源服务启动失败:', err);
      process.exit(1);
    });
}

// ─── 2. 认证 ────────────────────────────────────────────────────────────
function checkAuth(req) {
  if (!AUTH_ENABLED) return true;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const idx = decoded.indexOf(':');
  if (idx < 0) return false;
  return decoded.slice(0, idx) === AUTH_USER && decoded.slice(idx + 1) === AUTH_PASS;
}

// ─── 3. 反向代理 /api/* → 内部音源 API ──────────────────────────────────
function proxyToApi(req, res, apiPath) {
  const headers = { ...req.headers, host: `${API_HOST}:${API_PORT}` };
  delete headers['accept-encoding']; // 让上游返回未压缩内容，避免二次编码问题

  const upstream = http.request(
    {
      host: API_HOST,
      port: API_PORT,
      path: apiPath,
      method: req.method,
      headers
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );

  upstream.on('error', (err) => {
    console.error('[proxy] 上游请求失败:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ code: 502, msg: 'music api unavailable' }));
  });

  req.pipe(upstream);
}

// ─── 4. 静态文件 ────────────────────────────────────────────────────────
function serveStatic(req, res, urlPath) {
  let filePath = path.join(ROOT, urlPath);

  // 防路径穿越
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  filePath = normalized;

  // SPA 回退
  let stat = null;
  try {
    stat = fs.statSync(filePath);
  } catch {
    stat = null;
  }
  if (!stat || stat.isDirectory()) {
    filePath = path.join(ROOT, 'index.html');
    try {
      stat = fs.statSync(filePath);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('index.html not found — 构建产物缺失');
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const isHtml = ext === '.html';
  const isHashed = /\/assets\//.test(filePath);

  const headers = {
    'Content-Type': type,
    'Cache-Control': isHtml ? 'no-cache' : isHashed ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    'Accept-Ranges': 'bytes'
  };

  // 支持 Range（PWA / 音频预览需要）
  const range = req.headers.range;
  if (range && /^bytes=/.test(range)) {
    const [startRaw, endRaw] = range.replace(/^bytes=/, '').split('-');
    const start = startRaw ? parseInt(startRaw, 10) : 0;
    const end = endRaw ? parseInt(endRaw, 10) : stat.size - 1;
    if (Number.isNaN(start) || start >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }
    const safeEnd = Math.min(end, stat.size - 1);
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${safeEnd}/${stat.size}`,
      'Content-Length': safeEnd - start + 1
    });
    fs.createReadStream(filePath, { start, end: safeEnd }).pipe(res);
    return;
  }

  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

// ─── 5. 入口 ────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
    console.error(`[web] 找不到前端产物: ${ROOT}/index.html`);
    process.exit(1);
  }

  await startMusicApi();

  const server = http.createServer((req, res) => {
    if (!checkAuth(req)) {
      res.writeHead(401, {
        'WWW-Authenticate': 'Basic realm="XilerMusic", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8'
      });
      res.end('Authentication required');
      return;
    }

    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split('?')[0]);
    } catch {
      urlPath = req.url.split('?')[0];
    }

    // /api/xxx → 内部 /xxx
    if (urlPath === '/api' || urlPath.startsWith('/api/')) {
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      const apiPath = (urlPath.replace(/^\/api/, '') || '/') + query;
      proxyToApi(req, res, apiPath);
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    serveStatic(req, res, urlPath === '/' ? '/index.html' : urlPath);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[web] XilerMusic 已启动 → http://0.0.0.0:${PORT}`);
    console.log(`[web] 认证: ${AUTH_ENABLED ? '已开启 Basic 认证' : '未开启（公网部署请务必设置 BASIC_AUTH_USER/PASS）'}`);
  });
}

main();
