/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          E-COMMERCE STOREFRONT ITEMS CATALOG MIGRATION                    ║
 * ║       (Personal Training Session Packages & Stripe Integration)          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Create storefront catalog for PT session packages (fixed, monthly,
 *          custom) with Stripe product/price integration
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * E-Commerce Flow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Storefront Catalog → Add to Cart → Checkout → Stripe Payment → Purchase │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Relationship Diagram:
 * ┌────────────────────┐         ┌────────────────┐         ┌──────────────┐
 * │ Storefront Items   │         │   Cart Items   │         │    Users     │
 * │   (Catalog)        │         │   (Session)    │         │  (Buyers)    │
 * │                    │         │                │         │              │
 * │ - id (PK)          │◄────────│ - itemId (FK)  │────────►│ - id (PK)    │
 * │ - name             │         │ - userId (FK)  │         │ - email      │
 * │ - price            │         │ - quantity     │         │ - role       │
 * │ - stripeProductId  │         └────────────────┘         └──────────────┘
 * │ - stripePriceId    │                 │
 * │ - isActive         │                 ▼
 * └────────────────────┘         ┌────────────────┐
 *         │                      │     Orders     │
 *         │                      │  (Purchases)   │
 *         └─────────────────────►│ - itemId (FK)  │
 *                                │ - userId (FK)  │
 *                                │ - stripeSessId │
 *                                └────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  DATABASE ERD - STOREFRONT CATALOG                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * storefront_items Table:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Table: storefront_items                                                  │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ id                   │ INTEGER (PK, Auto-increment)                      │
 * │ packageType          │ STRING ('fixed', 'monthly', 'custom')             │
 * │ name                 │ STRING (NOT NULL) - Display name                  │
 * │ description          │ TEXT (Markdown-formatted description)             │
 * │ price                │ FLOAT (Upfront cost for fixed packages)           │
 * │ sessions             │ INTEGER (Session count for fixed packages)        │
 * │ pricePerSession      │ FLOAT (NOT NULL) - Price per individual session   │
 * │ months               │ INTEGER (Duration for monthly packages)           │
 * │ sessionsPerWeek      │ INTEGER (Frequency for monthly packages)          │
 * │ totalSessions        │ INTEGER (Calculated: months * sessionsPerWeek * 4)│
 * │ totalCost            │ FLOAT (Calculated: totalSessions * pricePerSession)│
 * │ imageUrl             │ STRING (Package card image)                       │
 * │ theme                │ STRING ('cosmic', 'fire', 'ocean', 'forest')      │
 * │ stripeProductId      │ STRING (Stripe Product ID)                        │
 * │ stripePriceId        │ STRING (Stripe Price ID)                          │
 * │ isActive             │ BOOLEAN (Default: true) - Catalog visibility      │
 * │ createdAt            │ DATE (Auto-managed)                               │
 * │ updatedAt            │ DATE (Auto-managed)                               │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ INDEXES              │ packageType, theme, isActive                      │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         DATA FLOW DIAGRAM                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Package Purchase Flow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. STOREFRONT DISPLAY                                                     │
 * │    GET /api/storefront → Fetch all active packages                        │
 * │    ↓                                                                      │
 * │    SELECT * FROM storefront_items WHERE isActive = true                  │
 * │      ORDER BY packageType, price ASC                                     │
 * │    ↓                                                                      │
 * │    Group by packageType:                                                 │
 * │      - Fixed Packages: 5-session, 10-session, 20-session bundles         │
 * │      - Monthly Packages: 1-month, 3-month, 6-month subscriptions         │
 * │      - Custom Packages: Build-your-own session packages                  │
 * │    ↓                                                                      │
 * │    Display: Package cards with name, description, price, theme           │
 * │                                                                           │
 * │ 2. ADD TO CART                                                           │
 * │    POST /api/cart { itemId: 123, quantity: 1 }                           │
 * │    ↓                                                                      │
 * │    Validate: storefront_items.id = 123 AND isActive = true               │
 * │    ↓                                                                      │
 * │    INSERT INTO cart_items (userId, itemId, quantity, price)              │
 * │      VALUES (user.id, 123, 1, storefrontItem.price)                      │
 * │    ↓                                                                      │
 * │    Return: Cart summary with total cost                                  │
 * │                                                                           │
 * │ 3. CHECKOUT & STRIPE INTEGRATION                                         │
 * │    POST /api/checkout { cartId: "abc-123" }                              │
 * │    ↓                                                                      │
 * │    For each cart item:                                                   │
 * │      a) Fetch storefront_items.stripePriceId                             │
 * │      b) Build Stripe checkout session:                                   │
 * │         stripe.checkout.sessions.create({                                │
 * │           line_items: [{                                                 │
 * │             price: stripePriceId,                                        │
 * │             quantity: cartItem.quantity                                  │
 * │           }],                                                            │
 * │           mode: 'payment',                                               │
 * │           success_url: '/checkout/success',                              │
 * │           cancel_url: '/checkout/cancel'                                 │
 * │         })                                                               │
 * │    ↓                                                                      │
 * │    Redirect user to Stripe hosted checkout page                          │
 * │                                                                           │
 * │ 4. POST-PURCHASE (Stripe Webhook)                                        │
 * │    POST /webhooks/stripe { event: 'checkout.session.completed' }         │
 * │    ↓                                                                      │
 * │    BEGIN TRANSACTION;                                                    │
 * │      a) CREATE Order (userId, itemId, stripePriceId, status='paid')      │
 * │      b) UPDATE User: Grant session credits based on package              │
 * │      c) DELETE cart_items WHERE userId = user.id (clear cart)            │
 * │      d) NOTIFY user: "Purchase confirmed! You have X new sessions"       │
 * │    COMMIT;                                                               │
 * │                                                                           │
 * │ 5. ADMIN MANAGEMENT                                                      │
 * │    PATCH /admin/storefront/:id { isActive: false }                       │
 * │    ↓                                                                      │
 * │    UPDATE storefront_items SET isActive = false WHERE id = :id           │
 * │    ↓                                                                      │
 * │    Package hidden from storefront (existing purchases unaffected)        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY packageType ('fixed', 'monthly', 'custom')?
 * - UI grouping: Display packages in separate tabs/sections
 * - Pricing logic: Fixed packages have upfront price, monthly packages recur
 * - Validation rules: Fixed packages require sessions field, monthly need months
 * - Query optimization: WHERE packageType = 'fixed' for filtered catalog display
 * - Future expansion: Add 'subscription' type for auto-renewing packages
 * - INDEX benefit: Fast filtering by package type
 *
 * WHY INTEGER Primary Key (Not UUID)?
 * - Storefront items are system-defined: Not user-generated, no GDPR concerns
 * - URL friendliness: /storefront/5 simpler than /storefront/abc-123-def-456
 * - Small dataset: Likely < 100 packages total, no scalability concerns
 * - Admin convenience: "Package ID 5" easier to reference than long UUID
 * - Database efficiency: INTEGER PK is 4 bytes vs UUID 16 bytes
 * - Legacy compatibility: Existing codebase may use INTEGER IDs
 *
 * WHY price AND pricePerSession (Two Price Columns)?
 * - price = Upfront cost: Total package price ($500 for 10-session bundle)
 * - pricePerSession = Unit cost: Price per individual session ($50/session)
 * - Discount calculation: price < (sessions * pricePerSession) = bulk discount
 * - Example: 10-session package: price=$450, pricePerSession=$50 (10% bulk discount)
 * - Display flexibility: Show "Save $50!" when price < sessions * pricePerSession
 * - Analytics: Track average revenue per session across package types
 * - NOT NULL on pricePerSession: Always set, price can be NULL for custom packages
 *
 * WHY totalSessions & totalCost (Calculated Columns)?
 * - Denormalized performance: No calculation on every query
 * - Monthly packages: totalSessions = months * sessionsPerWeek * 4 (weeks/month)
 * - totalCost = totalSessions * pricePerSession (for monthly packages)
 * - Display simplicity: Show "48 sessions for $2,400" without frontend calculation
 * - Consistency: Calculated once at package creation (not re-calculated each time)
 * - Nullable: Only applies to monthly packages, NULL for fixed packages
 *
 * WHY stripeProductId & stripePriceId (Two Stripe IDs)?
 * - Stripe data model: Products (metadata) are separate from Prices (payment info)
 * - stripeProductId: Stripe Product object (name, description, images)
 * - stripePriceId: Stripe Price object (amount, currency, recurring interval)
 * - One Product, Multiple Prices: Same product can have different pricing tiers
 * - Sync requirement: Both IDs must be created in Stripe first, then stored here
 * - Checkout integration: stripe.checkout.sessions.create({ price: stripePriceId })
 * - Nullable: Allows manual creation before Stripe sync
 *
 * WHY isActive Boolean (Soft Delete Pattern)?
 * - Catalog management: Admin can hide packages without deleting
 * - Historical data: Past purchases reference storefront_items.id (must exist)
 * - Re-activation: Can re-enable packages (isActive=false → true)
 * - Query pattern: WHERE isActive = true for public storefront display
 * - Analytics: Track which packages were popular (even if now inactive)
 * - No CASCADE issues: Setting isActive=false doesn't break existing orders
 * - INDEX benefit: Fast filtering for active catalog items
 *
 * WHY theme Column ('cosmic', 'fire', 'ocean', 'forest')?
 * - UI theming: Package cards styled with different color schemes
 * - Visual variety: Avoids monotonous storefront display
 * - Brand alignment: Themes match SwanStudios cosmic aesthetic
 * - Default 'cosmic': Purple/blue gradient (signature brand colors)
 * - Future expansion: Could add custom theme colors (JSON column)
 * - Filtering: "Show me all cosmic-themed packages"
 * - INDEX benefit: Query by theme for admin management
 *
 * WHY imageUrl (Not S3 Reference)?
 * - Simple string path: /images/packages/10-session-bundle.png
 * - CDN flexibility: Can be full URL (https://cdn.swanstudios.com/...)
 * - S3 pattern: Store S3 key as string (uploaded separately)
 * - Nullable: Package can display without image (fallback to theme colors)
 * - No FK constraint: Image URLs managed independently (not normalized)
 * - Admin upload flow: Upload image → get URL → set imageUrl on package
 *
 * WHY description TEXT (Not VARCHAR)?
 * - Markdown support: Store formatted descriptions with **bold**, lists, etc.
 * - No length limit: TEXT allows unlimited character count (vs VARCHAR(255))
 * - Rich content: Can include bullet points, links, emojis
 * - Example: "✅ 10 one-on-one sessions\n✅ Personalized NASM workout plans\n✅ Nutrition guidance"
 * - Frontend rendering: Parse markdown to HTML for display
 * - Nullable: Package can have minimal description (name + price only)
 *
 * WHY Transaction-Protected Migration?
 * - Atomic execution: All-or-nothing table creation + indexes
 * - Rollback safety: If index creation fails, entire migration rolls back
 * - Production safety: Prevents partial migration state (table exists, no indexes)
 * - Idempotency checks: showAllTables() prevents duplicate creation
 * - Column addition: addColumnIfMissing() handles schema evolution
 * - Error handling: try/catch with transaction rollback
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          INDEXES & CONSTRAINTS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Indexes Created:
 * 1. idx_storefront_packageType - INDEX (packageType)
 *    - Use case: Filter catalog by package type ("Show fixed packages")
 * 2. idx_storefront_theme - INDEX (theme)
 *    - Use case: Admin management ("Show all cosmic-themed packages")
 * 3. idx_storefront_isActive - INDEX (isActive)
 *    - Use case: Public storefront display (WHERE isActive = true)
 *
 * Future Optimization:
 * - CREATE INDEX idx_storefront_stripe ON storefront_items(stripeProductId, stripePriceId)
 *   - Use case: Reverse lookup from Stripe webhook (find item by Stripe IDs)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Admin-only writes: Only admins can CREATE/UPDATE/DELETE storefront items
 * - Public read access: Anyone can view active packages (WHERE isActive = true)
 * - Stripe ID validation: Verify Stripe IDs exist before storing
 * - Price integrity: Server-side price validation (no client manipulation)
 * - Soft delete: isActive=false hides packages (no CASCADE delete issues)
 * - Webhook verification: Stripe webhook signatures verified before fulfillment
 * - SQL injection: Parameterized queries prevent injection attacks
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Idempotent design: showAllTables() check prevents duplicate creation
 * - Column addition: addColumnIfMissing() handles schema evolution gracefully
 * - Transaction protection: Atomic table + index creation (rollback on error)
 * - Safe for production: CREATE TABLE is non-destructive
 * - No data loss: down() migration only drops table (no external dependencies)
 * - INTEGER PK: Auto-increment handled by database
 * - Default values: isActive=true, packageType='fixed', theme='cosmic'
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On: None (standalone table)
 *
 * Related Code:
 * - backend/models/StorefrontItem.cjs (Sequelize model)
 * - backend/controllers/storefrontController.mjs (CRUD operations)
 * - backend/routes/storefrontRoutes.mjs (API endpoints)
 * - backend/services/stripeService.mjs (Stripe product/price sync)
 * - frontend/src/pages/Storefront.tsx (Public catalog display)
 *
 * Related Migrations:
 * - 20250213192608-create-cart-items.cjs (Shopping cart junction table)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Executing migration: 20250213192601-create-storefront-items');

      // Check if table exists (Idempotency)
      const tables = await queryInterface.showAllTables({ transaction });
      if (!tables.includes('storefront_items')) {
        console.log('Table storefront_items does not exist. Creating table...');
        await queryInterface.createTable('storefront_items', {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
          packageType: { type: Sequelize.STRING, allowNull: false, defaultValue: 'fixed' }, // STRING type for simplicity
          name: { type: Sequelize.STRING, allowNull: false },
          description: { type: Sequelize.TEXT, allowNull: true },
          price: { type: Sequelize.FLOAT, allowNull: true }, // Changed to FLOAT to match model
          sessions: { type: Sequelize.INTEGER, allowNull: true },
          pricePerSession: { type: Sequelize.FLOAT, allowNull: false }, // Changed to FLOAT to match model
          months: { type: Sequelize.INTEGER, allowNull: true },
          sessionsPerWeek: { type: Sequelize.INTEGER, allowNull: true },
          totalSessions: { type: Sequelize.INTEGER, allowNull: true },
          totalCost: { type: Sequelize.FLOAT, allowNull: true }, // Changed to FLOAT to match model
          imageUrl: { type: Sequelize.STRING, allowNull: true },
          theme: { type: Sequelize.STRING, allowNull: true, defaultValue: 'cosmic' }, // STRING type for simplicity
          stripeProductId: { type: Sequelize.STRING, allowNull: true }, // Added field
          stripePriceId: { type: Sequelize.STRING, allowNull: true }, // Added field
          isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false }, // Added field
          createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        }, { transaction });
        console.log('Table storefront_items created.');

        // Add indexes
        await queryInterface.addIndex('storefront_items', ['packageType'], { transaction });
        await queryInterface.addIndex('storefront_items', ['theme'], { transaction });
        await queryInterface.addIndex('storefront_items', ['isActive'], { transaction });
        console.log('Indexes added.');
      } else {
        console.log('Table storefront_items already exists. Checking for missing columns...');
        // Add missing columns if table exists (more robust idempotency)
        const columns = await queryInterface.describeTable('storefront_items', { transaction });

        const addColumnIfMissing = async (colName, definition) => {
          if (!columns[colName]) {
            await queryInterface.addColumn('storefront_items', colName, definition, { transaction });
            console.log(`Added missing column: ${colName}`);
          }
        };

        // Define columns to add/check
        await addColumnIfMissing('price', { type: Sequelize.FLOAT, allowNull: true }); // Changed to FLOAT
        await addColumnIfMissing('stripeProductId', { type: Sequelize.STRING, allowNull: true });
        await addColumnIfMissing('stripePriceId', { type: Sequelize.STRING, allowNull: true });
        await addColumnIfMissing('isActive', { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false });

        // Optional: Add checks/warnings for existing column types if needed
        console.log('Column check complete.');
      }

      await transaction.commit();
      console.log('Migration 20250213192601-create-storefront-items completed successfully.');

    } catch (err) {
      await transaction.rollback();
      console.error("Migration 20250213192601-create-storefront-items failed:", err);
      throw err; // Re-throw error to halt migration process
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Reverting migration 20250213192601-create-storefront-items...');
      await queryInterface.dropTable('storefront_items', { transaction });
      // No ENUM types to drop, as we are using STRING in the migration
      await transaction.commit();
      console.log('Migration 20250213192601-create-storefront-items reverted.');
    } catch (err) {
      await transaction.rollback();
      console.error("Rollback for 20250213192601-create-storefront-items failed:", err);
      throw err;
    }
  },
};