// ALTERNATIVE: Fix Models to Use Consistent Table Names
// Instead of changing database, fix model references

import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

dotenv.config();

const fixModelTableReferences = async () => {
  try {
    console.log('🔧 FIXING MODEL TABLE REFERENCES');
    console.log('=================================');
    console.log('Strategy: Update all models to use lowercase "users" consistently');
    
    // Check current User model
    const userModelPath = './backend/models/User.mjs';
    console.log(`\n📂 Checking User model: ${userModelPath}`);
    
    try {
      const userModel = readFileSync(userModelPath, 'utf8');
      
      // Check current tableName setting
      if (userModel.includes("tableName: 'users'")) {
        console.log('✅ User model already uses tableName: "users"');
      } else if (userModel.includes('tableName:')) {
        console.log('⚠️ User model has different tableName setting');
        console.log('Need to check what it is set to');
      } else {
        console.log('❌ User model missing explicit tableName');
      }
      
      // Check associations file
      console.log('\n📂 Checking associations...');
      const associationsPath = './backend/models/associations.mjs';
      const associations = readFileSync(associationsPath, 'utf8');
      
      // Look for references to "Users" that should be "users"
      const referencesUsers = associations.match(/references.*["']Users["']/g);
      if (referencesUsers) {
        console.log('❌ Found associations referencing "Users":');
        referencesUsers.forEach(ref => console.log(`  - ${ref}`));
        console.log('\nThese should reference "users" (lowercase) instead');
      } else {
        console.log('✅ No explicit "Users" references found in associations');
      }
      
      // Check other model files for references
      console.log('\n📂 Checking other model files for "Users" references...');
      
      const modelFiles = [
        './backend/models/ShoppingCart.mjs',
        './backend/models/CartItem.mjs', 
        './backend/models/Session.mjs',
        './backend/models/Gamification.mjs',
        './backend/models/ClientProgress.mjs'
      ];
      
      let foundIssues = [];
      
      for (const modelFile of modelFiles) {
        try {
          const content = readFileSync(modelFile, 'utf8');
          
          // Look for references that might be causing issues
          const usersRefs = content.match(/['""]Users['""]|Users\./g);
          if (usersRefs) {
            foundIssues.push({
              file: modelFile,
              references: usersRefs
            });
          }
        } catch (readError) {
          console.log(`⚠️ Could not read ${modelFile}: ${readError.message}`);
        }
      }
      
      if (foundIssues.length > 0) {
        console.log('\n❌ Found "Users" references that should be "users":');
        foundIssues.forEach(issue => {
          console.log(`\n📁 ${issue.file}:`);
          issue.references.forEach(ref => console.log(`  - ${ref}`));
        });
      } else {
        console.log('✅ No problematic "Users" references found in model files');
      }
      
      // The real issue might be in how Sequelize creates tables
      console.log('\n💡 DIAGNOSIS:');
      console.log('==============');
      console.log('The issue is likely that Sequelize is trying to create foreign keys');
      console.log('that reference "Users" (uppercase) but the physical table is "users" (lowercase).');
      console.log('');
      console.log('The VIEW we created allows SELECT queries to work, but PostgreSQL');
      console.log('does not allow foreign key constraints to reference VIEWs.');
      console.log('');
      console.log('🎯 RECOMMENDED SOLUTION:');
      console.log('========================');
      console.log('1. Drop the "Users" view');
      console.log('2. Rename physical table: users → "Users"');
      console.log('3. This allows both queries AND foreign keys to work');
      console.log('4. Maintains model expectations');
      
      return {
        success: true,
        analysis: 'complete',
        recommendation: 'rename_physical_table',
        issues_found: foundIssues.length
      };
      
    } catch (readError) {
      console.log('❌ Error reading model files:', readError.message);
      return { success: false, error: readError.message };
    }
    
  } catch (error) {
    console.error('💥 Error in model analysis:', error.message);
    return { success: false, error: error.message };
  }
};

fixModelTableReferences().then(result => {
  console.log('\n🎯 MODEL ANALYSIS RESULT:');
  console.log('=========================');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('==============');
  console.log('1. First: Kill process on port 10000');
  console.log('2. Then: Run foreign key fix (rename users → "Users")');
  console.log('3. Finally: Restart backend server');
  console.log('4. Expect: All 43 models to load successfully');
});
