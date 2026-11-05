import { html, esc } from '../lib/core.mjs';

export const page = { id: 'home', path: '/', out: 'index.html' };

const feature = (c, ev, { sizes, next = true, hidden = false }) => html`
<article class="feature" data-ends="${c.endISO(ev)}"${hidden ? ' hidden' : ''}>
  <div class="feature__photo">${c.photo(ev.photo, { alt: ev.photo_alt, name: ev.name, sizes })}</div>
  <div class="feature__text">
    <h3 class="feature__name">${esc(ev.name)}</h3>
    <p class="feature__label">${[next ? 'Next' : '', ev.format ? esc(ev.format) : ''].filter(Boolean).join(' · ')}</p>
    <p class="feature__affil">${c.affil(ev)}</p>
    ${ev.title ? html`<p class="feature__title">${esc(ev.title)}</p>` : ''}
    <p class="feature__when">${esc(ev.date_label)}${ev.time_label ? ` · ${esc(ev.time_label)}` : ''}${ev.place ? ` · ${esc(ev.place)}` : ''}</p>
  </div>
</article>`;

export { feature };

export function render(c) {
  const { site, brand } = c;
  // "Recently": the six most recent past talks, newest first (two rows of three). Upcoming talks are
  // rendered hidden in front of them, latest first; site.js reveals each one when it ends and keeps the
  // list at six, so the home page stays right between builds. Older talks stay on /speakers.
  const LIMIT = 6;
  const recent = [
    ...[...c.upcoming].reverse().map((ev) => ({ ev, upcoming: true })),
    ...c.past.slice(0, LIMIT + c.upcoming.length).map((ev, i) => ({ ev, spare: i >= LIMIT })),
  ];
  const plain = (ev) => [ev.role, ev.org].filter(Boolean).join(' ');
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
    <div class="hero__thumb" aria-hidden="true"></div>
    <figure class="hero__figure">
      <div class="hero__frame">
        <div class="hero__img">
          ${c.picture('hero/hero', { alt: site.hero.alt, sizes: '100vw', loading: 'eager', fetchpriority: 'high', imgCls: 'hero__photo' })}
          ${c.manifest['hero/hero-mono'] ? c.picture('hero/hero-mono', { decorative: true, sizes: '100vw', cls: 'hero__photo--mono' }) : ''}
        </div>
      </div>
      <figcaption class="hero__caption">${esc(site.hero.caption)}</figcaption>
    </figure>
  </div>
</section>

<section class="row wrap" id="about" aria-labelledby="about-h">
  <div class="row__label">
    <h2 id="about-h">Who we are</h2>
    <ul class="about__lines">
      <li>Read the paper.</li>
      <li>Build the thing.</li>
      <li>Meet the people who made it.</li>
      <li>Bring a friend.</li>
    </ul>
  </div>
  <div class="row__body">
    <p class="about__text">The Dartmouth AI Club is ${esc(site.members.count)} undergraduates, most of them in computer science and engineering, who want to understand AI by working on it. Every week an officer or member presents a paper or a topic, and there is a build night. Through the year we sit down with the researchers and founders shaping the field. No experience required. Curiosity is enough.</p>
    <dl class="facts">
      <div><dt>Members</dt><dd class="tnum">${esc(site.members.count)}</dd></div>
      <div><dt>Meetings</dt><dd>${esc(site.meetings.when)}<br>${esc(site.meetings.where)}</dd></div>
      <div><dt>Build nights</dt><dd>Every week</dd></div>
    </dl>
    ${c.preview ? html`<figure class="about__photo"><div class="photo photo--wide photo--placeholder" role="img" aria-label="Placeholder for the second photo">Second photo: an ordinary Tuesday meeting. To come.</div></figure>` : ''}
  </div>
</section>

<section class="row wrap" id="what-we-do" aria-labelledby="what-h">
  <h2 class="row__label" id="what-h">What we do</h2>
  <div class="row__body">
    <ul class="pillars">
      <li class="pillar">
        <span class="bullet" aria-hidden="true">1</span>
        <h3 class="pillar__title">Research groups</h3>
        <p class="pillar__text">Small groups take on one research question for a term. They read the literature, run the experiments and present what they find.</p>
      </li>
      <li class="pillar">
        <span class="bullet" aria-hidden="true">2</span>
        <h3 class="pillar__title">Nonprofits</h3>
        <p class="pillar__text">Members build AI tools with nonprofit organizations, scoped to a term and handed over when they work.</p>
      </li>
      <li class="pillar">
        <span class="bullet" aria-hidden="true">3</span>
        <h3 class="pillar__title">Speaker series</h3>
        <p class="pillar__text">Fireside chats and talks with the people building AI, from frontier labs to startups.</p>
        <p class="pillar__more"><a class="link-arrow" href="${c.link('speakers')}">All speakers ${c.arrow('e')}</a></p>
      </li>
    </ul>
  </div>
</section>

<section class="row wrap" id="speakers" aria-labelledby="speakers-h">
  <h2 class="row__label" id="speakers-h">Speakers</h2>
  <div class="row__body">
    ${c.upcoming.length ? html`<div data-upcoming-section data-first-only>${c.upcoming.map((ev, i) => feature(c, ev, { sizes: '(min-width: 900px) 24vw, 92vw', hidden: i > 0 }))}</div>` : ''}
    <h3 class="subhead">Recently</h3>
    <ul class="people people--3" data-limit="${LIMIT}">
      ${recent.map(({ ev, upcoming, spare }) => html`
      <li class="person"${upcoming ? ` hidden data-past-after="${c.endISO(ev)}"` : spare ? ' hidden data-spare' : ''}>
        ${c.photo(ev.photo, { alt: ev.photo_alt, name: ev.name, sizes: '(min-width: 900px) 20vw, (min-width: 700px) 30vw, 45vw' })}
        <h4 class="person__name">${esc(ev.name)}</h4>
        <p class="person__meta">${esc(plain(ev))}</p>
        <p class="person__date">${esc(ev.date_label)}</p>
      </li>`)}
    </ul>
    <p class="row__more"><a class="link-arrow" href="${c.link('speakers')}">All speakers ${c.arrow('e')}</a></p>
  </div>
</section>

<section class="row wrap join-band" id="join" aria-labelledby="join-h">
  <p class="row__label" aria-hidden="true">Join</p>
  <div class="row__body">
    <h2 class="join-band__title" id="join-h">Join the club.</h2>
    <p class="join-band__text">Open to Dartmouth students, whatever you study. Get the GroupMe link, then come to a meeting.</p>
    <div class="join-band__actions">
      <a class="button" href="${c.link('join')}">Join the club ${c.arrow('e')}</a>
      <span class="join-band__when">${esc(site.meetings.when)} · ${esc(site.meetings.where)}</span>
    </div>
  </div>
</section>`;

  return c.layout({ page: 'home', title: site.name, path: '/', main });
}
