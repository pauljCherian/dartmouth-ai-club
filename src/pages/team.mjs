import { html, esc } from '../lib/core.mjs';

export const page = { id: 'team', path: '/team', out: 'team.html' };

export function render(c) {
  const { team } = c.content;
  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Team</h1>
</header>

<section class="row wrap" aria-labelledby="officers-h">
  <h2 class="row__title" id="officers-h">Officers, <span class="tnum nowrap">${esc(team.officers_term)}</span></h2>
  <div class="row__body">
    <ul class="people people--3">
      ${team.officers.map((o) => html`
      <li class="person">
        ${c.photo(o.photo, { alt: '', name: o.name, sizes: '(min-width: 56.25em) 20vw, (min-width: 43.75em) 30vw, 45vw' })}
        <h3 class="person__name">${esc(o.name)}</h3>
        <p class="person__meta">${esc(o.role)}</p>
        ${o.linkedin ? html`<a class="social person__social" href="${esc(o.linkedin)}">${c.svg('linkedin', { cls: 'social__icon' })}<span class="visually-hidden">LinkedIn profile of ${esc(o.name)}</span></a>` : ''}
      </li>`)}
    </ul>
  </div>
</section>

<section class="row wrap" aria-labelledby="advisors-h">
  <h2 class="row__title" id="advisors-h">Faculty advisors</h2>
  <div class="row__body">
    <ul class="list-rows">
      ${team.advisors.map((a) => html`
      <li>
        <h3 class="list-rows__title">${esc(a.name)}</h3>
        <p class="list-rows__meta">${c.keepLast(a.unit)}</p>
      </li>`)}
    </ul>
  </div>
</section>`;

  return c.layout({
    page: 'team',
    title: 'Team',
    description: 'The officers who run the Dartmouth AI Club, and its faculty advisors.',
    path: '/team',
    main,
  });
}
