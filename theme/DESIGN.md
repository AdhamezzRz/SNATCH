# SNATCH · Design contract ("One of One")

## Brand overview
SNATCH (SnatchTheFit) sells women's handbags from Cairo, most in several colourways, at about EGP 1,500–2,700. The buyer is confident, style-literate and shops on her phone. The site should feel like a fashion house's own world: considered, a little bold, unmistakably SNATCH.

## Design thesis
**Everything opens in a Λ.** The crossbar-less A of the SNATCH logo is the system's single shape: windows, menus, page changes and reveals all open through it.

## Colors
| Name | Value | Token | Role |
|---|---|---|---|
| Paper | `#FAF9F7` | `--paper` | Page background |
| Stone | `#EFECE8` | `--stone` | Behind product photos (photos multiply into it) |
| Ink | `#121010` | `--ink` | Text, primary buttons, logo |
| Muted | `#69635E` | `--muted` | Secondary text (5.6:1 on paper) |
| Line | `#E4E0DB` | `--line` | Hairlines |
| Wine | `#4A0F1D` | `--wine` | Brand colour: hero ground, menu, footer, buy buttons |

## Typography
| Role | Family | Size | Line height | Tracking |
|---|---|---|---|---|
| Display (hero, titles, menu, product name) | Marcellus 400 (flared, echoes the logo) | 40–236px fluid | 0.9–1.05 | -0.02 to -0.03em |
| Body / UI | Instrument Sans 400–600 | 13–17px | 1.45–1.55 | 0 |
| Labels | Instrument Sans 600, uppercase | 11–12px | 1.3 | 0.12–0.14em |
Fallbacks: Marcellus → Optima, Candara, serif. Instrument Sans → Helvetica Neue, Arial.

## Spacing and composition
- Gutter `clamp(18px, 3vw, 48px)`. Section rhythm `clamp(80px, 11vw, 168px)`.
- Square corners, except pills for filter chips, round arrows, swatches, and the mobile sheet top.
- No drop shadows. Depth comes from colour blocks, blur on sticky bars, and image layering.
- Product photos sit on Stone at 4:5.

## Components
- **Header:** fixed, transparent and light over the hero and footer, blurred paper elsewhere. Hides when scrolling down. Menu button left with the first three menu links, logo centred, then search, account and "Bag (n)".
- **Menu:** full-screen wine, unfolds as a Λ. Giant Marcellus links rise in. On desktop, a product preview changes as you hover a link.
- **Buttons:** 52–60px, uppercase 12px label. On hover a fill wipes up from the bottom (ink → wine, wine → ink, paper → ink).
- **Product card:** a 4:5 stone frame. On hover the second photo wipes up and an "Add to bag" bar slides in (a round + on touch). Colour dots swap photo, price and link.
- **Cart:** a right drawer on desktop and a bottom sheet with a grip on mobile. Added items fly into the bag icon.
- **Product page:** desktop shows a stacked gallery with a sticky info column. Mobile has a full-bleed swipe gallery with a counter, colour swatches, a wine add button with the price, a sticky buy bar and a zoom viewer.
- **Footer:** wine ground, a newsletter, menus, and a giant logo that rises letter by letter.

## Motion philosophy
- Signature moves: the intro logo build, the hero Λ window opening on scroll, the menu Λ, the Λ page transition, and the colour story driven by scroll.
- Curves: `--ease` (0.16,1,0.3,1) for UI, `--ease-cine` (0.76,0,0.24,1) for wipes and masks, `--ease-drawer` for sheets.
- Words rise from masks once. Images reveal bottom-up once.
- Under `prefers-reduced-motion` everything is static: no intro, the hero shows open, there is no smooth scroll, and the colour story is tap-driven.

## Dos and don'ts
- **Do** use the real SNATCH logo snippet (`logo-snatch`). Never redraw it.
- **Do** keep price and "Add to bag" visible on every product surface.
- **Do** use only live products without third-party brand logos in editorial slots.
- **Don't** add new accent colours, gradients, glows or decorative shapes.
- **Don't** add eyebrow text above every heading.
- **Don't** use more than one display face.
