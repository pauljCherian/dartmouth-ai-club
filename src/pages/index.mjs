import { html, esc } from '../lib/core.mjs';

export const page = { id: 'home', path: '/', out: 'index.html' };

// Runs right after the tagline is parsed: reserve its real height under the title, so the title doesn't jump
// when site.js measures the same thing (same rule as measure() in site.js). The title stays transparent until
// this has run (.is-measured), so a page that arrives in pieces on a slow network never paints it in the
// wrong place first.
const TAG_ROOM = `(function(){var d=document.documentElement,h=document.querySelector('[data-handoff]'),t=h&&h.querySelector('.hero__tagline');` +
  `try{if(!t||!d.classList.contains('js-handoff'))return;` +
  `if(matchMedia('(min-width: 56.25em)').matches&&!matchMedia('(orientation: landscape) and (max-height: 619px)').matches)return;` +
  `var s=getComputedStyle(t),g=Math.max(16,Math.min(28,innerWidth*0.02));` +
  `h.style.setProperty('--tag-h',Math.ceil(t.getBoundingClientRect().height+(parseFloat(s.marginTop)||0)+(parseFloat(s.marginBottom)||0)+g)+'px')` +
  `}finally{if(h)h.classList.add('is-measured')}})();`;

export function render(c) {
  const { site, brand } = c;
  // The six most recent talks, newest first (two rows of three); older ones are on /speakers. A talk added
  // before it happens appears once it has ended, decided in the visitor's browser (see core.mjs), so nothing on
  // the page waits for a rebuild or goes stale.
  const LIMIT = 6;
  const candidates = c.ordered;  // newest first: talks still to come lead, same-day talks keep their file order
  const recentIn = (k) => candidates.filter((ev) => !c.upcoming.includes(ev) || c.endedIn(ev, k)).slice(0, LIMIT);
  const recent = candidates.filter((ev) => c.STATES.some((k) => recentIn(k).includes(ev)));
  // Never crop the photo past its ceiling: the widest the frame may get is the photo's own aspect ratio
  // with that strip removed from the top. Shared with site.js through the custom properties.
  const heroV = c.manifest['hero/hero'].variants.at(-1);
  const heroAspect = heroV.w / heroV.h;
  const ceiling = c.content.photos?.hero?.ceiling ?? 0.18;
  const heroVars = [
    `--title-ratio:${brand.display.ratio}`,
    `--line2-ratio:${brand.display.line2}`,
    `--hero-aspect:${heroAspect.toFixed(4)}`,
    `--hero-max-aspect:${(heroAspect / (1 - ceiling)).toFixed(4)}`,
  ].join(';');

  const main = html`
<section class="hero" data-handoff style="${heroVars}">
  <div class="hero__stage">
    <h1 class="hero__title"><span class="visually-hidden">Dartmouth AI Club</span>${c.svg('logo-display')}</h1>
    <p class="hero__tagline">${esc(site.tagline)}</p>
    <script>${TAG_ROOM}</script>
    <div class="hero__thumb" aria-hidden="true"></div>
    <figure class="hero__figure">
      <div class="hero__frame">
        <div class="hero__img">
          ${c.picture('hero/hero', { alt: site.hero.alt, sizes: '100vw', loading: 'eager', fetchpriority: 'high', imgCls: 'hero__photo' })}
          ${c.manifest['hero/hero-mono'] ? c.picture('hero/hero-mono', { decorative: true, sizes: '100vw', cls: 'hero__photo--mono' }) : ''}
        </div>
      </div>
      <figcaption class="hero__caption">${c.tieDates(site.hero.caption)}</figcaption>
    </figure>
  </div>
</section>

<section class="row wrap" id="about" aria-labelledby="about-h">
  <h2 class="row__title row__title--lines" id="about-h"><span>Read the paper.</span> <span>Build the thing.</span> <span>Meet the makers.</span> <span>Bring a friend.</span></h2>
  <div class="row__body">
    <p class="about__text">The Dartmouth AI Club meets every week: an officer or member presents a paper or a topic, from how transformers work to adversarial attacks and LLMs for math. Through the year we sit down with the researchers and founders shaping the field. No&nbsp;experience required. Curiosity is&nbsp;enough.</p>
    ${c.preview ? html`<figure class="about__photo"><div class="photo photo--wide photo--placeholder" role="img" aria-label="Placeholder for the second photo">Second photo: an ordinary weekly meeting. To come.</div></figure>` : ''}
  </div>
</section>

<section class="row wrap" id="speakers" aria-labelledby="speakers-h">
  <h2 class="row__title" id="speakers-h">Speakers</h2>
  <div class="row__body">
    <ul class="people people--3">
      ${recent.map((ev) => html`
      <li class="person"${c.show((k) => recentIn(k).includes(ev))}>
        ${c.photo(ev.photo, { alt: ev.photo_alt, name: ev.name, sizes: '(min-width: 56.25em) 20vw, (min-width: 43.75em) 30vw, 45vw' })}
        <h3 class="person__name">${esc(ev.name)}</h3>
        <p class="person__meta">${c.fill(ev.role, 'Role to confirm')}</p>
        <p class="person__date">${esc(c.shortDate(ev.date))}</p>
      </li>`)}
    </ul>
    <p class="row__more"><a class="link-arrow" href="${c.link('speakers')}">All speakers ${c.arrow('e')}</a></p>
    ${c.credits(recent, (ev, k) => recentIn(k).includes(ev))}
  </div>
</section>`;

  return c.layout({ page: 'home', title: site.name, path: '/', main });
}
