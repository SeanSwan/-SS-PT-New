-- EMERGENCY: Direct SQL Fix for UUID vs INTEGER Mismatches
-- ========================================================
-- This script fixes all UUID foreign key issues in one go

-- Step 1: Drop all dependent tables first (in correct order)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS shopping_carts CASCADE;
DROP TABLE IF EXISTS food_scan_history CASCADE;

-- Step 2: Recreate shopping_carts with correct UUID userId
CREATE TABLE shopping_carts (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 3: Recreate cart_items
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    "cartId" INTEGER NOT NULL REFERENCES shopping_carts(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "storefrontItemId" INTEGER NOT NULL REFERENCES storefront_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 4: Recreate orders with correct UUID userId
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    "cartId" INTEGER REFERENCES shopping_carts(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "orderNumber" VARCHAR(255) NOT NULL UNIQUE,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'refunded', 'failed')),
    "paymentMethod" VARCHAR(255),
    "paymentId" VARCHAR(255),
    "stripePaymentIntentId" VARCHAR(255),
    "billingEmail" VARCHAR(255),
    "billingName" VARCHAR(255),
    "shippingAddress" JSON,
    notes TEXT,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 5: Recreate order_items
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    "orderId" INTEGER NOT NULL REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "storefrontItemId" INTEGER NOT NULL REFERENCES storefront_items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    "itemType" VARCHAR(255),
    "imageUrl" VARCHAR(255),
    metadata JSON,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 6: Recreate food_scan_history with correct UUID userId
CREATE TABLE food_scan_history (
    id SERIAL PRIMARY KEY,
    "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "productName" VARCHAR(255) NOT NULL,
    "productCode" VARCHAR(255),
    "scanDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "nutritionData" JSON,
    "imageUrl" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 7: Add performance indexes
CREATE INDEX idx_shopping_carts_userid ON shopping_carts("userId");
CREATE INDEX idx_cart_items_cartid ON cart_items("cartId");
CREATE INDEX idx_cart_items_storefrontitemid ON cart_items("storefrontItemId");
CREATE INDEX idx_orders_userid ON orders("userId");
CREATE INDEX idx_orders_ordernumber ON orders("orderNumber");
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_createdat ON orders("createdAt");
CREATE INDEX idx_order_items_orderid ON order_items("orderId");
CREATE INDEX idx_order_items_storefrontitemid ON order_items("storefrontItemId");
CREATE INDEX idx_food_scan_history_userid ON food_scan_history("userId");
CREATE INDEX idx_food_scan_history_scandate ON food_scan_history("scanDate");

-- Step 8: Update SequelizeMeta to mark all these migrations as complete
INSERT INTO "SequelizeMeta" (name) VALUES 
    ('20250213192604-create-shopping-carts.cjs'),
    ('20250213192608-create-cart-items.cjs'),
    ('20250506000001-create-orders.cjs'),
    ('20250506000002-create-food-scanner.cjs')
ON CONFLICT (name) DO NOTHING;
