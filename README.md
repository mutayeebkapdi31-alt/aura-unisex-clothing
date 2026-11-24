# AURA STUDIOS

Simple, sober unisex clothing store (Flask + SQLite, optional Supabase). Mobile-first and tested at Android phone width (393 px) as well as tablet and desktop.

## What's in the store
- Shop: hoodies, sweatshirts, T-shirts, shirts, pants. Category chips, search and sorting work instantly.
- Product-only imagery: every product uses a clean generated garment illustration (front + back). No people, no external image hosts, nothing to break offline.
- Bag drawer with free-shipping meter and promo codes, saved items, quick-add size picker, size guide.
- Checkout (demo payment only), customer accounts with order history, admin dashboard (products + orders).

## Run it
```bash
pip install -r requirements.txt
python app.py
```
Open http://127.0.0.1:5000. To view it on an Android phone, connect the phone to the same Wi-Fi and open `http://<your-computer-ip>:5000`.

## Demo logins
| Role | Email | Password |
| --- | --- | --- |
| Admin (`/admin`) | admin@aurastudios.com | admin |
| Customer | user@aurastudios.com | user |

Promo codes: `AURA20` (20% off over $50), `BONKERS10` (10% off over $30), `VIPDROP` (25% off over $100). Free shipping over $150, otherwise $15.

**Before going live:** change the demo passwords, set `FLASK_SECRET_KEY` in `.env`, and run behind gunicorn (`gunicorn app:app`).

## Tests
```bash
python test_app.py
```

## Supabase (optional)
Run `schema.sql` in your Supabase SQL editor, then put `SUPABASE_URL` and `SUPABASE_KEY` in `.env`. Without them the app uses the local SQLite database automatically.

## Adding products
Admin > Products > Add product. Pick a category and colour and a matching product illustration is generated automatically, or paste your own image URL.

## Motion & interaction layer
All animation lives in `static/css/animations.css` and `static/js/animations.js` (no libraries). Remove the matching `<link>`/`<script>` tags in `templates/base.html` to turn it off. It respects `prefers-reduced-motion`.
Highlights: intro curtain (first visit per session), word-by-word hero headline, typewriter word, floating mouse-parallax hero art, scrolling ticker and marquee, scroll-reveal with stagger, count-up stats, 3D tilt + glare on product cards, magnetic buttons, ripple clicks, cursor glow, auto-hiding blurred header, scroll progress bar, back-to-top, animated filtering/sorting, heart burst, fly-to-bag, animated bag totals, confetti at free shipping, product-page hover zoom, page fade transitions.

## Brown glass theme + characters
`static/css/glass.css` is the brown / off-white frosted-glass theme (change the colour variables at the top). `static/css/world.css` + `static/js/world.js` add:
- **Buddies**: five original animated characters (eyes follow the cursor, blink, wave, hop and talk when tapped). They live in the hero, the footer, the sidebar, the "Shop by vibe" tiles and down the page background (they dodge text automatically). Edit their lines in `LINES` and looks in `SPECS` inside `world.js`.
- **Floating ribbons** (fixed, drift and lean as you scroll) and **crossing strips** under the hero.
- **Header** (floating glass pill with search), **slide-in sidebar**, **mobile dock**, **Trending slider**, and a full **footer** (newsletter, links, trust row).
Social icons in the footer use `href="#"`: put your real profile links in `templates/base.html`.
Everything respects `prefers-reduced-motion`. Remove the `world.css` / `world.js` tags in `base.html` to switch the layer off.
