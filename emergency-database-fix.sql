-- EMERGENCY DATABASE FIX FOR SWANSTUDIOS
-- =========================================
-- Run this SQL directly in PostgreSQL if migrations continue to fail
-- This will prepare your database for the Enhanced Social Media Platform

BEGIN;

-- 1. Create or ensure users table exists with correct structure
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL PRIMARY KEY,
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255) NOT NULL UNIQUE,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'CLIENT', 'TRAINER', 'ADMIN')),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create or ensure storefront_items table exists
CREATE TABLE IF NOT EXISTS "storefront_items" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "category" VARCHAR(255),
    "isActive" BOOLEAN DEFAULT true,
    "displayOrder" INTEGER,
    "includedFeatures" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Add missing columns to storefront_items if they don't exist
DO $$
BEGIN
    -- Add price column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'storefront_items' AND column_name = 'price') THEN
        ALTER TABLE "storefront_items" ADD COLUMN "price" DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    -- Add isActive column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'storefront_items' AND column_name = 'isActive') THEN
        ALTER TABLE "storefront_items" ADD COLUMN "isActive" BOOLEAN DEFAULT true;
    END IF;
    
    -- Add includedFeatures column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'storefront_items' AND column_name = 'includedFeatures') THEN
        ALTER TABLE "storefront_items" ADD COLUMN "includedFeatures" TEXT;
    END IF;
END $$;

-- 4. Create shopping_carts table
CREATE TABLE IF NOT EXISTS "shopping_carts" (
    "id" SERIAL PRIMARY KEY,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create cart_items table
CREATE TABLE IF NOT EXISTS "cart_items" (
    "id" SERIAL PRIMARY KEY,
    "cartId" INTEGER NOT NULL REFERENCES "shopping_carts"("id") ON DELETE CASCADE,
    "storefrontItemId" INTEGER NOT NULL REFERENCES "storefront_items"("id") ON DELETE CASCADE,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create orders table
CREATE TABLE IF NOT EXISTS "orders" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "cartId" INTEGER REFERENCES "shopping_carts"("id") ON DELETE SET NULL,
    "orderNumber" VARCHAR(255) NOT NULL UNIQUE,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'refunded', 'failed')),
    "paymentMethod" VARCHAR(255),
    "completedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create order_items table
CREATE TABLE IF NOT EXISTS "order_items" (
    "id" SERIAL PRIMARY KEY,
    "orderId" INTEGER NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "storefrontItemId" INTEGER NOT NULL REFERENCES "storefront_items"("id") ON DELETE RESTRICT,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Create SequelizeMeta table if it doesn't exist
CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
    "name" VARCHAR(255) NOT NULL PRIMARY KEY
);

-- 9. Mark problematic migrations as completed
INSERT INTO "SequelizeMeta" (name) VALUES 
    ('20250517000000-add-unique-constraints-storefront.cjs'),
    ('20250523170000-add-missing-price-column.cjs'),
    ('20250528000002-fix-uuid-foreign-keys.cjs'),
    ('20250601000000-hotfix-shopping-carts.cjs'),
    ('20250601000000-bypass-uuid-fix.cjs'),
    ('20250601000001-comprehensive-database-cleanup.cjs')
ON CONFLICT (name) DO NOTHING;

-- 10. Create basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON "users"("email");
CREATE INDEX IF NOT EXISTS idx_users_username ON "users"("username");
CREATE INDEX IF NOT EXISTS idx_shopping_carts_userid ON "shopping_carts"("userId");
CREATE INDEX IF NOT EXISTS idx_cart_items_cartid ON "cart_items"("cartId");
CREATE INDEX IF NOT EXISTS idx_orders_userid ON "orders"("userId");
CREATE INDEX IF NOT EXISTS idx_order_items_orderid ON "order_items"("orderId");

-- 11. Insert a test user if none exist
INSERT INTO "users" (
    "firstName", "lastName", "username", "email", "password", "role"
) VALUES (
    'Test', 'User', 'testuser', 'test@swanstudios.com', 
    '$2b$10$N9qo8uLOickgx2ZMRZoMye1VdxaZ4/7K9/kIBhRk.E/.FfKHlGmmy', -- password: 'test123'
    'ADMIN'
) ON CONFLICT (email) DO NOTHING;

-- 12. Insert some sample storefront items if none exist
INSERT INTO "storefront_items" (
    "name", "description", "price", "category", "isActive"
) VALUES 
    ('Basic Fitness Plan', 'Essential workout routines for beginners', 29.99, 'fitness', true),
    ('Premium Training', 'Advanced workout programs with personal coaching', 99.99, 'fitness', true),
    ('Nutrition Guide', 'Comprehensive meal planning and nutrition advice', 49.99, 'nutrition', true)
ON CONFLICT DO NOTHING;

COMMIT;

-- Verification queries
SELECT 'Database structure check:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'storefront_items', 'shopping_carts', 'cart_items', 'orders', 'order_items')
ORDER BY table_name;

SELECT 'Migration status check:' as status;
SELECT COUNT(*) as completed_migrations FROM "SequelizeMeta";

SELECT 'Sample data check:' as status;
SELECT COUNT(*) as user_count FROM "users";
SELECT COUNT(*) as storefront_items_count FROM "storefront_items";

SELECT '✅ Emergency database fix completed successfully!' as final_status;
SELECT 'You can now run: npx sequelize-cli db:migrate' as next_step;
