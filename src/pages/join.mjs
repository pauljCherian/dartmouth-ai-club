import { html, esc } from '../lib/core.mjs';

export const page = { id: 'join', path: '/join', out: 'join.html' };

export function render(c) {
  const { site } = c;
  const form = site.join.form_url;
  const contact = site.contact;

  const step1 = form
    ? html`<p>Sign in with your Dartmouth account and the link appears.</p>
       <p><a class="button" href="${esc(form)}">Get the GroupMe link ${c.arrow('ne')}</a></p>`
    : c.preview
      ? html`<p>Sign in with your Dartmouth account and the link appears.</p>
       <p><a class="button" href="#get-link" aria-disabled="true">Get the GroupMe link ${c.arrow('ne')}</a></p>
       <p class="step__note">Preview: the Dartmouth-only form doesn’t exist yet, so this button goes nowhere.</p>`
      : html`<p>Email <a href="mailto:${esc(contact.email)}">${c.email(contact.email)}</a> from your Dartmouth address and we will send you the link.</p>`;

  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Join the club.</h1>
  <p class="page-lead">Open to Dartmouth undergraduates, whatever you study. No&nbsp;experience required.</p>
</header>

<ol class="steps" aria-label="How to join">
  <li class="row wrap step" id="get-link">
    <h2 class="row__title step__title"><span class="bullet" aria-hidden="true">1</span><span>Get the GroupMe link.</span></h2>
    <div class="row__body step__body">${step1}</div>
  </li>
  <li class="row wrap step">
    <h2 class="row__title step__title"><span class="bullet" aria-hidden="true">2</span><span>Come to a meeting.</span></h2>
    <div class="row__body step__body"><p>Each week’s time and room are posted in the GroupMe.</p></div>
  </li>
</ol>`;

  return c.layout({
    page: 'join',
    title: 'Join the club',
    description: 'How to join the Dartmouth AI Club: get the GroupMe link, then come to a meeting. Open to Dartmouth undergraduates, whatever you study.',
    path: '/join',
    main,
  });
}
