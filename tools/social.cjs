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
const INK = '#161616', PAPER = '#F4F4F1';
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));
const logo = fs.readFileSync(path.join(ROOT, 'src/svg/logo-display.svg'), 'utf8');
const font = (weight) => {
  const f = fs.readdirSync(path.join(ROOT, 'public/fonts')).find((n) => n.startsWith(`texgyreheros-${weight}.`) && n.endsWith('.woff2'));
  return `@font-face{font-family:"Club Sans";font-weight:${weight};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'public/fonts', f)).toString('base64')}) format("woff2");ascent-override:77%;descent-override:23%;line-gap-override:0%}`;
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const page = (w, h, bg, body) => `<!doctype html><meta charset="utf-8"><style>${font(400)}${font(700)}
html,body{margin:0}body{width:${w}px;height:${h}px;background:${bg};overflow:hidden;font-family:"Club Sans",Helvetica,Arial,sans-serif}
svg{display:block;width:100%;height:auto;overflow:visible}</style>${body}`;

// A profile picture: the logo centred in a square, 78% of its width, so all of it sits well inside the circle every
// platform cuts (its corners are 10% of the width from the circle's edge).
const profile = (size, fg, bg) => page(size, size, bg,
  `<div style="position:absolute;left:11%;width:78%;top:50%;transform:translateY(-50%);color:${fg}">${logo}</div>`);

// A banner: the tagline, in the site's statement type (regular weight, tight). `box` is the part every device shows
// and nothing covers (the platform's safe area, or the part clear of the profile picture), in pixels.
const banner = (w, h, box, size, fg = INK, bg = PAPER) => page(w, h, bg,
  `<div style="position:absolute;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;display:flex;align-items:center">
     <p style="margin:0;color:${fg};font-size:${size}px;font-weight:400;letter-spacing:-0.02em;line-height:1.08;text-wrap:balance">${esc(site.tagline)}</p>
   </div>`);

// The set to use: the profile picture is the logo in paper on ink (a dark disc keeps its shape on the white pages of
// LinkedIn, Instagram, YouTube and X, where a paper one melts into the page), and the banners are ink on paper, so
// the dark picture stands clear where a platform lays it over the banner. alt/ holds the opposite pairing.
const YT = { x: 507, y: 508, w: 1546, h: 424 };   // YouTube shows the middle 1546 x 423 everywhere, all 2560 x 1440 only on TVs
const LI = { x: 520, y: 0, w: 1640, h: 382 };     // LinkedIn Page cover (1128 x 191, drawn at twice that): the logo covers the lower left
const X = { x: 480, y: 70, w: 940, h: 360 };      // X header: the picture covers the lower left; narrow windows trim top and bottom
const FILES = [
  // name, width, height, html
  ['profile.png', 1600, 1600, profile(1600, PAPER, INK)],
  ['banner-youtube.png', 2560, 1440, banner(2560, 1440, YT, 104)],
  ['banner-linkedin.png', 2256, 382, banner(2256, 382, LI, 84)],
  ['banner-x.png', 1500, 500, banner(1500, 500, X, 76)],
  ['alt/profile-light.png', 1600, 1600, profile(1600, INK, PAPER)],
  ['alt/banner-youtube-dark.png', 2560, 1440, banner(2560, 1440, YT, 104, PAPER, INK)],
  ['alt/banner-linkedin-dark.png', 2256, 382, banner(2256, 382, LI, 84, PAPER, INK)],
  ['alt/banner-x-dark.png', 1500, 500, banner(1500, 500, X, 76, PAPER, INK)],
];

(async () => {
  fs.mkdirSync(path.join(OUT, 'alt'), { recursive: true });
  const browser = await chromium.launch();
  for (const [name, w, h, html] of FILES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.setContent(html, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const fits = await p.evaluate(() => { const t = document.querySelector('p'); if (!t) return true; const b = t.parentElement.getBoundingClientRect(), r = t.getBoundingClientRect(); return r.width <= b.width + 0.5 && r.height <= b.height + 0.5; });
    if (!fits) { console.error(`${name}: the tagline does not fit its safe area; make it shorter or the type smaller`); process.exitCode = 1; }
    await p.screenshot({ path: path.join(OUT, name), clip: { x: 0, y: 0, width: w, height: h } });
    console.log(`${name}  ${w} x ${h}  ${(fs.statSync(path.join(OUT, name)).size / 1024).toFixed(0)} KB`);
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
