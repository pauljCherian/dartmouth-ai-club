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
      : html`<p>Email <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a> from your Dartmouth address and we will send you the link.</p>`;

  const main = html`
<header class="page-head wrap">
  <h1 class="page-title">Join the club.</h1>
  <p class="page-lead">Open to Dartmouth students, whatever you study. No experience required.</p>
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
      <div class="step__body"><p>${esc(site.meetings.when)}, ${esc(site.meetings.where)}.</p></div>
    </li>
    ${c.socials() ? html`<li class="step">
      <span class="bullet" aria-hidden="true">3</span>
      <h2 class="step__title">Follow along.</h2>
      <div class="step__body">${c.socials()}</div>
    </li>` : ''}
  </ol>
</section>

<section class="wrap block" aria-labelledby="questions-h">
  <h2 class="year" id="questions-h">Questions</h2>
  <p class="page-lead" style="margin-top:12px">Email ${esc(contact.name)}, ${esc(contact.role)}: <a href="mailto:${esc(contact.email)}" class="site-footer__email">${esc(contact.email)}</a></p>
</section>`;

  return c.layout({
    page: 'join',
    title: 'Join the club',
    description: 'How to join the Dartmouth AI Club: get the GroupMe link, then come to a meeting. Open to Dartmouth students, whatever you study.',
    path: '/join',
    main,
  });
}
