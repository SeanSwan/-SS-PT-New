import { seedStorefrontItems } from './seeders/20250516-storefront-items.mjs';

console.log('Starting storefront seeding...');

try {
  await seedStorefrontItems();
  console.log('✅ Seeding completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
}
