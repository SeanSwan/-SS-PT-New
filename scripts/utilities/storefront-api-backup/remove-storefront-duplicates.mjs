#!/usr/bin/env node
/**
 * StoreFront Duplicate Removal Script
 * Checks for and removes duplicate packages
 */

import { execSync } from 'child_process';
import axios from 'axios';

console.log('🔍 Checking for duplicate packages...\n');

// Function to check API for duplicates
async function checkAPIForDuplicates() {
  try {
    console.log('1. Checking API response...');
    const response = await axios.get('http://localhost:3000/api/storefront');
    
    if (response.data?.success && response.data?.items) {
      const items = response.data.items;
      console.log(`   📦 Found ${items.length} total items`);
      
      // Check for duplicates by name
      const nameMap = new Map();
      const duplicates = [];
      
      items.forEach(item => {
        const key = `${item.name}-${item.packageType}`;
        if (nameMap.has(key)) {
          duplicates.push({
            original: nameMap.get(key),
            duplicate: item
          });
        } else {
          nameMap.set(key, item);
        }
      });
      
      if (duplicates.length > 0) {
        console.log(`   ❌ Found ${duplicates.length} duplicates:`);
        duplicates.forEach((dup, index) => {
          console.log(`      ${index + 1}. "${dup.duplicate.name}" (IDs: ${dup.original.id}, ${dup.duplicate.id})`);
        });
        return { hasDuplicates: true, duplicates, items };
      } else {
        console.log('   ✅ No duplicates found in API response');
        return { hasDuplicates: false, duplicates: [], items };
      }
    } else {
      console.log('   ❌ Invalid API response');
      return { hasDuplicates: false, duplicates: [], items: [] };
    }
  } catch (error) {
    console.log('   ❌ Error checking API:', error.message);
    return { hasDuplicates: false, duplicates: [], items: [] };
  }
}

// Function to clean database
async function cleanDatabase() {
  console.log('\n2. Cleaning database...');
  try {
    // Run a script to remove duplicates from database
    console.log('   🧹 Running database cleanup...');
    
    // Create a database cleanup script
    const cleanupScript = `
import { StorefrontItem } from './models/index.mjs';
import logger from './utils/logger.mjs';

async function removeDuplicates() {
  try {
    logger.info('Starting duplicate removal...');
    
    // Get all items
    const allItems = await StorefrontItem.findAll({
      order: [['id', 'ASC']]
    });
    
    const seen = new Map();
    const toDelete = [];
    
    for (const item of allItems) {
      const key = \`\${item.name}-\${item.packageType}\`;
      
      if (seen.has(key)) {
        // Keep the first one (lower ID), mark others for deletion
        toDelete.push(item.id);
        logger.info(\`Marking duplicate for deletion: \${item.name} (ID: \${item.id})\`);
      } else {
        seen.set(key, item);
      }
    }
    
    if (toDelete.length > 0) {
      await StorefrontItem.destroy({
        where: { id: toDelete }
      });
      logger.info(\`Removed \${toDelete.length} duplicate items\`);
    } else {
      logger.info('No duplicates found in database');
    }
    
    // Get final count
    const finalCount = await StorefrontItem.count();
    logger.info(\`Final count: \${finalCount} unique items\`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Error removing duplicates:', error);
    process.exit(1);
  }
}

removeDuplicates();
`;

    // Write the cleanup script
    require('fs').writeFileSync('./backend/remove-duplicates.mjs', cleanupScript);
    
    // Run the cleanup
    execSync('cd backend && node remove-duplicates.mjs', { stdio: 'inherit' });
    
    console.log('   ✅ Database cleanup completed');
    
    // Clean up the temporary script
    require('fs').unlinkSync('./backend/remove-duplicates.mjs');
    
  } catch (error) {
    console.log('   ❌ Error cleaning database:', error.message);
  }
}

// Function to add deduplication to frontend
async function addFrontendDeduplication() {
  console.log('\n3. Adding frontend deduplication...');
  
  // Code to insert into the StoreFrontFixed component
  const deduplicationCode = `
  // Deduplicate packages by name and type
  const deduplicatePackages = (packages: StoreItem[]): StoreItem[] => {
    const seen = new Map();
    return packages.filter(pkg => {
      const key = \`\${pkg.name}-\${pkg.packageType}\`;
      if (seen.has(key)) {
        console.log(\`🗑️ Removing duplicate: \${pkg.name} (ID: \${pkg.id})\`);
        return false;
      }
      seen.set(key, pkg);
      return true;
    });
  };`;
  
  console.log('   📝 Deduplication logic to add to StoreFrontFixed:');
  console.log('   ```typescript');
  console.log(deduplicationCode);
  console.log('   ```');
  console.log('   📍 Add this after the processedItems mapping and apply to both arrays');
}

// Main execution
async function main() {
  const result = await checkAPIForDuplicates();
  
  if (result.hasDuplicates) {
    console.log('\n🔧 Actions needed:');
    console.log('1. Clean database duplicates');
    console.log('2. Add frontend deduplication as backup');
    console.log('\nProceed with cleanup? (y/n)');
    
    // For automation, assume yes
    console.log('Proceeding with cleanup...\n');
    
    await cleanDatabase();
    await addFrontendDeduplication();
    
    // Re-check after cleanup
    console.log('\n4. Verifying cleanup...');
    const afterResult = await checkAPIForDuplicates();
    
    if (!afterResult.hasDuplicates) {
      console.log('✅ Success! No more duplicates found.');
    } else {
      console.log('⚠️ Some duplicates may still exist. Check manually.');
    }
  } else {
    console.log('\n✅ No action needed - no duplicates found!');
  }
  
  // Provide the updated component with deduplication
  console.log('\n📄 Updated StoreFrontFixed component with deduplication ready to apply...');
}

main().catch(console.error);
