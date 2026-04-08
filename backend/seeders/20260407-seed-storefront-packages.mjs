/**
 * Storefront Packages Seeder — 2026-04-07
 * Seeds 8 packages with graduated volume-discount pricing.
 * Run: node backend/seeders/20260407-seed-storefront-packages.mjs
 */
import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

const PACKAGES = [
  // Fixed session packages
  {
    packageType: 'fixed', name: 'Single Session',
    description: 'Try a premium training session with Sean Swan.',
    sessions: 1, pricePerSession: 175.00, price: 175.00,
    totalSessions: 1, totalCost: 175.00,
    imageUrl: '/assets/images/single-session.jpg',
    isActive: true, displayOrder: 1,
  },
  {
    packageType: 'fixed', name: 'Silver Package',
    description: 'Perfect starter package with 8 premium training sessions.',
    sessions: 8, pricePerSession: 170.00, price: 1360.00,
    totalSessions: 8, totalCost: 1360.00,
    imageUrl: '/assets/images/silver-package.jpg',
    isActive: true, displayOrder: 2,
  },
  {
    packageType: 'fixed', name: 'Gold Package',
    description: 'Comprehensive training with 20 sessions for serious results.',
    sessions: 20, pricePerSession: 165.00, price: 3300.00,
    totalSessions: 20, totalCost: 3300.00,
    imageUrl: '/assets/images/gold-package.jpg',
    isActive: true, displayOrder: 3,
  },
  {
    packageType: 'fixed', name: 'Platinum Package',
    description: 'Ultimate transformation with 50 premium sessions.',
    sessions: 50, pricePerSession: 160.00, price: 8000.00,
    totalSessions: 50, totalCost: 8000.00,
    imageUrl: '/assets/images/platinum-package.jpg',
    isActive: true, displayOrder: 4,
  },
  // Monthly subscription packages (4 sessions/week)
  {
    packageType: 'monthly', name: '3-Month Excellence',
    description: 'Intensive 3-month program with 4 sessions per week.',
    months: 3, sessionsPerWeek: 4, pricePerSession: 155.00,
    totalSessions: 48, price: 7440.00, totalCost: 7440.00,
    imageUrl: '/assets/images/3-month-package.jpg',
    isActive: true, displayOrder: 5,
  },
  {
    packageType: 'monthly', name: '6-Month Mastery',
    description: 'Build lasting habits with 6 months of consistent training.',
    months: 6, sessionsPerWeek: 4, pricePerSession: 150.00,
    totalSessions: 96, price: 14400.00, totalCost: 14400.00,
    imageUrl: '/assets/images/6-month-package.jpg',
    isActive: true, displayOrder: 6,
  },
  {
    packageType: 'monthly', name: '9-Month Transformation',
    description: 'Complete lifestyle transformation over 9 months.',
    months: 9, sessionsPerWeek: 4, pricePerSession: 145.00,
    totalSessions: 144, price: 20880.00, totalCost: 20880.00,
    imageUrl: '/assets/images/9-month-package.jpg',
    isActive: true, displayOrder: 7,
  },
  {
    packageType: 'monthly', name: '12-Month Elite Program',
    description: 'The ultimate yearly commitment for maximum results.',
    months: 12, sessionsPerWeek: 4, pricePerSession: 140.00,
    totalSessions: 192, price: 26880.00, totalCost: 26880.00,
    imageUrl: '/assets/images/12-month-package.jpg',
    isActive: true, displayOrder: 8,
  },
];

async function seedPackages() {
  try {
    const existing = await StorefrontItem.count();
    if (existing > 0) {
      console.log(`Storefront already has ${existing} packages — skipping seed (use FORCE_RESEED=true to override).`);
      if (process.env.FORCE_RESEED !== 'true') return [];
      // FORCE_RESEED: find each package by name and update in-place.
      // StorefrontItem has no unique constraint on 'name', so upsert by
      // conflictFields is not safe — use findOne + update instead.
      for (const pkg of PACKAGES) {
        const existing = await StorefrontItem.findOne({ where: { name: pkg.name } });
        if (existing) {
          await existing.update(pkg);
        } else {
          await StorefrontItem.create(pkg);
        }
      }
      console.log(`Force-reseeded ${PACKAGES.length} storefront packages (findOne+update).`);
      return [];
    }

    const created = await StorefrontItem.bulkCreate(PACKAGES, { validate: true, individualHooks: true, ignoreDuplicates: true });
    console.log(`Seeded ${created.length} storefront packages successfully.`);
    logger.info(`[StorefrontSeeder] Seeded ${created.length} packages with graduated pricing`);

    for (const p of created) {
      console.log(`  #${p.id} ${p.name}: ${p.totalSessions} sessions @ $${p.pricePerSession}/ea = $${p.price}`);
    }
    return created;
  } catch (error) {
    console.error('Storefront seeder failed:', error);
    logger.error('[StorefrontSeeder] Failed:', error);
    throw error;
  }
}

// Run directly: node backend/seeders/20260407-seed-storefront-packages.mjs
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  import('../models/index.mjs').then(() => seedPackages())
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedPackages;
