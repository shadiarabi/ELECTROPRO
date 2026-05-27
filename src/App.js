-- ============================================
-- Add discount support to invoices
-- Run in Supabase SQL Editor → New Query
-- ============================================

-- Add discount columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'fixed';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) DEFAULT 0;

-- Add discount columns to invoice_items table
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) DEFAULT 0;
