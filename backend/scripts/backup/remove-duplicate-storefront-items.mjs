/**
 * Database cleanup script to remove duplicate storefront items
 */

import { StorefrontItem } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

async function removeDuplicateStoreItems() {
  try {
    console.log('🔍 Checking for duplicate storefront items...');
    
    // Get all items ordered by ID (older items first)
    const allItems = await StorefrontItem.findAll({
      order: [['id', 'ASC']]
    });
    
    console.log(`📦 Found ${allItems.length} total items`);
    
    const seen = new Map();
    const toDelete = [];
    const unique = [];
    
    for (const item of allItems) {
      // Create a unique key based on name and package type
      const key = `${item.name}-${item.packageType}`;
      
      if (seen.has(key)) {
        // This is a duplicate - mark for deletion (keep the first/older one)
        toDelete.push(item.id);
        console.log(`🗑️  Duplicate found: "${item.name}" (${item.packageType}) - ID: ${item.id} (will delete)`);
      } else {
        // This is the first occurrence - keep it
        seen.set(key, item);
        unique.push(item);
        console.log(`✅ Keeping: "${item.name}" (${item.packageType}) - ID: ${item.id}`);
      }
    }
    
    if (toDelete.length > 0) {
      console.log(`\n🧹 Removing ${toDelete.length} duplicate(s)...`);
      
      // Delete duplicates
      const deleteResult = await StorefrontItem.destroy({
        where: { id: toDelete }
      });
      
      console.log(`✅ Successfully removed ${deleteResult} duplicate items`);
    } else {
      console.log('\n✅ No duplicates found - database is clean!');
    }
    
    // Get final count and verify
    const finalCount = await StorefrontItem.count();
    console.log(`\n📊 Final summary:`);
    console.log(`   - Original items: ${allItems.length}`);
    console.log(`   - Duplicates removed: ${toDelete.length}`);
    console.log(`   - Unique items remaining: ${finalCount}`);
    console.log(`   - Expected unique items: ${unique.length}`);
    
    if (finalCount === unique.length) {
      console.log(`\n🎉 Cleanup completed successfully!`);
    } else {
      console.log(`\n⚠️  Warning: Count mismatch. Please verify manually.`);
    }
    
    // List remaining items for verification
    console.log('\n📋 Remaining unique items:');
    const remainingItems = await StorefrontItem.findAll({
      order: [['packageType', 'ASC'], ['displayOrder', 'ASC']]
    });
    
    remainingItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name} (${item.packageType}) - $${item.displayPrice || item.price}`);
    });
    
  } catch (error) {
    console.error('❌ Error removing duplicates:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] && import.meta.url.includes(process.argv[1].split('/').pop())) {
  removeDuplicateStoreItems()
    .then(() => {
      console.log('\n✨ Duplicate removal completed. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Duplicate removal failed:', error);
      process.exit(1);
    });
}

export default removeDuplicateStoreItems;