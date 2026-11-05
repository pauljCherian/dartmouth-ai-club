// Shared helpers and components for every page.
// Everything that comes from content/*.json goes through esc() before it reaches HTML.

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const flat = (v) => (Array.isArray(v) ? v.map(flat).join('') : v === null || v === undefined || v === false ? '' : String(v));
// Tagged template: joins arrays, drops null/false. It does NOT escape: call esc() on data.
export const html = (strings, ...values) => strings.reduce((out, s, i) => out + s + (i < values.length ? flat(values[i]) : ''), '');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDate = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

export function createContext({ mode, now, content, svgs, manifest, brand, inline, allowMissing = false }) {
  const { site } = content;
  const preview = mode === 'preview';

  const PAGES = { home: '', speakers: 'speakers', team: 'team', join: 'join', reading: 'reading', '404': '404', review: 'review' };
  const link = (page, hash = '') => {
    if (!(page in PAGES)) throw new Error(`Unknown page in link(): ${page}`);
    const h = hash ? `#${hash}` : '';
    if (preview) return `${page === 'home' ? 'index' : PAGES[page]}.html${h}`;
    return page === 'home' ? `/${h}` : `/${PAGES[page]}${h}`;
  };
  const asset = (p) => (preview ? p.replace(/^\//, '') : `/${p.replace(/^\//, '')}`);
  const href = (h) => (h.startsWith('asset:') ? asset(h.slice(6)) : h);
  const isExternal = (h) => /^https?:\/\//.test(h);

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

  const affil = (ev) =>
    html`${ev.role ? html`<span class="muted">${esc(ev.role)}</span> ` : ''}<strong>${esc(ev.org)}</strong>`;

  // Upcoming vs past at build time; site.js corrects it in the browser if a talk ends after the build.
  const ends = (ev) => (ev.end ? Date.parse(ev.end) : ev.start ? Date.parse(ev.start) + 2 * 3600e3 : NaN);
  const upcoming = content.speakers
    .filter((ev) => ev.start && ends(ev) > now.getTime())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  // Every talk, newest first. A talk without a date keeps its position in the file relative to the dated ones.
  let lastKnown = Infinity;
  const ordered = content.speakers
    .map((ev, i) => {
      const t = ev.start ? Date.parse(ev.start) : lastKnown - 1;
      if (ev.start) lastKnown = t;
      return { ev, t, i };
    })
    .sort((a, b) => b.t - a.t || a.i - b.i)
    .map((x) => x.ev);
  const past = ordered.filter((ev) => !upcoming.includes(ev));
  const endISO = (ev) => new Date(ends(ev)).toISOString();

  const socials = (cls = 'socials') => {
    const items = site.socials.filter((s) => s.url || preview);
    if (!items.length) return '';
    return html`<ul class="${cls}">${items.map((s) =>
      s.url
        ? html`<li><a class="link-arrow" href="${esc(s.url)}">${esc(s.name)} ${arrow('ne')}</a></li>`
        : html`<li><span class="is-placeholder" title="Link to come">${esc(s.name)}</span></li>`
    )}</ul>`;
  };

  const header = (page) => html`
<header class="site-header" data-header>
  <div class="site-header__inner wrap">
    <a class="site-logo" href="${link('home')}" aria-label="Dartmouth AI Club, home">${svg('logo-small')}</a>
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
<nav class="site-menu" id="site-menu" aria-label="Menu" hidden>
  <div class="site-menu__nav wrap">
    <a href="${link('speakers')}"${page === 'speakers' ? ' aria-current="page"' : ''}>Speakers</a>
    <a href="${link('team')}"${page === 'team' ? ' aria-current="page"' : ''}>Team</a>
    <a class="is-join" href="${link('join')}"${page === 'join' ? ' aria-current="page"' : ''}>Join the club</a>
    <a class="is-minor" href="${link('reading')}"${page === 'reading' ? ' aria-current="page"' : ''}>Reading list</a>
  </div>
  <div class="site-menu__foot wrap">
    ${socials('site-menu__socials socials')}
    <a href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a>
  </div>
</nav>`;

  const footer = (page) => html`
<footer class="site-footer" id="contact">
  <div class="site-footer__inner wrap">
    <div class="site-footer__brand"><a href="${link('home')}" aria-label="Dartmouth AI Club, home">${svg('logo-small')}</a></div>
    <nav class="site-footer__nav" id="footer-nav" aria-label="Footer">
      <ul>
        ${[['speakers', 'Speakers'], ['team', 'Team'], ['join', 'Join the club'], ['reading', 'Reading list']].map(([id, label]) => html`<li><a href="${link(id)}"${page === id ? ' aria-current="page"' : ''}>${label}</a></li>`)}
      </ul>
    </nav>
    <div class="site-footer__contact">
      <span class="label">Contact</span>
      <a class="site-footer__email" href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a>
      <p class="muted">${esc(site.meetings.when)} · ${esc(site.meetings.where)}</p>
    </div>
    ${socials('site-footer__socials') ? html`<div class="site-footer__social">
      <span class="label">Follow</span>
      ${socials('site-footer__socials')}
    </div>` : ''}
    <p class="site-footer__legal">© ${now.getFullYear()} Dartmouth AI Club</p>
  </div>
</footer>`;

  const early = (page) =>
    `(function(d){` +
    (preview && page === 'home' ? `d.lang='en';d.classList.add('page-home');` : '') +
    `d.classList.add('js');try{if(location.hash==='#logo')d.classList.add('logo-always');` +
    `if(d.classList.contains('page-home')&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&matchMedia('(min-height: 300px)').matches){d.classList.add('js-handoff');` +
    // site.js always runs before DOMContentLoaded (deferred or inline at the end), so this cannot race it:
    // if the hand-off did not start by then, fall back to the static layout.
    `document.addEventListener('DOMContentLoaded',function(){if(!window.__daicHandoff)d.classList.remove('js-handoff')})}}catch(e){}})(document.documentElement);`;

  const same = site.socials.filter((s) => s.url).map((s) => s.url);
  const jsonLd = () =>
    JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: site.name,
        url: site.origin,
        logo: `${site.origin}/logo-512.png`,
        email: site.contact.email,
        ...(same.length ? { sameAs: same } : {}),
      },
      ...upcoming.map((ev) => ({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: [ev.format, ev.name].filter(Boolean).join(' with ') + (ev.title ? `: ${ev.title}` : ''),
        startDate: ev.start,
        ...(ev.end ? { endDate: ev.end } : {}),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'Place', name: ev.place || 'Dartmouth College', address: 'Hanover, NH' },
        performer: { '@type': 'Person', name: ev.name },
        organizer: { '@type': 'Organization', name: site.name, url: site.origin },
      })),
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
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(ogOrigin)}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(site.hero.alt)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${icon('favicon.ico')}" sizes="32x32">
<link rel="icon" href="${icon('favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${icon('apple-touch-icon.png')}">
${preview ? '' : '<link rel="manifest" href="/site.webmanifest">'}
${page === 'home' ? `<script type="application/ld+json">${jsonLd()}</script>` : ''}`;
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
    link, asset, href, isExternal, svg, arrow, picture, photo, affil,
    upcoming, past, ordered, ends, endISO, shortDate, socials, layout, esc, html,
  };
}
