import { html, esc } from '../lib/core.mjs';

// Preview-only page for the board: every element and why it is there, open choices, facts to confirm, what we
// still need, and what was tested. Never built into the live site.
export const page = { id: 'review', path: '/review', out: 'review.html' };

export function render(c) {
  const { site, speakers, team } = c.content;
  const files = c.reviewFiles || new Set();
  const qa = c.reviewQA || null;
  const img = (file, alt, cap) =>
    files.has(file)
      ? html`<figure class="review-fig"><a href="review/${file}" target="_blank" rel="noopener"><img src="review/${file}" alt="${esc(alt)}" loading="lazy"></a>${cap ? html`<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`
      : html`<p class="muted">(${esc(alt)}: not generated yet)</p>`;
  // widths: one per column in ems, the last takes the rest, so every table of a kind lines up with the others
  const table = (label, head, rows, widths = []) => html`<div class="review-scroll" tabindex="0" role="region" aria-label="${esc(label)}"><table class="review-table">
    ${widths.length ? html`<colgroup>${widths.map((w) => html`<col style="width:${w}em">`)}<col></colgroup>` : ''}
    <thead><tr>${head.map((h) => html`<th scope="col">${esc(h)}</th>`)}</tr></thead>
    <tbody>${rows.map(([a, ...rest]) => html`<tr><th scope="row">${esc(a)}</th>${rest.map((x) => html`<td>${esc(x)}</td>`)}</tr>`)}</tbody>
  </table></div>`;

  // Every element on the site: what it is, keep / cut / change, and the reason. The patterns it follows are the
  // rules in the next section.
  const log = [
    ['Every page', [
      ['Header logo', 'Changed', 'One drawing: the header logo is the home title’s own drawing, 124 px wide (108 on phones). In v2 the header had a looser drawing of its own, and the letters jumped apart at the end of the hand-off; with one drawing the title lands as exactly the logo it becomes.'],
      ['Header links', 'Kept', 'Speakers, Team, Join the club. No “Home” on laptops: the logo, top left, is the home link.'],
      ['Phone menu', 'Changed', 'The four pages, Home first, the current one underlined, and the club’s X and YouTube right under them (once their links exist), as in the footer. No email: the contact address lives in the footer only.'],
      ['404 page', 'Kept', 'A “Not in service” sign, after the New York subway’s: one black panel, the site’s own type in paper, and the thin rule those signs carry along the top. The one page that isn’t normal browsing gets the one black shape; one sentence, one link home, and the full header and footer.'],
      ['Section headings', 'Changed', 'One heading per section, top left, large and regular weight (Vitsœ’s pattern). The small bold labels are gone everywhere, not just “Join”.'],
      ['Rules', 'Changed', 'Three kinds, by what they separate: the header’s rule runs edge to edge (it divides the fixed bar from the page); a section’s runs from margin to margin; the rules between items in a section (talks, advisors) run across the content column. All gray; no ink rules.'],
      ['Footer', 'Changed', 'Vitsœ’s layout: the invitation to join (on every page but /join), the page links, the contact, and the club’s X and YouTube once their links exist. The links list every page, Join included, because they are also the menu when JavaScript is off. The second logo is gone: the header already shows it on the same screen.'],
      ['Meeting time and room', 'Cut', 'It was wrong (8 pm, not 7) and the night changes every term (Wednesdays in winter, Tuesdays in spring). /join says the GroupMe posts each week’s time and room.'],
      ['© line', 'Kept', 'A convention (Vitsœ has one). It shows the year of the last build.'],
    ]],
    ['Home', [
      ['Title, tagline, photo and hand-off', 'Kept', 'The one moment of motion. The photo is the strongest reason to join.'],
      ['Photo caption', 'Changed', '“The club with Yann LeCun.” Hanover is obvious; the date is on /speakers, and on the home page it made the site look older every month.'],
      ['“Who we are” label', 'Cut', 'The four lines are now that section’s heading.'],
      ['Four lines', 'Kept', 'The most memorable copy on the site, now the heading.'],
      ['About paragraph', 'Changed', 'No member count, majors or build nights: none was confirmed, and a number goes stale. Three real topics from the club’s own sessions show a newcomer what a meeting is.'],
      ['Facts row', 'Cut', 'Member count, meeting time and build nights: unconfirmed or wrong.'],
      ['What we do', 'Cut', 'Research groups and Nonprofits were placeholder copy; Speaker series repeated the next section and its link; the green discs mean “steps” everywhere else.'],
      ['Speakers', 'Changed', 'The six newest talks: photo, name, role at the time of the talk, date. One “All speakers →”, not two.'],
      ['Join section', 'Moved', 'Into the footer, so every page ends with it. The button says what happens next: “How to join →”.'],
      ['Old posters', 'Cut', 'Two event posters with the old 8 pm time were still published; they are gone, and the old poster address goes to /speakers.'],
    ]],
    ['Speakers', [
      ['Lead', 'Changed', 'Adds “New talks are announced in the GroupMe.”: the job the Next block did, without anyone updating the site. Not a link: the footer’s “How to join →” is on the same page.'],
      ['Next', 'Cut', 'Nobody would keep it current. A talk is added on its day or after, so the list is a record that never shows a talk as coming up (the site launches the day of Mazda Moayeri’s talk).'],
      ['Each talk', 'Changed', 'The same five things for everyone, in the same sizes and order as the home tiles: photo, name, role at the time of the talk, one line on their own work, date last. No format, interviewer, room, poster or talk title.'],
      ['Year', 'Changed', 'A section heading like any other.'],
      ['Member sessions', 'Cut', 'A dated archive that stopped in April. Three of its topics now appear as examples in About.'],
      ['Reading list page', 'Cut', 'Expert titles say “experts only” to a beginner, and nobody would keep it current. /reading goes to the home page.'],
    ]],
    ['Team', [
      ['Lead', 'Cut', 'It repeated the two section headings.'],
      ['Officers', 'Changed', `A list, as Stanford’s: name, links, role, one line each, under “Officers, ${team.officers_term}”. No photos: they went out of date every year and two were always missing; the club’s faces are in the group photo.`],
      ['LinkedIn and X', 'Changed', 'The networks’ marks beside each name, always visible: Stanford shows them on hover, which phones don’t have.'],
      ['Faculty advisors', 'Changed', 'The same list: name, and school or department (a rank changes with promotions).'],
    ]],
    ['Join', [
      ['Steps', 'Changed', 'Sections like every other page’s: the heading top left, led by its green number (green numbers mean steps, here only).'],
      ['Step 1', 'Changed', 'With the form: “Sign in with your Dartmouth account and the link appears.” and one button; the sentence about bots is gone. Until the form exists: email the contact address.'],
      ['Step 2', 'Changed', '“Each week’s time and room are posted in the GroupMe.”'],
      ['Step 3 and Questions', 'Cut', 'Not steps; the footer carries the contact (and the social marks once their links exist).'],
    ]],
    ['404', [
      ['Sentence and links', 'Changed', '“This page doesn’t exist.” and one link home; the header and footer carry the rest.'],
    ]],
  ];

  const considered = [
    ['Phone links in the header instead of a menu', 'One reviewer’s idea. “Join the club” does not fit beside the logo on a 320 px phone, and very large text would wrap the header. Your reference, Vitsœ, uses a menu.'],
    ['No speaker descriptions', 'Three reviewers argued for name, role and date only. Kept because you asked for a description on every talk; the rule keeps them honest: one line, under about 90 characters, about the person’s own work at the time of the talk. The live build refuses to run while one is missing.'],
    ['Links that appear on hover', 'Stanford’s team list shows LinkedIn and X when you hover over a name. Phones have no hover, and most visitors are on phones, so the marks are always shown, quietly gray.'],
    ['Cutting the four lines', 'Two reviewers. Kept: they are now the section’s only heading.'],
    ['Cutting the © line', 'Three reviewers. Kept: it is the convention, and Vitsœ keeps it.'],
    ['“Join the club” in the phone header', 'The menu and the footer of every page carry it.'],
    ['Tab icon from the wordmark', 'Two reviewers: inside the site ↗ means “leaves the site”. Kept because you chose it in v1 and the tab icon is not a link, so it sends nobody anywhere; easy to change.'],
  ];

  const open = [
    ['Hero motion', 'Hand-off: the title shrinks into the header logo.', 'Logo visible from the start; the title fades as the photo grows.'],
    ['Hero photo', 'Starts black-and-white and turns to color as it grows (the “Black-and-white photo turning to color” link above).', 'Full color from the start, lightly corrected (built as the default until you decide).'],
    ['Speaker photos', 'Ink-and-paper monochrome, one crop for everyone.', 'Color, balanced for consistency.'],
  ];

  const confirmations = [
    ['Tagline', `“${site.tagline}”`, 'My draft, replacing “the best undergrad AI club”: a claim nobody can check.'],
    ['About', '“meets every week … from how transformers work to adversarial attacks and LLMs for math”', 'From the club’s session archive (Jan–Apr 2026). Still weekly this term?'],
    ['Officers', `Officers, ${team.officers_term}`, 'Right year and names?'],
    ['AI Families, Conferences & Trips', 'Not on the new site', 'The old site listed both. If they still run, one true sentence each can go in About.'],
    ['Research groups', 'Not on the new site', 'You have three VPs Research. If research groups run, send one sentence on what they do and how to get in.'],
    ...speakers.filter((s) => s.confirm).map((s) => [s.name, s.role || '(no role yet)', s.confirm]),
  ];

  const needed = [

    ['Yann LeCun', 'The original file of the photo from his visit (the one with the Dartmouth backdrop), sent as a file or Drive link rather than in the chat, so it can be cropped at full size. It replaces the Wikimedia portrait and its credit line.'],
    ['Mazda Moayeri', 'The original photo; it is currently cut out of the event poster (400 px wide).'],
    ['Andrew Milich, Chetan Patel', 'Larger photos, at least 1000 px wide (now 400 and 554 px): on phones and high-resolution laptops their tiles need about 600 px.'],
    ['Full-resolution hero photo', 'IMG_0412 at 5712 × 4284, exported as JPEG at full size with location unchecked.'],
    ['Second photo', 'An ordinary weekly meeting: what a newcomer walks into. It would go under the About text.'],
    ['GroupMe form', 'A Dartmouth-only form whose confirmation shows the GroupMe link. Then step 1 on /join becomes one sentence and one button.'],
    ['X and YouTube', 'The club’s two URLs. The marks are built and appear in the footer and menu as soon as the links exist.'],
    ['Founding (optional)', 'The year the club was founded and by whom, for one line under the officers: “Founded in … by …”. A founding never changes, unlike titles.'],
    ['Class years (optional)', 'Each officer’s class year, if you want “Paul Cherian ’27” in the list: very Dartmouth, and never out of date.'],
    ['Officers', 'Open your own LinkedIn link on the Team page once and confirm it is your profile.'],
  ];

  const main = html`
<style>
  .review-table { width: 100%; min-width: 34em; border-collapse: collapse; font-size: var(--t-5); table-layout: fixed; }
  .review-table th, .review-table td { text-align: left; vertical-align: top; padding: 12px 16px 12px 0; border-top: 1px solid var(--rule); }
  .review-table tr:first-child > * { border-top: 0; }
  .review-table th { font-weight: 700; }
  .review-table thead th { white-space: nowrap; color: var(--gray); font-weight: 400; }
  .review-scroll { overflow-x: auto; }
  .review-scroll + .review-scroll, .review-sub + .review-scroll { margin-top: 8px; }
  .review-sub { margin-top: 40px; font-size: var(--t-4); font-weight: 700; }
  .review-sub:first-child { margin-top: 0; }
  .review-grid { display: grid; gap: 28px var(--gap); grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); }
  .review-fig img { width: 100%; height: auto; border: 1px solid var(--rule); background: var(--paper); }
  .review-fig figcaption { margin-top: 8px; font-size: var(--t-6); color: var(--gray); }
  .review-list > li { padding-block: 14px; border-top: 1px solid var(--rule); }
  .review-list > li:first-child { padding-top: 0; border-top: 0; }
  .review-list strong { display: block; }
  .review-text { max-width: 34em; }
  .review-text + * { margin-top: 16px; }
  .review-variants { display: flex; flex-wrap: wrap; gap: 12px 28px; font-size: var(--t-4); }
  .review-rules { display: grid; gap: 10px; max-width: 40em; }
  .review-rules li { padding-left: 1.1em; text-indent: -1.1em; }
  .review-rules li::before { content: "–"; display: inline-block; width: 1.1em; text-indent: 0; }
</style>
<header class="page-head wrap">
  <h1 class="page-title">Design review</h1>
  <p class="page-lead">For the board, not the public. Every element and why it is there, what still needs a decision, and what we need from you. This page is never built into the live site.</p>
</header>

<section class="row wrap" aria-labelledby="look-h">
  <h2 class="row__title" id="look-h">How to look at it</h2>
  <div class="row__body">
    <p class="review-text">Open the home page and scroll slowly: the title hands off to the header while the photo grows. Then do it on your phone. Two variants exist only for comparison.</p>
    <p class="review-variants">
      <a class="link-arrow" href="${c.link('home')}">Hand-off, as built ${c.arrow('e')}</a>
      <a class="link-arrow" href="index.html#logo">Logo visible from the start ${c.arrow('e')}</a>
      <a class="link-arrow" href="index.html#mono">Black-and-white photo turning to color ${c.arrow('e')}</a>
      <a class="link-arrow" href="${c.link('404')}">404 page ${c.arrow('e')}</a>
    </p>
  </div>
</section>

<section class="row wrap" aria-labelledby="rules-h">
  <h2 class="row__title" id="rules-h">The rules</h2>
  <div class="row__body">
    <ul class="review-rules">
      <li>Everything on the site does a job, or is a convention people expect. If it would go wrong without anyone editing it, it isn’t on the site.</li>
      <li>A page has one giant title. A section has one heading, top left, and its content on the right, under a gray hairline from margin to margin. Rules between items in a section run across the content column; the header’s runs edge to edge.</li>
      <li>Green means you can act: every Join link and button, hover, focus. Numbered green discs mean steps, and only appear on /join.</li>
      <li>→ goes somewhere on this site; ↗ leaves it. A network’s own mark (LinkedIn, X, YouTube) needs neither. (The tab icon is the ↗ on its own: your choice, and not a link.)</li>
      <li>A speaker is shown the same way everywhere, in the same sizes: photo, name, role at the time of the talk, date last. The Speakers page adds one line on their work, before the date.</li>
      <li>The logo is one drawing. The home title and the header logo are the same SVG at two sizes.</li>
      <li>Sentences end with a full stop (“Join the club.”, “Read the paper.”); names don’t (“Speakers”, “Team”).</li>
    </ul>
  </div>
</section>

<section class="row wrap" aria-labelledby="log-h">
  <h2 class="row__title" id="log-h">Every element</h2>
  <div class="row__body">
    ${log.map(([pg, rows]) => html`<h3 class="review-sub">${esc(pg)}</h3>${table(pg, ['Element', 'Decision', 'Why'], rows, [10, 6.5])}`)}
    <h3 class="review-sub">Considered, not done</h3>
    ${table('Considered, not done', ['Idea', 'Why not'], considered, [16.5])}
  </div>
</section>

<section class="row wrap" aria-labelledby="dec-h">
  <h2 class="row__title" id="dec-h">Open choices</h2>
  <div class="row__body">
    ${table('Open choices', ['Choice', 'Recommended', 'Alternative'], open, [10, 15])}
    <h3 class="review-sub">Photo treatment</h3>
    <div class="review-grid">
      ${img('portraits-duo.png', 'All portraits in ink-and-paper monochrome', 'Monochrome: mismatched sources start to look like one set.')}
      ${img('portraits-color.png', 'All portraits in balanced color', 'Color: better, but the sources still disagree.')}
    </div>
    <h3 class="review-sub">Hero photo correction</h3>
    ${img('hero-before-after.png', 'The group photo before and after correction', 'Left: as sent. Right: warm cast reduced, shadows opened slightly, no haze.')}
    <h3 class="review-sub">Link preview</h3>
    <figure class="review-fig" style="max-width:720px"><img src="${c.asset('og.jpg')}" alt="The link preview: the whole group photo beside the two-line logo" loading="lazy"><figcaption>What iMessage, Slack and LinkedIn show when someone shares the site.</figcaption></figure>
    <h3 class="review-sub">Logo</h3>
    ${img('logo-specimen.png', 'The lockup at display and small sizes', 'Display size (the home title): tight. Small size (the header): a little more open, so the lines stay apart on ordinary screens.')}
  </div>
</section>

<section class="row wrap" aria-labelledby="confirm-h">
  <h2 class="row__title" id="confirm-h">Facts to confirm</h2>
  <div class="row__body">${table('Facts to confirm', ['Item', 'On the site now', 'Question'], confirmations, [10, 15])}</div>
</section>

<section class="row wrap" aria-labelledby="need-h">
  <h2 class="row__title" id="need-h">Still needed</h2>
  <div class="row__body"><ul class="review-list">${needed.map(([a, b]) => html`<li><strong>${esc(a)}</strong>${esc(b)}</li>`)}</ul></div>
</section>

${qa ? html`
<section class="row wrap" aria-labelledby="qa-h">
  <h2 class="row__title" id="qa-h">What was tested</h2>
  <div class="row__body">
    <div class="review-text">${qa}</div>
    ${img('qa-devices.png', 'The home page and hand-off on every tested screen size', 'Each column is one screen size; rows are the hand-off at the start, halfway and settled.')}
  </div>
</section>` : ''}`;

  return c.layout({ page: 'review', title: 'Design review', path: '/review', main, noindex: true });
}
