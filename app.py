"""
AURA STUDIOS | High Fashion Unisex Streetwear & Luxury Pret
Flask Application Backend
"""

import os
import secrets
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash, Response, abort
from supabase_client import db_manager, supabase_client
from product_art import render_svg, KINDS, PALETTE

try:  # CORS is only needed if the API is called from another origin
    from flask_cors import CORS
except ImportError:  # pragma: no cover
    CORS = None

app = Flask(__name__)
# Set FLASK_SECRET_KEY in .env for production; a random key is used otherwise
app.secret_key = os.getenv("FLASK_SECRET_KEY") or secrets.token_hex(32)
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax")
if CORS:
    CORS(app)

CATEGORIES = ["Shirts", "T-Shirts", "Pants", "Hoodies", "Sweatshirts"]

LOOKS = [
    ("Everyday", "Heavy hoodie with relaxed cargo pants.",
     ["heavyweight-box-hoodie-acid-charcoal", "raw-edge-parachute-cargo-black"]),
    ("Studio", "Poplin shirt over a clean tee with pleated trousers.",
     ["boxy-camp-collar-poplin-shirt-chalk", "heavy-box-minimalist-tee-obsidian", "heavyweight-pleated-balloon-trousers-charcoal"]),
    ("Weekend", "Soft sweatshirt and a worn-in graphic tee.",
     ["drop-shoulder-box-sweatshirt-olive", "distressed-vintage-graphic-tee-moss"]),
]

# Helper context processor
@app.context_processor
def inject_globals():
    return {
        "current_user": session.get("user"),
        "categories": CATEGORIES,
    }


# ================= PRODUCT ARTWORK =================

@app.route("/img/<kind>/<color>.svg")
def product_art(kind, color):
    """Clean garment-only product images generated on the fly."""
    if kind not in KINDS:
        abort(404)
    view = "back" if request.args.get("v") == "back" else "front"
    svg = render_svg(kind, color, view, request.args.get("s", ""))
    resp = Response(svg, mimetype="image/svg+xml")
    resp.headers["Cache-Control"] = "public, max-age=604800"
    return resp

# ================= PAGE ROUTES =================

@app.route("/")
def index():
    """Main landing page with dynamic unisex streetwear drops, hero, and interactive store."""
    category = request.args.get("category")
    if category not in CATEGORIES:
        category = "all"
    # All products are rendered; filtering, search and sorting happen instantly in the browser.
    products = db_manager.get_products()
    return render_template("index.html", products=products, active_category=category)

@app.route("/product/<product_id_or_slug>")
def product_detail(product_id_or_slug):
    """Deep product detail view with multi-image zoom, unisex fit specs, and size selector."""
    product = db_manager.get_product(product_id_or_slug)
    if not product:
        flash("Product not found", "error")
        return redirect(url_for("index"))
    
    # Related products from same category or featured
    related = [p for p in db_manager.get_products(category=product["category"]) if p["id"] != product["id"]][:4]
    if len(related) < 4:
        extra = [p for p in db_manager.get_products() if p["id"] != product["id"] and p not in related]
        related.extend(extra[:4 - len(related)])

    return render_template("product_detail.html", product=product, related=related)

@app.route("/lookbook")
def lookbook():
    """Curated outfits built from the live catalogue."""
    looks = []
    for title, blurb, slugs in LOOKS:
        items = [p for p in (db_manager.get_product(s) for s in slugs) if p]
        if items:
            looks.append({"title": title, "blurb": blurb, "items": items})
    return render_template("lookbook.html", looks=looks)

@app.route("/checkout")
def checkout():
    """Checkout experience with coupon support and order review."""
    return render_template("checkout.html")

@app.route("/account")
def account():
    """User account overview with past orders and profile details."""
    user = session.get("user")
    if not user:
        return redirect(url_for("index") + "?auth=login")
    orders = db_manager.get_orders(user_id=user["id"])
    return render_template("account.html", user=user, orders=orders)

@app.route("/admin")
def admin_portal():
    """Admin Executive Dashboard: metrics, catalog CRUD, order fulfillment."""
    user = session.get("user")
    # Quick check for demo admin access
    if not user or user.get("role") != "admin":
        return render_template("admin_login.html")
    
    stats = db_manager.get_admin_stats()
    products = db_manager.get_products()
    orders = db_manager.get_orders()
    return render_template("admin_dashboard.html", stats=stats, products=products, orders=orders,
                           palette=list(PALETTE.keys()), supabase_connected=bool(supabase_client))

# ================= API ENDPOINTS =================

@app.route("/api/products", methods=["GET", "POST"])
def api_products():
    if request.method == "GET":
        category = request.args.get("category")
        fit_type = request.args.get("fit")
        search = request.args.get("q")
        sort = request.args.get("sort")
        products = db_manager.get_products(category=category, fit_type=fit_type, search=search, sort=sort)
        return jsonify({"success": True, "count": len(products), "products": products})
    
    # POST: Create product (Admin only)
    user = session.get("user")
    if not user or user.get("role") != "admin":
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    data = request.get_json(silent=True) or {}
    if not str(data.get("name", "")).strip() or not data.get("price"):
        return jsonify({"success": False, "error": "Name and Price are required"}), 400
    try:
        if float(data["price"]) <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Price must be a positive number"}), 400
    if data.get("category") not in CATEGORIES:
        data["category"] = "T-Shirts"

    created = db_manager.create_product(data)
    return jsonify({"success": True, "product": created})

@app.route("/api/products/<product_id>", methods=["GET", "PUT", "DELETE"])
def api_product_item(product_id):
    if request.method == "GET":
        p = db_manager.get_product(product_id)
        if not p:
            return jsonify({"success": False, "error": "Not found"}), 404
        return jsonify({"success": True, "product": p})

    # Admin verification for modifications
    user = session.get("user")
    if not user or user.get("role") != "admin":
        return jsonify({"success": False, "error": "Unauthorized"}), 403

    if request.method == "PUT":
        data = request.get_json() or {}
        updated = db_manager.update_product(product_id, data)
        return jsonify({"success": True, "product": updated})

    if request.method == "DELETE":
        success = db_manager.delete_product(product_id)
        return jsonify({"success": success})

@app.route("/api/orders", methods=["GET", "POST"])
def api_orders():
    if request.method == "GET":
        user = session.get("user")
        if not user:
            return jsonify({"success": False, "error": "Login required"}), 401
        
        # Admin gets all orders, customer gets their own
        user_id = None if user.get("role") == "admin" else user["id"]
        orders = db_manager.get_orders(user_id=user_id)
        return jsonify({"success": True, "orders": orders})

    # POST: Place Order
    data = request.get_json(silent=True) or {}
    required = ["customer_name", "customer_email", "shipping_address", "city", "postal_code", "items"]
    for r in required:
        if not data.get(r):
            return jsonify({"success": False, "error": f"Missing field: {r}"}), 400

    # Always bind the order to the signed-in user (never trust a client-supplied id)
    user = session.get("user")
    data["user_id"] = user["id"] if user else None

    try:
        order = db_manager.create_order(data)
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    return jsonify({"success": True, "order": order})

@app.route("/api/orders/<order_id>/status", methods=["PUT"])
def api_order_status(order_id):
    user = session.get("user")
    if not user or user.get("role") != "admin":
        return jsonify({"success": False, "error": "Admin access required"}), 403
    
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status not in ("Pending", "Processing", "Shipped", "Delivered", "Cancelled"):
        return jsonify({"success": False, "error": "Valid status required"}), 400

    db_manager.update_order_status(order_id, new_status)
    return jsonify({"success": True, "status": new_status})

@app.route("/api/coupons/apply", methods=["POST"])
def api_apply_coupon():
    data = request.get_json(silent=True) or {}
    code = str(data.get("code", "")).strip()
    try:
        total = float(data.get("cart_total", 0.0))
    except (TypeError, ValueError):
        total = 0.0
    res = db_manager.validate_coupon(code, total)
    return jsonify(res)

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip()
    password = str(data.get("password", ""))
    user = db_manager.authenticate_user(email, password)
    if user:
        session["user"] = user
        return jsonify({"success": True, "user": user})
    return jsonify({"success": False, "error": "Invalid email or password"}), 401

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip()
    password = str(data.get("password", ""))
    full_name = str(data.get("full_name", "")).strip()
    phone = str(data.get("phone", "")).strip()

    if len(password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters"}), 400

    if not email or not password or not full_name:
        return jsonify({"success": False, "error": "Please provide email, password, and full name"}), 400

    res = db_manager.register_user(email, password, full_name, phone)
    if "error" in res:
        return jsonify({"success": False, "error": res["error"]}), 400
    
    session["user"] = res
    return jsonify({"success": True, "user": res})

@app.route("/api/auth/logout", methods=["POST", "GET"])
def api_logout():
    session.pop("user", None)
    if request.is_json:
        return jsonify({"success": True})
    return redirect(url_for("index"))

@app.route("/api/auth/me")
def api_me():
    user = session.get("user")
    if user:
        return jsonify({"authenticated": True, "user": user})
    return jsonify({"authenticated": False})

@app.route("/api/admin/stats")
def api_admin_stats():
    user = session.get("user")
    if not user or user.get("role") != "admin":
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    stats = db_manager.get_admin_stats()
    return jsonify({"success": True, "stats": stats})

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    print(f"\nAURA STUDIOS running on http://127.0.0.1:{port}")
    print(f"Admin portal: http://127.0.0.1:{port}/admin\n")
    # 0.0.0.0 lets a phone on the same Wi-Fi open http://<your-computer-ip>:<port>
    app.run(host="0.0.0.0", port=port, debug=debug)
