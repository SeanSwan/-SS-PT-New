-- Add isActive column to storefront_items table
-- This fixes the seeding error in production

ALTER TABLE storefront_items 
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE storefront_items 
SET "isActive" = true 
WHERE "isActive" IS NULL;

-- Add displayOrder column if it doesn't exist
ALTER TABLE storefront_items 
ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER DEFAULT 1;
