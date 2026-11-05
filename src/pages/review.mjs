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
      ['Phone menu', 'Changed', 'The four pages, Home first, the current one underlined, and the club’s X and YouTube right under them (once their links exist), as the footer has them under its contact. No email: the contact address lives in the footer only. Opened by a tap, it takes focus itself and draws no box (iPhones drew a focus box around Home, which read as if Home were the current page); opened from the keyboard, focus lands on Home with its ring.'],
      ['Section headings', 'Changed', 'One heading per section, top left, in the heading size and regular weight: the size shows where a section starts, and regular weight keeps it a step below the page’s one bold title. A small bold label above it gave a section two headings, so the labels are gone everywhere, not just “Join”.'],
      ['Rules', 'Changed', 'Three kinds, by what they separate: the header’s rule runs edge to edge (it divides the fixed bar from the page); a section’s runs from margin to margin; the rules between items in a section (talks, officers, advisors) run across the content column. All three gray (the 404 sign’s own paper rule is an open choice below).'],
      ['Footer', 'Changed', 'The last section of every page, laid out like the others (on /join, where the page itself is the invitation, it has no heading): “Join the club.” top left, its sentence and button on the right (on every page but /join), so every other page ends with the one thing the club asks of a visitor; then the page links and the contact, and the club’s X and YouTube once their links exist. The links list every page, Join included, in bold like every list of pages, because they are also the menu when JavaScript is off. The second logo is gone: the header already shows it on the same screen.'],
      ['Meeting time and room', 'Cut', 'It was wrong (8 pm, not 7) and the night changes every term (Wednesdays in winter, Tuesdays in spring). /join says Dartmouth Groups posts each week’s time and room.'],
      ['Contact email', 'Changed', 'Paul Cherian’s Dartmouth address, as president (the officers’ decision): in the footer of every page, and on /join until the form exists. It changes at each handover, in content/site.json.'],
      ['© line', 'Kept', 'A convention visitors expect at the foot of a page (the club’s old site had one too). On a printed inner page, where the header is hidden, it is the only line that names the club. It shows the year of the last build.'],
      ['Header rule', 'Changed', 'Appears as soon as the page scrolls under the header, without fading in: nothing on the site fades in as you scroll.'],
    ]],
    ['Home', [
      ['Title, tagline, photo and hand-off', 'Kept', 'The one moment of motion. The photo is the strongest reason to join.'],
      ['Photo caption', 'Changed', '“The club with Yann LeCun.” Hanover is obvious; the date is on /speakers, and on the home page it made the site look older every month.'],
      ['“Who we are” label', 'Cut', 'The four lines are now that section’s heading.'],
      ['Four lines', 'Kept', 'The most memorable copy on the site, now the heading.'],
      ['About paragraph', 'Changed', 'No member count, majors or build nights: none was confirmed, and a number goes stale. Three real topics from the club’s own sessions show a newcomer what a meeting is.'],
      ['Facts row', 'Cut', 'Member count, meeting time and build nights: unconfirmed or wrong.'],
      ['What we do', 'Cut', 'Research groups and Nonprofits were placeholder copy; Speaker series repeated the next section and its link.'],
      ['Speakers', 'Kept', 'The six newest talks: photo, name, role at the time of the talk, date. One “All speakers →”, not two.'],
      ['Join section', 'Moved', 'Into the footer, so every page but /join ends with it. The button says what happens next: “How to join →”.'],
      ['Old posters', 'Cut', 'Two event posters with the old 8 pm time were still published; they are gone, and the old poster address goes to /speakers.'],
    ]],
    ['Speakers', [
      ['Lead', 'Changed', 'Adds “New talks are announced on Dartmouth Groups.”: the job the Next block did, without anyone updating the site. Not a link: the footer’s “How to join →” is on the same page.'],
      ['Next', 'Cut', 'Nobody would keep it current. A talk is added on its day or after, so the list is a record that never shows a talk as coming up (the site launches the day of Mazda Moayeri’s talk).'],
      ['Each talk', 'Changed', 'The same five things for everyone, in the same order and type sizes as the home tiles: photo, name, role at the time of the talk, one line on their own work, date last. The photo is the same crop and tone, smaller. No format, interviewer, room, poster or talk title.'],
      ['Year', 'Changed', 'A section heading like any other.'],
      ['Member sessions', 'Cut', 'A dated archive that stopped in April. Three of its topics now appear as examples in About.'],
      ['Reading list page', 'Cut', 'Expert titles say “experts only” to a beginner, and nobody would keep it current. /reading goes to the home page.'],
    ]],
    ['Team', [
      ['Lead', 'Cut', 'It repeated the two section headings.'],
      ['Officers', 'Changed', `A list: name, profile links, then the role, flush left like every name and role on the site (on laptops the role starts on column 8, the footer’s contact column), under “Officers, ${team.officers_term}”: the president first, then everyone else by last name, so no vice president ranks above another (the page sorts them; the file’s order doesn’t matter). No photos: they went out of date every year and two were always missing; the club’s faces are in the group photo.`],
      ['Profile links', 'Changed', 'Each officer’s LinkedIn (and X, if they give one) as the network’s own mark beside the name, always visible: most visitors are on phones, which have no hover, and a speaker or sponsor looking for an officer gets there in one tap. The same mark, in ink at one size, as the club’s own X and YouTube.'],
      ['Faculty advisors', 'Changed', 'The same list: name, and school or department (a rank changes with promotions).'],
    ]],
    ['Join', [
      ['Steps', 'Changed', 'Sections like every other page’s: the heading top left, starting with its number in the heading’s own type. The green discs are gone: green means you can press it, and a number can’t be pressed.'],
      ['Step 1', 'Changed', '“Join on Dartmouth Groups.”: sign in with a Dartmouth account and join, with one green button. Dartmouth Groups is the gate: only Dartmouth accounts get in, members get the GroupMe link there, and the link is never on the site.'],
      ['Step 2', 'Changed', '“Each week’s time and room are posted on Dartmouth Groups.”'],
      ['Step 3 and Questions', 'Cut', 'Not steps; the footer carries the contact (and the social marks once their links exist).'],
    ]],
    ['404', [
      ['Sign', 'To decide', 'One ink panel, so the one page that isn’t normal browsing can’t be mistaken for a page that worked. Its words, “Not in service”, and the thin rule along its top come from New York subway signs, not from the site’s rules: every other page’s title is its name, as in the browser tab (on /join, that name as a sentence; here “Page not found”), and every other rule is a gray hairline between two things. See Open choices.'],
      ['Sentence and link', 'Changed', '“This page doesn’t exist.” and one link home; the header and footer carry the rest.'],
    ]],
  ];

  const considered = [
    ['Phone links in the header instead of a menu', 'One reviewer’s idea. Speakers, Team and Join the club need about 250 px beside the logo; a 390 px phone has about 235 px and a 320 px phone about 165 px, and very large text would wrap the header. A menu button is what phone visitors expect, and the footer of every page lists the same links.'],
    ['No speaker descriptions', 'Three reviewers argued for name, role and date only. Kept because you asked for a description on every talk; the rule keeps them honest: one line, under about 90 characters, about the person’s own work at the time of the talk (one exception for now: Mazda Moayeri’s line describes his PhD until he tells us what he does at Meta). The live build refuses to run while one is missing.'],
    ['Links that appear on hover', 'Showing an officer’s LinkedIn only while the pointer is over their name. Phones have no hover, and most visitors are on phones, so the marks are always shown.'],
    ['Cutting the four lines', 'Two reviewers. Kept: they are now the section’s only heading.'],
    ['Cutting the © line', 'Three reviewers. Kept: visitors expect it at the foot of a page, and on a printed inner page, where the header is hidden, it is the only line that names the club.'],
    ['“Join the club” in the phone header', 'The menu and the footer of every page carry it.'],
    ['Tab icon from the wordmark', 'Two reviewers: inside the site ↗ means “leaves the site”. Kept because you chose it in v1 and the tab icon is not a link, so it sends nobody anywhere; easy to change.'],
  ];

  const open = [
    ['Hero motion', 'Hand-off: the title shrinks into the header logo.', 'Logo visible from the start; the title fades as the photo grows.'],
    ['Hero photo', 'Starts black-and-white and turns to color as it grows (the “Black-and-white photo turning to color” link above).', 'Full color from the start, lightly corrected (built as the default until you decide).'],
    ['Speaker photos', 'Ink-and-paper monochrome, one crop for everyone.', 'Color, balanced for consistency.'],
    ['Speaker photos at all', 'Keep them, and from now on take each speaker’s photo at the talk: facing the camera, in front of the Dartmouth backdrop, like Yann LeCun’s. Replace a borrowed photo when the club has its own; never flip one.', 'No photos: name, role, line and date only, like the Team page.'],
    ['404 page', 'Its title is its name, “Page not found”, as in the browser tab, in the page-title size; on the ink panel if you want it to look unlike every other page, with no rule along the top.', 'As built: “Not in service” on an ink panel with a thin rule along its top, after New York subway signs.'],
  ];

  const confirmations = [
    ['Tagline', `“${site.tagline}”`, 'My draft, replacing “the best undergrad AI club”: a claim nobody can check.'],
    ['Every week', '“meets every week” (About), “weekly meetings” (search description), “Each week’s time and room” (/join)', 'The archive shows weekly Wednesdays from Jan 28 to Mar 4, 2026, then only Apr 7, Apr 14 and May 5; and the old site said “bi-weekly sessions” from Dec 30, 2025. Is it every week this term? If the rhythm changes by term, it comes out of all three places.'],
    ['Officers', `Officers, ${team.officers_term}`, 'Right year and names? (Lisa Samoylov is off: she is an alumna.)'],
    ['Club name', '“Dartmouth AI Club” (logo, titles, footer)', 'Dartmouth Groups lists the club as “Dartmouth Undergraduate AI Club”. Which is the name the site should use?'],
    ['AI Families, Conferences & Trips', 'Not on the new site', 'The old site listed both. If they still run, one true sentence each can go in About.'],
    ['Research groups', 'Not on the new site', 'You have three VPs Research. If research groups run, send one sentence on what they do and how to get in.'],
    ...speakers.filter((s) => s.confirm).map((s) => [s.name, s.role || '(no role yet)', s.confirm]),
  ];

  const needed = [
    ['Mazda Moayeri', 'The original photo; it is currently cut out of the event poster (400 px wide).'],
    ['Andrew Milich, Chetan Patel', 'Larger photos, at least 1000 px wide (now 400 and 554 px): on phones and high-resolution laptops their tiles need about 600 px.'],
    ['Full-resolution hero photo', 'IMG_0412 at 5712 × 4284, exported as JPEG at full size with location unchecked.'],
    ['Second photo', 'An ordinary weekly meeting: what a newcomer walks into. It would go under the About text.'],
    ['X and YouTube', 'The club’s two URLs. The marks are built and appear in the footer and menu as soon as the links exist.'],
    ['Founding (optional)', 'The year the club was founded and by whom, for one line under the officers: “Founded in … by …”. A founding never changes, unlike titles.'],
    ['Class years (optional)', 'Each officer’s class year, if you want “Paul Cherian ’27” in the list: very Dartmouth, and never out of date.'],
    ['Officers', 'Open your own LinkedIn link on the Team page once and confirm it is your profile.'],
    ['Club email (optional)', 'The club’s own Dartmouth account, Dartmouth.Machine.Learning.Student.Group@dartmouth.edu, is the address on its Dartmouth Groups page. In the footer instead of Paul’s, it would outlive a handover; a personal address doesn’t. Your call.'],
    ['GroupMe link on Dartmouth Groups', 'Post it where members see it once they have joined (for example a members-only post), and keep GroupMe set to approve new members, in case the link travels.'],
  ];

  // The system, measured from the production build (public/review/system.json, written by the QA sheet script):
  // every text style on the site, by size token, and what it is used for.
  const sys = c.reviewSystem || null;
  const SIZES = [['t-page', 'Page title'], ['t-2', 'Heading'], ['t-3', 'Lead'], ['t-4', 'Body'], ['t-5', 'Small'], ['t-6', 'Caption'], ['t-menu', 'Menu']];
  const ROLES = [
    [/page-title/, 'page titles'], [/site-footer__title/, 'the footer’s “Join the club.”'], [/step__title/, 'step headings'], [/row__title/, 'section headings'],
    [/page-lead/, 'page leads'], [/about__text/, 'the About text'], [/hero__tagline/, 'the tagline'], [/notfound__text/, 'the 404 sentence'],
    [/link-arrow/, 'arrow links'], [/person__name|talk__name|roster__name/, 'names'], [/person__meta|talk__affil|roster__what/, 'roles and schools'],
    [/person__date|talk__date/, 'dates'], [/talk__desc/, 'speaker lines'], [/step__body|step__note/, 'step text'], [/button/, 'buttons'],
    [/site-footer__text/, 'the footer sentence'], [/site-nav/, 'header links'], [/site-menu__nav/, 'menu links'], [/site-footer__email/, 'the contact email'],
    [/site-footer__legal/, 'the © line'], [/hero__caption/, 'the photo caption'], [/credits/, 'photo credits'], [/step__n/, 'step numbers'],
    [/sign__text/, 'the 404 sign'], [/site-footer__nav/, 'footer links'], [/skip-link/, 'the skip link'], [/tnum/, 'section headings'],
  ];
  const roleOf = (sel) => (ROLES.find(([re]) => re.test(sel)) || [null, sel])[1];
  const typeRows = () => {
    if (!sys) return [];
    const [ph, lp] = [sys.widths['390'], sys.widths['1440']];
    const px = (wd, t) => `${Math.round(wd.tokens[`--${t}`])} px`;
    const rows = SIZES.filter(([t]) => Number.isFinite(ph.tokens[`--${t}`]) && Number.isFinite(lp.tokens[`--${t}`])).map(([t, name]) => {
      const styles = [...ph.styles, ...lp.styles].filter((s) => s.token === t);
      const weights = [...new Set(styles.map((s) => (s.weight >= 700 ? 'Bold' : 'Regular')))].sort().reverse().join(', ');
      const lhs = [...new Set(styles.map((s) => s.lh))].sort().join(', ');
      const uses = [...new Set(styles.flatMap((s) => Object.keys(s.uses).map((u) => roleOf(u.split(': ')[1]))))].join(', ');
      return [`${name} (${t.replace('t-', 'T')})`, px(ph, t), px(lp, t), weights || '–', lhs || '–', uses || 'not used'];
    });
    const off = new Map();  // one row per role off the scale, with its size on each screen
    for (const [where, wd] of [['phone', ph], ['laptop', lp]]) for (const s of wd.styles.filter((x) => !x.token)) {
      for (const role of new Set(Object.keys(s.uses).map((u) => roleOf(u.split(': ')[1])))) {
        const r = off.get(role) || { phone: '', laptop: '', weight: s.weight >= 700 ? 'Bold' : 'Regular', lh: String(s.lh) };
        r[where] = `${Math.round(s.px)} px`; off.set(role, r);
      }
    }
    for (const [role, r] of off) rows.push(['Off the scale', r.phone || 'on scale', r.laptop || 'on scale', r.weight, r.lh, role]);
    return rows;
  };
  const gridText = () => {
    if (!sys) return '';
    const g = (w) => { const cols = sys.widths[w].cols; return { m: Math.round(cols[0][0]), gap: Math.round(cols[1][0] - cols[0][0] - cols[0][1]), col: Math.round(cols[0][1]) }; };
    const [a, b] = [g('390'), g('1440')];
    return `Twelve columns at every size. On a 390 px phone: ${a.m} px margins, ${a.gap} px gutters, columns ${a.col} px wide, and every section heading sits above its content. On a 1440 px laptop: ${b.m} px margins, ${b.gap} px gutters, columns ${b.col} px wide; from 900 px wide, a section heading takes columns 1 to 4 and its content columns 5 to 12. Beyond 1920 px of content, everything stops flush left.`;
  };
  const PAGES = [['home', 'Home'], ['speakers', 'Speakers'], ['team', 'Team'], ['join', 'Join'], ['404', '404'], ['menu', 'Phone menu']];

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
  .review-rules--n { counter-reset: rule; gap: 14px; }
  .review-rules--n li { counter-increment: rule; padding-left: 1.6em; text-indent: -1.6em; }
  .review-rules--n li::before { content: counter(rule) "."; width: 1.6em; font-variant-numeric: tabular-nums; }
  .review-pages { display: grid; gap: 40px; }
  .review-page__name { margin-bottom: 10px; font-size: var(--t-4); font-weight: 700; }
  .review-page__shots { display: grid; gap: 16px var(--gap); align-items: start; }
  @media (min-width: 37.5em) { .review-page__shots { grid-template-columns: minmax(0, 1fr) minmax(0, 3fr); } }
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
    <p class="review-text">Ten rules. Every element on the site follows from one of them, so the review is: does each thing on each page follow its rule? A reference (another club’s site, Vitsœ, a subway sign) can show what visitors expect; it is never the reason.</p>
    <ol class="review-rules review-rules--n">
      <li><strong>Jobs.</strong> Everything on the site does a job for a visitor or is a convention visitors expect. What changes at a handover (the officers, their year, the contact) lives in content/ and changes in one commit; nothing else goes stale: no member count, no meeting night or room, no “upcoming” talk.</li>
      <li><strong>Type.</strong> One family (Helvetica; its free twin TeX Gyre Heros where Helvetica isn’t installed) in seven sizes, each with one job: page title (a page’s name, or on /join the sentence it is), menu (the four pages in the phone menu), heading (a section’s name or its sentences), lead (what introduces a page or the club: the line under a title, the tagline, About), body (what you read: names, speaker lines, steps, buttons), small (what you look up: roles, dates, page links, the address, the © line) and caption (under a photo). Two weights: bold for page titles, the names of speakers, officers and advisors, and links and buttons that stand on their own; regular for what you read, a name inside a sentence and the contact address. Display sizes are set tight and a little closer (titles −0.045 em like the logo, the menu −0.035, headings −0.02, leads −0.005); text you read is set open (1.22 for the shortest lines up to 1.5).</li>
      <li><strong>Colour.</strong> Ink on paper, never pure black or white. Gray for secondary text (roles, dates, captions, credits, the © line); hairlines in their own lighter gray; an empty photo frame is pale gray until its photo loads. Green marks what you can press (every Join link and button, a link under the pointer except the logo, which never changes), the keyboard focus and selected text; nothing else is green. Ink panels: the 404 sign, and the skip link when it has focus.</li>
      <li><strong>Grid and sections.</strong> One twelve-column grid with the same margins on every page; text flush left. The header is a bar, not a section: the logo on the left margin, the links ending on the right margin. A page head holds the title and at most one lead (the 404 adds its link home); the home page head follows the logo instead: the tagline beside “AI CLUB” on laptops, the photo edge to edge on phones. Everything below is a section, one section rhythm below what comes before it: a gray hairline from margin to margin, one heading top left (columns 1–4 from 900 px wide, above the content on phones) and the content on the right (columns 5–12), which may divide its own width (the speaker tiles: halves on phones, thirds from 700 px). Rows of a list (talks, officers, advisors) are divided by hairlines across the content column. The footer is the last section of every page, laid out the same way; on /join, where the page itself is the invitation, it has no heading. The © line closes the page from the left margin. The header’s hairline runs edge to edge once the page scrolls under it.</li>
      <li><strong>Components.</strong> Each kind of thing has one design wherever it appears. A speaker: photo, name, role at the time of the talk, date last; the Speakers page adds one line on their work, before the date, with the photo in a fixed column beside the words (84 px on phones, 128 on laptops); the same type sizes and order everywhere. A list row: name, the profile mark if any, role. An arrow link: bold words and an arrow. A button: green and bold, only for joining; it names its action (“How to join”), a navigation link names its page (“Join the club”). A network mark: the network’s own logo, in ink, as tall as body text. The contact address: small and regular, a link with no arrow or underline, made to be read and copied. The menu button: two ink bars, a × while open, a 44 px target. A step: a section whose heading starts with its number.</li>
      <li><strong>Photos.</strong> Real photos of the club and its guests: no stock, no illustration, no generated images; best, the club’s own photo taken at the talk, the speaker facing the camera. Portraits share one 4:5 crop and the board’s chosen treatment (ink-and-paper now), so pictures from different sources look like one set; a photo is never flipped. A photo used under a licence carries its credit, in caption size, wherever it appears. The group photo’s treatment is an open choice below.</li>
      <li><strong>Words.</strong> Plain words a first-year understands. One name per thing: a meeting is the club’s own session, a talk is a guest’s visit, the people who join are undergraduates, and the place to join is Dartmouth Groups. A sentence ends with a full stop, even as a heading (“Join the club.”, “Read the paper.”); a label doesn’t (“Speakers”, “How to join”). A speaker’s role reads “Title, Organisation” as of the talk; dates read “Nov 6, 2026”; an officers’ term reads “2026–27”. Curly quotes, en dashes in ranges, and no sentence ends on a lone word.</li>
      <li><strong>Links and navigation.</strong> Every page links to every other: the header on laptops (the logo is home), the menu on phones, the footer everywhere (also the menu without JavaScript). The page you are on is underlined; hover only changes the colour. → goes somewhere on this site and ↗ leaves it, on standalone links and buttons only. A link inside a sentence carries no arrow and is underlined in its sentence’s colour; a list of pages carries none either; a network’s mark needs no arrow.</li>
      <li><strong>Logo.</strong> One drawing, the club’s name in two lines of TeX Gyre Heros Bold turned into outlines, used at every size: the giant home title, the header, the link preview and the square logo. Never retyped or redrawn. The tab icon is the ↗ on its own: your choice, and not a link.</li>
      <li><strong>Motion.</strong> One choreographed moment: on the home page the giant title hands off to the header as the photo grows. Everything else moves only when you tap (the menu opening); nothing fades in as you scroll, and scrolling is the browser’s own. A device set to reduce motion, or without JavaScript, gets the still page.</li>
    </ol>
  </div>
</section>

${sys ? html`
<section class="row wrap" aria-labelledby="system-h">
  <h2 class="row__title" id="system-h">The system</h2>
  <div class="row__body">
    <p class="review-text">Every page is built from these parts, measured from the live build. For the page-by-page review: each page below has the twelve-column grid drawn over it in pink, and each kind of text labelled with its size (T2, T4…). An orange label would mark a size that is off the scale.</p>
    <h3 class="review-sub">Type</h3>
    ${table('Type sizes', ['Size', 'Phone', 'Laptop', 'Weight', 'Line height', 'Used for'], typeRows(), [9.5, 4.5, 4.5, 6, 5.5])}
    <h3 class="review-sub">Colour</h3>
    ${table('Colours', ['Colour', 'Value', 'Used for'], [
      ['Paper', '#F4F4F1', 'Every background; the type on the 404 sign and on buttons.'],
      ['Ink', '#161616', 'Text, the logo, the 404 sign.'],
      ['Gray', '#666662', 'Secondary text: roles, dates, captions, credits, the © line.'],
      ['Rule', '#D9D9D4', 'Hairlines only.'],
      ['Green', '#00693E', 'Things you can press: Join links and buttons, links on hover, keyboard focus, selected text.'],
    ], [6, 6])}
    <h3 class="review-sub">Grid</h3>
    <p class="review-text">${gridText()}</p>
    <h3 class="review-sub">Pages</h3>
    <div class="review-pages">
      ${PAGES.map(([id, name]) => html`<div class="review-page">
        <p class="review-page__name">${esc(name)}</p>
        <div class="review-page__shots">
          ${img(`system-${id}-390.jpg`, `${name} on a 390 px phone, with the grid and type sizes marked`, 'Phone, 390 px')}
          ${id === 'menu' ? '' : img(`system-${id}-1440.jpg`, `${name} on a 1440 px laptop, with the grid and type sizes marked`, 'Laptop, 1440 px')}
        </div>
      </div>`)}
    </div>
  </div>
</section>` : ''}

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
    ${img('logo-specimen.png', 'The one logo drawing, as the home title and at the header’s sizes', 'One drawing at every size: the home title, then the header at 124 px (laptops), 108 px (phones) and 124 px on a 2× screen.')}
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
