#!/usr/bin/env node
// Tiny static server for local checks. Behaves like Vercel for this site: clean URLs (/speakers serves
// speakers.html; /speakers.html, /index and trailing slashes redirect), the redirects and headers listed
// in vercel.json, and 404.html with a 404 status.
// It listens on this computer only (127.0.0.1) and never serves a file from outside the output folder.
//
//   node tools/serve.mjs            serves dist/ on http://localhost:4321
//   node tools/serve.mjs preview 4322   (preview/index.html is a fragment for the artifact viewer; the other pages are complete)

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirName = process.argv[2] || 'dist';
const dir = path.resolve(ROOT, dirName);
const port = Number(process.argv[3] || 4321);
const host = '127.0.0.1';
const clean = dirName === 'dist';
const vercel = JSON.parse(await readFile(path.join(ROOT, 'vercel.json'), 'utf8'));
const redirects = new Map((vercel.redirects || []).map((r) => [r.source, r.destination]));
// vercel.json header sources look like "/fonts/(.*)": literal text plus "(.*)" wildcards.
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const headerRules = (vercel.headers || []).map((h) => ({
  re: new RegExp(`^${h.source.split('(.*)').map(escapeRe).join('(.*)')}$`),
  headers: Object.fromEntries(h.headers.map((x) => [x.key.toLowerCase(), x.value])),
}));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};
const isFile = async (p) => { try { return (await stat(p)).isFile() ? p : null; } catch { return null; } };
const inside = (p) => p === dir || p.startsWith(dir + path.sep);

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p;
  try { p = decodeURIComponent(url.pathname); } catch { res.writeHead(400); res.end(); return; }
  if (p.includes('\0')) { res.writeHead(400); res.end(); return; }
  const redirect = (to) => { res.writeHead(308, { location: to + url.search }); res.end(); };

  if (clean) {
    if (p.length > 1 && p.endsWith('/')) return redirect(p.replace(/\/+$/, '') || '/'); // trailingSlash: false
    const bare = p.replace(/\.html$/, '');
    if (bare === '/index') return redirect('/');
    if (redirects.has(bare)) { res.writeHead(308, { location: redirects.get(bare) }); res.end(); return; }
    if (p.endsWith('.html')) return redirect(bare);
  }

  // Resolve inside the output folder only: "/..%2f..%2fetc/passwd" must not escape it.
  const local = path.resolve(dir, `.${path.posix.normalize(p)}`);
  if (!inside(local)) { res.writeHead(403); res.end(); return; }
  let file = (await isFile(local)) || (await isFile(path.join(local, 'index.html'))) || (clean ? await isFile(`${local}.html`) : null);
  let status = 200;
  if (!file || !inside(file)) { file = path.join(dir, '404.html'); status = 404; }

  const headers = { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'public, max-age=0, must-revalidate' };
  for (const rule of headerRules) if (rule.re.test(p)) Object.assign(headers, rule.headers);
  const body = await readFile(file);
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(port, host, () => console.log(`Serving ${dirName}/ at http://localhost:${port} (this computer only)`));
