import { html, esc } from '../lib/core.mjs';

export const page = { id: 'team', path: '/team', out: 'team.html' };

export function render(c) {
  const { team } = c.content;
  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Team</h1>
  <p class="page-lead">The officers who run the club, and the faculty who advise it.</p>
</header>

<section class="wrap block" aria-labelledby="officers-h">
  <h2 class="year" id="officers-h">Officers</h2>
  <ul class="people people--3" style="margin-top:12px">
    ${team.officers.map((o) => html`
    <li class="person">
      ${c.photo(o.photo, { alt: `Portrait of ${o.name}.`, name: o.name, sizes: '(min-width: 700px) 30vw, 45vw' })}
      <h3 class="person__name">${esc(o.name)}</h3>
      <p class="person__meta">${esc(o.role)}</p>
      ${o.linkedin ? html`<a class="person__link link-arrow" href="${esc(o.linkedin)}" rel="noopener" target="_blank">LinkedIn ${c.arrow('ne')}<span class="visually-hidden"> profile of ${esc(o.name)}</span></a>` : ''}
    </li>`)}
  </ul>
</section>

<section class="wrap block" aria-labelledby="advisors-h">
  <h2 class="year" id="advisors-h">Faculty advisors</h2>
  <ul class="list-rows">
    ${team.advisors.map((a) => html`
    <li>
      <p class="list-rows__title">${esc(a.name)}</p>
      <p class="list-rows__meta">${esc(a.title)}, ${esc(a.unit)}</p>
    </li>`)}
  </ul>
</section>`;

  return c.layout({
    page: 'team',
    title: 'Team',
    description: 'The officers who run the Dartmouth AI Club and the faculty advisors from Thayer School of Engineering and Computer Science who advise it.',
    path: '/team',
    main,
  });
}
