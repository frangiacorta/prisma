import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export async function startServer(port = 8240) {
  const root = fileURLToPath(new URL('./web/', import.meta.url));
  const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    try {
      let name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      if (name === '/') name = '/index.html';
      const target = path.resolve(root, '.' + name);
      if (!target.startsWith(root) || name.split('/').some(p => p.startsWith('.'))) { res.writeHead(403); res.end(); return; }
      const data = await readFile(target);
      res.writeHead(200, {'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'no-store'});
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(port, '127.0.0.1', resolve);});
  return {server, url: `http://127.0.0.1:${server.address().port}/`};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {url} = await startServer(Number(process.env.PRISMA_PORT || 8240));
  console.log(`Diagnostica Prisma: ${url}`);
}
