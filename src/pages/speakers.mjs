import { html, esc } from '../lib/core.mjs';
import { feature } from './index.mjs';

export const page = { id: 'speakers', path: '/speakers', out: 'speakers.html' };

export function render(c) {
  const { content } = c;
  const isUpcoming = (ev) => c.upcoming.includes(ev);

  // Newest first, grouped by calendar year of the talk; talks without a date keep their year label.
  const yearOf = (ev) => (ev.start ? ev.start.slice(0, 4) : String(ev.date_label).match(/\d{4}/)?.[0] || 'Earlier');
  const groups = [];
  for (const ev of c.ordered) {
    const y = yearOf(ev);
    let g = groups.find((x) => x.year === y);
    if (!g) groups.push((g = { year: y, items: [] }));
    g.items.push(ev);
  }

  const talk = (ev) => {
    const upcoming = isUpcoming(ev);
    const links = (ev.links || []).map((l) => {
      const h = c.href(l.href);
      const ext = c.isExternal(h);
      const image = /\.(png|jpe?g|webp|avif)$/i.test(h) ? ' (image)' : '';
      return html`<a class="link-arrow" href="${esc(h)}">${esc(l.label)}<span class="visually-hidden"> for ${esc(ev.name)}${image}</span> ${c.arrow(ext ? 'ne' : 'e')}</a>`;
    });
    const extra = [ev.format, ev.host, ev.place].filter(Boolean).map(esc).join(' · ');
    return html`
    <li class="talk"${upcoming ? c.show((k) => c.endedIn(ev, k)) : ''}>
      <div class="talk__photo">${c.photo(ev.photo, { alt: ev.photo_alt, name: ev.name, sizes: '(min-width: 900px) 128px, 84px' })}</div>
      <div class="talk__body">
        <h4 class="talk__name">${esc(ev.name)}</h4>
        <p class="talk__affil">${c.affil(ev)}</p>
        ${ev.description ? html`<p class="talk__desc">${c.keepLast(ev.description)}</p>` : ''}
        ${ev.title ? html`<p class="talk__desc">${c.keepLast(ev.title)}</p>` : ''}
        ${extra || links.length ? html`<p class="talk__extra">${extra ? html`<span>${extra}</span>` : ''}${links}</p>` : ''}
      </div>
      <p class="talk__date">${esc(ev.start ? c.shortDate(ev.start) : ev.date_label)}</p>
    </li>`;
  };

  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Speakers</h1>
  <p class="page-lead">The people building AI, in&nbsp;conversation with Dartmouth&nbsp;students.</p>
</header>

${c.upcoming.length ? html`
<section class="wrap block" data-upcoming-section${c.show((k) => c.nextIn(k))} aria-labelledby="next-h">
  <h2 class="year" id="next-h">Next</h2>
  <div class="features">${c.upcoming.map((ev) => feature(c, ev, { sizes: '(min-width: 900px) 30vw, 92vw', next: false, show: c.show((k) => !c.endedIn(ev, k)) }))}</div>
</section>` : ''}

<section class="wrap" aria-labelledby="past-h">
  <h2 class="visually-hidden" id="past-h">Past speakers</h2>
  ${groups.map((g) => {
    // A year shows once one of its talks has happened.
    return html`
  <div class="year-group"${c.show((k) => g.items.some((ev) => !isUpcoming(ev) || c.endedIn(ev, k)))}>
    <h3 class="year">${esc(g.year)}</h3>
    <ul class="talks">${g.items.map(talk)}</ul>
  </div>`;
  })}
</section>

<section class="wrap block" id="sessions" aria-labelledby="sessions-h">
  <h2 class="year" id="sessions-h">Member sessions</h2>
  <p class="page-lead" style="margin:0 0 clamp(24px,3vw,40px)">At the weekly meeting an officer or member presents a paper or a topic. Slides and papers from past sessions.</p>
  <ul class="sessions">
    ${content.sessions.map((s) => html`
    <li class="session">
      <h3 class="session__title">${esc(s.title)}</h3>
      <p class="session__date">${esc(c.shortDate(s.date))}</p>
      <p class="session__people">${esc(s.people)}</p>
      ${s.summary ? html`<p class="session__summary">${esc(s.summary)}</p>` : ''}
      <p class="session__links">${(s.links || []).map((l) => {
        const h = c.href(l.href);
        const ext = c.isExternal(h);
        return html`<a class="link-arrow" href="${esc(h)}">${esc(l.label)}<span class="visually-hidden"> from the session ${esc(s.title)}</span> ${c.arrow(ext ? 'ne' : 'e')}</a>`;
      })}</p>
    </li>`)}
  </ul>
</section>`;

  return c.layout({
    page: 'speakers',
    title: 'Speakers',
    description: 'Researchers, founders and engineers who have spoken at the Dartmouth AI Club, and the club’s member sessions.',
    path: '/speakers',
    main,
  });
}
