-- ============================================
-- ElectroPro Database Setup
-- Run this in Supabase → SQL Editor → New Query
-- ============================================

-- LOCATIONS table
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default locations
INSERT INTO locations (name) VALUES
  ('Main Warehouse'),
  ('Branch A - Downtown'),
  ('Branch B - Eastside'),
  ('Branch C - Mall');

-- PRODUCTS table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category TEXT,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sell_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- STOCK table (stock per product per location)
CREATE TABLE stock (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, location_id)
);

-- INVOICES table
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  date DATE NOT NULL,
  location_id INTEGER REFERENCES locations(id),
  customer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- INVOICE ITEMS table
CREATE TABLE invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  cost NUMERIC(10,2) NOT NULL
);

-- ============================================
-- Enable Row Level Security (RLS) - keeps data safe
-- ============================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict later with auth)
CREATE POLICY "Allow all" ON locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON stock FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON invoice_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Sample Data (optional - delete if not needed)
-- ============================================
INSERT INTO products (name, sku, category, cost_price, sell_price) VALUES
  ('iPhone 15 Pro', 'APL-IP15P', 'Phones', 850, 1099),
  ('Samsung Galaxy S24', 'SAM-GS24', 'Phones', 700, 899),
  ('MacBook Pro M3', 'APL-MBP-M3', 'Laptops', 1400, 1799),
  ('Sony WH-1000XM5', 'SNY-WH5', 'Audio', 200, 349),
  ('iPad Air 5', 'APL-IPA5', 'Tablets', 450, 599);

-- Add stock for each product at each location
INSERT INTO stock (product_id, location_id, quantity)
SELECT p.id, l.id, 
  CASE WHEN l.name = 'Main Warehouse' THEN 20
       WHEN l.name = 'Branch A - Downtown' THEN 8
       WHEN l.name = 'Branch B - Eastside' THEN 5
       ELSE 10 END
FROM products p CROSS JOIN locations l;
