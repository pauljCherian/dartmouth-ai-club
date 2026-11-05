#!/usr/bin/env node
// Tiny static server for local checks. Behaves like Vercel for this site:
// clean URLs (/speakers serves speakers.html, /speakers.html redirects), the
// redirects listed in vercel.json, and 404.html with a 404 status.
//
//   node tools/serve.mjs            serves dist/ on http://localhost:4321
//   node tools/serve.mjs preview 4322

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirName = process.argv[2] || 'dist';
const dir = path.resolve(ROOT, dirName);
const port = Number(process.argv[3] || 4321);
const clean = dirName === 'dist';
const vercel = JSON.parse(await readFile(path.join(ROOT, 'vercel.json'), 'utf8'));
const redirects = new Map((vercel.redirects || []).map((r) => [r.source, r.destination]));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};
const isFile = async (p) => { try { return (await stat(p)).isFile() ? p : null; } catch { return null; } };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p;
  try { p = decodeURIComponent(url.pathname); } catch { res.writeHead(400); res.end(); return; }
  if (p.includes('\0') || path.normalize(p).includes('..')) { res.writeHead(400); res.end(); return; }

  const bare = p.replace(/\.html$/, '');
  if (clean && redirects.has(bare)) { res.writeHead(308, { location: redirects.get(bare) }); res.end(); return; }
  if (clean && p.endsWith('.html')) {
    res.writeHead(308, { location: (p === '/index.html' ? '/' : bare) + url.search });
    res.end();
    return;
  }
  const local = path.join(dir, p);
  let file = (await isFile(local)) || (await isFile(path.join(local, 'index.html'))) || (clean ? await isFile(`${local}.html`) : null);
  let status = 200;
  if (!file) { file = path.join(dir, '404.html'); status = 404; }
  const body = await readFile(file);
  res.writeHead(status, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(body);
}).listen(port, () => console.log(`Serving ${dirName}/ at http://localhost:${port}`));
