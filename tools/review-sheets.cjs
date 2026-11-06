// The System sheets for the board's placement review: every page at phone and laptop size with the 12-column grid
// drawn over it and every text style labelled with its type token, plus system.json: each type style and where it is used.
// Usage: node tools/review-sheets.cjs <base url> public/review   (against the production build, e.g. npm run serve;
// the home page in its static layout). Re-run it and commit system.json with the 11 system-*.jpg whenever the type,
// the grid or a page's layout changes, or the review page's System section shows an old site.
// Needs Playwright with its Chromium (a QA tool, not part of the site build): it is required from PLAYWRIGHT_PATH if set.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://127.0.0.1:4321';
const OUT = process.argv[3] || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const PAGES = [['home', '/'], ['speakers', '/speakers'], ['team', '/team'], ['join', '/join'], ['404', '/nope'], ['menu', '/speakers']];
const WIDTHS = [{ w: 390, h: 844, dpr: 2, mobile: true }, { w: 1440, h: 900, dpr: 1, mobile: false }];
const TOKENS = ['--t-page', '--t-2', '--t-3', '--t-4', '--t-5', '--t-6', '--t-menu'];

(async () => {
  const b = await chromium.launch();
  const data = { base: BASE, widths: {} };
  for (const W of WIDTHS) {
    const wd = (data.widths[W.w] = { tokens: {}, uses: [] });
    for (const [name, url] of PAGES) {
      if (name === 'menu' && !W.mobile) continue;
      const ctx = await b.newContext({ viewport: { width: W.w, height: W.h }, deviceScaleFactor: W.dpr, isMobile: W.mobile, hasTouch: W.mobile, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(BASE + url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager')));
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      if (name === 'menu') { await page.click('.menu-button'); await page.waitForTimeout(400); }
      const res = await page.evaluate(({ TOKENS, name }) => {
        // token sizes at this width
        const probe = (v) => { const d = document.createElement('div'); d.style.fontSize = `var(${v})`; document.body.appendChild(d); const px = parseFloat(getComputedStyle(d).fontSize); d.remove(); return px; };
        const tokens = Object.fromEntries(TOKENS.map((t) => [t, probe(t)]));
        const tokenOf = (px) => { for (const [t, v] of Object.entries(tokens)) if (Math.abs(v - px) < 0.3) return t.replace('--', ''); return null; };
        const COLORS = { 'rgb(22, 22, 22)': 'ink', 'rgb(102, 102, 98)': 'gray', 'rgb(0, 105, 62)': 'green', 'rgb(0, 82, 47)': 'green-deep', 'rgb(244, 244, 241)': 'paper' };
        const scope = name === 'menu' ? document.querySelector('.site-menu') : document.body;
        const sig = (el) => {
          const parts = [];
          for (let e = el; e && e !== document.body && parts.length < 5; e = e.parentElement) {
            const c = [...e.classList].filter((x) => !/^is-|^js/.test(x));
            parts.unshift(e.tagName.toLowerCase() + (c.length ? '.' + c.join('.') : ''));
            if (c.length) break;
          }
          return parts.join(' > ');
        };
        const els = [...scope.querySelectorAll('*')].filter((el) => {
          if (['SCRIPT', 'STYLE', 'svg', 'path', 'TITLE'].includes(el.tagName)) return false;
          if (el.closest('.visually-hidden, [hidden], .hero__title, .skip-link')) return false;
          if (name !== 'menu' && el.closest('.site-menu')) return false;
          const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
          const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false;
          return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        });
        // a child that only repeats its parent's style (a span inside a heading) gets no label of its own
        const inherits = (el, cs) => { const p = el.parentElement; if (!p || !els.includes(p)) return false; const pc = getComputedStyle(p); return pc.fontSize === cs.fontSize && pc.fontWeight === cs.fontWeight && pc.color === cs.color; };
        const uses = els.map((el) => {
          const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
          const px = parseFloat(cs.fontSize);
          const lh = cs.lineHeight === 'normal' ? 'normal' : +(parseFloat(cs.lineHeight) / px).toFixed(2);
          return { page: name, sel: sig(el), text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 48), px: +px.toFixed(2), token: tokenOf(px), weight: +cs.fontWeight,
            lh, ls: cs.letterSpacing === 'normal' ? 0 : +(parseFloat(cs.letterSpacing) / px).toFixed(3), color: COLORS[cs.color] || cs.color,
            x: Math.round(r.left), y: Math.round(r.top + scrollY), inherits: inherits(el, cs) };
        });
        // the 12-column grid, measured from a probe row inside the page's own wrapper
        const host = document.querySelector('main') || document.body;
        const wrap = document.createElement('div'); wrap.className = 'wrap'; wrap.style.cssText = 'position:absolute;left:0;right:0;top:0;visibility:hidden';
        const row = document.createElement('div'); row.className = 'row'; row.style.cssText = 'padding:0;background:none';
        for (let i = 0; i < 12; i++) { const c = document.createElement('div'); c.style.cssText = 'grid-column:span 1;height:1px'; row.appendChild(c); }
        wrap.appendChild(row); host.appendChild(wrap);
        const cols = [...row.children].map((c) => { const r = c.getBoundingClientRect(); return [r.left, r.width]; });
        wrap.remove();
        // draw the overlay and the labels
        const H = Math.max(document.documentElement.scrollHeight, innerHeight);
        const layer = document.createElement('div');
        layer.style.cssText = `position:${name === 'menu' ? 'fixed' : 'absolute'};left:0;top:0;width:100%;height:${name === 'menu' ? '100%' : H + 'px'};pointer-events:none;z-index:2147483647`;
        for (const [x, w] of cols) { const c = document.createElement('div'); c.style.cssText = `position:absolute;top:0;bottom:0;left:${x}px;width:${w}px;background:rgba(214,40,90,.07);box-shadow:inset 1px 0 rgba(214,40,90,.35),inset -1px 0 rgba(214,40,90,.35)`; layer.appendChild(c); }
        const seen = new Set();
        for (const u of uses) {
          const key = u.sel + '|' + u.px + '|' + u.weight;
          if (seen.has(key) || u.inherits) continue; seen.add(key);
          const t = document.createElement('div');
          t.textContent = `${u.token ? u.token.replace('t-', 'T') : 'OFF ' + u.px}${u.weight >= 700 ? ' bold' : ''}`;
          const top = name === 'menu' ? u.y - scrollY : u.y;
          t.style.cssText = `position:absolute;left:${Math.max(0, u.x - 2)}px;top:${Math.max(0, top - 13)}px;font:600 10px/12px ui-monospace,Menlo,monospace;letter-spacing:0;padding:0 3px;border-radius:2px;color:#fff;background:${u.token ? 'rgba(214,40,90,.9)' : '#E8730C'};white-space:nowrap`;
          layer.appendChild(t);
        }
        document.body.appendChild(layer);
        return { tokens, uses, cols: cols.map(([x, w]) => [Math.round(x * 10) / 10, Math.round(w * 10) / 10]) };
      }, { TOKENS, name });
      wd.tokens = res.tokens; wd.cols = res.cols; wd.uses.push(...res.uses.filter((u) => !u.inherits));
      const file = path.join(OUT, `system-${name}-${W.w}.jpg`);
      await page.screenshot({ path: file, fullPage: name !== 'menu', type: 'jpeg', quality: 82 });
      await ctx.close();
      console.log('wrote', path.basename(file));
    }
  }
  // aggregate: one entry per style (token, weight, line-height, letter-spacing, colour) per width
  for (const [w, wd] of Object.entries(data.widths)) {
    const styles = new Map();
    for (const u of wd.uses) {
      const k = [u.token || 'off:' + u.px, u.weight, u.lh, u.ls, u.color].join('|');
      if (!styles.has(k)) styles.set(k, { token: u.token, px: u.px, weight: u.weight, lh: u.lh, ls: u.ls, color: u.color, uses: {} });
      const s = styles.get(k); const uk = `${u.page}: ${u.sel}`;
      s.uses[uk] = s.uses[uk] || { n: 0, text: u.text }; s.uses[uk].n++;
    }
    wd.styles = [...styles.values()].sort((a, b) => b.px - a.px || b.weight - a.weight);
    delete wd.uses;
  }
  fs.writeFileSync(path.join(OUT, 'system.json'), JSON.stringify(data, null, 1));
  for (const [w, wd] of Object.entries(data.widths)) {
    console.log(`\n== ${w}px  tokens: ${Object.entries(wd.tokens).map(([k, v]) => `${k.replace('--', '')}=${v}`).join(' ')}`);
    for (const s of wd.styles) console.log(`${(s.token || 'OFF').padEnd(6)} ${String(s.px).padEnd(6)} w${s.weight} lh${s.lh} ls${s.ls} ${s.color.padEnd(6)} | ${Object.entries(s.uses).map(([k, v]) => `${k}${v.n > 1 ? ' ×' + v.n : ''}`).join('; ')}`);
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
