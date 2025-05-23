/**
 * Model Verification Script
 * This script loads all models and checks that they can be instantiated
 * without errors. Useful as a pre-deployment check.
 */

import sequelize from '../database.mjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import setupAssociations from '../setupAssociations.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelsDir = path.join(__dirname, '..', 'models');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Models to be verified
const modelFiles = [];

async function main() {
  try {
    console.log('🔍 Verifying database models...');
    
    // Read model files from the models directory
    const files = fs.readdirSync(modelsDir);
    files.forEach(file => {
      if (file.endsWith('.mjs') && !file.startsWith('index')) {
        modelFiles.push(file);
      }
    });
    
    console.log(`Found ${modelFiles.length} model files to verify`);
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Setup model associations
    await setupAssociations();
    console.log('✅ Model associations set up successfully');
    
    // List all model names
    const modelNames = Object.keys(sequelize.models);
    console.log(`\nModels loaded (${modelNames.length}):`);
    modelNames.forEach(name => {
      console.log(`- ${name}`);
    });
    
    // Verify each model can be instantiated
    console.log('\nVerifying models can be instantiated:');
    for (const name of modelNames) {
      const Model = sequelize.models[name];
      try {
        // Attempt to build a blank instance (doesn't save to DB)
        const instance = Model.build({});
        console.log(`✅ ${name}: Instance built successfully`);
      } catch (error) {
        console.error(`❌ ${name}: Error building instance: ${error.message}`);
        if (error.stack) {
          console.error(error.stack);
        }
      }
    }
    
    console.log('\nModel verification completed');
    process.exit(0);
  } catch (error) {
    console.error('Error verifying models:', error);
    process.exit(1);
  }
}

// Run the verification
main();
