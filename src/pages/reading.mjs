import { html, esc } from '../lib/core.mjs';

export const page = { id: 'reading', path: '/reading', out: 'reading.html' };

export function render(c) {
  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Reading list</h1>
  <p class="page-lead">Papers and posts the club has read and recommends.</p>
</header>

<section class="wrap block" aria-label="Reading list">
  <ul class="list-rows">
    ${c.content.reading.map((r) => html`
    <li>
      <a class="list-rows__title link-arrow" href="${esc(r.href)}" rel="noopener" target="_blank"><span>${esc(r.title)}</span> ${c.arrow('ne')}</a>
      <p class="list-rows__meta">${esc(r.authors)}</p>
    </li>`)}
  </ul>
</section>`;

  return c.layout({
    page: 'reading',
    title: 'Reading list',
    description: 'Papers and posts the Dartmouth AI Club has read and recommends, from adversarial examples to recursive language models.',
    path: '/reading',
    main,
  });
}
