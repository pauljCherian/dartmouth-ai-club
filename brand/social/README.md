# Profile picture and banners

Made by `node tools/social.cjs` from the site's logo, type, colours and tagline. Run it again if the logo or the tagline changes; don't edit the PNGs by hand.

They look like the website: its off-white ground, the logo and the words in ink, and nothing else (no address, no decoration).

| File | Use it for | Size |
| --- | --- | --- |
| `profile.png` | The profile picture everywhere: GroupMe (group avatar), LinkedIn (Page logo), X, Instagram, YouTube. The logo as it sits in the site's header | 1600 × 1600. Every platform shrinks it and most cut a circle out of it; the logo sits well inside that circle |
| `banner-youtube.png` | YouTube channel banner: the logo with the tagline beside it | 2560 × 1440. Phones and laptops show only the middle strip, which holds everything, with a margin on each side |
| `banner-linkedin.png` | LinkedIn Page cover: the tagline | 2256 × 382 (twice LinkedIn's 1128 × 191, the same shape). The words clear the Page logo at the lower left |
| `banner-x.png` | X header: the tagline | 1500 × 500. The words clear the profile picture at the lower left |

On LinkedIn and X the profile picture sits on the banner, so the banner holds the tagline alone: the picture and the banner together make the same pair as YouTube's banner, the logo and the tagline.

Under about 64 px wide nobody can read the words in the picture; the club's name is printed beside it wherever it is that small. On a white page the picture's off-white disc is faint, as the site's own ground would be.

`alt/` has other colours, for a picture that stands out more on a white page: the logo on black or on Dartmouth green, and the banners on ink. Don't put the black picture on the ink banners: it disappears.

## Words

- Name: Dartmouth AI Club
- X handle, if free: `@DartmouthAIClub` (15 characters, the most X allows)
- X description (155 characters; X allows 160):
  Dartmouth undergraduates who study and build AI. A paper or a topic every week, and talks with people building AI, from Yann LeCun to Anthropic and Cursor.
- Shorter (118 characters; fits Instagram's 150 and LinkedIn's tagline):
  Dartmouth undergraduates who study and build AI. A paper or a topic every week, and talks with the people building AI.
- Website field: https://aiclub.dartmouth.edu
- Location field: Hanover, NH
