import { html, esc } from '../lib/core.mjs';

export const page = { id: 'join', path: '/join', out: 'join.html' };

export function render(c) {
  const { site } = c;
  const groups = site.join.groups_url;

  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">${c.keepLast('Join the club.')}</h1>
  <p class="page-lead">Open to all Dartmouth&nbsp;undergraduates.</p>
</header>

<ol class="steps" aria-label="How to join">
  <li class="row wrap step" id="dartmouth-groups">
    <h2 class="row__title step__title"><span class="step__n" aria-hidden="true">1</span><span>Join on Dartmouth Groups.</span></h2>
    <div class="row__body step__body">
      <p>Sign in with your Dartmouth account and join the club. The link to the club’s GroupMe is posted&nbsp;there.</p>
      <p><a class="button" href="${esc(groups)}">Join on Dartmouth Groups ${c.arrow('ne')}</a></p>
    </div>
  </li>
  <li class="row wrap step">
    <h2 class="row__title step__title"><span class="step__n" aria-hidden="true">2</span><span>Come to a meeting.</span></h2>
    <div class="row__body step__body"><p>Each week’s time and room are posted in the&nbsp;GroupMe.</p></div>
  </li>
</ol>`;

  return c.layout({
    page: 'join',
    title: 'Join the club',
    description: 'Join the Dartmouth AI Club on Dartmouth Groups, then come to a meeting. Open to all Dartmouth undergraduates.',
    path: '/join',
    main,
  });
}
