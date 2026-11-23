import app
import json

client = app.app.test_client()

print("Testing / ...")
res = client.get("/")
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
print("✓ / returns 200")

print("Testing /api/products ...")
res = client.get("/api/products")
assert res.status_code == 200
data = res.get_json()
assert data["success"] is True
assert len(data["products"]) >= 8
print(f"✓ /api/products returns {len(data['products'])} products")

print("Testing /product/<slug> ...")
res = client.get("/product/heavyweight-box-hoodie-acid-charcoal")
assert res.status_code == 200
assert b"Heavyweight Box Hoodie" in res.data
print("✓ /product/<slug> returns 200 with product details")

print("Testing /lookbook ...")
res = client.get("/lookbook")
assert res.status_code == 200
print("✓ /lookbook returns 200")

print("Testing /checkout ...")
res = client.get("/checkout")
assert res.status_code == 200
print("✓ /checkout returns 200")

print("Testing /admin (unauthenticated) ...")
res = client.get("/admin")
assert res.status_code == 200
print("✓ /admin returns login page (200)")

print("Testing Admin Login API ...")
res = client.post("/api/auth/login", json={"email": "admin@aurastudios.com", "password": "admin"})
assert res.status_code == 200
user_data = res.get_json()
assert user_data["user"]["role"] == "admin"
print("✓ Admin Login successful:", user_data["user"]["full_name"])

print("Testing /admin (authenticated) ...")
res = client.get("/admin")
assert res.status_code == 200
assert b"Executive Command System" in res.data or b"EXECUTIVE COMMAND SYSTEM" in res.data
print("✓ Admin Dashboard renders successfully")

print("Testing Coupon API ...")
res = client.post("/api/coupons/apply", json={"code": "AURA20", "cart_total": 200.0})
assert res.status_code == 200
cdata = res.get_json()
assert cdata["valid"] is True
assert cdata["discount_amount"] == 40.0
print(f"✓ Coupon AURA20 verified: -${cdata['discount_amount']}")

print("Testing Order Placement API ...")
order_payload = {
    "customer_name": "Test Customer",
    "customer_email": "test@customer.com",
    "customer_phone": "+1 555-9000",
    "shipping_address": "123 Fashion Way",
    "city": "London",
    "postal_code": "EC1A 1BB",
    "subtotal": 110.0,
    "discount_amount": 22.0,
    "shipping_fee": 0.0,
    "payment_method": "Card",
    "items": [
        {
            "product_id": "prod-001",
            "product_name": "Heavyweight Box Hoodie - Acid Wash Charcoal",
            "product_image": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2",
            "size": "L",
            "quantity": 1,
            "unit_price": 110.0,
            "total_price": 110.0
        }
    ]
}
res = client.post("/api/orders", json=order_payload)
assert res.status_code == 200
ord_data = res.get_json()
assert ord_data["success"] is True
print("✓ Order placed successfully:", ord_data["order"]["id"], "Tracking:", ord_data["order"]["tracking_number"])

print("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")
