# SNATCH — After Hours · Design contract

## Brand overview
SNATCH (SnatchTheFit) sells women's handbags from Cairo: totes, shoulder bags, crossbodies, clutches and satchels, most in several colourways, at about EGP 1,500–2,700. The buyer is a confident, style-literate woman who wants a bag people ask about. The site should make her feel like she's walked into a private viewing after closing time. It should feel exclusive and a little dangerous, and she should leave with something.

## Design thesis
**One light, everything else is shadow.** Every product is staged as if it's the only thing lit in a dark vault, and the visitor's cursor is the flashlight.

## Colors
| Name | Value | Token | Role |
|---|---|---|---|
| Void | `#0B0908` | `--void` → `--surface` | Page background, warm near-black |
| Ink | `#161110` | `--ink` → `--surface-raised` | Drawers, panels, raised surfaces |
| Bone | `#EFE8DE` | `--bone` → `--on-surface` | Primary text, primary button fill |
| Ash | `#A39A90` | `--ash` → `--on-surface-muted` | Secondary text (7:1 on Void) |
| Oxblood | `#7A1626` | `--ox` → `--accent` | Button hover fill, selection, menu glow. Used as a fill only, never as small text |
| Brass | `#B89A6A` | `--brass` → `--detail` | Hairline accents, lot numbers, focus rings |
| Lightbox | `#ECE7E1` | `--lightbox` | The lit stage behind every product photo |

All primitives are merchant settings (Theme settings › Colors). Components use only the semantic tokens.

## Typography
| Role | Family | Weight | Size | Line height | Tracking |
|---|---|---|---|---|---|
| Mega (hero, page titles) | Bodoni Moda (self-hosted variable, opsz 96) | 400 | clamp(54px, 12.5vw, 232px) | 0.86 | -0.04em |
| Display | Bodoni Moda | 400 | clamp(44px, 7.4vw, 132px) | 0.92 | -0.035em |
| H2 | Bodoni Moda | 400 | clamp(36px, 4.8vw, 80px) | 0.98 | -0.025em |
| H3 / card titles | Bodoni Moda | 400 | 19–36px | 1.06–1.1 | -0.015em |
| Body | Instrument Sans (variable) | 400 | 15–17px | 1.55 | 0 |
| Label (buttons, nav) | Instrument Sans | 500 | 12px, uppercase | 1.2 | 0.16em |
| Meta (lot numbers, SKUs, counters) | JetBrains Mono | 400 | 11px, uppercase | 1.4 | 0.06em |

Fallbacks: Bodoni → Bodoni 72, Didot, Times New Roman, serif. Instrument Sans → Helvetica Neue, Arial, sans-serif. Italic Bodoni is reserved for one accent line per moment (hero line 3, chapter titles, colour names on the product page).

## Spacing and composition
- Gutter: `clamp(16px, 3.2vw, 56px)`. Section rhythm: `clamp(96px, 14vw, 220px)`.
- Radius: 2px on image stages, 0 everywhere else. No shadows. Depth comes from light, grain and blend modes.
- Hairlines (`--hairline` at 14% bone, `--hairline-strong` at 32%) separate regions.
- 12-column editorial grid for features and chapters, with deliberate offsets (the second chapter drops 18vw).
- Product photos are studio shots on white. They sit in a Lightbox with `mix-blend-mode: multiply`, so the white melts into the lit stage.

## Components
- **Primary button**: bone fill, void text, 54px tall, uppercase label. On hover an oxblood fill wipes up from the bottom (420ms, cine ease). Magnetic pull toward the cursor on desktop.
- **Ghost button**: hairline border on a blurred translucent void.
- **Product card**: 3:4 lightbox, hover crossfades to the second photo and scales 1.045, and a soft-light spotlight follows the cursor. Bodoni title, mono colour name, price. Colour dots swap the photo, colour, price and link without leaving the grid.
- **Colourway grouping**: products named "Style - Colour" are merged into one card per style (theme setting).
- **Header**: transparent over the home hero, solid blurred void after scrolling. Hides on scroll down. SNATCH stroke wordmark centred.
- **Menu**: full-screen void with an oxblood glow, giant Bodoni links, a live Cairo clock.
- **Cart drawer**: native `<dialog>` from the right, server-rendered lines (section rendering), steppers and checkout.
- **Inputs**: transparent, hairline border, bone border on focus.
- **Footer**: newsletter, menus, and a full-width SNATCH wordmark that draws itself in.

## Motion philosophy
- One curtain per visit: the wordmark draws in, a 000→100 counter runs, and the panels part like vault doors.
- The spotlight is the signature. It drifts slowly on its own and follows the cursor when you move.
- Scroll is narrative: manifesto words light up as you read, the lots section turns vertical scroll into a sideways walk (GSAP ScrollTrigger pin), and images are revealed with a clip-path "aperture" plus parallax.
- Curves: `--ease-ui` (0.16,1,0.3,1) for UI, `--ease-drawer` (0.32,0.72,0,1) for surfaces, `--ease-cine` (0.76,0,0.24,1) for curtains and wipes. Exits are faster than entrances.
- `prefers-reduced-motion`: no curtain, no smooth scroll, no pins, no autoplay, and everything is revealed immediately.

## Dos and don'ts
- **Do** keep price, name and "Add to bag" readable at all times. Theatre never hides the sale.
- **Do** use real product photography on the lightbox, and campaign imagery only in editorial slots.
- **Do** keep oxblood as a fill or glow. For text accents use brass or bone.
- **Don't** add another accent colour, gradients on buttons, rounded pills or drop shadows.
- **Don't** feature products that carry another fashion house's logo in campaign imagery.
- **Don't** add eyebrow text above every heading. Labels appear only where they carry information (lot, colourway, place and time).
