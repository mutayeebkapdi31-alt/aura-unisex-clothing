-- ============================================================
-- AURA STUDIOS | UNISEX STREETWEAR & LUXURY APPAREL
-- Supabase PostgreSQL Schema & Initial Seed Data
-- ============================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    compare_at_price NUMERIC(10,2),
    description TEXT,
    fit_type TEXT DEFAULT 'Oversized Boxy',
    fabric_weight TEXT DEFAULT '380 GSM Heavy French Terry',
    gender TEXT DEFAULT 'Unisex',
    badge TEXT,
    sizes JSONB DEFAULT '["S", "M", "L", "XL", "XXL"]'::jsonb,
    inventory JSONB DEFAULT '{"S": 15, "M": 25, "L": 30, "XL": 20, "XXL": 10}'::jsonb,
    images JSONB NOT NULL,
    is_featured BOOLEAN DEFAULT true,
    is_new_drop BOOLEAN DEFAULT false,
    rating NUMERIC(2,1) DEFAULT 4.9,
    reviews_count INT DEFAULT 42,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. USERS TABLE (Integrated with Custom Auth or Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'customer', -- 'customer' or 'admin'
    phone TEXT,
    address JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    shipping_address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) DEFAULT 0.00,
    shipping_fee NUMERIC(10,2) DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'
    payment_method TEXT DEFAULT 'Card',
    payment_status TEXT DEFAULT 'Paid',
    tracking_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_image TEXT NOT NULL,
    size TEXT NOT NULL,
    quantity INT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL
);

-- 6. COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT UNIQUE NOT NULL,
    discount_percent INT NOT NULL,
    min_spend NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    verified_buyer BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Row Level Security (RLS) Setup
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Allow public read access on products and categories
CREATE POLICY "Public products viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Public categories viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Public coupons viewable by everyone" ON coupons FOR SELECT USING (true);

-- SEED DATA: COUPONS
INSERT INTO coupons (code, discount_percent, min_spend, is_active)
VALUES 
    ('AURA20', 20, 50.00, true),
    ('BONKERS10', 10, 30.00, true),
    ('VIPDROP', 25, 100.00, true)
ON CONFLICT (code) DO NOTHING;

-- SEED DATA: ADMIN USER
-- Password hash for 'admin123'
INSERT INTO users (id, email, password_hash, full_name, role)
VALUES 
    ('usr-admin-01', 'admin@aurastudios.com', 'pbkdf2:sha256:600000$admin$8f4a21136b856b3e34bcf932c5890e5445ecdeca0b0d6fb9c55bdf465d83637e', 'AURA Executive', 'admin')
ON CONFLICT (email) DO NOTHING;
