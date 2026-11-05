#!/usr/bin/env node
// Zero-dependency static build for the Dartmouth AI Club site.
//
//   node tools/build.mjs            -> dist/     production: clean URLs, absolute asset paths (Vercel serves this)
//   node tools/build.mjs --preview  -> preview/  self-contained preview: .html links, inlined CSS, JS and fonts
//
// BUILD_NOW=2026-11-07T12:00:00-05:00 node tools/build.mjs   pretend it is another date (decides upcoming vs past talks)
//
// The build fails loudly on: invalid content, a missing image, font or SVG, or any broken internal link or anchor.

import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
  photos: await readJSON('content/photos.json'),
};

// Every talk is in Hanover: an offset must be New York's offset on that date (-04:00 in summer, -05:00 in winter).
const nyOffsetMinutes = (date) => {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  const v = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, Number(x.value)]));
  return Math.round((Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second) - date.getTime()) / 60000);
};
const fmtOffset = (min) => `${min < 0 ? '-' : '+'}${String(Math.floor(Math.abs(min) / 60)).padStart(2, '0')}:${String(Math.abs(min) % 60).padStart(2, '0')}`;
// New York calendar date and clock time of an instant, for checking the printed labels.
const nyParts = (date) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(date).map((x) => [x.type, x.value]));

(function validate({ site, speakers, team, sessions, reading }) {
  const need = (obj, keys, where) => keys.forEach((k) => (obj[k] === undefined || obj[k] === '') && fail(`${where}: missing "${k}"`));
  need(site, ['name', 'origin', 'tagline', 'description'], 'site.json');
  need(site.members || {}, ['count'], 'site.json members');
  need(site.meetings || {}, ['when', 'where'], 'site.json meetings');
  need(site.hero || {}, ['alt', 'caption'], 'site.json hero');
  need(site.contact || {}, ['email', 'name', 'role'], 'site.json contact');
  if (site.contact && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(site.contact.email)) fail('site.json: contact.email is not an email address');
  const ids = new Set();
  speakers.forEach((ev, i) => {
    const where = `speakers.json[${i}] ${ev.name || ''}`;
    need(ev, ['id', 'name', 'org', 'date_label', 'photo'], where);
    if (typeof ev.photo_alt !== 'string') fail(`${where}: "photo_alt" must be text: "" for a plain portrait, a description for an event photo`);
    if (ids.has(ev.id)) fail(`${where}: duplicate id "${ev.id}"`);
    ids.add(ev.id);
    let datesOk = true;
    for (const k of ['start', 'end']) {
      if (!ev[k]) continue;
      if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?([+-]\d\d:\d\d|Z)$/.test(ev[k]) || Number.isNaN(Date.parse(ev[k]))) {
        fail(`${where}: "${k}" must look like 2026-11-06T16:00:00-05:00 (date, time and New York offset)`);
        datesOk = false;
        continue;
      }
      const m = ev[k].match(/([+-])(\d\d):(\d\d)$/);
      const given = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
      // The date must exist: Date.parse quietly rolls Nov 31 over to Dec 1.
      if (new Date(Date.parse(ev[k]) + given * 60000).toISOString().slice(0, 16) !== ev[k].slice(0, 16)) {
        fail(`${where}: "${k}" is not a real date and time (${ev[k].slice(0, 16)})`);
        datesOk = false;
        continue;
      }
      const expected = nyOffsetMinutes(new Date(ev[k]));
      if (given !== expected) fail(`${where}: "${k}" uses offset ${fmtOffset(given)}, but New York is on ${fmtOffset(expected)} that day`);
    }
    if (ev.end && !ev.start) fail(`${where}: "end" is set but "start" is not`);
    if (datesOk && ev.start && ev.end && !(Date.parse(ev.end) > Date.parse(ev.start))) fail(`${where}: "end" must be after "start"`);
    if (datesOk && ev.start && ev.end && Date.parse(ev.end) - Date.parse(ev.start) > 72 * 3600e3) fail(`${where}: "end" is more than 3 days after "start" (typo?)`);
    // The printed date and time must match "start" (a rescheduled talk must not keep its old label).
    if (datesOk && ev.start) {
      const ny = nyParts(new Date(ev.start));
      const want = `${ny.month} ${ny.day}, ${ny.year}`;
      const label = String(ev.date_label || '');
      // "Fri Nov 6, 2026", "Friday, November 6, 2026", "Nov 6, 2026", "Sept 9, 2026": compare as month, day, year.
      const DAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
      const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const m = label.toLowerCase().match(/^(?:([a-z]+)\.?,?\s+)?([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
      const month = m && MONTHS.indexOf(m[2].slice(0, 3));
      const nyDate = new Date(Date.UTC(Number(ny.year), MONTHS.indexOf(ny.month.toLowerCase().slice(0, 3)), Number(ny.day)));
      if (!m || month < 0 || Number(m[3]) !== nyDate.getUTCDate() || month !== nyDate.getUTCMonth() || Number(m[4]) !== nyDate.getUTCFullYear()) {
        fail(`${where}: "date_label" should read like "${want}" (optionally with the weekday first): "start" is ${ny.weekday} ${want} in New York`);
      } else if (m[1] && DAYS[m[1].slice(0, 3)] !== nyDate.getUTCDay()) {
        fail(`${where}: "date_label" weekday is wrong: ${ny.weekday} ${want}`);
      }
      if (ev.time_label) {
        // "4 pm", "4:00 pm", "4 p.m.", "4pm", or a range like "4–5:30 pm" (the start is checked).
        const t = String(ev.time_label).toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
        const tm = t.match(/^(\d{1,2})(?::(\d\d))?(am|pm)?(?:[-–—](\d{1,2})(?::(\d\d))?)?(am|pm)?$/);
        const period = tm && (tm[3] || tm[6]);
        const ok = tm && period && Number(tm[1]) === Number(ny.hour) && (tm[2] || '00') === ny.minute && period === ny.dayPeriod.toLowerCase();
        if (!ok) fail(`${where}: "time_label" says "${ev.time_label}" but "start" is ${ny.hour}${ny.minute === '00' ? '' : ':' + ny.minute} ${ny.dayPeriod.toLowerCase()} in New York`);
      }
    }
  });
  team.officers.forEach((o, i) => need(o, ['name', 'role', 'photo'], `team.json officers[${i}]`));
  team.advisors.forEach((a, i) => need(a, ['name', 'title', 'unit'], `team.json advisors[${i}]`));
  sessions.forEach((s, i) => {
    need(s, ['date', 'title', 'people'], `sessions.json[${i}]`);
    if (!/^\d{4}-\d\d-\d\d$/.test(s.date)) fail(`sessions.json[${i}]: date must be YYYY-MM-DD`);
    else {
      const day = new Date(`${s.date}T00:00:00Z`);
      if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== s.date) fail(`sessions.json[${i}]: ${s.date} is not a real date`);
    }
  });
  reading.forEach((r, i) => need(r, ['title', 'authors', 'href'], `reading.json[${i}]`));
  for (const [k, v] of Object.entries(site.claims || {})) {
    if (k.startsWith('_')) continue;
    if (!v || typeof v.about !== 'string' || !v.about) fail(`site.json claims.${k}: needs "about" (the words used in Who we are), or delete the entry`);
  }
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
{
  const ratio = (name) => { const v = svgs[name]?.markup.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/); return v ? Number(v[2]) / Number(v[1]) : null; };
  const d = ratio('logo-display');
  if (d && Math.abs(d - brand.display.ratio) / d > 0.005) fail(`content/brand.json: display.ratio is ${brand.display.ratio} but src/svg/logo-display.svg is ${d.toFixed(4)} (height/width); re-measure brand.json (line2 too) after changing the logo`);
}

// ---------- 3. Images ----------
const manifestPath = rel('public/img/manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : {};
if (!manifest['hero/hero']) fail('public/img/manifest.json has no hero image (run tools/images.py)');
// Every portrait must exist, unless photos.json lists it under "missing" (those get an initials tile).
{
  const treatment = content.site.portrait_treatment || 'duo';
  const known = new Set(Object.keys(content.photos.missing || {}));
  const used = [
    ...content.speakers.map((ev, i) => [ev.photo, `speakers.json[${i}] ${ev.name}`]),
    ...content.team.officers.map((o, i) => [o.photo, `team.json officers[${i}] ${o.name}`]),
  ];
  for (const [id, where] of used) {
    if (process.env.ALLOW_MISSING) break;  // development builds: placeholders instead
    if (id && !manifest[`people/${id}-${treatment}`] && !known.has(id)) fail(`${where}: no portrait "${id}" in public/img (check the id, or list it under "missing" in content/photos.json)`);
  }
  const c = content.photos.hero?.ceiling;
  if (typeof c !== 'number' || c < 0 || c >= 0.5) fail('photos.json: hero.ceiling must be a number between 0 and 0.5');
}

// ---------- 4. CSS and JS ----------
let css = await readFile(rel('src/styles/site.css'), 'utf8');
const js = await readFile(rel('src/scripts/site.js'), 'utf8');
const ALLOW_MISSING = Boolean(process.env.ALLOW_MISSING); // development only: placeholders for missing fonts and portraits
// Fonts: inlined in the preview; in production served under a content-hashed name, so they can be cached
// for a year as immutable and a replaced font still reaches every visitor.
const fonts = [];
for (const w of ['400', '700']) {
  const fontPath = rel('public/fonts', `texgyreheros-${w}.woff2`);
  if (!existsSync(fontPath)) {
    if (!ALLOW_MISSING) fail(`public/fonts/texgyreheros-${w}.woff2 is missing`);
    css = css.replace(`, url("__FONT_${w}__") format("woff2")`, '');
    continue;
  }
  const font = await readFile(fontPath);
  if (PREVIEW) {
    css = css.replace(`__FONT_${w}__`, `data:font/woff2;base64,${font.toString('base64')}`);
  } else {
    const name = `texgyreheros-${w}.${createHash('sha256').update(font).digest('hex').slice(0, 10)}.woff2`;
    fonts.push({ from: `fonts/texgyreheros-${w}.woff2`, to: `fonts/${name}`, data: font });
    css = css.replace(`__FONT_${w}__`, `/fonts/${name}`);
  }
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
  for (const f of fonts) {
    await rm(path.join(OUT, f.from), { force: true });
    await writeFile(path.join(OUT, f.to), f.data);
  }
  await rm(path.join(OUT, 'img/manifest.json'), { force: true });
  await rm(path.join(OUT, 'review'), { recursive: true, force: true });
  await mkdir(path.join(OUT, 'js'), { recursive: true });
  await writeFile(path.join(OUT, 'js/site.js'), js);
  const origin = content.site.origin.replace(/\/$/, '');
  const urls = written.filter((w) => w.file !== '404.html').map((w) => `${origin}${w.path === '/' ? '/' : w.path}`);
  await writeFile(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
}

// ---------- 7. Check every internal link, image, font and anchor in the output ----------
const ids = new Map(written.map((w) => [w.file, new Set([...w.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
const fileFor = (urlPath) => {
  if (PREVIEW) return urlPath;
  if (urlPath === '/' || urlPath === '') return 'index.html';
  const clean = urlPath.replace(/^\//, '');
  if (ids.has(`${clean}.html`)) return `${clean}.html`;
  return clean;
};
const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const origin = content.site.origin.replace(/\/$/, '');
const check = (from, raw) => {
  let ref = raw.replace(/&amp;/g, '&');
  if (!PREVIEW && ref.startsWith(`${origin}/`)) ref = ref.slice(origin.length); // canonical, og:image, JSON-LD
  if (/^(https?:|mailto:|tel:|data:)/.test(ref)) return;
  let [p, hash] = ref.split('#');
  p = p.split('?')[0]; // "?v=2" cache busters don't change the file
  const file = p === '' ? from : fileFor(p);
  if (!isFile(path.join(OUT, file))) { fail(`${from}: broken link or file "${raw}"`); return; }
  if (hash && ids.has(file) && !ids.get(file).has(hash) && !['mono', 'logo'].includes(hash)) fail(`${from}: anchor "#${hash}" not found in ${file}`);
};
for (const w of written) {
  const refs = [];
  for (const m of w.html.matchAll(/\s(?:href|src)="([^"]+)"/g)) refs.push(m[1]);
  for (const m of w.html.matchAll(/\ssrcset="([^"]+)"/g)) m[1].split(',').forEach((part) => refs.push(part.trim().split(/\s+/)[0]));
  for (const m of w.html.matchAll(/\scontent="(https?:\/\/[^"]+)"/g)) refs.push(m[1]); // og:image, og:url
  for (const st of w.html.matchAll(/<style>([\s\S]*?)<\/style>/g)) for (const m of st[1].matchAll(/url\(["']?([^"')]+)["']?\)/g)) refs.push(m[1]); // fonts in the inlined CSS
  for (const m of w.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    JSON.parse(m[1], (k, v) => { if (typeof v === 'string' && v.startsWith(`${origin}/`)) refs.push(v); return v; });
  }
  for (const raw of refs) check(w.file, raw);
}
if (!PREVIEW) {
  let wm = null;
  try { wm = JSON.parse(await readFile(path.join(OUT, 'site.webmanifest'), 'utf8')); }
  catch (e) { fail(`public/site.webmanifest is missing or not valid JSON: ${e.message}`); }
  for (const icon of (wm && wm.icons) || []) {
    const u = new URL(icon.src, `${origin}/site.webmanifest`);
    if (`${u.protocol}//${u.host}` === new URL(origin).origin) check('site.webmanifest', u.pathname);
  }
  for (const r of (JSON.parse(await readFile(rel('vercel.json'), 'utf8')).redirects || [])) {
    if (/:\w|\(|\$\d/.test(r.destination)) continue; // a pattern (":file", "(.*)", "$1"): no single file to check
    check(`vercel.json redirect ${r.source}`, r.destination);
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
