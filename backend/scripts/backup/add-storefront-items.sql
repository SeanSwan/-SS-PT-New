-- PostgreSQL-compatible version - FINAL CORRECT PACKAGES (FIXED ON MAY 16, 2025)
-- This file contains the EXACT 8 packages that should appear in the storefront.
-- WARNING: Do not modify the package names, counts, or prices unless instructed.

-- Add price column if it doesn't exist (only runs if needed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'storefront_items' AND column_name = 'price'
    ) THEN
        ALTER TABLE storefront_items 
        ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Clear ALL existing packages first (IMPORTANT - prevents duplicates)
DELETE FROM storefront_items WHERE 1=1;
-- Reset the sequence
ALTER SEQUENCE storefront_items_id_seq RESTART WITH 1;

-- Insert the EXACT 8 PACKAGES - DO NOT MODIFY UNLESS INSTRUCTED
-- =========================================================================

-- FIXED PACKAGES (4) - Session-based packages
INSERT INTO storefront_items 
("packageType", name, description, price, sessions, "pricePerSession", "totalCost", theme, "displayOrder", "isActive", "createdAt", "updatedAt") 
VALUES 
('fixed', 'Single Session', 'Try a premium training session with Sean Swan.', 175.00, 1, 175.00, 175.00, 'ruby', 1, true, NOW(), NOW()),
('fixed', 'Silver Package', 'Perfect starter package with 8 premium training sessions.', 1320.00, 8, 165.00, 1320.00, 'emerald', 2, true, NOW(), NOW()),
('fixed', 'Gold Package', 'Comprehensive training with 20 sessions for serious results.', 3100.00, 20, 155.00, 3100.00, 'cosmic', 3, true, NOW(), NOW()),
('fixed', 'Platinum Package', 'Ultimate transformation with 50 premium sessions.', 7500.00, 50, 150.00, 7500.00, 'purple', 4, true, NOW(), NOW());

-- MONTHLY PACKAGES (4) - Subscription-based packages with sessions per week
INSERT INTO storefront_items 
("packageType", name, description, price, months, "sessionsPerWeek", "pricePerSession", "totalSessions", "totalCost", theme, "displayOrder", "isActive", "createdAt", "updatedAt") 
VALUES 
('monthly', '3-Month Excellence', 'Intensive 3-month program with 4 sessions per week.', 6960.00, 3, 4, 145.00, 48, 6960.00, 'emerald', 5, true, NOW(), NOW()),
('monthly', '6-Month Mastery', 'Build lasting habits with 6 months of consistent training.', 13680.00, 6, 4, 142.50, 96, 13680.00, 'cosmic', 6, true, NOW(), NOW()),
('monthly', '9-Month Transformation', 'Complete lifestyle transformation over 9 months.', 20340.00, 9, 4, 141.25, 144, 20340.00, 'ruby', 7, true, NOW(), NOW()),
('monthly', '12-Month Elite Program', 'The ultimate yearly commitment for maximum results.', 26880.00, 12, 4, 140.00, 192, 26880.00, 'purple', 8, true, NOW(), NOW());

-- =========================================================================
-- VERIFICATION SECTION - Uncomment to check results
-- SELECT COUNT(*) as total_packages FROM storefront_items; -- Should show 8
-- SELECT name, "packageType", sessions, months, "pricePerSession", price FROM storefront_items ORDER BY "displayOrder";

-- IMPORTANT: After running this script, refresh your browser to see changes.
