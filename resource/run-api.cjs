/**
 * 独立启动 AlgerMusicPlayer 的网易云音源 API 后端
 * 从 pnpm 的 .pnpm 目录动态解析包路径，不依赖 Electron 主进程
 *
 * 用法: node run-api.cjs [port]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.argv[2]) || 30488;
const HOST = '127.0.0.1';

function resolvePkg() {
  const root = path.join(__dirname, 'node_modules');

  // 1) 先试常规解析
  try {
    return path.dirname(require.resolve('netease-cloud-music-api-alger/package.json'));
  } catch {
    /* ignore */
  }

  // 2) 回退：扫描 .pnpm 目录
  const store = path.join(root, '.pnpm');
  if (fs.existsSync(store)) {
    const hit = fs
      .readdirSync(store)
      .find((d) => d.startsWith('netease-cloud-music-api-alg'));
    if (hit) {
      const p = path.join(store, hit, 'node_modules', 'netease-cloud-music-api-alger');
      if (fs.existsSync(path.join(p, 'server.js'))) return p;
    }
  }
  throw new Error('找不到 netease-cloud-music-api-alger 包，请先执行 pnpm install');
}

// 必须在 require 之前创建 anonymous_token，否则模块加载时 readFileSync 崩溃
const tokenPath = path.resolve(os.tmpdir(), 'anonymous_token');
if (!fs.existsSync(tokenPath)) {
  fs.writeFileSync(tokenPath, '', 'utf-8');
}

const pkgDir = resolvePkg();
console.log('[api] package:', pkgDir);

const { serveNcmApi } = require(path.join(pkgDir, 'server.js'));

serveNcmApi({ port: PORT, host: HOST })
  .then(() => {
    console.log(`[api] MUSIC API STARTED → http://${HOST}:${PORT}`);
  })
  .catch((err) => {
    console.error('[api] 启动失败:', err);
    process.exit(1);
  });
