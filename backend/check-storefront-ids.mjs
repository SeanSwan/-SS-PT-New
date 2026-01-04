/**
 * Check Storefront Item IDs
 */

import sequelize from './database.mjs';

async function checkIDs() {
  try {
    await sequelize.authenticate();

    const [packages] = await sequelize.query(`
      SELECT id, name, sessions, "pricePerSession", "totalCost", "isActive", "packageType"
      FROM storefront_items
      ORDER BY id;
    `);

    console.log('\n=== STOREFRONT ITEMS BY ID ===');
    packages.forEach(p => {
      console.log(`ID: ${p.id} | Name: ${p.name} | Active: ${p.isActive} | Type: ${p.packageType} | Sessions: ${p.sessions}`);
    });

    console.log(`\nTotal packages: ${packages.length}`);
    console.log(`ID range: ${packages[0]?.id} - ${packages[packages.length-1]?.id}`);

    await sequelize.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkIDs();
