import { html, esc } from '../lib/core.mjs';

export const page = { id: 'team', path: '/team', out: 'team.html' };

// A roster, not a photo grid: name and links, then the role, flush left like every name and role on the site (on laptops
// the role sits on the name's line, from column 8). Officer photos
// went out of date every year and two were always missing; the club's faces are the group photo on the home page.
export function render(c) {
  const { team } = c.content;
  // An officer's profiles as the networks' own marks, always visible (a hover-only reveal hides them on phones).
  const links = (o) => {
    const list = [['linkedin', 'LinkedIn', o.linkedin], ['x', 'X', o.x]].filter(([, , url]) => url);
    return list.length
      ? html`<span class="roster__links">${list.map(([icon, label, url]) => html`<a class="social roster__link" href="${esc(url)}">${c.svg(icon, { cls: 'social__icon' })}<span class="visually-hidden">${esc(label)} profile of ${esc(o.name)}</span></a>`)}</span>`
      : '';
  };
  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Team</h1>
</header>

<section class="row wrap" aria-labelledby="officers-h">
  <h2 class="row__title" id="officers-h">Officers, <span class="tnum nowrap">${esc(team.officers_term)}</span></h2>
  <div class="row__body">
    <ul class="roster">
      ${team.officers.map((o) => html`
      <li class="roster__row">
        <div class="roster__who"><h3 class="roster__name">${esc(o.name)}</h3>${links(o)}</div>
        <span class="roster__what">${esc(o.role)}</span>
      </li>`)}
    </ul>
  </div>
</section>

<section class="row wrap" aria-labelledby="advisors-h">
  <h2 class="row__title" id="advisors-h">Faculty advisors</h2>
  <div class="row__body">
    <ul class="roster">
      ${team.advisors.map((a) => html`
      <li class="roster__row">
        <div class="roster__who"><h3 class="roster__name">${esc(a.name)}</h3></div>
        <span class="roster__what">${c.keepLast(a.unit)}</span>
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
