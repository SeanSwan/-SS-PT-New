/**
 * Storefront Packages Seeder — 2026-04-07 (corrected 2026-04-08)
 * ==============================================================
 * 5 packages only. ALL 1-hour sessions: $175 flat — NO volume discounts.
 * 30-minute assessment pack: $110/session (10-pack).
 *
 * Run:        node backend/seeders/20260407-seed-storefront-packages.mjs
 * Replace DB: FORCE_RESEED=true node backend/seeders/20260407-seed-storefront-packages.mjs
 */
import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

const PACKAGES = [
  {
    packageType: 'fixed',
    name: 'Single Session',
    description: 'One premium 1-hour personal training session with Sean Swan.',
    sessions: 1, pricePerSession: 175.00,
    totalSessions: 1, totalCost: 175.00, price: 175.00,
    imageUrl: '/assets/images/single-session.jpg',
    isActive: true, displayOrder: 1,
  },
  {
    packageType: 'monthly',
    name: '3-Month Program',
    description: 'Consistent training over 3 months — 4 sessions per week at $175/session.',
    months: 3, sessionsPerWeek: 4,
    totalSessions: 48, pricePerSession: 175.00,
    totalCost: 8400.00, price: 8400.00,
    imageUrl: '/assets/images/3-month-package.jpg',
    isActive: true, displayOrder: 2,
  },
  {
    packageType: 'monthly',
    name: '6-Month Program',
    description: 'Build lasting habits with 6 months of dedicated training — 4 sessions per week.',
    months: 6, sessionsPerWeek: 4,
    totalSessions: 96, pricePerSession: 175.00,
    totalCost: 16800.00, price: 16800.00,
    imageUrl: '/assets/images/6-month-package.jpg',
    isActive: true, displayOrder: 3,
  },
  {
    packageType: 'monthly',
    name: '12-Month Program',
    description: 'Full year commitment for maximum transformation — 4 sessions per week.',
    months: 12, sessionsPerWeek: 4,
    totalSessions: 192, pricePerSession: 175.00,
    totalCost: 33600.00, price: 33600.00,
    imageUrl: '/assets/images/12-month-package.jpg',
    isActive: true, displayOrder: 4,
  },
  {
    packageType: 'fixed',
    name: '30-Minute Assessment Pack',
    description: 'Ten focused 30-minute personal training sessions at $110 per session.',
    sessions: 10, pricePerSession: 110.00,
    totalSessions: 10, totalCost: 1100.00, price: 1100.00,
    imageUrl: '/assets/images/platinum-package.jpg',
    isActive: true, displayOrder: 5,
  },
];

async function seedPackages() {
  try {
    const existing = await StorefrontItem.count();

    if (existing > 0 && process.env.FORCE_RESEED !== 'true') {
      console.log(`Storefront already has ${existing} packages — skipping (use FORCE_RESEED=true to replace).`);
      return [];
    }

    if (existing > 0) {
      // FAIL-CLOSED PAID-HISTORY GUARD.
      // The clear path below is TRUNCATE ... CASCADE, and cart_items/order_items
      // both carry FKs to storefront_items. TRUNCATE CASCADE truncates those
      // dependent tables outright — it does NOT honour the order_items
      // ON DELETE SET NULL tombstone relax — so on a live database this erases
      // the line items of already-paid orders. The model-destroy fallback below
      // deletes them explicitly for the same reason. Financial/audit records are
      // not re-derivable, so refuse rather than ask forgiveness: a catalog fix is
      // an admin-UI edit, never a truncate.
      const { default: OrderItem } = await import('../models/OrderItem.mjs');
      const paidLineItems = await OrderItem.count();
      if (paidLineItems > 0 && process.env.I_ACCEPT_DESTROYING_PAID_ORDER_HISTORY !== 'true') {
        throw new Error(
          `REFUSING TO RESEED: ${paidLineItems} order_items row(s) reference this catalog. ` +
          'FORCE_RESEED truncates storefront_items CASCADE, which would delete paid order ' +
          'line items (unrecoverable financial history). Edit the catalog from the admin ' +
          'storefront UI instead. If you have verified this database is disposable, re-run ' +
          'with I_ACCEPT_DESTROYING_PAID_ORDER_HISTORY=true.'
        );
      }

      console.log(`FORCE_RESEED=true — clearing ${existing} existing packages...`);
      const { default: sequelize } = await import('../database.mjs');
      try {
        await sequelize.query('TRUNCATE TABLE storefront_items RESTART IDENTITY CASCADE;');
        console.log('Cleared via TRUNCATE CASCADE.');
      } catch {
        const { default: CartItem } = await import('../models/CartItem.mjs');
        const { default: OrderItem } = await import('../models/OrderItem.mjs');
        await CartItem.destroy({ where: {} });
        await OrderItem.destroy({ where: {} });
        await StorefrontItem.destroy({ where: {} });
        console.log('Cleared via model destroy.');
      }
    }

    const created = await StorefrontItem.bulkCreate(PACKAGES, {
      validate: true,
      individualHooks: true,
    });

    console.log(`\nSeeded ${created.length} storefront packages:`);
    for (const p of created) {
      console.log(`  #${p.id} ${p.name}: ${p.totalSessions} sessions @ $${p.pricePerSession}/ea = $${p.totalCost}`);
    }

    logger.info(`[StorefrontSeeder] Seeded ${created.length} packages — $175 flat + 30-min $110 pack`);
    return created;
  } catch (error) {
    console.error('Storefront seeder failed:', error.message);
    logger.error('[StorefrontSeeder] Failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  import('../models/index.mjs')
    .then(() => seedPackages())
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedPackages;
