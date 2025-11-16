/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           SHOPPING CART ITEMS JUNCTION TABLE MIGRATION                    ║
 * ║        (Many-to-Many: Shopping Carts ↔ Storefront Items)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Track individual items in shopping carts with quantity and price
 *          snapshot (M:M junction table for e-commerce)
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Shopping Cart Workflow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Browse Storefront → Add to Cart → Update Quantity → Checkout → Purchase │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Relationship Diagram:
 * ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
 * │ Shopping Carts   │        │   Cart Items     │        │ Storefront Items │
 * │                  │        │   (Junction)     │        │   (Products)     │
 * │ - id (PK)        │◄───────│ - cartId (FK)    │───────►│ - id (PK)        │
 * │ - userId (FK)    │        │ - storefrontId   │        │ - name           │
 * │ - status (ENUM)  │        │ - quantity       │        │ - price          │
 * └──────────────────┘        │ - price (snapshot)│       │ - isActive       │
 *         │                   └──────────────────┘        └──────────────────┘
 *         │
 *         ▼
 * ┌──────────────────┐
 * │     Users        │
 * │ - id (PK)        │
 * │ - email          │
 * └──────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  DATABASE ERD - CART ITEMS JUNCTION                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * cart_items Table (Junction with Quantity + Price Snapshot):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Table: cart_items                                                        │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ id                   │ INTEGER (PK, Auto-increment)                      │
 * │ cartId               │ INTEGER (FK → shopping_carts.id)                 │
 * │ storefrontItemId     │ INTEGER (FK → storefront_items.id)               │
 * │ quantity             │ INTEGER (NOT NULL, Default: 1) - Item count      │
 * │ price                │ FLOAT (NOT NULL) - Price snapshot at add-to-cart │
 * │ createdAt            │ DATE (Auto-managed)                              │
 * │ updatedAt            │ DATE (Auto-managed)                              │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ CASCADE DELETE       │ cartId, storefrontItemId (both CASCADE)          │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         DATA FLOW DIAGRAM                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Shopping Cart Operations:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. ADD ITEM TO CART                                                       │
 * │    POST /api/cart/add { storefrontItemId: 5, quantity: 1 }               │
 * │    ↓                                                                      │
 * │    Check: Does user have active cart?                                    │
 * │      SELECT * FROM shopping_carts WHERE                                  │
 * │        userId = user.id AND status = 'active'                            │
 * │    ↓                                                                      │
 * │    If NO active cart:                                                    │
 * │      INSERT INTO shopping_carts (userId, status='active')                │
 * │      cartId = new cart's id                                              │
 * │    If YES:                                                               │
 * │      cartId = existing cart's id                                         │
 * │    ↓                                                                      │
 * │    Check: Is item already in cart?                                       │
 * │      SELECT * FROM cart_items WHERE                                      │
 * │        cartId = cartId AND storefrontItemId = 5                          │
 * │    ↓                                                                      │
 * │    If item exists:                                                       │
 * │      UPDATE cart_items SET quantity += 1 WHERE id = item.id              │
 * │    If new item:                                                          │
 * │      Fetch current price: storefrontItem.price                           │
 * │      INSERT INTO cart_items (                                            │
 * │        cartId, storefrontItemId, quantity=1, price=storefrontItem.price  │
 * │      )                                                                   │
 * │    ↓                                                                      │
 * │    Return: Cart summary with total cost                                  │
 * │                                                                           │
 * │ 2. UPDATE QUANTITY                                                       │
 * │    PATCH /api/cart/items/:id { quantity: 3 }                             │
 * │    ↓                                                                      │
 * │    Validate: quantity > 0 (if 0, use DELETE instead)                     │
 * │    ↓                                                                      │
 * │    UPDATE cart_items SET quantity = 3 WHERE id = :id                     │
 * │    ↓                                                                      │
 * │    Recalculate cart total: SUM(price * quantity) for all items           │
 * │                                                                           │
 * │ 3. REMOVE ITEM                                                           │
 * │    DELETE /api/cart/items/:id                                            │
 * │    ↓                                                                      │
 * │    DELETE FROM cart_items WHERE id = :id AND cartId = user's active cart │
 * │    ↓                                                                      │
 * │    If cart now empty:                                                    │
 * │      DELETE FROM shopping_carts WHERE id = cartId                        │
 * │                                                                           │
 * │ 4. CHECKOUT FLOW                                                         │
 * │    POST /api/checkout                                                    │
 * │    ↓                                                                      │
 * │    Fetch all cart items:                                                 │
 * │      SELECT * FROM cart_items WHERE cartId = user's active cart          │
 * │        JOIN storefront_items (get stripePriceId)                         │
 * │    ↓                                                                      │
 * │    Build Stripe line items:                                              │
 * │      line_items: [                                                       │
 * │        { price: storefrontItem.stripePriceId, quantity: cartItem.quantity }│
 * │      ]                                                                   │
 * │    ↓                                                                      │
 * │    Create Stripe checkout session → Redirect to Stripe                   │
 * │                                                                           │
 * │ 5. POST-PURCHASE CLEANUP (Stripe Webhook)                                │
 * │    POST /webhooks/stripe { event: 'checkout.session.completed' }         │
 * │    ↓                                                                      │
 * │    BEGIN TRANSACTION;                                                    │
 * │      a) Create Order records from cart_items                             │
 * │      b) DELETE FROM cart_items WHERE cartId = cartId                     │
 * │      c) DELETE FROM shopping_carts WHERE id = cartId                     │
 * │    COMMIT;                                                               │
 * │    ↓                                                                      │
 * │    Cart cleared, user can start new cart                                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Junction Table (Not Just Store Item IDs in Cart)?
 * - Normalized design: Each cart-item relationship is a separate row
 * - Quantity tracking: Each item can have quantity > 1
 * - Price snapshot: Stores price at time of add-to-cart (protects against price changes)
 * - Multiple items: One cart can contain many different storefront items
 * - Easy updates: UPDATE quantity or DELETE item without affecting other items
 * - SQL queries: SUM(price * quantity) for cart total is straightforward
 * - Standard pattern: E-commerce best practice (Amazon, Shopify, etc.)
 *
 * WHY price Snapshot (Not Just Reference storefront_items.price)?
 * - Price stability: User adds item at $50, price changes to $60, cart still shows $50
 * - User trust: "I added this at $50, why is checkout $60?" confusion avoided
 * - Checkout consistency: Cart total matches what user saw when adding items
 * - Admin flexibility: Can update storefront prices without affecting active carts
 * - Abandoned cart recovery: Email shows original price user saw
 * - Historical accuracy: If item price changes, cart reflects add-to-cart price
 * - Standard practice: All e-commerce platforms snapshot prices
 *
 * WHY quantity Column (Not Create Multiple Rows)?
 * - Efficiency: One row for "10-session package x3" vs three separate rows
 * - Atomic updates: UPDATE quantity = 5 vs DELETE + INSERT multiple rows
 * - Cart display: Show "Qty: 3" next to item (not three separate line items)
 * - Stock validation: Easy to check if storefrontItem.stock >= cartItem.quantity
 * - Stripe integration: line_items: [{ price: stripePriceId, quantity: 3 }]
 * - Standard pattern: All shopping carts use quantity field
 *
 * WHY CASCADE DELETE (Both Foreign Keys)?
 * - Cart deletion cleanup: If cart deleted, remove all cart items (no orphans)
 * - Storefront item deletion: If product discontinued, remove from all carts
 * - Data integrity: No orphaned cart_items rows pointing to nonexistent carts/items
 * - User experience: If user clears cart, all items removed in one operation
 * - Admin workflow: Deactivating storefront item removes it from all carts
 * - GDPR compliance: User deletion cascades to cart → cart_items (full cleanup)
 *
 * WHY INTEGER Primary Key (Not UUID)?
 * - Small dataset: Cart items are temporary (deleted after checkout)
 * - Performance: INTEGER join/index faster than UUID (4 bytes vs 16 bytes)
 * - Short-lived data: No need for globally unique IDs (cart-scoped)
 * - Auto-increment: Database handles ID generation (no UUID generation overhead)
 * - Legacy compatibility: Matches storefront_items and shopping_carts PK type
 * - URL simplicity: /cart/items/123 vs /cart/items/abc-def-ghi
 *
 * WHY No Unique Constraint (cartId, storefrontItemId)?
 * - Current design: Allows duplicate items (rare, but possible)
 * - Alternative approach: Some systems enforce UNIQUE(cartId, storefrontItemId)
 * - Trade-off: No unique constraint = simpler INSERT logic (no ON CONFLICT needed)
 * - Application logic: Controller checks for duplicates and updates quantity
 * - Future consideration: Could add unique constraint if duplication becomes issue
 *
 * WHY createdAt Timestamp?
 * - Cart abandonment: Track when item was added
 * - Analytics: "Items added 7 days ago but not purchased" = abandoned cart
 * - Email campaigns: Send reminder "You have items in your cart" after 24 hours
 * - User behavior: Track time between add-to-cart and checkout
 * - Sorting: Display cart items in order added (ORDER BY createdAt)
 *
 * WHY updatedAt Timestamp?
 * - Quantity changes: Track when user changed quantity from 1 → 3
 * - Cart activity: Detect if user actively managing cart vs abandoned
 * - Debugging: Investigate "Why did cart total change?" issues
 * - Analytics: updatedAt >> createdAt = user is actively shopping
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          INDEXES & CONSTRAINTS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * No indexes added (foreign keys automatically indexed by most databases).
 *
 * Future Optimization:
 * - CREATE INDEX idx_cart_items_cart ON cart_items(cartId)
 *   - Use case: Fetch all items in a cart (already indexed via FK in most DBs)
 * - CREATE UNIQUE INDEX idx_cart_items_unique ON cart_items(cartId, storefrontItemId)
 *   - Use case: Enforce one row per cart-item pair (prevent duplicates)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - User isolation: Users can only modify items in their own cart (verify cartId ownership)
 * - Price validation: Server fetches current price, client cannot manipulate
 * - Stock validation: Check storefrontItem.stock >= quantity before checkout
 * - CASCADE delete: Cart deletion removes all items (no orphaned data)
 * - Quantity limits: Enforce max quantity per item (prevent abuse)
 * - Active cart check: Only one active cart per user (prevent cart confusion)
 * - SQL injection: Parameterized queries for all cart operations
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Safe for production: CREATE TABLE is non-destructive
 * - Foreign key dependencies: Requires shopping_carts and storefront_items tables
 * - CASCADE behavior: Automatic cleanup on cart/item deletion
 * - No data loss: down() migration drops table cleanly (temporary data only)
 * - Integer PK: Auto-increment handled by database
 * - Default values: quantity=1 (user adds one item at a time)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - 20250213192601-create-storefront-items.cjs (storefront_items table)
 * - Migration for shopping_carts table (must exist)
 *
 * Related Code:
 * - backend/models/CartItem.cjs (Sequelize model)
 * - backend/controllers/cartController.mjs (add/update/remove items)
 * - backend/routes/cartRoutes.mjs (API endpoints)
 * - frontend/src/components/Cart/CartItem.tsx (UI for cart items)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('cart_items', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      cartId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'shopping_carts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      storefrontItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'storefront_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      price: {
        // Price per unit at the time of adding to cart.
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('cart_items');
  }
};