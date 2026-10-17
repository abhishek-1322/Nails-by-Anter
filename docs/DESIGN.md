# Nails by Anter — Design Specification

Open `styleguide.html` to see a live rendering of every component described here.

## Brand tokens (`tailwind.config.js`)

| Token | Value | Use |
|---|---|---|
| `cream` | `#FAF7F2` | Page background |
| `cream-100` | `#F6F0E8` | Alternate section and footer background |
| `blush` / `blush-100` | `#F3E3E0` / `#F7EAE7` | Tinted bands, image placeholders, icon discs |
| `burgundy` | `#6E2638` | Primary brand colour, headings, primary buttons |
| `burgundy-400` | `#A0566A` | Italic accent words in headings |
| `gold` | `#B8945B` | Decorative lines, icons, floral line art |
| `gold-700` | `#8A6A3A` | Small gold text such as eyebrows (passes AA contrast on cream) |
| `ink` / `ink-soft` / `ink-mute` | `#2B1E22` / `#5A4A4E` / `#8A787C` | Body text hierarchy |

Typography: **Playfair Display** for headings, with italics for accent words, and **Montserrat** for body text, eyebrows and buttons. Uppercase labels use wide tracking (0.2–0.32em) for an editorial feel.

Motion: reveal-on-scroll (fade, slide up/left/right, zoom), a slow zoom on the hero image, a 1.06× zoom on image hover, a shine sweep on primary buttons, and arrows that nudge on hover. All motion is turned off under `prefers-reduced-motion`.

## Breakpoints

| Range | Tailwind | Layout |
|---|---|---|
| 320–767px | base / `sm` | Single column, hamburger drawer, sticky bottom Book Now bar, carousels swipe, 2-col masonry |
| 768–1023px | `md` | Two-column sections, 3-col masonry, 2-col service grid |
| 1024px+ | `lg` / `xl` | Full desktop nav, split hero, 3–5 column grids, sticky booking summary |

## Wireframes

### Home
```
┌──────────────────────────────────────────────────────────────┐
│ ♡ Nails by Anter   Home Gallery Services About FAQ Contact [BOOK]│  sticky header
├───────────────────────┬──────────────────────────────────────┤
│ PREMIUM NAIL ART      │                                      │
│ YOUR NAILS,           │        [ hero hand photo ]           │
│ YOUR STYLE.           │                     ★4.9 badge       │
│ text  [BOOK APPT] →   │                                      │
├───────────────────────┴──────────────────────────────────────┤
│              ── OUR SIGNATURE WORK ──                        │
│  [img]   [img]   [img]   [img]  › (scroll-snap, 6 cards)     │
│  ‹  VIEW ALL  ›                                              │
├──────────────────────────────────────────────────────────────┤  blush band
│            ── DESIGNED FOR YOUR MOMENT ──                    │
│   (◎)Manicure (◎)Nail Art (◎)Gel (◎)Extensions (◎)Bridal     │
├──────────────────────┬───────────────────────────────────────┤
│ THE NAIL ART GALLERY │  masonry 4 cols ▢▯▢▯ (lightbox)       │
│ text [VIEW ALL]      │                                       │
├──────────────────────┴───────────────────────────────────────┤
│  ⌒ arch img + inset  │ WHY CHOOSE US  2×2 features           │
├──────────────────────────────────────────────────────────────┤  blush
│ ❦  ‹   “Beautiful nails, beautiful mood.” ★★★★★   ›  ❦       │
├──────────────────────────────────────────────────────────────┤
│        @nailsbya on Instagram   ▢▢▢▢▢▢   [FOLLOW]            │
├──────────────────────────────┬───────────────────────────────┤
│  [ hand photo ]              │ READY TO GLOW? Book… [BOOK] ❦ │  burgundy
├──────────────────────────────┴───────────────────────────────┤
│ logo/social │ Explore │ Visit the studio │ Studio hours      │  footer
└──────────────────────────────────────────────────────────────┘
Mobile: hero image on top with the text below it; sections stack; the carousel swipes;
         a sticky [BOOK NOW] bar appears after 420px of scroll.
```

### Gallery
```
[ page hero: breadcrumb · THE NAIL ART GALLERY · lead ]
( All 28 ) ( French ) ( Chrome ) ( Bridal ) ( Floral ) ( Minimal ) ( Glitter )
                   SHOWING 12 OF 28 DESIGNS
▢ ▯ ▢ ▯   masonry (2/3/4 cols), hover overlay with title + tag, click opens lightbox
▯ ▢ ▯ ▢   lightbox: ‹ image › · caption · counter · Esc / arrow keys / swipe
        [ LOAD MORE + ]   (auto-loads 2 pages on scroll, then shows the button)
[ CTA: Bring the inspiration… [Book this look] [View pricing] ]
```

### Services
```
[ hero: SERVICES & PRICING + trust badges │ arch image + "Most loved" card ]
── THE SERVICE MENU ──
┌card┐ ┌card┐ ┌card┐   image · ⏱ duration · meta · title · description
└────┘ └────┘ └────┘   From ₹price ··························· [BOOK NOW]
(3 cols desktop / 2 tablet / 1 mobile)
[ Packages: Essentials │ ★ Signature (burgundy, raised) │ Bridal Luxe ]
[ Add-ons: intro │ price list (dl) ]
[ CTA band ]
```

### About
```
[ full-bleed hero image + gradient · ARTISTRY AT YOUR FINGERTIPS ]
[ Our story text │ 2 staggered images + "Est. 2018" pill ]
[ arch portrait + "A" monogram │ Meet the artist · quote · team cards ]
[ EXPERIENCE: 8+ │ 5,000+ │ 650+ │ 4.9★  (count-up) ]
[ Certifications: 4 cards ]
[ Studio photos: bento grid (lightbox) ]
[ Values: 4 icon columns · Book CTA ]
```

### Booking
```
[ hero: BOOK AN APPOINTMENT ]
 (1)──(2)──(3)──(4)──(5)──(6)   stepper (labels hidden on mobile, caption shown instead)
┌──────────────── wizard card ────────────────┐ ┌──── summary (sticky) ────┐
│ Step n of 6 · heading                       │ │ [image] Booking summary  │
│ 1 service cards (radio) 2 artist cards      │ │ Service / Artist / Date  │
│ 3 calendar (‹ Month ›, Mon closed, 60 days) │ │ Time / Duration          │
│ 4 slots: Morning / Afternoon / Evening      │ │ Estimated total  ₹       │
│ 5 name · phone · email · notes · consent    │ │ Prefer to call?          │
│ 6 ✓ confirmed · Ref · [Add to calendar]     │ └──────────────────────────┘
│ [‹ Back]                       [Continue →] │
└─────────────────────────────────────────────┘
```

### Contact
```
[ hero: LET'S TALK NAILS ]
[ Call ][ Email ][ Visit ][ WhatsApp ]   (overlapping the hero edge)
[ form: name · phone · email · topic · message · Send │ hours · address · socials · Book ]
[ full-width Google Map ]
```

### FAQ
```
[ hero: QUESTIONS, ANSWERED ]
[ topic nav (sticky on desktop, scrolling chips on mobile) │ accordion groups:
  Nail care · Bridal · Appointments · Policies │ "Still have a question?" card ]
```

## Component system (`src/styles/input.css`)

| Component | Classes | Notes |
|---|---|---|
| Layout | `container-x`, `section`, `section-tint` | max-w-7xl, responsive gutters and padding |
| Typography | `display-1`, `heading-2`, `section-title`, `title-lines`, `eyebrow`, `lead`, `prose-luxe` | Wrap a word in `<em>` inside a heading to get the italic rose accent |
| Buttons | `btn` + `btn-primary` / `btn-outline` / `btn-light` / `btn-cream`, `btn-sm`, `btn-block`, `btn-arrow`, `icon-btn`, `text-link` | 48px minimum height; shine sweep on primary |
| Navigation | `site-header`, `nav-link`, `mobile-menu`, `mobile-nav`, `sticky-cta`, `breadcrumb` | Active state set through `aria-current="page"` |
| Cards | `card`, `collection-card`, `service-card`, `img-zoom`, `badge`, `arch` | Add the `group` class to the card element to enable hover zoom |
| Icons | `icon`, `service-icon`, `feature-icon` | Sprite in `partials/icons.svg` |
| Gallery | `masonry`, `gallery-item`, `gallery-overlay`, `chip`, `lightbox` | `data-lightbox` + `data-caption="Title · Tag"`; wrap a set in `data-lightbox-group` |
| Carousel / slider | `carousel-track` + `data-carousel*`; `slider-*` + `data-slider*` | Scroll-snap carousel; auto-playing testimonials that pause on hover or focus |
| Testimonial | `stars`, `floral-art` | |
| Forms | `form-label`, `form-input`, `form-error`, `form-check`, `alert-success`, `form[data-validate]` | Error text goes in `#<id>-error`; custom messages via `data-msg-required` and `data-msg-pattern` |
| Accordion | `accordion` > `details` > `summary` + `acc-icon` + `acc-body` | Native and keyboard accessible |
| Booking | `stepper`, `step`, `option-card`, `option-check`, `cal-grid`, `cal-day`, `slot`, `summary-row` | |
| Stats | `stat-num`, `stat-label`, `data-count`, `data-suffix` | Count up on scroll |
| Motion | `reveal`, `reveal-fade` / `-zoom` / `-left` / `-right`, `style="--delay:120ms"` | Only active when JavaScript is running (`.js` class on `<html>`) |
