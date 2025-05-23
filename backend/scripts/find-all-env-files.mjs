// backend/scripts/find-all-env-files.mjs
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function findAllEnvFiles() {
  console.log('🔍 Searching for all .env files in your project...\n');
  
  // Define search directories
  const searchPaths = [
    path.resolve(__dirname, '../..'), // Project root
    path.resolve(__dirname, '..'), // Backend directory
    path.resolve(__dirname, '../../frontend'), // Frontend directory (if exists)
    path.resolve(__dirname, '../../client'), // Client directory (if exists)
    path.resolve(__dirname, '../../ui'), // UI directory (if exists)
  ];
  
  const envFiles = [];
  
  // Function to recursively search for .env files
  async function searchDirectory(dir, depth = 0) {
    if (depth > 3) return; // Don't go too deep
    
    try {
      const items = await readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          // Skip node_modules and other common directories
          if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item.name)) {
            await searchDirectory(fullPath, depth + 1);
          }
        } else if (item.isFile()) {
          // Check for .env files
          if (item.name === '.env' || 
              item.name.startsWith('.env.') || 
              item.name.endsWith('.env')) {
            envFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
      console.log(`⚠️ Cannot access ${dir}: ${error.message}`);
    }
  }
  
  // Search all paths
  for (const searchPath of searchPaths) {
    await searchDirectory(searchPath);
  }
  
  // Display found files
  console.log(`📄 Found ${envFiles.length} environment file(s):\n`);
  
  for (const envFile of envFiles) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 ${envFile}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const content = await readFile(envFile, 'utf8');
      const stats = await stat(envFile);
      
      console.log(`📅 Last modified: ${stats.mtime.toLocaleString()}`);
      console.log(`📏 Size: ${stats.size} bytes`);
      console.log(`\n📝 Content:`);
      
      // Parse and display environment variables
      const lines = content.split('\n');
      const envVars = {};
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          const value = valueParts.join('=');
          envVars[key] = value;
        }
      }
      
      // Focus on database-related variables
      console.log('\n🗃️ Database-related variables:');
      const dbKeys = Object.keys(envVars).filter(key => 
        key.includes('PG_') || 
        key.includes('DB_') || 
        key.includes('DATABASE_') || 
        key.includes('MONGO')
      );
      
      if (dbKeys.length > 0) {
        for (const key of dbKeys) {
          if (key.includes('PASSWORD') || key.includes('PASS')) {
            console.log(`  ${key}=***HIDDEN***`);
          } else {
            console.log(`  ${key}=${envVars[key]}`);
          }
        }
      } else {
        console.log('  No database variables found');
      }
      
      // Show all non-sensitive variables
      console.log('\n📋 All variables (non-sensitive):');
      for (const [key, value] of Object.entries(envVars)) {
        if (!key.includes('PASSWORD') && !key.includes('SECRET') && !key.includes('KEY')) {
          console.log(`  ${key}=${value}`);
        }
      }
      
      console.log(`\n📊 Total variables: ${Object.keys(envVars).length}`);
      
    } catch (error) {
      console.log(`❌ Error reading file: ${error.message}`);
    }
  }
  
  // Recommendations
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('🎯 ANALYSIS & RECOMMENDATIONS');
  console.log(`${'='.repeat(60)}`);
  
  if (envFiles.length === 0) {
    console.log('\n❌ No .env files found!');
    console.log('💡 You may need to create a new .env file.');
    console.log('\nCreate .env file at project root with:');
    console.log('PG_USER=swanadmin');
    console.log('PG_PASSWORD=swanadmin123');
    console.log('PG_DB=swanstudios');
    console.log('PG_HOST=localhost');
    console.log('PG_PORT=5432');
  } else if (envFiles.length === 1) {
    console.log(`\n✅ Found 1 .env file: ${envFiles[0]}`);
    console.log('💡 This should be the one your application is using.');
  } else {
    console.log(`\n⚠️ Found ${envFiles.length} .env files!`);
    console.log('💡 Your application might be loading the wrong one.');
    console.log('\nPriority order (application looks for .env in this order):');
    console.log('1. Backend directory: /backend/.env');
    console.log('2. Project root: /.env');
    console.log('3. Current working directory');
    
    // Find the most likely active one
    const backendEnv = envFiles.find(f => f.includes('backend'));
    const rootEnv = envFiles.find(f => f.endsWith('.env') && !f.includes('backend'));
    
    if (backendEnv) {
      console.log(`\n🎯 Most likely active: ${backendEnv}`);
    } else if (rootEnv) {
      console.log(`\n🎯 Most likely active: ${rootEnv}`);
    }
  }
  
  // Create backup script
  console.log('\n📦 Would you like to backup all .env files? (y/n)');
  // Note: In actual implementation, this would need readline interface
  
  console.log('\n🔧 Next steps:');
  console.log('1. Review the .env files above');
  console.log('2. Identify which one has the correct PostgreSQL credentials');
  console.log('3. Update the credentials to match your PostgreSQL setup');
  console.log('4. Ensure the .env file is in the right location');
  console.log('5. Test the connection again');
}

findAllEnvFiles().catch(console.error);