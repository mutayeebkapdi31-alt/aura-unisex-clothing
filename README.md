# AURA STUDIOS | High Fashion Unisex Streetwear & Luxury Pret

> **Architectural Non-Binary Silhouettes • Heavyweight 460 GSM French Terry • Interactive Streetwear E-Commerce**

Inspired by the editorial elegance of **Zara Studio** and the raw urban streetwear energy of **Bonkers Corner**, **AURA STUDIOS** is a modern, fully animated, interactive e-commerce platform built specifically for genderless/unisex apparel.

---

## ✦ Key Highlights & Interactive Features

### 1. Animated Editorial & Streetwear UX
- **Brutalist Announcement Marquee**: Continuous dual-speed ribbon ticker showcasing drop announcements and flash discounts.
- **Hero Drop Showcase**: High-impact editorial photography, live drop status badge (`DROP 04 LIVE`), and smooth scroll call-to-actions.
- **Dual-Image Hover Flip**: Product cards seamlessly reveal secondary editorial back/detail views on hover.
- **Hover Quick-Size Drawer**: Select unisex sizes (S, M, L, XL, XXL) directly from product cards on hover with 1-click cart addition.
- **Interactive "Find Your Fit" Unisex Advisor**: Algorithmic sizing calculator that factors in height, weight, and aesthetic preference (Tailored Clean vs. Boxy Oversized).
- **Slide-out Cart Drawer with Free Shipping Meter**: Real-time progress bar ($150 target), quantity adjusters, instant promo code validation (`AURA20` for 20% off), and cost breakdown.
- **Wishlist Engine**: Particle heart animation with instant persistence across sessions.
- **Interactive Lookbook**: Zara Studio-inspired full bleed campaign with interactive shop-the-look action links.

### 2. User & Customer Experience
- **Authentication**: Seamless modal sign-in/register with pre-loaded demo credentials.
- **My Account Portal**: Live order history with status tracking indicators (`Processing`, `Shipped`, `Delivered`), item details, tracking IDs, and delivery addresses.
- **Frictionless Checkout**: Multi-step checkout with address validation, simulated payment modes (Credit Card, Apple Pay / G-Pay, Cash on Delivery), and instant order confirmation with tracking IDs.

### 3. Executive Admin Control Panel (`/admin`)
- **Key Metrics Dashboard**: Live calculations for Gross Revenue, Total Orders, Average Order Value (AOV), Active Products, and Processing Orders.
- **Full Catalog CRUD**:
  - Add new unisex pieces with live image preview, GSM fabric weight, fit types, sizes, and pricing.
  - Delete or modify catalog pieces.
- **Order Fulfillment Manager**:
  - View incoming orders and purchased items.
  - Update fulfillment statuses inline (`Pending` → `Processing` → `Shipped` → `Delivered`).
- **Supabase Cloud Sync Monitor**: View status of database connectivity and cloud PostgreSQL replication.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Modern CSS3 (Grid, Flexbox, Custom Variables, Keyframe Animations, Glassmorphism), Vanilla ES6+ JavaScript, Lucide Icons.
- **Backend**: Python 3 (Flask, Flask-CORS, Werkzeug).
- **Database & Cloud**: Supabase (PostgreSQL with Row Level Security) + Resilient Zero-Config SQLite local engine fallback with full schema parity.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have Python 3.8+ installed.

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Application
```bash
python app.py
```
Open your browser and navigate to:
- **Storefront**: [http://127.0.0.1:5000](http://127.0.0.1:5000)
- **Admin Portal**: [http://127.0.0.1:5000/admin](http://127.0.0.1:5000/admin)

---

## 🔑 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin Executive** | `admin@aurastudios.com` | `admin` |
| **Demo Customer** | `user@aurastudios.com` | `user` |

> *Promo Code:* Apply `AURA20` in the cart or checkout to get **20% OFF** your order!

---

## ☁️ Supabase Cloud Setup (Optional)

The website works immediately out of the box using its internal database engine. If you want to connect to a live Supabase project:

1. Create a project on [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run the contents of `schema.sql`.
3. Copy your project URL and API key.
4. Create a `.env` file (or copy `.env.example`) and fill in:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-anon-or-service-key
   ```
5. Restart the server (`python app.py`). AURA STUDIOS will automatically synchronize with your Supabase cloud database!
