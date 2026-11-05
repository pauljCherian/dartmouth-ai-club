import { html } from '../lib/core.mjs';

export const page = { id: '404', path: '/404', out: '404.html' };

export function render(c) {
  const main = html`
<section class="wrap page-head notfound">
  <h1 class="sign"><span class="visually-hidden">Page not found. </span><span class="sign__text">Not in service</span></h1>
  <p class="page-lead notfound__text">This page doesn’t exist.</p>
  <p class="notfound__links"><a class="link-arrow" href="${c.link('home')}">Home ${c.arrow('e')}</a></p>
</section>`;

  return c.layout({ page: '404', title: 'Page not found', description: 'This page of the Dartmouth AI Club site does not exist.', path: '/404', main, noindex: true });
}
