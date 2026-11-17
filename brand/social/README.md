# Profile picture and banners

Made by `node tools/social.cjs` from the site's logo, type, colours and tagline. Run it again if the logo or the tagline changes; don't edit the PNGs by hand.

| File | Use it for | Size |
| --- | --- | --- |
| `profile.png` | The profile picture everywhere: GroupMe (group avatar), LinkedIn (Page logo), X, Instagram, YouTube | 1600 × 1600. Every platform shrinks it and most cut a circle out of it; the logo sits well inside that circle |
| `banner-youtube.png` | YouTube channel banner: the logo, the tagline and the site's address | 2560 × 1440. Phones and laptops show only the middle strip, which holds everything, with a margin on each side |
| `banner-linkedin.png` | LinkedIn Page cover: the tagline and the address | 2256 × 382 (twice LinkedIn's 1128 × 191, the same shape). The words clear the Page logo at the lower left |
| `banner-x.png` | X header: the tagline and the address | 1500 × 500. The words clear the profile picture at the lower left |

Why these colours. The profile picture is the logo in paper on Dartmouth green: a coloured disc keeps its shape on white pages and on black ones (a black disc vanishes on a black app, a light one on a white page), and the picture is the one thing on every platform that people press to reach the club, which is what green means on the site. The banners are paper on ink. YouTube's banner carries the logo because the picture sits under it; on LinkedIn and X the picture sits on the banner, so the name is not repeated.

Under about 64 px wide nobody can read the words in the picture; the club's name is printed beside it wherever it is that small.

`alt/` has the other colours: the picture in black or light, and the banners on paper. Don't put a black picture on the ink banners: it disappears.

## Words

- Name: Dartmouth AI Club
- X handle, if free: `@DartmouthAIClub` (15 characters, the most X allows)
- X description (155 characters; X allows 160):
  Dartmouth undergraduates who study and build AI. A paper or a topic every week, and talks with people building AI, from Yann LeCun to Anthropic and Cursor.
- Shorter (118 characters; fits Instagram's 150 and LinkedIn's tagline):
  Dartmouth undergraduates who study and build AI. A paper or a topic every week, and talks with the people building AI.
- Website field: https://aiclub.dartmouth.edu
- Location field: Hanover, NH
