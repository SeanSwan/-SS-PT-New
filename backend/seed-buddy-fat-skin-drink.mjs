/**
 * seed-buddy-fat-skin-drink.mjs
 * ============================================================================
 * Seeds the flagship physical product — the "Buddy Fat Skin" recovery drink —
 * with 4 variants (Organic / Everyday × 1.5L / 16oz). Commerce expansion Phase 1.
 *
 * SAFETY:
 * - Idempotent: skips if the product already exists (matched by name).
 * - Seeds the product as isActive=FALSE so it CANNOT surface in the storefront
 *   until Sean explicitly activates it — gated on the county health permit +
 *   Stripe Tax enablement. Run, review, then flip isActive when cleared to sell.
 * - Run manually:  node backend/seed-buddy-fat-skin-drink.mjs   (do NOT auto-run)
 *
 * Pricing is a recommended starting point — adjust to real organic ingredient
 * costs (Costco / Sprouts, 92807). Non-organic ("Everyday") uses clean but
 * non-certified ingredients at a lower price point.
 * See docs/ai-workflow/brainstorms/storefront-commerce-expansion-2026-06-13.md
 */
import sequelize from './database.mjs';
import StorefrontItem from './models/StorefrontItem.mjs';
import ProductVariant from './models/ProductVariant.mjs';

const PRODUCT_NAME = 'Buddy Fat Skin Recovery Drink';

const VARIANTS = [
  { label: 'Organic · 1.5L Day Bottle', price: 24.00, sku: 'BFS-ORG-1500', attributes: { tier: 'organic', size: '1.5L' }, displayOrder: 1 },
  { label: 'Organic · 16oz Trial',      price: 9.00,  sku: 'BFS-ORG-0473', attributes: { tier: 'organic', size: '16oz' }, displayOrder: 2 },
  { label: 'Everyday · 1.5L Day Bottle', price: 17.00, sku: 'BFS-STD-1500', attributes: { tier: 'standard', size: '1.5L' }, displayOrder: 3 },
  { label: 'Everyday · 16oz Trial',      price: 6.50,  sku: 'BFS-STD-0473', attributes: { tier: 'standard', size: '16oz' }, displayOrder: 4 },
];

async function seed() {
  try {
    const existing = await StorefrontItem.findOne({ where: { name: PRODUCT_NAME } });
    if (existing) {
      console.log(`"${PRODUCT_NAME}" already exists (id=${existing.id}); skipping product create.`);
      return;
    }

    const product = await StorefrontItem.create({
      name: PRODUCT_NAME,
      description:
        'Organic anti-inflammation recovery drink — green tea, lemon, ginger, honey, '
        + 'cinnamon, and a touch of cayenne. Made fresh, local-first. Also available in a '
        + 'lower-priced Everyday tier made with clean (non-certified-organic) ingredients.',
      packageType: 'fixed',     // schema requires a packageType; products use 'fixed'
      price: 24.00,             // base/display price (organic 1.5L); variants override
      totalCost: 24.00,
      pricePerSession: 0,       // not applicable to products; column is NOT NULL
      sessions: 0,
      itemKind: 'physical_product',
      isTaxable: true,          // physical goods ARE CA sales-taxable (services are not)
      fulfillmentType: 'local_delivery',
      isActive: false,          // GATED: activate only after health permit + Stripe Tax
      displayOrder: 1,
    });

    for (const v of VARIANTS) {
      await ProductVariant.create({
        storefrontItemId: product.id,
        label: v.label,
        sku: v.sku,
        price: v.price,
        stockQuantity: null,    // made-to-order; not inventory-tracked
        attributes: v.attributes,
        displayOrder: v.displayOrder,
        isActive: true,
      });
    }

    console.log(`Seeded "${PRODUCT_NAME}" (id=${product.id}, isActive=false) with ${VARIANTS.length} variants.`);
    console.log('Activate when cleared to sell:  UPDATE storefront_items SET "isActive"=true WHERE id=' + product.id + ';');
  } catch (error) {
    console.error('Failed to seed Buddy Fat Skin drink:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

seed();
