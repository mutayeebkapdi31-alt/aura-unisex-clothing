"""
AURA STUDIOS | High Fashion Unisex Streetwear & Luxury Pret
Flask Application Backend
"""

import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_cors import CORS
from supabase_client import db_manager

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "aura_luxury_unisex_secret_dev_key_2026")
CORS(app)

# Helper context processor
@app.context_processor
def inject_user():
    return {
        "current_user": session.get("user")
    }

# ================= PAGE ROUTES =================

@app.route("/")
def index():
    """Main landing page with dynamic unisex streetwear drops, hero, and interactive store."""
    category = request.args.get("category")
    fit_type = request.args.get("fit")
    sort = request.args.get("sort")
    search = request.args.get("q")
    products = db_manager.get_products(category=category, fit_type=fit_type, search=search, sort=sort)
    featured = [p for p in products if p.get("is_featured")]
    return render_template("index.html", products=products, featured=featured, active_category=category or "all")

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
    """Editorial Zara-inspired unisex campaign lookbook with interactive hotspots."""
    return render_template("lookbook.html")

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
    return render_template("admin_dashboard.html", stats=stats, products=products, orders=orders)

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
    
    data = request.get_json() or {}
    if not data.get("name") or not data.get("price"):
        return jsonify({"success": False, "error": "Name and Price are required"}), 400
    
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
    data = request.get_json() or {}
    required = ["customer_name", "customer_email", "shipping_address", "city", "postal_code", "items"]
    for r in required:
        if not data.get(r):
            return jsonify({"success": False, "error": f"Missing field: {r}"}), 400

    # Auto associate logged in user if available
    user = session.get("user")
    if user and not data.get("user_id"):
        data["user_id"] = user["id"]

    order = db_manager.create_order(data)
    return jsonify({"success": True, "order": order})

@app.route("/api/orders/<order_id>/status", methods=["PUT"])
def api_order_status(order_id):
    user = session.get("user")
    if not user or user.get("role") != "admin":
        return jsonify({"success": False, "error": "Admin access required"}), 403
    
    data = request.get_json() or {}
    new_status = data.get("status")
    if not new_status:
        return jsonify({"success": False, "error": "Status required"}), 400

    db_manager.update_order_status(order_id, new_status)
    return jsonify({"success": True, "status": new_status})

@app.route("/api/coupons/apply", methods=["POST"])
def api_apply_coupon():
    data = request.get_json() or {}
    code = data.get("code", "").strip()
    total = float(data.get("cart_total", 0.0))
    res = db_manager.validate_coupon(code, total)
    return jsonify(res)

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")
    user = db_manager.authenticate_user(email, password)
    if user:
        session["user"] = user
        return jsonify({"success": True, "user": user})
    return jsonify({"success": False, "error": "Invalid email or password"}), 401

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()

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
    print(f"\n⚡ AURA STUDIOS running on http://127.0.0.1:{port}")
    print(f"👉 Customer Portal: http://127.0.0.1:{port}")
    print(f"👉 Admin Portal: http://127.0.0.1:{port}/admin (Email: admin@aurastudios.com / Pass: admin)\n")
    app.run(host="0.0.0.0", port=port, debug=True)
