"""
AURA STUDIOS - Supabase & Data Persistence Engine
Seamlessly connects to Supabase when credentials exist in .env,
and provides a resilient, zero-config local SQLite/JSON fallback with identical schema.
"""

import os
import json
import sqlite3
import datetime
from typing import Dict, Any, List, Optional
from werkzeug.security import generate_password_hash, check_password_hash
from product_art import art_images, kind_for_category, PALETTE

# Try loading dotenv if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase_client = None
if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL.startswith("http"):
    try:
        from supabase import create_client, Client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(" Connected to Supabase Cloud Instance")
    except Exception as e:
        print(f"⚠️ Supabase connection failed: {e}. Falling back to Local SQLite Engine.")
        supabase_client = None
else:
    print("ℹ️ SUPABASE_URL / SUPABASE_KEY not configured. Running with embedded SQLite database.")


DB_PATH = os.path.join(os.path.dirname(__file__), "data", "aura_store.db")

# Dedicated curated unisex products for Shirts, T-Shirts, Pants, Hoodies, and Sweatshirts
DEFAULT_PRODUCTS = [
    # --- HOODIES ---
    {
        "id": "prod-001",
        "name": "Heavyweight Box Hoodie - Acid Wash Charcoal",
        "slug": "heavyweight-box-hoodie-acid-charcoal",
        "category": "Hoodies",
        "price": 110.00,
        "compare_at_price": 145.00,
        "description": "Engineered with 460 GSM luxury French Terry. Features an exaggerated boxy unisex cut, dropped shoulders, double-layered hood without drawstrings, and deep ribbed cuffs. Acid washed by hand for unique distressed character.",
        "fit_type": "Oversized Boxy",
        "fabric_weight": "460 GSM Ultra-Heavy French Terry",
        "gender": "Unisex",
        "badge": "DROP 04",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "inventory": {"S": 12, "M": 24, "L": 38, "XL": 19, "XXL": 9},
        "images": art_images("hoodie", "3a3b3e", ""),
        "is_featured": True,
        "is_new_drop": True,
        "rating": 4.9,
        "reviews_count": 84
    },
    {
        "id": "prod-012",
        "name": "Two-Way Hardware Zip Hoodie - Pitch Black",
        "slug": "two-way-hardware-zip-hoodie-black",
        "category": "Hoodies",
        "price": 120.00,
        "compare_at_price": 155.00,
        "description": "460 GSM double-faced combed cotton with custom matte-black two-way YKK tactical zippers. Seamless shoulders, darted hood, and concealed side-seam welt pockets for minimalist urban silhouette.",
        "fit_type": "Boxy Drop Shoulder",
        "fabric_weight": "460 GSM Double-Faced Terry",
        "gender": "Unisex",
        "badge": "BESTSELLER",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "inventory": {"S": 14, "M": 28, "L": 35, "XL": 18, "XXL": 8},
        "images": art_images("hoodie", "1b1b1d", "zip"),
        "is_featured": True,
        "is_new_drop": True,
        "rating": 4.8,
        "reviews_count": 52
    },

    # --- SWEATSHIRTS ---
    {
        "id": "prod-013",
        "name": "Drop Shoulder Box Sweatshirt - Faded Olive",
        "slug": "drop-shoulder-box-sweatshirt-olive",
        "category": "Sweatshirts",
        "price": 95.00,
        "compare_at_price": 125.00,
        "description": "420 GSM loopback cotton fleece. Cut wide through the chest with an exaggerated drop shoulder and cropped hemline that sits cleanly at the waist. Hand-distressed ribbing at neck and cuffs.",
        "fit_type": "Exaggerated Drop Shoulder",
        "fabric_weight": "420 GSM Brushed Fleece",
        "gender": "Unisex",
        "badge": "DROP 04",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "inventory": {"S": 16, "M": 30, "L": 42, "XL": 22, "XXL": 10},
        "images": art_images("sweatshirt", "6b6f4e", ""),
        "is_featured": True,
        "is_new_drop": True,
        "rating": 4.9,
        "reviews_count": 47
    },
    {
        "id": "prod-014",
        "name": "Studio Arch Crewneck Sweatshirt - Bone Ecru",
        "slug": "studio-arch-crewneck-sweatshirt-ecru",
        "category": "Sweatshirts",
        "price": 90.00,
        "compare_at_price": 120.00,
        "description": "Premium 400 GSM unbrushed diagonal loop French Terry. Finished with tonal puff embroidery across the back and understated minimalist collar ribbing.",
        "fit_type": "Relaxed Streetwear",
        "fabric_weight": "400 GSM Loopback Cotton",
        "gender": "Unisex",
        "badge": "EXCLUSIVE",
        "sizes": ["S", "M", "L", "XL"],
        "inventory": {"S": 18, "M": 35, "L": 38, "XL": 14},
        "images": art_images("sweatshirt", "e4dccb", ""),
        "is_featured": False,
        "is_new_drop": False,
        "rating": 4.8,
        "reviews_count": 39
    },

    # --- T-SHIRTS ---
    {
        "id": "prod-003",
        "name": "Distressed Vintage Graphic Tee - Faded Moss",
        "slug": "distressed-vintage-graphic-tee-moss",
        "category": "T-Shirts",
        "price": 65.00,
        "compare_at_price": 85.00,
        "description": "Crafted from 280 GSM combed single jersey cotton. Custom enzyme wash treatment gives it a 90s vintage broken-in hand feel. Subtle distress abrasions at collar, cuffs, and hem. Bonkers street typography.",
        "fit_type": "Oversized Street",
        "fabric_weight": "280 GSM Combed Ring-Spun Cotton",
        "gender": "Unisex",
        "badge": "LIMITED",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "inventory": {"S": 20, "M": 45, "L": 50, "XL": 30, "XXL": 12},
        "images": art_images("tee", "7d8466", ""),
        "is_featured": True,
        "is_new_drop": True,
        "rating": 5.0,
        "reviews_count": 118
    },
    {
        "id": "prod-008",
        "name": "Heavy Box Minimalist Tee - Deep Obsidian",
        "slug": "heavy-box-minimalist-tee-obsidian",
        "category": "T-Shirts",
        "price": 60.00,
        "compare_at_price": 80.00,
        "description": "300 GSM ultra-dense single jersey cotton. Features a high ribbed mock neckline, wide boxy sleeves, and clean dropped shoulder seam. An everyday unisex essential.",
        "fit_type": "Boxy Architectural",
        "fabric_weight": "300 GSM Heavy Single Jersey",
        "gender": "Unisex",
        "badge": "ESSENTIAL",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "inventory": {"S": 25, "M": 50, "L": 55, "XL": 35, "XXL": 15},
        "images": art_images("tee", "1b1b1d", ""),
        "is_featured": True,
        "is_new_drop": False,
        "rating": 4.8,
        "reviews_count": 76
    },

    # --- SHIRTS ---
    {
        "id": "prod-009",
        "name": "Boxy Camp Collar Poplin Shirt - Crisp Chalk",
        "slug": "boxy-camp-collar-poplin-shirt-chalk",
        "category": "Shirts",
        "price": 85.00,
        "compare_at_price": 115.00,
        "description": "Zara-inspired luxury unisex button-down shirt. Woven from 220 GSM high-density Italian poplin with a relaxed Cuban camp collar, mother-of-pearl buttons, and a structured square hem.",
        "fit_type": "Boxy Dropped Shoulder",
        "fabric_weight": "220 GSM Italian Poplin Cotton",
        "gender": "Unisex",
        "badge": "EDITORIAL",
        "sizes": ["S", "M", "L", "XL"],
        "inventory": {"S": 15, "M": 30, "L": 35, "XL": 18},
        "images": art_images("shirt", "f1efe9", ""),
        "is_featured": True,
        "is_new_drop": True,
        "rating": 4.9,
        "reviews_count": 64
    },
    {
        "id": "prod-010",
        "name": "Raw Edge Utility Overshirt - Distressed Mineral",
        "slug": "raw-edge-utility-overshirt-mineral",
        "category": "Shirts",
        "price": 110.00,
        "compare_at_price": 145.00,
        "description": "Heavyweight 320 GSM cotton twill overshirt with dual oversized chest flap pockets. Raw distressed hemline, heavy gunmetal snap buttons, and relaxed unisex drape.",
        "fit_type": "Relaxed Boxy Overshirt",
        "fabric_weight": "320 GSM Heavy Twill",
        "gender": "Unisex",
        "badge": "TRENDING",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "inventory": {"S": 12, "M": 24, "L": 28, "XL": 15, "XXL": 6},
        "images": art_images("shirt", "8d9499", "utility"),
        "is_featured": False,
        "is_new_drop": False,
        "rating": 4.8,
        "reviews_count": 41
    },

    # --- PANTS ---
    {
        "id": "prod-002",
        "name": "Raw Edge Parachute Cargo Pants - Matte Black",
        "slug": "raw-edge-parachute-cargo-black",
        "category": "Pants",
        "price": 125.00,
        "compare_at_price": 160.00,
        "description": "Constructed from high-density water-repellent memory nylon. Wide parachute balloon leg with internal bungee drawcords at hems and waist for customizable drape. Dual bellow 3D utility cargo pockets.",
        "fit_type": "Parachute Relaxed",
        "fabric_weight": "210 GSM Technical Japanese Nylon",
        "gender": "Unisex",
        "badge": "BESTSELLER",
        "sizes": ["S", "M", "L", "XL"],
        "inventory": {"S": 15, "M": 32, "L": 40, "XL": 14},
        "images": art_images("pants", "1b1b1d", "cargo"),
        "is_featured": True,
        "is_new_drop": False,
        "rating": 4.8,
        "reviews_count": 62
    },
    {
        "id": "prod-011",
        "name": "Heavyweight Pleated Balloon Trousers - Charcoal Melange",
        "slug": "heavyweight-pleated-balloon-trousers-charcoal",
        "category": "Pants",
        "price": 135.00,
        "compare_at_price": 175.00,
        "description": "Zara Studio-inspired tailored trousers cut from 360 GSM wool-blend serge. Double front pleats, elasticated rear waistband with internal drawstring, and a wide-tapered balloon silhouette.",
        "fit_type": "Wide Leg Balloon",
        "fabric_weight": "360 GSM Wool-Blend Serge",
        "gender": "Unisex",
        "badge": "EDITORIAL",
        "sizes": ["S", "M", "L", "XL"],
        "inventory": {"S": 10, "M": 22, "L": 26, "XL": 12},
        "images": art_images("pants", "3a3b3e", "balloon"),
        "is_featured": True,
        "is_new_drop": True,
        "rating": 4.9,
        "reviews_count": 58
    }
]

ART_BY_ID = {
    "prod-001": ("hoodie", "3a3b3e", ""),
    "prod-012": ("hoodie", "1b1b1d", "zip"),
    "prod-013": ("sweatshirt", "6b6f4e", ""),
    "prod-014": ("sweatshirt", "e4dccb", ""),
    "prod-003": ("tee", "7d8466", ""),
    "prod-008": ("tee", "1b1b1d", ""),
    "prod-009": ("shirt", "f1efe9", ""),
    "prod-010": ("shirt", "8d9499", "utility"),
    "prod-002": ("pants", "1b1b1d", "cargo"),
    "prod-011": ("pants", "3a3b3e", "balloon"),
}


def _is_local_image(url: str) -> bool:
    return isinstance(url, str) and (url.startswith("/img/") or url.startswith("data:"))


def normalize_images(p: Dict[str, Any]) -> Dict[str, Any]:
    """Swap legacy external (photo) URLs for the generated product-only artwork."""
    imgs = p.get("images") or []
    if isinstance(imgs, str):
        try:
            imgs = json.loads(imgs)
        except Exception:
            imgs = [imgs]
    if not imgs or any("unsplash.com" in str(i) for i in imgs):
        kind, color, style = ART_BY_ID.get(p.get("id"), (kind_for_category(p.get("category")), "3a3b3e", ""))
        imgs = art_images(kind, color, style)
    p["images"] = imgs
    return p


def _image_for_item(item: Dict[str, Any]) -> str:
    img = item.get("product_image") or ""
    if "unsplash.com" in img or not img:
        kind, color, style = ART_BY_ID.get(item.get("product_id"), ("tee", "3a3b3e", ""))
        return art_images(kind, color, style)[0]
    return img


class DatabaseManager:
    def __init__(self):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        self.init_sqlite_db()

    def get_connection(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def init_sqlite_db(self, force_reseed=False):
        """Initializes tables and seeds default data in SQLite."""
        conn = self.get_connection()
        cur = conn.cursor()

        cur.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            compare_at_price REAL,
            description TEXT,
            fit_type TEXT,
            fabric_weight TEXT,
            gender TEXT DEFAULT 'Unisex',
            badge TEXT,
            sizes TEXT,
            inventory TEXT,
            images TEXT,
            is_featured INTEGER DEFAULT 1,
            is_new_drop INTEGER DEFAULT 0,
            rating REAL DEFAULT 4.9,
            reviews_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT DEFAULT 'customer',
            phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            customer_phone TEXT,
            shipping_address TEXT NOT NULL,
            city TEXT NOT NULL,
            postal_code TEXT NOT NULL,
            subtotal REAL NOT NULL,
            discount_amount REAL DEFAULT 0.0,
            shipping_fee REAL DEFAULT 0.0,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'Pending',
            payment_method TEXT DEFAULT 'Card',
            payment_status TEXT DEFAULT 'Paid',
            tracking_number TEXT,
            items_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS coupons (
            code TEXT PRIMARY KEY,
            discount_percent INTEGER NOT NULL,
            min_spend REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1
        );
        """)

        conn.commit()

        if force_reseed:
            cur.execute("DELETE FROM products")
            conn.commit()

        # Seed products if empty
        cur.execute("SELECT COUNT(*) FROM products")
        if cur.fetchone()[0] == 0:
            for p in DEFAULT_PRODUCTS:
                cur.execute("""
                INSERT INTO products (
                    id, name, slug, category, price, compare_at_price, description, 
                    fit_type, fabric_weight, gender, badge, sizes, inventory, images, 
                    is_featured, is_new_drop, rating, reviews_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    p["id"], p["name"], p["slug"], p["category"], p["price"], p["compare_at_price"],
                    p["description"], p["fit_type"], p["fabric_weight"], p["gender"], p["badge"],
                    json.dumps(p["sizes"]), json.dumps(p["inventory"]), json.dumps(p["images"]),
                    1 if p.get("is_featured") else 0, 1 if p.get("is_new_drop") else 0,
                    p.get("rating", 4.9), p.get("reviews_count", 0)
                ))

        # Seed default coupons
        cur.execute("SELECT COUNT(*) FROM coupons")
        if cur.fetchone()[0] == 0:
            cur.executemany("INSERT INTO coupons VALUES (?, ?, ?, ?)", [
                ('AURA20', 20, 50.0, 1),
                ('BONKERS10', 10, 30.0, 1),
                ('VIPDROP', 25, 100.0, 1)
            ])

        # Seed Admin user: email: admin@aurastudios.com / password: admin
        cur.execute("SELECT COUNT(*) FROM users WHERE email = 'admin@aurastudios.com'")
        if cur.fetchone()[0] == 0:
            cur.execute("""
            INSERT INTO users (id, email, password_hash, full_name, role)
            VALUES (?, ?, ?, ?, ?)
            """, (
                "usr-admin-01",
                "admin@aurastudios.com",
                generate_password_hash("admin"),
                "AURA Creative Director",
                "admin"
            ))

        # Seed demo customer user: user@aurastudios.com / password: user
        cur.execute("SELECT COUNT(*) FROM users WHERE email = 'user@aurastudios.com'")
        if cur.fetchone()[0] == 0:
            cur.execute("""
            INSERT INTO users (id, email, password_hash, full_name, role)
            VALUES (?, ?, ?, ?, ?)
            """, (
                "usr-customer-01",
                "user@aurastudios.com",
                generate_password_hash("user"),
                "Alex Rivera",
                "customer"
            ))

        # Seed a sample order if orders empty
        cur.execute("SELECT COUNT(*) FROM orders")
        if cur.fetchone()[0] == 0:
            demo_items = [
                {
                    "product_id": "prod-001",
                    "product_name": "Heavyweight Box Hoodie - Acid Wash Charcoal",
                    "product_image": art_images("hoodie", "3a3b3e", "")[0],
                    "size": "L",
                    "quantity": 1,
                    "unit_price": 110.0,
                    "total_price": 110.0
                },
                {
                    "product_id": "prod-003",
                    "product_name": "Distressed Vintage Graphic Tee - Faded Moss",
                    "product_image": art_images("tee", "7d8466", "")[0],
                    "size": "M",
                    "quantity": 1,
                    "unit_price": 65.0,
                    "total_price": 65.0
                }
            ]
            cur.execute("""
            INSERT INTO orders (
                id, user_id, customer_name, customer_email, customer_phone,
                shipping_address, city, postal_code, subtotal, discount_amount,
                shipping_fee, total_amount, status, payment_method, payment_status,
                tracking_number, items_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'))
            """, (
                "ORD-78219", "usr-customer-01", "Alex Rivera", "user@aurastudios.com", "+1 555-0192",
                "742 Evergreen Terrace", "Los Angeles", "90210", 175.0, 35.0,
                0.0, 140.0, "Shipped", "Card", "Paid", "TRACK-AURA-89412",
                json.dumps(demo_items)
            ))

        conn.commit()
        conn.close()

    # ================= PRODUCTS =================
    def get_products(self, category=None, fit_type=None, search=None, sort=None) -> List[Dict[str, Any]]:
        # If Supabase is active, try it first
        if supabase_client:
            try:
                query = supabase_client.table("products").select("*")
                if category and category.lower() != 'all':
                    query = query.ilike("category", f"%{category}%")
                if fit_type:
                    query = query.ilike("fit_type", f"%{fit_type}%")
                if search:
                    query = query.ilike("name", f"%{search}%")
                res = query.execute()
                if res.data:
                    return [normalize_images(dict(r)) for r in res.data]
            except Exception as e:
                print(f"Supabase query error: {e}. Using local store.")

        # Local SQLite fallback
        conn = self.get_connection()
        cur = conn.cursor()
        query = "SELECT * FROM products WHERE 1=1"
        params = []

        if category and category.lower() != 'all':
            query += " AND LOWER(category) = LOWER(?)"
            params.append(category)

        if fit_type and fit_type.lower() != 'all':
            query += " AND fit_type LIKE ?"
            params.append(f"%{fit_type}%")

        if search:
            query += " AND (name LIKE ? OR description LIKE ? OR badge LIKE ?)"
            s_param = f"%{search}%"
            params.extend([s_param, s_param, s_param])

        if sort == 'price_asc':
            query += " ORDER BY price ASC"
        elif sort == 'price_desc':
            query += " ORDER BY price DESC"
        elif sort == 'rating':
            query += " ORDER BY rating DESC"
        elif sort == 'newest':
            query += " ORDER BY created_at DESC"
        else:
            query += " ORDER BY is_featured DESC, created_at DESC"

        cur.execute(query, params)
        rows = cur.fetchall()
        products = []
        for row in rows:
            p = dict(row)
            p['sizes'] = json.loads(p['sizes']) if isinstance(p['sizes'], str) else p['sizes']
            p['inventory'] = json.loads(p['inventory']) if isinstance(p['inventory'], str) else p['inventory']
            p['images'] = json.loads(p['images']) if isinstance(p['images'], str) else p['images']
            p['is_featured'] = bool(p['is_featured'])
            p['is_new_drop'] = bool(p['is_new_drop'])
            products.append(normalize_images(p))
        conn.close()
        return products

    def get_product(self, product_id_or_slug: str) -> Optional[Dict[str, Any]]:
        if supabase_client:
            try:
                res = supabase_client.table("products").select("*").or_(f"id.eq.{product_id_or_slug},slug.eq.{product_id_or_slug}").execute()
                if res.data:
                    return normalize_images(dict(res.data[0]))
            except Exception as e:
                print(f"Supabase get_product error: {e}")

        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM products WHERE id = ? OR slug = ?", (product_id_or_slug, product_id_or_slug))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        p = dict(row)
        p['sizes'] = json.loads(p['sizes']) if isinstance(p['sizes'], str) else p['sizes']
        p['inventory'] = json.loads(p['inventory']) if isinstance(p['inventory'], str) else p['inventory']
        p['images'] = json.loads(p['images']) if isinstance(p['images'], str) else p['images']
        p['is_featured'] = bool(p['is_featured'])
        p['is_new_drop'] = bool(p['is_new_drop'])
        return normalize_images(p)

    def create_product(self, data: Dict[str, Any]) -> Dict[str, Any]:
        import uuid
        prod_id = f"prod-{uuid.uuid4().hex[:6]}"
        import re as _re
        base_slug = data.get("slug") or _re.sub(r"[^a-z0-9]+", "-", data["name"].lower()).strip("-") or "product"
        slug = base_slug
        conn0 = self.get_connection()
        if conn0.execute("SELECT 1 FROM products WHERE slug = ?", (slug,)).fetchone():
            slug = f"{base_slug}-{prod_id[-4:]}"
        conn0.close()
        sizes = data.get("sizes") or ["S", "M", "L", "XL", "XXL"]
        inventory = data.get("inventory") or {sz: 20 for sz in sizes}
        images = [i for i in (data.get("images") or []) if i]
        if not images:
            color_hex = PALETTE.get(data.get("color", ""), "3a3b3e")
            images = art_images(kind_for_category(data.get("category")), color_hex, "")

        # Try Supabase sync
        if supabase_client:
            try:
                sb_data = {
                    "id": prod_id,
                    "name": data["name"],
                    "slug": slug,
                    "category": data.get("category", "T-Shirts"),
                    "price": float(data.get("price", 99.0)),
                    "compare_at_price": float(data["compare_at_price"]) if data.get("compare_at_price") else None,
                    "description": data.get("description", ""),
                    "fit_type": data.get("fit_type", "Oversized Boxy"),
                    "fabric_weight": data.get("fabric_weight", "380 GSM Heavy French Terry"),
                    "gender": data.get("gender", "Unisex"),
                    "badge": data.get("badge", "NEW"),
                    "sizes": sizes,
                    "inventory": inventory,
                    "images": images,
                    "is_featured": bool(data.get("is_featured", True)),
                    "is_new_drop": bool(data.get("is_new_drop", True))
                }
                supabase_client.table("products").insert(sb_data).execute()
            except Exception as e:
                print(f"Supabase create product error: {e}")

        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("""
        INSERT INTO products (
            id, name, slug, category, price, compare_at_price, description,
            fit_type, fabric_weight, gender, badge, sizes, inventory, images,
            is_featured, is_new_drop, rating, reviews_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 1)
        """, (
            prod_id, data["name"], slug, data.get("category", "T-Shirts"),
            float(data.get("price", 99.0)), float(data["compare_at_price"]) if data.get("compare_at_price") else None,
            data.get("description", ""), data.get("fit_type", "Oversized Boxy"),
            data.get("fabric_weight", "380 GSM Heavy French Terry"), data.get("gender", "Unisex"),
            data.get("badge", "NEW"), json.dumps(sizes), json.dumps(inventory), json.dumps(images),
            1 if data.get("is_featured", True) else 0, 1 if data.get("is_new_drop", True) else 0
        ))
        conn.commit()
        conn.close()
        return self.get_product(prod_id)

    def update_product(self, product_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cur = conn.cursor()
        
        updates = []
        params = []
        for key in ["name", "category", "price", "compare_at_price", "description", "fit_type", "fabric_weight", "badge", "gender"]:
            if key in data:
                updates.append(f"{key} = ?")
                params.append(data[key])
        if "sizes" in data:
            updates.append("sizes = ?")
            params.append(json.dumps(data["sizes"]))
        if "inventory" in data:
            updates.append("inventory = ?")
            params.append(json.dumps(data["inventory"]))
        if "images" in data:
            updates.append("images = ?")
            params.append(json.dumps(data["images"]))
        if "is_featured" in data:
            updates.append("is_featured = ?")
            params.append(1 if data["is_featured"] else 0)
        if "is_new_drop" in data:
            updates.append("is_new_drop = ?")
            params.append(1 if data["is_new_drop"] else 0)

        if updates:
            params.append(product_id)
            query = f"UPDATE products SET {', '.join(updates)} WHERE id = ?"
            cur.execute(query, params)
            conn.commit()
        conn.close()

        if supabase_client:
            try:
                supabase_client.table("products").update(data).eq("id", product_id).execute()
            except Exception as e:
                print(f"Supabase update error: {e}")

        return self.get_product(product_id)

    def delete_product(self, product_id: str) -> bool:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM products WHERE id = ?", (product_id,))
        conn.commit()
        conn.close()

        if supabase_client:
            try:
                supabase_client.table("products").delete().eq("id", product_id).execute()
            except Exception as e:
                print(f"Supabase delete error: {e}")
        return True

    # ================= ORDERS =================
    FREE_SHIPPING_THRESHOLD = 150.0
    SHIPPING_FEE = 15.0

    def price_items(self, raw_items, coupon_code=None):
        """Build trusted line items from the catalogue. Never trusts client prices."""
        if not isinstance(raw_items, list) or not raw_items:
            raise ValueError("Your bag is empty")
        lines = []
        for raw in raw_items[:50]:
            product = self.get_product(str(raw.get("product_id", "")))
            if not product:
                raise ValueError("One of the items is no longer available")
            size = str(raw.get("size", ""))
            if size not in (product.get("sizes") or []):
                raise ValueError(f"Size {size or '?'} is not available for {product['name']}")
            try:
                qty = int(raw.get("quantity", 1))
            except (TypeError, ValueError):
                raise ValueError("Invalid quantity")
            if qty < 1 or qty > 10:
                raise ValueError("Quantity must be between 1 and 10")
            stock = (product.get("inventory") or {}).get(size)
            if stock is not None and int(stock) < qty:
                raise ValueError(f"Only {int(stock)} left in size {size} for {product['name']}")
            unit = float(product["price"])
            lines.append({
                "product_id": product["id"],
                "product_name": product["name"],
                "product_image": product["images"][0],
                "size": size,
                "quantity": qty,
                "unit_price": unit,
                "total_price": round(unit * qty, 2),
            })
        subtotal = round(sum(l["total_price"] for l in lines), 2)
        discount = 0.0
        applied = None
        if coupon_code:
            res = self.validate_coupon(coupon_code, subtotal)
            if res.get("valid"):
                discount = float(res["discount_amount"])
                applied = res["code"]
        shipping = 0.0 if subtotal >= self.FREE_SHIPPING_THRESHOLD else self.SHIPPING_FEE
        return lines, subtotal, discount, shipping, applied

    def _decrement_stock(self, lines):
        conn = self.get_connection()
        cur = conn.cursor()
        for l in lines:
            cur.execute("SELECT inventory FROM products WHERE id = ?", (l["product_id"],))
            row = cur.fetchone()
            if not row:
                continue
            inv = json.loads(row["inventory"]) if row["inventory"] else {}
            if l["size"] in inv:
                inv[l["size"]] = max(0, int(inv[l["size"]]) - l["quantity"])
                cur.execute("UPDATE products SET inventory = ? WHERE id = ?", (json.dumps(inv), l["product_id"]))
        conn.commit()
        conn.close()

    def create_order(self, data: Dict[str, Any]) -> Dict[str, Any]:
        import random
        items, subtotal, discount, shipping, _coupon = self.price_items(data.get("items"), data.get("coupon_code"))
        total = round(max(0.0, subtotal - discount + shipping), 2)
        while True:
            order_id = f"ORD-{random.randint(10000, 99999)}"
            if not self.get_order(order_id):
                break
        tracking = f"TRACK-AURA-{random.randint(100000, 999999)}"
        self._decrement_stock(items)

        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("""
        INSERT INTO orders (
            id, user_id, customer_name, customer_email, customer_phone,
            shipping_address, city, postal_code, subtotal, discount_amount,
            shipping_fee, total_amount, status, payment_method, payment_status,
            tracking_number, items_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_id, data.get("user_id"), data["customer_name"], data["customer_email"],
            data.get("customer_phone", ""), data["shipping_address"], data["city"],
            data["postal_code"], subtotal, discount, shipping, total,
            "Processing", data.get("payment_method", "Card"), "Paid",
            tracking, json.dumps(items)
        ))
        conn.commit()
        conn.close()

        if supabase_client:
            try:
                sb_order = {
                    "id": order_id,
                    "user_id": data.get("user_id"),
                    "customer_name": data["customer_name"],
                    "customer_email": data["customer_email"],
                    "customer_phone": data.get("customer_phone", ""),
                    "shipping_address": data["shipping_address"],
                    "city": data["city"],
                    "postal_code": data["postal_code"],
                    "subtotal": subtotal,
                    "discount_amount": discount,
                    "shipping_fee": shipping,
                    "total_amount": total,
                    "status": "Processing",
                    "payment_method": data.get("payment_method", "Card"),
                    "payment_status": "Paid",
                    "tracking_number": tracking
                }
                supabase_client.table("orders").insert(sb_order).execute()
            except Exception as e:
                print(f"Supabase order sync error: {e}")

        return self.get_order(order_id)

    def get_orders(self, user_id=None) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        cur = conn.cursor()
        if user_id:
            cur.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        else:
            cur.execute("SELECT * FROM orders ORDER BY created_at DESC")
        rows = cur.fetchall()
        orders = []
        for row in rows:
            o = dict(row)
            o['items'] = json.loads(o['items_json']) if o.get('items_json') else []
            for it in o['items']:
                it['product_image'] = _image_for_item(it)
            orders.append(o)
        conn.close()
        return orders

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        o = dict(row)
        o['items'] = json.loads(o['items_json']) if o.get('items_json') else []
        for it in o['items']:
            it['product_image'] = _image_for_item(it)
        return o

    def update_order_status(self, order_id: str, new_status: str) -> bool:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE orders SET status = ? WHERE id = ?", (new_status, order_id))
        conn.commit()
        conn.close()

        if supabase_client:
            try:
                supabase_client.table("orders").update({"status": new_status}).eq("id", order_id).execute()
            except Exception as e:
                print(f"Supabase order status error: {e}")
        return True

    # ================= COUPONS =================
    def validate_coupon(self, code: str, cart_total: float) -> Dict[str, Any]:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1", (code,))
        row = cur.fetchone()
        conn.close()

        if not row:
            return {"valid": False, "message": "Invalid discount code"}
        
        c = dict(row)
        if cart_total < c["min_spend"]:
            return {"valid": False, "message": f"Code requires minimum order of ${c['min_spend']:.2f}"}

        discount = (cart_total * c["discount_percent"]) / 100.0
        return {
            "valid": True,
            "code": c["code"],
            "discount_percent": c["discount_percent"],
            "min_spend": c["min_spend"],
            "discount_amount": round(discount, 2),
            "message": f"Applied {c['discount_percent']}% discount!"
        }

    # ================= STATS & DASHBOARD =================
    def get_admin_stats(self) -> Dict[str, Any]:
        conn = self.get_connection()
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*), COALESCE(SUM(total_amount), 0) FROM orders")
        orders_count, total_revenue = cur.fetchone()

        cur.execute("SELECT COUNT(*) FROM products")
        products_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'customer'")
        customers_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM orders WHERE status = 'Processing' OR status = 'Pending'")
        pending_orders = cur.fetchone()[0]

        aov = round(total_revenue / orders_count, 2) if orders_count > 0 else 0.0

        conn.close()
        return {
            "total_revenue": round(total_revenue, 2),
            "total_orders": orders_count,
            "pending_orders": pending_orders,
            "products_count": products_count,
            "customers_count": max(customers_count, 18),
            "average_order_value": aov
        }

    # ================= AUTH =================
    def authenticate_user(self, email, password):
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email,))
        row = cur.fetchone()
        conn.close()

        if row and check_password_hash(row["password_hash"], password):
            u = dict(row)
            del u["password_hash"]
            return u
        return None

    def register_user(self, email, password, full_name, phone=""):
        import uuid
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
        if cur.fetchone():
            conn.close()
            return {"error": "Email already exists"}

        user_id = f"usr-{uuid.uuid4().hex[:8]}"
        hashed = generate_password_hash(password)
        cur.execute("""
        INSERT INTO users (id, email, password_hash, full_name, role, phone)
        VALUES (?, ?, ?, ?, 'customer', ?)
        """, (user_id, email, hashed, full_name, phone))
        conn.commit()
        conn.close()

        return {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": "customer",
            "phone": phone
        }

db_manager = DatabaseManager()
