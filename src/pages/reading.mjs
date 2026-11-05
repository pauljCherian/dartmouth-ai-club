import { html, esc } from '../lib/core.mjs';

export const page = { id: 'reading', path: '/reading', out: 'reading.html' };

export function render(c) {
  // The arrow follows the last word wherever the title wraps: last word and arrow never split.
  const titleArrow = (t) => {
    const m = String(t).match(/^(.*\s)?(\S+)$/s);
    return html`${m[1] ? esc(m[1]) : ''}<span class="nowrap">${esc(m[2])}&nbsp;${c.arrow('ne')}</span>`;
  };
  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Reading list</h1>
  <p class="page-lead">Papers and posts the club has read and recommends.</p>
</header>

<section class="wrap block" aria-label="Reading list">
  <ul class="list-rows">
    ${c.content.reading.map((r) => html`
    <li>
      <a class="list-rows__title link-arrow link-arrow--inline" href="${esc(r.href)}">${titleArrow(r.title)}</a>
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
