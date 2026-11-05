import { html, esc } from '../lib/core.mjs';

export const page = { id: 'speakers', path: '/speakers', out: 'speakers.html' };

export function render(c) {
  const { content } = c;
  const isUpcoming = (ev) => c.upcoming.includes(ev);

  // Newest first, grouped by the calendar year of the talk.
  const yearOf = (ev) => ev.date.slice(0, 4);
  const groups = [];
  for (const ev of c.ordered) {
    const y = yearOf(ev);
    let g = groups.find((x) => x.year === y);
    if (!g) groups.push((g = { year: y, items: [] }));
    g.items.push(ev);
  }

  // Each talk: who they are, what they do, and when they came. Nothing else.
  const talk = (ev) => html`
    <li class="talk"${isUpcoming(ev) ? c.show((k) => c.endedIn(ev, k)) : ''}>
      <div class="talk__photo">${c.photo(ev.photo, { alt: ev.photo_alt, name: ev.name, sizes: '(min-width: 56.25em) 128px, 84px' })}</div>
      <div class="talk__body">
        <h3 class="talk__name">${esc(ev.name)}</h3>
        <p class="talk__affil">${c.fill(ev.role, 'Role at the time of the talk: to confirm')}</p>
        <p class="talk__desc">${c.fill(ev.description, 'One line on their work: to come')}</p>
      </div>
      <p class="talk__date">${esc(c.shortDate(ev.date))}</p>
    </li>`;
  // A talk added before it happens is listed once it has ended (decided in the visitor's browser, see core.mjs).
  const shown = (ev) => (isUpcoming(ev) ? { ...ev, __show: c.show((k) => c.endedIn(ev, k)) } : ev);

  // One section per year, newest first; a year appears once one of its talks has happened.
  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Speakers</h1>
  <p class="page-lead">The people building AI, in&nbsp;conversation with Dartmouth students. New talks are announced in the&nbsp;<a href="${c.link('join')}">GroupMe</a>.</p>
</header>
${groups.map((g) => html`
<section class="row wrap"${c.show((k) => g.items.some((ev) => !isUpcoming(ev) || c.endedIn(ev, k)))} aria-labelledby="y${esc(g.year)}">
  <h2 class="row__title tnum" id="y${esc(g.year)}">${esc(g.year)}</h2>
  <div class="row__body">
    <ul class="talks">${g.items.map(talk)}</ul>
    ${c.credits(g.items.map(shown))}
  </div>
</section>`)}`;

  return c.layout({
    page: 'speakers',
    title: 'Speakers',
    description: 'Researchers, founders and engineers who have spoken at the Dartmouth AI Club.',
    path: '/speakers',
    main,
  });
}
