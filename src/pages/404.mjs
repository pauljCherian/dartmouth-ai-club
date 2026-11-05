import { html } from '../lib/core.mjs';

export const page = { id: '404', path: '/404', out: '404.html' };

export function render(c) {
  const main = html`
<section class="wrap page-head notfound">
  <h1 class="sign"><span class="visually-hidden">Page not found. </span><span class="sign__text">Not in service</span></h1>
  <p class="notfound__text">This page doesn’t exist, or it moved when we rebuilt the site.</p>
  <ul class="notfound__links">
    <li><a class="link-arrow" href="${c.link('home')}">Home ${c.arrow('e')}</a></li>
    <li><a class="link-arrow" href="${c.link('speakers')}">Speakers ${c.arrow('e')}</a></li>
    <li><a class="link-arrow" href="${c.link('join')}">Join the club ${c.arrow('e')}</a></li>
  </ul>
</section>`;

  return c.layout({ page: '404', title: 'Page not found', path: '/404', main, noindex: true });
}
