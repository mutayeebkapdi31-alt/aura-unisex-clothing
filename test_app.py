import re
import app

client = app.app.test_client()


def check(label, cond):
    assert cond, f"FAILED: {label}"
    print(f"✓ {label}")


# ---------- pages ----------
for path in ["/", "/?category=Hoodies", "/lookbook", "/checkout"]:
    res = client.get(path)
    check(f"GET {path} -> 200", res.status_code == 200)
    html = res.get_data(as_text=True)
    check(f"{path} uses no external image/icon hosts", "unsplash" not in html and "unpkg" not in html)
    check(f"{path} has mobile viewport", "width=device-width, initial-scale=1" in html)

res = client.get("/product/heavyweight-box-hoodie-acid-charcoal")
check("product page -> 200", res.status_code == 200 and b"Heavyweight Box Hoodie" in res.data)
check("unknown product redirects home", client.get("/product/nope").status_code == 302)
check("account redirects when signed out", client.get("/account").status_code == 302)

# ---------- generated product images ----------
for kind in ["hoodie", "sweatshirt", "tee", "shirt", "pants"]:
    for q in ["", "?v=back"]:
        r = client.get(f"/img/{kind}/3a3b3e.svg{q}")
        check(f"/img/{kind} {q or 'front'} renders svg", r.status_code == 200 and r.mimetype == "image/svg+xml" and b"<svg" in r.data)
check("unknown garment -> 404", client.get("/img/spaceship/3a3b3e.svg").status_code == 404)

# ---------- catalogue ----------
data = client.get("/api/products").get_json()
check("catalogue has 10 products", data["success"] and len(data["products"]) >= 10)
check("every product image is a local generated image", all(i.startswith("/img/") for p in data["products"] for i in p["images"]))

# ---------- admin ----------
check("admin shows login when signed out", b"Admin sign in" in client.get("/admin").data)
check("bad login rejected", client.post("/api/auth/login", json={"email": "admin@aurastudios.com", "password": "x"}).status_code == 401)
res = client.post("/api/auth/login", json={"email": "admin@aurastudios.com", "password": "admin"})
check("admin login", res.status_code == 200 and res.get_json()["user"]["role"] == "admin")
check("admin dashboard renders", b"Admin dashboard" in client.get("/admin").data)

res = client.post("/api/products", json={"name": "Test Tee", "category": "T-Shirts", "price": 40, "color": "Navy"})
created = res.get_json()["product"]
check("admin can create product with generated image", res.status_code == 200 and created["images"][0].startswith("/img/tee/"))
check("admin can delete product", client.delete(f"/api/products/{created['id']}").get_json()["success"])
check("negative price rejected", client.post("/api/products", json={"name": "Bad", "price": -5}).status_code == 400)
client.get("/api/auth/logout")
check("api blocks non-admin product create", client.post("/api/products", json={"name": "x", "price": 5}).status_code == 403)

# ---------- coupons ----------
c = client.post("/api/coupons/apply", json={"code": "aura20", "cart_total": 200}).get_json()
check("AURA20 gives 20% (case-insensitive)", c["valid"] and c["discount_amount"] == 40.0)
check("coupon min spend enforced", not client.post("/api/coupons/apply", json={"code": "AURA20", "cart_total": 10}).get_json()["valid"])
check("garbage cart_total does not crash", client.post("/api/coupons/apply", json={"code": "AURA20", "cart_total": "abc"}).status_code == 200)

# ---------- orders: prices come from the server ----------
base = {"customer_name": "Test", "customer_email": "t@example.com", "customer_phone": "555",
        "shipping_address": "1 Road", "city": "Town", "postal_code": "123", "payment_method": "Card"}
stock_before = client.get("/api/products/prod-001").get_json()["product"]["inventory"]["L"]
res = client.post("/api/orders", json={**base, "coupon_code": "AURA20", "subtotal": 1, "discount_amount": 1, "shipping_fee": 0,
    "items": [{"product_id": "prod-001", "size": "L", "quantity": 1, "unit_price": 0.01}]})
o = res.get_json()["order"]
check("tampered prices ignored (110 - 20% + 15 shipping)", res.status_code == 200 and o["subtotal"] == 110.0 and o["discount_amount"] == 22.0 and o["shipping_fee"] == 15.0 and o["total_amount"] == 103.0)
check("order items use catalogue price and local image", o["items"][0]["unit_price"] == 110.0 and o["items"][0]["product_image"].startswith("/img/"))
stock_after = client.get("/api/products/prod-001").get_json()["product"]["inventory"]["L"]
check("stock decremented", stock_after == stock_before - 1)

res = client.post("/api/orders", json={**base, "items": [{"product_id": "prod-001", "size": "L", "quantity": 2}]})
check("free shipping at $150+", res.get_json()["order"]["shipping_fee"] == 0.0)
check("invalid size rejected", client.post("/api/orders", json={**base, "items": [{"product_id": "prod-001", "size": "XS", "quantity": 1}]}).status_code == 400)
check("bad quantity rejected", client.post("/api/orders", json={**base, "items": [{"product_id": "prod-001", "size": "L", "quantity": 99}]}).status_code == 400)
check("unknown product rejected", client.post("/api/orders", json={**base, "items": [{"product_id": "zzz", "size": "L", "quantity": 1}]}).status_code == 400)
check("missing field rejected", client.post("/api/orders", json={"items": []}).status_code == 400)

# ---------- customer ----------
res = client.post("/api/auth/login", json={"email": "user@aurastudios.com", "password": "user"})
check("customer login", res.status_code == 200)
html = client.get("/account").get_data(as_text=True)
check("account page lists orders without external images", "ORD-78219" in html and "unsplash" not in html)
check("customer cannot reach admin API", client.get("/api/admin/stats").status_code == 403)
check("short password rejected on register", client.post("/api/auth/register", json={"email": "n@e.com", "password": "123", "full_name": "N"}).status_code == 400)

print("\nALL TESTS PASSED")
