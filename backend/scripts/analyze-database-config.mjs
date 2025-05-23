// backend/scripts/analyze-database-config.mjs
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function analyzeDatabaseConfig() {
  console.log('🔍 Analyzing SwanStudios Database Configuration\n');
  
  // 1. Check .env file
  console.log('1. 📄 Environment Configuration:');
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    const envContent = await readFile(envPath, 'utf8');
    
    console.log('✅ .env file found');
    console.log('Database-related variables:');
    
    const envLines = envContent.split('\n');
    const dbVars = envLines.filter(line => 
      line.includes('PG_') || 
      line.includes('DB_') || 
      line.includes('DATABASE_')
    );
    
    for (const line of dbVars) {
      if (line.includes('PASSWORD') || line.includes('PASS')) {
        const [key] = line.split('=');
        console.log(`   ${key}=***HIDDEN***`);
      } else {
        console.log(`   ${line}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error reading .env: ${error.message}`);
  }
  
  // 2. Check database.mjs configuration
  console.log('\n2. 🗃️ Database Configuration File:');
  try {
    const dbConfigPath = path.resolve(__dirname, '../database.mjs');
    const dbConfig = await readFile(dbConfigPath, 'utf8');
    
    console.log('✅ database.mjs file found');
    
    // Extract key configuration details
    if (dbConfig.includes('pool:')) {
      console.log('✅ Connection pool configured');
    }
    
    if (dbConfig.includes('SSL') || dbConfig.includes('ssl')) {
      console.log('✅ SSL configuration present');
    }
    
    if (dbConfig.includes('retry')) {
      console.log('✅ Retry logic configured');
    }
    
    // Check for environment-specific logic
    if (dbConfig.includes('isProduction')) {
      console.log('✅ Production/Development environment handling');
    }
    
    // Look for fallback configurations
    if (dbConfig.includes('sqlite') || dbConfig.includes('SQLite')) {
      console.log('⚠️ SQLite fallback configuration detected');
    }
    
  } catch (error) {
    console.log(`❌ Error reading database.mjs: ${error.message}`);
  }
  
  // 3. Check if there are any backup configurations
  console.log('\n3. 🔄 Backup Configurations:');
  const backupFiles = [
    'database.mjs.backup',
    'database.old.mjs',
    'database.postgres.mjs'
  ];
  
  for (const backupFile of backupFiles) {
    try {
      const backupPath = path.resolve(__dirname, '..', backupFile);
      await readFile(backupPath, 'utf8');
      console.log(`✅ Found backup: ${backupFile}`);
    } catch (error) {
      console.log(`❌ No backup found: ${backupFile}`);
    }
  }
  
  // 4. Check package.json for database dependencies
  console.log('\n4. 📦 Database Dependencies:');
  try {
    const packagePath = path.resolve(__dirname, '../package.json');
    const packageContent = await readFile(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    const dbDeps = {};
    
    // Check dependencies
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach(dep => {
        if (dep.includes('pg') || dep.includes('postgres') || dep.includes('sql')) {
          dbDeps[dep] = packageJson.dependencies[dep];
        }
      });
    }
    
    console.log('Database-related dependencies:');
    for (const [dep, version] of Object.entries(dbDeps)) {
      console.log(`   ${dep}: ${version}`);
    }
    
    // Check scripts
    console.log('\nDatabase-related scripts:');
    if (packageJson.scripts) {
      Object.keys(packageJson.scripts).forEach(script => {
        if (script.includes('db') || script.includes('migrate') || script.includes('seed')) {
          console.log(`   ${script}: ${packageJson.scripts[script]}`);
        }
      });
    }
    
  } catch (error) {
    console.log(`❌ Error reading package.json: ${error.message}`);
  }
  
  // 5. Suggest next steps
  console.log('\n5. 🚀 Next Steps Based on Analysis:');
  console.log('\nA. If PostgreSQL is installed but PATH is broken:');
  console.log('   - Run: node scripts/deep-postgres-diagnosis.mjs');
  console.log('   - Use the generated fix-postgres-path.bat (as admin)');
  console.log('\nB. For a quick temporary fix:');
  console.log('   - Set environment variable in current session');
  console.log('   - Use the dev tool you mentioned to bypass authentication');
  console.log('\nC. For a permanent solution:');
  console.log('   - Fix the PATH in System Environment Variables');
  console.log('   - Restart your IDE/terminal');
  console.log('   - Test with: psql --version');
  
  console.log('\n6. 🔧 Development Tool Integration:');
  console.log('Since you mentioned using a dev tool for login:');
  console.log('- The PATH issue is separate from authentication');
  console.log('- Once PATH is fixed, your dev tool should work normally');
  console.log('- The database connection issue is about finding psql.exe, not credentials');
}

analyzeDatabaseConfig().catch(console.error);