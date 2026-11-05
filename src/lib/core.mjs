// Shared helpers and components for every page.
// Everything that comes from content/*.json goes through esc() before it reaches HTML.

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const flat = (v) => (Array.isArray(v) ? v.map(flat).join('') : v === null || v === undefined || v === false ? '' : String(v));
// Tagged template: joins arrays, drops null/false. It does NOT escape: call esc() on data.
export const html = (strings, ...values) => strings.reduce((out, s, i) => out + s + (i < values.length ? flat(values[i]) : ''), '');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Escaped text whose last two words never split across lines (no single word left alone on the last line).
// Only when the pair is short: a long pair ("Superintelligence Labs") held together could not wrap at all in a
// narrow column. Those lines rely on text-wrap: pretty instead.
export const keepLast = (text) => esc(text).replace(/(\S+) (\S+)$/, (m, a, b) => (a.length + b.length <= 17 ? `${a}&nbsp;${b}` : m));
// Escaped text with dates ("Oct 29, 2026", "Fri Nov 6, 2026") held on one line.
export const tieDates = (text) =>
  esc(text).replace(/\b((?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) )?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}, \d{4})\b/g, (d) => d.replace(/ /g, '&nbsp;'));
// Escaped email address that may break after the @ and nowhere else (not before its last letter).
export const email = (addr) => esc(addr).replace('@', '@<wbr>');

export const shortDate = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

export function createContext({ mode, now, content, svgs, manifest, brand, inline, allowMissing = false }) {
  const { site } = content;
  const preview = mode === 'preview';

  const PAGES = { home: '', speakers: 'speakers', team: 'team', join: 'join', '404': '404', review: 'review' };
  const link = (page, hash = '') => {
    if (!(page in PAGES)) throw new Error(`Unknown page in link(): ${page}`);
    const h = hash ? `#${hash}` : '';
    if (preview) return `${page === 'home' ? 'index' : PAGES[page]}.html${h}`;
    return page === 'home' ? `/${h}` : `/${PAGES[page]}${h}`;
  };
  const asset = (p) => (preview ? p.replace(/^\//, '') : `/${p.replace(/^\//, '')}`);

  const svg = (name, { cls = '', label = '' } = {}) => {
    const s = svgs[name];
    if (!s) throw new Error(`Missing SVG: ${name}`);
    const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"';
    return s.markup.replace('<svg', `<svg ${a11y}${cls ? ` class="${cls}"` : ''}`);
  };
  const arrow = (dir = 'e') => svg(dir === 'ne' ? 'arrow-ne' : 'arrow-e', { cls: `arrow arrow--${dir}` });

  const picture = (key, { alt = '', sizes = '100vw', cls = '', imgCls = '', loading = 'lazy', fetchpriority = '', decorative = false } = {}) => {
    const m = manifest[key];
    if (!m) throw new Error(`Missing image in manifest: ${key}`);
    const vs = [...m.variants].sort((a, b) => a.w - b.w);
    const set = (fmt) => vs.filter((v) => v[fmt]).map((v) => `${asset(v[fmt])} ${v.w}w`).join(', ');
    const fallback = vs.find((v) => v.w >= 640 && v.jpg) || vs[vs.length - 1];
    return html`<picture${cls ? ` class="${cls}"` : ''}>${set('avif') ? `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` : ''}${set('webp') ? `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` : ''}<img src="${asset(fallback.jpg)}" srcset="${set('jpg')}" sizes="${sizes}" width="${fallback.w}" height="${fallback.h}" alt="${esc(decorative ? '' : alt)}" loading="${loading}" decoding="async"${fetchpriority ? ` fetchpriority="${fetchpriority}"` : ''}${imgCls ? ` class="${imgCls}"` : ''}${decorative ? ' aria-hidden="true"' : ''}></picture>`;
  };

  const treatment = site.portrait_treatment || 'duo';
  const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const photo = (id, { alt = '', sizes = '50vw', cls = '', name = '', placeholder = 'Photo to come' } = {}) => {
    const key = `people/${id}-${treatment}`;
    if (!manifest[key]) {
      // Preview: say plainly that a photo is missing. Live site: a quiet initials tile keeps the grid intact.
      if (preview || allowMissing) return html`<div class="photo photo--placeholder ${cls}" role="img" aria-label="${esc(placeholder)}">${esc(placeholder)}</div>`;
      if (name) return html`<div class="photo photo--initials ${cls}" aria-hidden="true"><span>${esc(initials(name))}</span></div>`;
      throw new Error(`Missing portrait ${key}`);
    }
    return html`<div class="photo ${cls}">${picture(key, { alt, sizes })}</div>`;
  };

  // A speaker's role or one-line description: the text, or in the preview a visible gap where it is still missing
  // (the live build refuses to run without it).
  const fill = (text, gap) => (text ? keepLast(text) : preview ? html`<span class="is-placeholder">${esc(gap)}</span>` : '');

  // Every talk, newest first (talks on the same day keep their order in the file).
  const ordered = content.speakers
    .map((ev, i) => ({ ev, i }))
    .sort((a, b) => b.ev.date.localeCompare(a.ev.date) || a.i - b.i)
    .map((x) => x.ev);

  // Credits for speaker photos used under a licence that asks for one (photo_credit in speakers.json): who took
  // it, where it comes from, the licence, and that it was changed. Shown on every page that shows the photo.
  const credits = (evs) => {
    const list = evs.filter((ev) => ev.photo_credit);
    if (!list.length) return '';
    return html`<p class="credits">${list.map((ev) => {
      const pc = ev.photo_credit;
      return html`<span>Photo of ${esc(ev.name)}: <a href="${esc(pc.source)}">${esc(pc.by)}</a>, <a href="${esc(pc.license_url)}">${esc(pc.license)}</a>, cropped and toned. </span>`;
    })}</p>`;
  };


  // Social links as the networks' own marks (X, YouTube: src/svg/<name>.svg), in ink, one size, each
  // with its name for screen readers. People find these marks faster than words.
  const socials = (cls = 'socials') => {
    const items = site.socials.filter((s) => s.url || preview);
    if (!items.length) return '';
    const mark = (s) => (svgs[String(s.name).toLowerCase()] ? svg(String(s.name).toLowerCase(), { cls: 'social__icon' }) : esc(s.name));
    return html`<ul class="${cls}">${items.map((s) =>
      s.url
        ? html`<li><a class="social" href="${esc(s.url)}">${mark(s)}<span class="visually-hidden">${esc(s.name)}</span></a></li>`
        : html`<li><span class="social is-placeholder" title="${esc(s.name)}: link to come">${mark(s)}<span class="visually-hidden">${esc(s.name)} (link to come)</span></span></li>`
    )}</ul>`;
  };

  const header = (page) => html`
<header class="site-header" data-header>
  <div class="site-header__inner wrap">
    <a class="site-logo" href="${link('home')}" aria-label="Dartmouth AI Club, home">${svg('logo-display')}</a>
    <nav class="site-nav" aria-label="Main">
      <a href="${link('speakers')}"${page === 'speakers' ? ' aria-current="page"' : ''}>Speakers</a>
      <a href="${link('team')}"${page === 'team' ? ' aria-current="page"' : ''}>Team</a>
      <a class="site-nav__join" href="${link('join')}"${page === 'join' ? ' aria-current="page"' : ''}>Join the club</a>
    </nav>
    <a class="menu-link" href="#footer-nav">Menu</a>
    <button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu" data-menu-button>
      <span class="menu-button__label visually-hidden">Menu</span>
      <span class="menu-button__icon" aria-hidden="true"><span></span><span></span></span>
    </button>
  </div>
</header>
<nav class="site-menu" id="site-menu" aria-label="Menu" tabindex="-1" hidden>
  <div class="site-menu__nav wrap">
    <a href="${link('home')}"${page === 'home' ? ' aria-current="page"' : ''}>Home</a>
    <a href="${link('speakers')}"${page === 'speakers' ? ' aria-current="page"' : ''}>Speakers</a>
    <a href="${link('team')}"${page === 'team' ? ' aria-current="page"' : ''}>Team</a>
    <a class="is-join" href="${link('join')}"${page === 'join' ? ' aria-current="page"' : ''}>Join the club</a>
    ${socials('site-menu__socials socials')}
  </div>
</nav>`;

  // Footer, the last section of every page and laid out like the others: the invitation to join (on every page but
  // /join itself), so every other page ends with the one thing we ask of a visitor; the links (also the menu without
  // JavaScript) and the contact; the copyright line under them.
  const footer = (page) => html`
<footer class="site-footer" id="contact">
  <div class="site-footer__inner wrap">
    ${page !== 'join' ? html`<section class="site-footer__join" aria-labelledby="footer-join-h">
      <h2 class="site-footer__title" id="footer-join-h">Join the club.</h2>
      <p class="site-footer__text">Open to Dartmouth undergraduates, whatever you study. Join on Dartmouth Groups, then come to a&nbsp;meeting.</p>
      <p class="site-footer__action"><a class="button" href="${link('join')}">How to join ${arrow('e')}</a></p>
    </section>` : ''}
    <nav class="site-footer__nav" id="footer-nav" aria-label="Footer">
      <ul>
        ${[['home', 'Home'], ['speakers', 'Speakers'], ['team', 'Team'], ['join', 'Join the club']].map(([id, label]) => html`<li><a href="${link(id)}"${id === 'join' ? ' class="is-join"' : ''}${page === id ? ' aria-current="page"' : ''}>${label}</a></li>`)}
      </ul>
    </nav>
    <div class="site-footer__contact">
      <a class="site-footer__email" href="mailto:${esc(site.contact.email)}">${email(site.contact.email)}</a>
      ${socials('socials site-footer__socials')}
    </div>
    <p class="site-footer__legal">© ${now.getFullYear()} Dartmouth AI Club</p>
  </div>
</footer>`;

  const early = (page) =>
    `(function(d){` +
    (preview && page === 'home' ? `d.lang='en';d.classList.add('page-home');` : '') +
    `d.classList.add('js');try{if(location.hash==='#logo')d.classList.add('logo-always');` +
    `if(d.classList.contains('page-home')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){if(!matchMedia('(min-height: 300px)').matches)d.classList.add('handoff-parked');else{d.classList.add('js-handoff');` +
    // site.js always runs before DOMContentLoaded (deferred or inline at the end), so this cannot race it:
    // if the hand-off did not start by then, fall back to the static layout.
    `document.addEventListener('DOMContentLoaded',function(){if(!window.__daicHandoff)d.classList.remove('js-handoff')})}}` +
    // Last resort for a site.js request that never answers (DOMContentLoaded then never fires): 12 s after the
    // HTML is parsed, fall back to the no-script layout. site.js restores the js class if it arrives later.
    `document.addEventListener('readystatechange',function(){if(document.readyState==='interactive')setTimeout(function(){if(!window.__daicSite)d.classList.remove('js','js-handoff')},12000)})` +
    `}catch(e){}` +
    // Preview only: the Claude artifact viewer keeps one scroll position for the whole artifact and re-applies
    // it to whichever page loads next, so a page opened from a link would start where the last one was left.
    // A page reached by a link (not a reload, not back/forward) starts at the top, as in a browser.
    (preview ? `try{var P='__daic_page',was=sessionStorage.getItem(P),here=location.pathname,nv=(performance.getEntriesByType('navigation')[0]||{}).type;` +
      `sessionStorage.setItem(P,here);if(was&&was!==here&&nv==='navigate'&&!location.hash){sessionStorage.removeItem('__frame_scroll');` +
      `var top=function(){if(scrollY)scrollTo(0,0)};addEventListener('load',function(){top();setTimeout(top,0);setTimeout(top,120)})}}catch(e){}` : '') +
    `})(document.documentElement);`;

  const same = site.socials.filter((s) => s.url).map((s) => s.url);
  // Home: the club itself (no talk is announced on the site, so no events).
  const jsonLd = (page) =>
    JSON.stringify([
      ...(page === 'home' ? [{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: site.name,
        url: site.origin,
        logo: `${site.origin}/logo-512.png`,
        email: site.contact.email,
        ...(same.length ? { sameAs: same } : {}),
      }] : []),
    ]).replace(/</g, '\\u003c');

  // Link previews of Vercel preview deployments must point at that deployment's own og.jpg.
  const ogOrigin = process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : site.origin;
  const layout = ({ page, title, description, path, main, noindex = false }) => {
    const fullTitle = page === 'home' ? site.name : `${title} – ${site.name}`;
    const desc = description || site.description;
    const url = `${site.origin}${path}`;
    const css = inline.css;
    const icon = (p) => (preview ? p : `/${p}`);
    const meta = html`
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(url)}">`}
<meta name="theme-color" content="#F4F4F1">
<meta name="color-scheme" content="light">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(ogOrigin === site.origin ? url : `${ogOrigin}${path}`)}">
<meta property="og:image" content="${esc(ogOrigin)}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(site.hero.alt)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${icon('favicon.ico')}" sizes="32x32">
<link rel="icon" href="${icon('favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${icon('apple-touch-icon.png')}">
${preview ? '' : '<link rel="manifest" href="/site.webmanifest">'}
${page === 'home' ? `<script type="application/ld+json">${jsonLd(page)}</script>` : ''}`;
    const body = html`
<a class="skip-link" href="#main">Skip to content</a>
${header(page)}
<main id="main"${page === 'home' ? '' : ' class="page-pad"'}>
${main}
</main>
${footer(page)}`;
    // If site.js cannot load, drop the classes that promise it (dead menu button, pinned hero).
    const script = preview ? `<script>${inline.js}</script>` : `<script src="/js/site.js" defer onerror="document.documentElement.classList.remove('js','js-handoff')"></script>`;

    if (preview && page === 'home') {
      // Artifact page: the host wraps this in its own document skeleton.
      return html`<title>${esc(site.name)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${meta}
<style>${css}</style>
<script>${early(page)}</script>
${body}
${script}
`;
    }
    return html`<!doctype html>
<html lang="en" class="page-${page}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
${meta}
<script>${early(page)}</script>
<style>${css}</style>
${preview ? '' : script}
</head>
<body>
${body}
${preview ? script : ''}
</body>
</html>
`;
  };

  return {
    mode, preview, now, site, content, brand, manifest,
    link, asset, svg, arrow, picture, photo,
    ordered, shortDate, socials, layout, esc, html, credits, fill, keepLast, tieDates, email,
  };
}
