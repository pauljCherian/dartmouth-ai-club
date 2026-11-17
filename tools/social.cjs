// The club's profile pictures and banners for GroupMe, LinkedIn, X, Instagram and YouTube, drawn from the site's own
// logo (src/svg/logo-display.svg), type (public/fonts) and colours, and the tagline in content/site.json.
//
//   node tools/social.cjs            writes brand/social/*.png
//
// Run it again when the logo or the tagline changes. Needs Playwright with its Chromium (a tool for the officers'
// computer, not part of the site build): it is required from PLAYWRIGHT_PATH if set.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'brand/social');
const INK = '#161616', PAPER = '#F4F4F1', GREEN = '#00693E';
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));
const logo = fs.readFileSync(path.join(ROOT, 'src/svg/logo-display.svg'), 'utf8');
const address = site.origin.replace(/^https?:\/\//, '');
const font = (weight) => {
  const f = fs.readdirSync(path.join(ROOT, 'public/fonts')).find((n) => n.startsWith(`texgyreheros-${weight}.`) && n.endsWith('.woff2'));
  return `@font-face{font-family:"Club Sans";font-weight:${weight};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'public/fonts', f)).toString('base64')}) format("woff2");ascent-override:77%;descent-override:23%;line-gap-override:0%}`;
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const page = (w, h, bg, body) => `<!doctype html><meta charset="utf-8"><style>${font(400)}${font(700)}
html,body{margin:0}body{width:${w}px;height:${h}px;background:${bg};overflow:hidden;font-family:"Club Sans",Helvetica,Arial,sans-serif}
svg{display:block;width:100%;height:auto;overflow:visible}p{margin:0}</style>${body}`;

// A profile picture: the logo centred in a square, 78% of its width, so all of it sits well inside the circle every
// platform cuts (its corners are 10% of the width from the circle's edge).
const profile = (size, fg, bg) => page(size, size, bg,
  `<div style="position:absolute;left:11%;width:78%;top:50%;transform:translateY(-50%);color:${fg}">${logo}</div>`);

// The words of a banner: the tagline in the site's statement type (regular weight, tight) with the site's address
// under it, small and bold like the site's links.
const say = (size, addr = 0.4) =>
  `<p style="font-size:${size}px;font-weight:400;letter-spacing:-0.02em;line-height:1.08;text-wrap:balance">${esc(site.tagline)}</p>
   <p style="margin-top:${Math.round(size * 0.42)}px;font-size:${Math.round(size * addr)}px;font-weight:700;line-height:1">${esc(address)}</p>`;
// `box` is the part of a banner that every device shows and nothing covers (the platform's safe area, or the part
// clear of the profile picture), in pixels. Nothing is ever set against its edge: `pad` is the margin inside it.
const words = (w, h, box, size, fg, bg, pad = 0) => page(w, h, bg,
  `<div data-box style="position:absolute;left:${box.x + pad}px;top:${box.y}px;width:${box.w - 2 * pad}px;height:${box.h}px;display:flex;flex-direction:column;justify-content:center;color:${fg}">
     <div data-fit>${say(size)}</div>
   </div>`);
// The logo beside the words, like a section of the site: the name on the left, what it says on the right.
// For YouTube, where the profile picture sits under the banner instead of over it.
const lockup = (w, h, box, size, fg, bg, pad, logoW) => page(w, h, bg,
  `<div data-box style="position:absolute;left:${box.x + pad}px;top:${box.y}px;width:${box.w - 2 * pad}px;height:${box.h}px;display:flex;align-items:center;justify-content:space-between;color:${fg}">
     <div style="width:${logoW}px;flex:none">${logo}</div>
     <div data-fit style="width:${box.w - 2 * pad - logoW - Math.round(size * 1.6)}px">${say(size, 0.5)}</div>
   </div>`);

// The set to use: the profile picture is the logo in paper on Dartmouth green. A coloured disc keeps its shape on
// white pages and on black ones (an ink disc vanishes on black, a paper one on white), and it is the one thing on
// every platform that people press to reach the club, which is what green means on the site. The banners are paper
// on ink. YouTube's has the logo too; on LinkedIn and X the picture sits on the banner, so the name is not repeated.
// alt/ holds the other colours.
const YT = { x: 507, y: 508, w: 1546, h: 424 };   // YouTube shows the middle 1546 x 423 everywhere, all 2560 x 1440 only on TVs
const LI = { x: 520, y: 0, w: 1640, h: 382 };     // LinkedIn Page cover (1128 x 191, drawn at twice that): the logo covers the lower left
const X = { x: 460, y: 70, w: 1000, h: 360 };     // X header: the picture covers the lower left; narrow windows trim top and bottom
const FILES = [
  // name, width, height, html
  ['profile.png', 1600, 1600, profile(1600, PAPER, GREEN)],
  ['banner-youtube.png', 2560, 1440, lockup(2560, 1440, YT, 68, PAPER, INK, 90, 620)],
  ['banner-linkedin.png', 2256, 382, words(2256, 382, LI, 80, PAPER, INK)],
  ['banner-x.png', 1500, 500, words(1500, 500, X, 70, PAPER, INK)],
  ['alt/profile-black.png', 1600, 1600, profile(1600, PAPER, INK)],
  ['alt/profile-light.png', 1600, 1600, profile(1600, INK, PAPER)],
  ['alt/banner-youtube-light.png', 2560, 1440, lockup(2560, 1440, YT, 68, INK, PAPER, 90, 620)],
  ['alt/banner-linkedin-light.png', 2256, 382, words(2256, 382, LI, 80, INK, PAPER)],
  ['alt/banner-x-light.png', 1500, 500, words(1500, 500, X, 70, INK, PAPER)],
];

(async () => {
  fs.mkdirSync(path.join(OUT, 'alt'), { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h, html] of FILES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.setContent(html, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const fits = await p.evaluate(() => { const bx = document.querySelector('[data-box]'); if (!bx) return true; const B = bx.getBoundingClientRect(); return [...document.querySelectorAll('[data-fit]')].every((e) => { const r = e.getBoundingClientRect(); return r.left >= B.left - 0.5 && r.right <= B.right + 0.5 && r.top >= B.top - 0.5 && r.bottom <= B.bottom + 0.5 && e.scrollWidth <= e.clientWidth + 1; }); });
    if (!fits) { console.error(`${name}: the words do not fit the safe area; make the tagline shorter or the type smaller`); process.exitCode = 1; }
    await p.screenshot({ path: path.join(OUT, name), clip: { x: 0, y: 0, width: w, height: h } });
    console.log(`${name}  ${w} x ${h}  ${(fs.statSync(path.join(OUT, name)).size / 1024).toFixed(0)} KB`);
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
