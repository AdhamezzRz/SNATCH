# SNATCH · Design contract

## Brand overview
SNATCH (SnatchTheFit) sells women's handbags from Cairo: totes, shoulder bags, crossbodies, clutches and satchels, most in several colourways, at about EGP 1,500–2,700. The buyer is a confident, style-literate woman shopping on her phone. The site should feel calm, clear and expensive, like walking into a bright, well-edited boutique where it's easy to find the bag and buy it.

## Design thesis
**Gallery white: the bag is the only thing that speaks.** Every surface steps back so real product photography, colour and price read instantly.

## Colors
| Name | Value | Token | Role |
|---|---|---|---|
| Paper | `#FFFFFF` | `--paper` → `--surface` | Page background |
| Stage | `#F4F3F1` | `--stage` | Behind product photos (photos multiply into it) |
| Ink | `#111111` | `--ink` → `--on-surface` | Text, primary buttons, logo |
| Graphite | `#6A6763` | `--graphite` → `--on-surface-muted` | Secondary text (5.6:1 on white) |
| Line | `#E7E4E0` | `--line` | Hairlines, borders |
| Wine | `#5E1724` | `--wine` → `--accent` | Sale prices, cart badge, focus. Punctuation only |

## Typography
One family, Instrument Sans (self-hosted variable), plus the SNATCH logo as the only display mark.
| Role | Weight | Size | Line height | Tracking |
|---|---|---|---|---|
| Display (hero, page titles) | 500 | clamp(36px, 5vw, 72px) | 1.0 | -0.03em |
| H2 | 500 | clamp(26px, 2.6vw, 40px) | 1.1 | -0.02em |
| Card title | 500 | 14–15px | 1.3 | 0 |
| Body | 400 | 15–16px | 1.55 | 0 |
| Label | 500 | 11–12px uppercase | 1.2 | 0.08em |
Fallback: Helvetica Neue, Arial, sans-serif. Sentence case everywhere except small labels.

## Spacing and composition
- Gutter `clamp(16px, 2.5vw, 40px)`. Section rhythm `clamp(56px, 8vw, 120px)`.
- Radius 0. No shadows. Hairlines (`--line`) separate regions.
- Product grid: 4 columns desktop, 2 on mobile. Shoppers can switch density.
- Product photos sit on `--stage` at 4:5 with `mix-blend-mode: multiply`, so every studio shot sits on the same ground.

## Components
- **Header:** white, sticky, hairline bottom. Logo left, primary navigation centre on desktop, search / account / bag right. Mobile: menu button opens a left drawer.
- **Primary button:** ink fill, white text, 48px, 12px uppercase label. Hover darkens and the arrow nudges. Press scales to 0.97.
- **Secondary button:** 1px ink border, transparent.
- **Product card:** 4:5 stage, second photo on hover, colour dots that swap photo, colour and price in place, and a quick-add button. Title, colour and price in three quiet lines.
- **Colourway grouping:** "Style - Colour" products fold into one card per style (theme setting).
- **Cart:** right drawer (`<dialog>`), server-rendered lines, steppers, subtotal and checkout.
- **Inputs:** 48px, 1px line border, ink border on focus.
- **Footer:** newsletter, menus, payment icons and the logo.

## Motion philosophy
Quiet and quick. Hover image crossfades (300ms), the split hero widens toward the side you hover, drawers slide (340ms in, 200ms out), new content fades up 12px once. Cross-page view transitions morph the product photo from card to product page. No smooth-scroll hijacking, no pinning, no autoplay. Everything is disabled under `prefers-reduced-motion`.

## Dos and don'ts
- **Do** lead with real product photography. Use campaign images only in editorial slots, and only for live products.
- **Do** keep price and "Add to bag" visible without hunting.
- **Don't** add a second typeface, gradients, shadows, rounded pills, decorative badges or eyebrow text.
- **Don't** feature products that carry another fashion house's logo in editorial slots.
- **Don't** redraw or restyle the SNATCH logo. Use `snippets/logo-snatch.liquid`.
