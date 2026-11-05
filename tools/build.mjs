#!/usr/bin/env node
// Zero-dependency static build for the Dartmouth AI Club site.
//
//   node tools/build.mjs            -> dist/     production: clean URLs, absolute asset paths (Vercel serves this)
//   node tools/build.mjs --preview  -> preview/  self-contained preview: .html links, inlined CSS, JS and fonts
//
// BUILD_NOW=2026-11-07T12:00:00-05:00 node tools/build.mjs   pretend it is another date (decides upcoming vs past talks)
//
// The build fails loudly on: invalid content, a missing image or SVG, or any broken internal link or anchor.

import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createContext } from '../src/lib/core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = process.argv.includes('--preview');
const MODE = PREVIEW ? 'preview' : 'prod';
const OUT = path.join(ROOT, PREVIEW ? 'preview' : 'dist');
const NOW = process.env.BUILD_NOW ? new Date(process.env.BUILD_NOW) : new Date();
if (Number.isNaN(NOW.getTime())) throw new Error(`BUILD_NOW is not a valid date: ${process.env.BUILD_NOW}`);

const rel = (...p) => path.join(ROOT, ...p);
const readJSON = async (p) => JSON.parse(await readFile(rel(p), 'utf8'));
const problems = [];
const fail = (msg) => problems.push(msg);

// ---------- 1. Content ----------
const content = {
  site: await readJSON('content/site.json'),
  speakers: await readJSON('content/speakers.json'),
  team: await readJSON('content/team.json'),
  sessions: await readJSON('content/sessions.json'),
  reading: await readJSON('content/reading.json'),
};

(function validate({ site, speakers, team, sessions, reading }) {
  const need = (obj, keys, where) => keys.forEach((k) => (obj[k] === undefined || obj[k] === '') && fail(`${where}: missing "${k}"`));
  need(site, ['name', 'origin', 'tagline', 'description'], 'site.json');
  need(site.contact || {}, ['email', 'name', 'role'], 'site.json contact');
  if (site.contact && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(site.contact.email)) fail('site.json: contact.email is not an email address');
  const ids = new Set();
  speakers.forEach((ev, i) => {
    const where = `speakers.json[${i}] ${ev.name || ''}`;
    need(ev, ['id', 'name', 'org', 'date_label', 'photo', 'photo_alt'], where);
    if (ids.has(ev.id)) fail(`${where}: duplicate id "${ev.id}"`);
    ids.add(ev.id);
    for (const k of ['start', 'end']) if (ev[k] && Number.isNaN(Date.parse(ev[k]))) fail(`${where}: "${k}" is not a date`);
    if (ev.start && !/[+-]\d\d:\d\d$|Z$/.test(ev.start)) fail(`${where}: "start" needs a time zone offset, e.g. -05:00`);
  });
  team.officers.forEach((o, i) => need(o, ['name', 'role', 'photo'], `team.json officers[${i}]`));
  team.advisors.forEach((a, i) => need(a, ['name', 'title', 'unit'], `team.json advisors[${i}]`));
  sessions.forEach((s, i) => {
    need(s, ['date', 'title', 'people'], `sessions.json[${i}]`);
    if (!/^\d{4}-\d\d-\d\d$/.test(s.date)) fail(`sessions.json[${i}]: date must be YYYY-MM-DD`);
  });
  reading.forEach((r, i) => need(r, ['title', 'authors', 'href'], `reading.json[${i}]`));
})(content);

// ---------- 2. Brand: SVG assets and lockup metrics ----------
const svgs = {};
for (const f of (await readdir(rel('src/svg'))).filter((f) => f.endsWith('.svg'))) {
  let markup = (await readFile(rel('src/svg', f), 'utf8'))
    .replace(/<\?xml[^>]*>\s*/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .trim();
  markup = markup.replace(/<svg\b([^>]*)>/, (m, attrs) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, '')}>`);
  svgs[f.replace(/\.svg$/, '')] = { markup };
}
for (const name of ['logo-display', 'logo-small', 'arrow-e', 'arrow-ne']) if (!svgs[name]) fail(`src/svg/${name}.svg is missing`);
const brand = await readJSON('content/brand.json');

// ---------- 3. Images ----------
const manifestPath = rel('public/img/manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : {};
if (!manifest['hero/hero']) fail('public/img/manifest.json has no hero image (run tools/images.py)');

// ---------- 4. CSS and JS ----------
let css = await readFile(rel('src/styles/site.css'), 'utf8');
const js = await readFile(rel('src/scripts/site.js'), 'utf8');
const ALLOW_MISSING = Boolean(process.env.ALLOW_MISSING); // development only: placeholders instead of errors
if (PREVIEW) {
  for (const w of ['400', '700']) {
    const fontPath = rel('public/fonts', `texgyreheros-${w}.woff2`);
    if (!existsSync(fontPath)) {
      if (!ALLOW_MISSING) fail(`public/fonts/texgyreheros-${w}.woff2 is missing`);
      css = css.replace(`, url("__FONT_${w}__") format("woff2")`, '');
      continue;
    }
    const font = await readFile(fontPath);
    css = css.replace(`__FONT_${w}__`, `data:font/woff2;base64,${font.toString('base64')}`);
  }
} else {
  css = css.replace('__FONT_400__', '/fonts/texgyreheros-400.woff2').replace('__FONT_700__', '/fonts/texgyreheros-700.woff2');
}
css = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim();

if (problems.length) {
  console.error(`Build stopped. Fix these first:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

// ---------- 5. Pages ----------
const ctx = createContext({ mode: MODE, now: NOW, content, svgs, manifest, brand, inline: { css, js }, allowMissing: ALLOW_MISSING });
if (PREVIEW && existsSync(rel('public/review'))) {
  ctx.reviewFiles = new Set(await readdir(rel('public/review')));
  if (ctx.reviewFiles.has('qa.html')) ctx.reviewQA = await readFile(rel('public/review/qa.html'), 'utf8');
}
const pageNames = ['index', 'speakers', 'team', 'join', 'reading', '404', ...(PREVIEW ? ['review'] : [])];
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const written = [];
for (const name of pageNames) {
  const mod = await import(pathToFileURL(rel('src/pages', `${name}.mjs`)).href);
  const htmlOut = mod.render(ctx);
  await writeFile(path.join(OUT, mod.page.out), htmlOut);
  written.push({ file: mod.page.out, path: mod.page.path, html: htmlOut });
}

// ---------- 6. Static files ----------
const copyIf = async (from, to) => existsSync(rel(from)) && cp(rel(from), path.join(OUT, to), { recursive: true });
if (PREVIEW) {
  await copyIf('public/img', 'img');
  await copyIf('public/review', 'review');
  for (const f of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'og.jpg']) await copyIf(`public/${f}`, f);
  await rm(path.join(OUT, 'img/manifest.json'), { force: true });
  await rm(path.join(OUT, 'review/qa.html'), { force: true });
} else {
  await cp(rel('public'), OUT, { recursive: true });
  await rm(path.join(OUT, 'img/manifest.json'), { force: true });
  await rm(path.join(OUT, 'review'), { recursive: true, force: true });
  await mkdir(path.join(OUT, 'js'), { recursive: true });
  await writeFile(path.join(OUT, 'js/site.js'), js);
  const origin = content.site.origin.replace(/\/$/, '');
  const urls = written.filter((w) => w.file !== '404.html').map((w) => `${origin}${w.path === '/' ? '/' : w.path}`);
  await writeFile(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
}

// ---------- 7. Check every internal link, image and anchor in the output ----------
const ids = new Map(written.map((w) => [w.file, new Set([...w.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
const fileFor = (urlPath) => {
  if (PREVIEW) return urlPath;
  if (urlPath === '/' || urlPath === '') return 'index.html';
  const clean = urlPath.replace(/^\//, '');
  if (ids.has(`${clean}.html`)) return `${clean}.html`;
  return clean;
};
for (const w of written) {
  const refs = [];
  for (const m of w.html.matchAll(/\s(?:href|src)="([^"]+)"/g)) refs.push(m[1]);
  for (const m of w.html.matchAll(/\ssrcset="([^"]+)"/g)) m[1].split(',').forEach((part) => refs.push(part.trim().split(/\s+/)[0]));
  for (const raw of refs) {
    const ref = raw.replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
    const [p, hash] = ref.split('#');
    const file = p === '' ? w.file : fileFor(p);
    if (!existsSync(path.join(OUT, file))) { fail(`${w.file}: broken link or image "${ref}"`); continue; }
    if (hash && ids.has(file) && !ids.get(file).has(hash) && !['mono', 'logo'].includes(hash)) fail(`${w.file}: anchor "#${hash}" not found in ${file}`);
  }
}
if (problems.length) {
  if (ALLOW_MISSING) console.warn(`Development build with missing pieces:\n- ${problems.join('\n- ')}`);
  else {
    console.error(`Build output has problems:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
}
console.log(`Built ${written.length} pages to ${path.relative(ROOT, OUT)}/ (${MODE}, now = ${NOW.toISOString()}). Upcoming talks: ${ctx.upcoming.map((e) => e.name).join(', ') || 'none'}.`);
