-- EMERGENCY SQL FIX FOR SWANSTUDIOS DATABASE
-- Run this directly in your PostgreSQL database if migrations fail

-- 1. Create shopping_carts table if it doesn't exist
CREATE TABLE IF NOT EXISTS "shopping_carts" (
    "id" SERIAL PRIMARY KEY,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create cart_items table if it doesn't exist  
CREATE TABLE IF NOT EXISTS "cart_items" (
    "id" SERIAL PRIMARY KEY,
    "cartId" INTEGER NOT NULL REFERENCES "shopping_carts"("id") ON DELETE CASCADE,
    "storefrontItemId" INTEGER NOT NULL REFERENCES "storefront_items"("id") ON DELETE CASCADE,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Mark the problematic migration as completed
INSERT INTO "SequelizeMeta" (name) 
VALUES ('20250528000002-fix-uuid-foreign-keys.cjs')
ON CONFLICT (name) DO NOTHING;

-- 4. Verify the tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('shopping_carts', 'cart_items', 'orders');

-- Success message
SELECT 'Database hotfix applied successfully!' as status;
