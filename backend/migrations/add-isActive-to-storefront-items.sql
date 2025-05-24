-- Migration: Add isActive column to storefront_items table
-- This fixes the seeding issue seen in production deployment
-- Run this in your PostgreSQL database when convenient

-- Add the missing isActive column
ALTER TABLE storefront_items 
ADD COLUMN "isActive" BOOLEAN DEFAULT true;

-- Update existing records to be active by default
UPDATE storefront_items 
SET "isActive" = true 
WHERE "isActive" IS NULL;

-- Add a comment for documentation
COMMENT ON COLUMN storefront_items."isActive" IS 'Indicates if the storefront item is currently active and available for purchase';

-- Verification query (optional)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'storefront_items' AND column_name = 'isActive';
