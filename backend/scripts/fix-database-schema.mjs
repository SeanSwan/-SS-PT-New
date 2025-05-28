#!/usr/bin/env node

/**
 * Emergency Database Schema Fix for Production
 * ==========================================
 * Adds missing columns to storefront_items table
 */

import sequelize from '../database.mjs';

console.log('🔧 Emergency Database Schema Fix');
console.log('================================');

async function fixDatabaseSchema() {
  try {
    console.log('📋 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if columns exist first
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'storefront_items' 
      AND (column_name = 'isActive' OR column_name = 'displayOrder');
    `);

    const existingColumns = results.map(row => row.column_name);
    console.log('📊 Existing columns:', existingColumns);

    // Add isActive column if missing
    if (!existingColumns.includes('isActive')) {
      console.log('➕ Adding isActive column...');
      await sequelize.query(`
        ALTER TABLE storefront_items 
        ADD COLUMN "isActive" BOOLEAN DEFAULT true NOT NULL;
      `);
      console.log('✅ Added isActive column');
    } else {
      console.log('ℹ️  isActive column already exists');
    }

    // Add displayOrder column if missing
    if (!existingColumns.includes('displayOrder')) {
      console.log('➕ Adding displayOrder column...');
      await sequelize.query(`
        ALTER TABLE storefront_items 
        ADD COLUMN "displayOrder" INTEGER DEFAULT 1;
      `);
      console.log('✅ Added displayOrder column');
    } else {
      console.log('ℹ️  displayOrder column already exists');
    }

    // Update existing records
    console.log('📝 Updating existing records...');
    await sequelize.query(`
      UPDATE storefront_items 
      SET "isActive" = true 
      WHERE "isActive" IS NULL;
    `);

    await sequelize.query(`
      UPDATE storefront_items 
      SET "displayOrder" = 1 
      WHERE "displayOrder" IS NULL;
    `);

    console.log('✅ Database schema fix completed successfully!');
    console.log('🎯 Storefront seeding should work now');

  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixDatabaseSchema()
  .then(() => {
    console.log('🎉 Schema fix complete - deploy again to test');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });
