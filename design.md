# East On Division — Design Reference

## Brand

### Logo Assets
- `public/images/logo.jpg` — Full logo art (guitarist silhouette + script wordmark + arrow icon)
- `public/images/arrow.png` — Arrow icon standalone (4-stripe: teal / yellow / orange / red)

The arrow is used as the nav logomark. The full logo is used in the hero and footer.

### Color Palette

```css
:root {
  --teal:     #68c9ce;   /* primary accent, links, borders, teal stripe */
  --yellow:   #ffce18;   /* secondary accent, dates, CTAs, yellow stripe */
  --orange:   #e58924;   /* tertiary, release types, track numbers, orange stripe */
  --red:      #cf2927;   /* used sparingly, red stripe */
  --dark:     #1e1e1e;   /* section backgrounds */
  --darker:   #141414;   /* page background */
  --charcoal: #2a2a2a;   /* card/cell backgrounds */
  --cream:    #f0e8d0;   /* primary text */
  --muted:    #a09080;   /* secondary text, labels, nav links */
}
```

### Typography

```css
/* Display / headings */
font-family: 'Bebas Neue', sans-serif;
/* used for: section titles, member names, dates, stat numbers, setlist labels */

/* Body / prose */
font-family: 'Playfair Display', serif;
/* used for: bio text, EPK body, contact body, hero tagline (italic), track titles */

/* Mono / UI */
font-family: 'DM Mono', monospace;
/* used for: nav links, section eyebrows, track numbers, form fields, buttons, body default */
```

Google Fonts import:
```html
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

### Texture

Film grain overlay on `body::after`:
```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,..."); /* SVG feTurbulence filter */
}
```

---

## Layout

- Max content width: `1120px`, centered, `margin: 0 auto`
- Section padding: `100px 48px` desktop / `70px 20px` mobile (800px breakpoint)
- Alternating section backgrounds:
  - Default: `#141414`
  - Alt: `rgba(255,255,255,0.02)` with `border-top/bottom: 1px solid rgba(91,200,192,0.1)`

---

## Components

### Nav

```
position: fixed | z-index: 200
background: rgba(20,20,20,0.92) | backdrop-filter: blur(8px)
border-bottom: 1px solid rgba(91,200,192,0.2)
padding: 14px 48px
layout: space-between (logo left, links right)
```

- Logo: arrow.png at `height: 38px`
- Links: `0.68rem` DM Mono, `0.25em` letter-spacing, uppercase, `--muted`, hover `--teal`
- Hides on scroll down past 100px, shows on scroll up (see JS section)

### Section Header Pattern

```html
<p class="section-eye">Eyebrow Label</p>
<div class="section-rule"></div>
<h2 class="section-title">Title</h2>
```

- `.section-eye`: `0.62rem` DM Mono, `0.4em` letter-spacing, uppercase, `--teal`
- `.section-rule`: `48px` wide, `2px` tall, gradient `--teal → --yellow`
- `.section-title`: Bebas Neue, `clamp(2.8rem, 5vw, 4.5rem)`, `--cream`

### Buttons

```css
.btn {
  font: 0.68rem/1 'DM Mono'; letter-spacing: 0.22em; text-transform: uppercase;
  padding: 13px 30px; border: 1.5px solid var(--teal); color: var(--teal);
  text-decoration: none; transition: background 0.2s, color 0.2s;
}
.btn:hover          { background: var(--teal); color: var(--darker); }
.btn-fill           { background: var(--teal); color: var(--darker); }
.btn-fill:hover     { background: var(--yellow); border-color: var(--yellow); }
.btn-yellow         { border-color: var(--yellow); color: var(--yellow); }
.btn-yellow:hover   { background: var(--yellow); color: var(--darker); }
```

### Show Row

```
grid-template-columns: 90px 1fr auto
gap: 28px | padding: 22px 0
border-bottom: 1px solid rgba(255,255,255,0.05)
```

- Date block: day in Bebas Neue `2.6rem` `--yellow`, month in `0.6rem` DM Mono `--muted`
- Venue: Bebas Neue `1.4rem` `--cream`
- Location: `0.7rem` DM Mono, `0.12em` letter-spacing, `--muted`
- Ticket button: `.btn` — only render if `ticket_uri` present in data

**Dynamic render target:** `.shows-list` div. Clear contents and replace with fetched events. Empty state: single centered paragraph in Playfair italic, `--muted`.

### Setlist

Two-column grid (`1fr 1fr`, collapses to `1fr` at 800px).

Each column:
```html
<div class="setlist-block">
  <div class="setlist-label">Set One</div>
  <div class="setlist-count">17 tracks</div>
  <ul class="setlist-track-list">
    <li>
      <span class="trk-num">01</span>
      <span class="trk-title">Pride and Joy</span>
    </li>
    ...
  </ul>
</div>
```

- `.setlist-label`: Bebas Neue `1.1rem`, `--yellow`, with `::after` pseudo-element extending a gradient rule to the right
- `.setlist-count`: `0.6rem` DM Mono, `--muted`
- Track `li`: flex, `gap: 14px`, `padding: 11px 0`, `border-bottom: 1px solid rgba(255,255,255,0.04)`
- Hover: `background: rgba(91,200,192,0.04)`, `padding-left: 8px` (transition `0.15s`)
- `.trk-num`: `0.6rem`, `--orange`, `opacity: 0.7`, `min-width: 24px`, zero-padded (`01`, `02`...)
- `.trk-title`: Playfair Display `0.95rem`, `--cream`

Bottom of setlist section: `.setlist-total` — flex row with label, big number (`--yellow` Bebas Neue `2rem`), and Book the Band CTA (`.btn-yellow`, links to `#contact`).

### Release Card

```css
border: 1px solid rgba(232,192,64,0.2);
padding: 22px;
background: rgba(232,192,64,0.03);
transition: border-color 0.2s, background 0.2s;
```
Hover: border `--yellow`, bg `rgba(232,192,64,0.07)`

- Release type: `0.58rem` DM Mono, `0.35em` letter-spacing, `--orange`
- Title: Bebas Neue `1.5rem`, `--cream`
- Year: `0.65rem` DM Mono, `--muted`
- Stream links: `0.6rem` DM Mono, `--teal`, border-bottom underline style, hover `--yellow`

### Photo Strip

```css
display: flex; gap: 4px;
border-top/bottom: 2px solid rgba(91,200,192,0.15);
```

Each image:
```css
flex: 1; min-width: 0; height: 260px;
object-fit: cover;
filter: grayscale(30%) contrast(1.08);
transition: flex 0.4s ease, filter 0.3s;
```
Hover: `flex: 2.5`, `filter: grayscale(0%) contrast(1.1)`

**Dynamic render target:** `.photo-strip` div. Replace `<img>` tags with fetched photos. Use largest image from each photo's `images` array. Limit to 5. Keep hardcoded imgs as fallback if fetch returns empty.

### EPK Stats Grid

```
display: grid; grid-template-columns: 1fr 1fr; gap: 2px;
```
Each cell: `border: 1px solid rgba(91,200,192,0.12)`, `bg: rgba(91,200,192,0.03)`, `padding: 22px 18px`
- Number: Bebas Neue `2.6rem`, `--teal`
- Label: `0.6rem` DM Mono, `0.22em` letter-spacing, `--muted`

Current values: `3` Members / `39` Song Repertoire / `2` Full Sets / `IN` Home Base

### Merch CTA Block

Flex row: `arrow.png (height: 64px)` | text block (lead + sub) | `.btn-fill`
```
border: 1px solid rgba(91,200,192,0.25)
background: rgba(91,200,192,0.03)
padding: 36px 40px; gap: 32px
```
Collapses to column at 800px.

### About Grid

```
grid-template-columns: 1fr 1.5fr; gap: 72px
```

Photo side: `2x2` grid with first image spanning full width (`aspect-ratio: 16/9`), two square images below. All grayscale filtered, color on hover.

Text side: prose in Playfair Display `1.05rem`, `--muted`, `line-height: 1.9`, then member list.

### Member List

```
display: flex; flex-direction: column;
```
Each row: `justify-content: space-between`, `padding: 14px 0`, `border-bottom: 1px solid rgba(255,255,255,0.06)`
- Name: Bebas Neue `1.3rem`, `--cream`
- Role: `0.68rem` DM Mono, `0.15em` letter-spacing, uppercase, `--teal`, `opacity: 0.8`

---

## Facebook Data Shapes

### events.json item
```json
{
  "id": "123456789",
  "name": "East On Division at The Heorot",
  "start_time": "2025-06-14T20:00:00-0500",
  "place": {
    "name": "The Heorot",
    "location": { "city": "Muncie", "state": "IN" }
  },
  "ticket_uri": "https://...",
  "cover": { "source": "https://..." },
  "description": "..."
}
```

Parse `start_time` with `new Date()`. Format day as `getDate()`, month as `toLocaleString('en-US', { month: 'short' })` + year.

### photos.json item
```json
{
  "id": "987654321",
  "images": [
    { "source": "https://...", "width": 960, "height": 720 },
    { "source": "https://...", "width": 720, "height": 540 },
    { "source": "https://...", "width": 130, "height": 130 }
  ],
  "created_time": "2025-03-01T18:00:00+0000",
  "name": "Optional caption"
}
```

Use `images[0]` (largest). Set as `img.src`. Set `alt` from `name` or empty string.

---

## JavaScript

### Scroll Reveal

```js
const obs = new IntersectionObserver(
  es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.08 }
);
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
```

```css
.reveal         { opacity: 0; transform: translateY(20px); transition: opacity 0.7s ease, transform 0.7s ease; }
.reveal.visible { opacity: 1; transform: translateY(0); }
```

### Nav Hide/Show

```js
let last = 0;
const nav = document.getElementById('main-nav');
window.addEventListener('scroll', () => {
  const cur = window.scrollY;
  nav.style.transform = cur > last && cur > 100 ? 'translateY(-100%)' : 'translateY(0)';
  nav.style.transition = 'transform 0.3s ease';
  last = cur;
});
```

### Content Load

```js
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [eventsRes, photosRes] = await Promise.all([
      fetch('/data/events.json'),
      fetch('/data/photos.json')
    ]);
    const events = await eventsRes.json();
    const photos = await photosRes.json();
    if (events.length) renderShows(events);
    if (photos.length) renderPhotos(photos);
  } catch (e) {
    console.warn('Content load failed, using fallbacks');
  }
});
```

---

## Responsive Breakpoint (max-width: 800px)

- Nav padding: `12px 20px`
- Nav link gap: `18px`
- Section padding: `70px 20px`
- `.about-grid`, `.epk-grid`, `.contact-grid`: `grid-template-columns: 1fr`
- `.setlist-cols`: `grid-template-columns: 1fr`
- `.show-row`: `grid-template-columns: 70px 1fr` (ticket button hidden)
- `.photo-strip img`: `height: 160px`
- `.merch-cta-block`: `flex-direction: column; text-align: center`
- `.form-row`: `grid-template-columns: 1fr`

---

## Hero Animation

```css
@keyframes heroIn {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* applied to .hero-content */
animation: heroIn 1.4s cubic-bezier(0.16,1,0.3,1) both;
```

Scroll hint bobble:
```css
@keyframes bobble {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50%       { transform: translateX(-50%) translateY(6px); }
}
```
