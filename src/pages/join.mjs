import { html, esc } from '../lib/core.mjs';

export const page = { id: 'join', path: '/join', out: 'join.html' };

export function render(c) {
  const { site } = c;
  const form = site.join.form_url;
  const contact = site.contact;

  const step1 = form
    ? html`<p>Sign in with your Dartmouth account and the link appears. Keeping it behind Dartmouth login keeps the bots out.</p>
       <p><a class="button" href="${esc(form)}">Get the GroupMe link ${c.arrow('ne')}</a></p>`
    : c.preview
      ? html`<p>Sign in with your Dartmouth account and the link appears. Keeping it behind Dartmouth login keeps the bots out.</p>
       <p><a class="button" href="#get-link" aria-disabled="true">Get the GroupMe link ${c.arrow('ne')}</a></p>
       <p class="step__note">Preview: the Dartmouth-only form doesn’t exist yet, so this button goes nowhere.</p>`
      : html`<p>Email <a href="mailto:${esc(contact.email)}">${c.email(contact.email)}</a> from your Dartmouth address and we will send you the link.</p>`;

  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Join the club.</h1>
  <p class="page-lead">Open to Dartmouth students, whatever you study. No&nbsp;experience required.</p>
</header>

<section class="wrap block" aria-label="How to join">
  <ol class="steps">
    <li class="step" id="get-link">
      <span class="bullet" aria-hidden="true">1</span>
      <h2 class="step__title">Get the GroupMe link.</h2>
      <div class="step__body">${step1}</div>
    </li>
    <li class="step">
      <span class="bullet" aria-hidden="true">2</span>
      <h2 class="step__title">Come to a meeting.</h2>
      <div class="step__body"><p>Each week’s time and room is posted in the GroupMe. Come to any meeting.</p></div>
    </li>
  </ol>
</section>`;

  return c.layout({
    page: 'join',
    title: 'Join the club',
    description: 'How to join the Dartmouth AI Club: get the GroupMe link, then come to a meeting. Open to Dartmouth students, whatever you study.',
    path: '/join',
    main,
  });
}
