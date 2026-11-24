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
