import { html, esc } from '../lib/core.mjs';

// Preview-only page for the board: decisions, facts to confirm, assets still needed, QA notes.
export const page = { id: 'review', path: '/review', out: 'review.html' };

export function render(c) {
  const { site, speakers } = c.content;
  const files = c.reviewFiles || new Set();
  const qa = c.reviewQA || null;
  const img = (file, alt, cap) =>
    files.has(file)
      ? html`<figure class="review-fig"><a href="review/${file}" target="_blank" rel="noopener"><img src="review/${file}" alt="${esc(alt)}" loading="lazy"></a>${cap ? html`<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`
      : html`<p class="muted">(${esc(alt)}: not generated yet)</p>`;

  const confirmations = [
    ['Tagline', `“${site.tagline}”`, 'Draft I wrote to replace “the best undergrad AI club”: a claim nobody can check.'],
    ['Members', String(site.members.count), site.members.source],
    ['Meetings', `${site.meetings.when}, ${site.meetings.where}`, site.meetings.source],
    ['Hero caption', site.hero.caption, site.hero.caption_source],
    ['Research groups, Nonprofits', 'Pillar descriptions', 'Placeholder copy. What do these programs actually do?'],
    ['Who can join', '“Open to Dartmouth students, whatever you study.”', 'Undergraduates only, or graduate students too?'],
    ['Contact email', site.contact.email, 'You chose a person over the long official address; one line in content/site.json to change.'],
    ...speakers.filter((s) => s.confirm).map((s) => [s.name, `${[s.role, s.org].filter(Boolean).join(' ')}`, s.confirm]),
    ['Session archive', '“Jeffery Xie” → “Jeffrey Xie”', 'The old archive and team page spelled the name differently; I used the team page spelling.'],
  ];

  const needed = [
    ['Full-resolution hero photo', 'IMG_0412 at 5712 × 4284. Export as JPEG (maximum quality, full size, location unchecked) and share a Google Drive link. Everything else is automatic.'],
    ['Second photo', 'An ordinary Tuesday meeting: what a newcomer walks into. Goes in “Who we are”.'],
    ['Yann LeCun', 'A photo of him from the visit. His entry currently uses a crop of the group photo.'],
    ['Ted Li', 'A larger photo. The only one we have is 361 × 343 px.'],
    ['Mazda Moayeri', 'The original photo. It is currently cut out of the event poster.'],
    ['GroupMe form', 'A Dartmouth-only form whose confirmation shows the GroupMe link (setup steps in my message).'],
    ['Socials', 'Instagram and LinkedIn URLs. Empty links are hidden on the live site.'],
    ['Talk descriptions', 'One line per past talk. Optional; rows look fine without.'],
  ];

  const main = html`
<style>
  .review-table { width: 100%; border-collapse: collapse; font-size: var(--t-5); }
  .review-table th, .review-table td { text-align: left; vertical-align: top; padding: 12px 16px 12px 0; border-top: 1px solid var(--rule); }
  .review-table th { font-weight: 700; white-space: nowrap; }
  .review-scroll { overflow-x: auto; }
  .review-grid { display: grid; gap: 28px var(--gap); grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); }
  .review-fig img { width: 100%; height: auto; border: 1px solid var(--rule); background: #fff; }
  .review-fig figcaption { margin-top: 8px; font-size: var(--t-6); color: var(--gray); }
  .review-list > li { padding-block: 14px; border-top: 1px solid var(--rule); }
  .review-list strong { display: block; }
  .review-h { margin-top: clamp(48px, 6vw, 88px); }
  .review-variants { display: flex; flex-wrap: wrap; gap: 12px 28px; margin-top: 16px; font-size: var(--t-4); }
</style>
<header class="page-head wrap">
  <h1 class="page-title">Design review</h1>
  <p class="page-lead">For the board, not the public. What to look at, what needs a decision, and what we still need from you. This page is never built into the live site.</p>
</header>

<section class="wrap block" aria-labelledby="look-h">
  <h2 class="year" id="look-h">How to look at it</h2>
  <p class="page-lead" style="margin-top:12px">Open the home page and scroll slowly. The title hands off to the header while the photo grows. Then do it on your phone. Two variants exist only for comparison:</p>
  <p class="review-variants">
    <a class="link-arrow" href="${c.link('home')}">Hand-off, as built ${c.arrow('e')}</a>
    <a class="link-arrow" href="index.html#logo">Logo visible from the start ${c.arrow('e')}</a>
    <a class="link-arrow" href="index.html#mono">Black-and-white photo turning to color ${c.arrow('e')}</a>
    <a class="link-arrow" href="${c.link('404')}">404 page ${c.arrow('e')}</a>
  </p>
</section>

<section class="wrap block" aria-labelledby="dec-h">
  <h2 class="year" id="dec-h">Decisions</h2>
  <div class="review-scroll"><table class="review-table">
    <thead><tr><th scope="col">Decision</th><th scope="col">Recommended</th><th scope="col">Alternative</th></tr></thead>
    <tbody>
      <tr><th scope="row">Hero motion</th><td>Hand-off: the title shrinks into the header logo.</td><td>Logo visible from the start; the title fades as the photo grows.</td></tr>
      <tr><th scope="row">Hero photo</th><td>Full colour, lightly corrected.</td><td>Starts black-and-white, turns to colour as it grows.</td></tr>
      <tr><th scope="row">Tab icon</th><td>A: off-white arrow on an ink square.</td><td>B: green square. C: “DA/AI” crop of the logo.</td></tr>
      <tr><th scope="row">Speaker and team photos</th><td>Ink-and-paper monochrome, one crop for everyone.</td><td>Colour, balanced for consistency.</td></tr>
      <tr><th scope="row">Nav label</th><td>“Speakers”: the page also shows the next talk.</td><td>“Past Speakers”.</td></tr>
    </tbody>
  </table></div>
  <h3 class="subhead review-h">Tab icon candidates</h3>
  ${img('favicon-comparison.png', 'Tab icon candidates at real size on light and dark browser tabs', 'D shows the full name squeezed into a tab icon: unreadable, which is why the icon cannot simply be the logo.')}
  <h3 class="subhead review-h">Photo treatment</h3>
  <div class="review-grid">
    ${img('portraits-duo.png', 'All portraits in ink-and-paper monochrome', 'Monochrome: mismatched sources start to look like one set.')}
    ${img('portraits-color.png', 'All portraits in balanced colour', 'Colour: better, but the sources still disagree.')}
  </div>
  <h3 class="subhead review-h">Hero photo correction</h3>
  ${img('hero-before-after.png', 'The group photo before and after correction', 'Left: as sent. Right: warm cast reduced, shadows opened slightly, no haze.')}
  <h3 class="subhead review-h">Logo</h3>
  ${img('logo-specimen.png', 'The lockup at display and small sizes', 'Display size: tighter letterspacing and leading. Small size: looser, so the two lines never touch.')}
</section>

<section class="wrap block" aria-labelledby="confirm-h">
  <h2 class="year" id="confirm-h">Copy and facts to confirm</h2>
  <div class="review-scroll"><table class="review-table">
    <thead><tr><th scope="col">Item</th><th scope="col">On the site now</th><th scope="col">Why it needs a look</th></tr></thead>
    <tbody>${confirmations.map(([a, b, d]) => html`<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td><td>${esc(d)}</td></tr>`)}</tbody>
  </table></div>
</section>

<section class="wrap block" aria-labelledby="need-h">
  <h2 class="year" id="need-h">Still needed from you</h2>
  <ul class="review-list">${needed.map(([a, b]) => html`<li><strong>${esc(a)}</strong>${esc(b)}</li>`)}</ul>
</section>

${qa ? html`
<section class="wrap block" aria-labelledby="qa-h">
  <h2 class="year" id="qa-h">What was tested</h2>
  <div class="page-lead" style="margin-top:12px">${qa}</div>
  ${img('qa-devices.png', 'The home page and hand-off on every tested screen size', 'Each column is one screen size; rows are the hand-off at the start, halfway and settled.')}
</section>` : ''}`;

  return c.layout({ page: 'review', title: 'Design review', path: '/review', main, noindex: true });
}
