import { html, esc } from '../lib/core.mjs';

export const page = { id: 'speakers', path: '/speakers', out: 'speakers.html' };

export function render(c) {

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
    <li class="talk">
      <div class="talk__photo">${c.photo(ev.photo, { alt: ev.photo_alt, name: ev.name, sizes: '(min-width: 56.25em) 128px, 84px' })}</div>
      <div class="talk__body">
        <h3 class="talk__name">${esc(ev.name)}</h3>
        <p class="talk__affil">${c.fill(ev.role, 'Role to confirm')}</p>
        <p class="talk__desc">${c.fill(ev.description, 'Line to come')}</p>
        <p class="talk__date">${c.when(ev)}</p>
      </div>
    </li>`;

  // One section per year, newest first.
  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Speakers</h1>
  <p class="page-lead">The people building AI, in&nbsp;conversation with Dartmouth students. New talks are announced in the&nbsp;GroupMe.</p>
</header>
${groups.map((g) => html`
<section class="row wrap" aria-labelledby="y${esc(g.year)}">
  <h2 class="row__title tnum" id="y${esc(g.year)}">${esc(g.year)}</h2>
  <div class="row__body">
    <ul class="talks">${g.items.map(talk)}</ul>
    ${c.credits(g.items)}
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
