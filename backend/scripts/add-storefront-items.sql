-- PostgreSQL-compatible version

-- Add price column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'storefront_items' AND column_name = 'price'
    ) THEN
        ALTER TABLE storefront_items 
        ADD COLUMN price FLOAT NOT NULL DEFAULT 0;
    END IF;
END $$;

-- First delete any items with the same IDs to prevent errors
DELETE FROM storefront_items WHERE id IN (1, 2, 3, 4, 6, 9, 12);

-- Insert fixed packages with minimal fields
INSERT INTO storefront_items 
(id, "packageType", name, description, price, sessions, "pricePerSession", "totalCost", "createdAt", "updatedAt") 
VALUES 
(1, 'fixed', 'Gold Glimmer', 'An introductory 8-session package to ignite your transformation.', 1400, 8, 175, 1400, NOW(), NOW()),
(2, 'fixed', 'Platinum Pulse', 'Elevate your performance with 20 dynamic sessions.', 3300, 20, 165, 3300, NOW(), NOW()),
(3, 'fixed', 'Rhodium Rise', 'Unleash your inner champion with 50 premium sessions.', 7500, 50, 150, 7500, NOW(), NOW());

-- Insert monthly packages with minimal fields
INSERT INTO storefront_items 
(id, "packageType", name, description, price, months, "sessionsPerWeek", "pricePerSession", "totalSessions", "totalCost", "createdAt", "updatedAt") 
VALUES 
(4, 'monthly', 'Silver Storm', 'High intensity 3-month program at 4 sessions per week.', 7440, 3, 4, 155, 48, 7440, NOW(), NOW()),
(6, 'monthly', 'Gold Grandeur', 'Maximize your potential with 6 months at 4 sessions per week.', 13920, 6, 4, 145, 96, 13920, NOW(), NOW()),
(9, 'monthly', 'Platinum Prestige', 'The best value – 9 months at 4 sessions per week.', 20160, 9, 4, 140, 144, 20160, NOW(), NOW()),
(12, 'monthly', 'Rhodium Reign', 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.', 25920, 12, 4, 135, 192, 25920, NOW(), NOW());