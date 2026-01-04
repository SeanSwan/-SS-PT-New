import sequelize from './backend/database.mjs';
import { initializeModelsCache, getStorefrontItem } from './backend/models/index.mjs';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Initialize models cache like the server does
    await initializeModelsCache();
    console.log('Models cache initialized');

    const StorefrontItem = getStorefrontItem();
    const count = await StorefrontItem.count();
    console.log('StorefrontItem count:', count);

    if (count > 0) {
      const items = await StorefrontItem.findAll({
        limit: 10,
        attributes: ['id', 'name', 'price', 'totalCost', 'packageType']
      });
      console.log('Sample items:');
      items.forEach(item => {
        console.log(`  ID: ${item.id}, Name: ${item.name}, Price: ${item.price}, TotalCost: ${item.totalCost}, Type: ${item.packageType}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();