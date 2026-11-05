import { html, esc } from '../lib/core.mjs';

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
  groups.sort((a, b) => (a.year === 'Earlier') - (b.year === 'Earlier'));  // stable: years keep their order

  // Each talk: who they are, what they do, and when they came. Nothing else.
  const talk = (ev) => html`
    <li class="talk"${isUpcoming(ev) ? c.show((k) => c.endedIn(ev, k)) : ''}>
      <div class="talk__photo">${c.photo(ev.photo, { alt: ev.photo_alt, name: ev.name, sizes: '(min-width: 56.25em) 128px, 84px' })}</div>
      <div class="talk__body">
        <h4 class="talk__name">${esc(ev.name)}</h4>
        <p class="talk__affil">${c.affil(ev)}</p>
        ${ev.description ? html`<p class="talk__desc">${c.keepLast(ev.description)}</p>` : ''}
      </div>
      <p class="talk__date">${esc(ev.start ? c.shortDate(ev.start) : ev.date_label)}</p>
    </li>`;

  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Speakers</h1>
  <p class="page-lead">The people building AI, in&nbsp;conversation with Dartmouth&nbsp;students.</p>
</header>

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
</section>`;

  return c.layout({
    page: 'speakers',
    title: 'Speakers',
    description: 'Researchers, founders and engineers who have spoken at the Dartmouth AI Club.',
    path: '/speakers',
    main,
  });
}
