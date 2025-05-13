// backend/scripts/deep-env-search.mjs
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, stat } from 'fs/promises';

const execAsync = promisify(exec);

async function deepEnvSearch() {
  console.log('🔍 Deep search for .env files on your system...\n');
  
  // Method 1: Use Windows search command
  console.log('1. Searching with Windows dir command...');
  const searchPaths = [
    'C:\\Users\\ogpsw\\Desktop\\quick-pt\\SS-PT',
    'C:\\Users\\ogpsw\\Desktop\\quick-pt',
    'C:\\Users\\ogpsw\\Desktop',
    'C:\\Users\\ogpsw\\Documents'
  ];
  
  for (const searchPath of searchPaths) {
    try {
      console.log(`\n🔍 Searching in: ${searchPath}`);
      const { stdout } = await execAsync(`dir "${searchPath}" /s /b | findstr /i "\\.env"`);
      if (stdout.trim()) {
        console.log('Found files:');
        stdout.trim().split('\n').forEach(file => {
          console.log(`  📄 ${file.trim()}`);
        });
      } else {
        console.log('  No .env files found');
      }
    } catch (error) {
      console.log(`  ❌ Error searching: ${error.message}`);
    }
  }
  
  // Method 2: Use PowerShell Get-ChildItem
  console.log('\n2. Using PowerShell search...');
  try {
    const psCommand = `Get-ChildItem -Path "C:\\Users\\ogpsw\\Desktop\\quick-pt" -Recurse -Filter "*.env" -Force | ForEach-Object { $_.FullName }`;
    const { stdout } = await execAsync(`powershell -Command "${psCommand}"`);
    if (stdout.trim()) {
      console.log('PowerShell found:');
      stdout.trim().split('\n').forEach(file => {
        console.log(`  📄 ${file.trim()}`);
      });
    } else {
      console.log('  No .env files found with PowerShell');
    }
  } catch (error) {
    console.log(`  ❌ PowerShell search failed: ${error.message}`);
  }
  
  // Method 3: Check common locations
  console.log('\n3. Checking common .env locations...');
  const commonLocations = [
    'C:\\Users\\ogpsw\\Desktop\\quick-pt\\SS-PT\\.env',
    'C:\\Users\\ogpsw\\Desktop\\quick-pt\\SS-PT\\backend\\.env',
    'C:\\Users\\ogpsw\\Desktop\\quick-pt\\SS-PT\\frontend\\.env',
    'C:\\Users\\ogpsw\\Desktop\\quick-pt\\.env',
    'C:\\Users\\ogpsw\\Desktop\\.env'
  ];
  
  for (const location of commonLocations) {
    try {
      const stats = await stat(location);
      const content = await readFile(location, 'utf8');
      console.log(`\n✅ Found: ${location}`);
      console.log(`   📅 Modified: ${stats.mtime.toLocaleString()}`);
      console.log(`   📏 Size: ${stats.size} bytes`);
      
      // Quick analysis of database variables
      const dbVars = content.split('\n').filter(line => 
        line.includes('PG_') || line.includes('DB_') || line.includes('MONGO')
      );
      
      if (dbVars.length > 0) {
        console.log('   🗃️ Database variables found:');
        dbVars.forEach(var_line => {
          const [key] = var_line.split('=');
          console.log(`      ${key}=${key.includes('PASSWORD') ? '***HIDDEN***' : '...'}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Not found: ${location}`);
    }
  }
  
  // Method 4: Check for backup files
  console.log('\n4. Looking for .env backup files...');
  const backupPatterns = [
    '.env.backup',
    '.env.bak',
    '.env.old',
    '.env.original',
    '.env.save',
    'env_backup.txt'
  ];
  
  for (const pattern of backupPatterns) {
    try {
      const searchCmd = `dir "C:\\Users\\ogpsw\\Desktop\\quick-pt\\SS-PT" /s /b | findstr /i "${pattern}"`;
      const { stdout } = await execAsync(searchCmd);
      if (stdout.trim()) {
        console.log(`\n✅ Found backup: ${pattern}`);
        stdout.trim().split('\n').forEach(file => {
          console.log(`   📄 ${file.trim()}`);
        });
      }
    } catch (error) {
      // No backup found
    }
  }
  
  // Method 5: Check git history for .env
  console.log('\n5. Checking git history for .env (if git repository exists)...');
  try {
    const { stdout } = await execAsync('git log --oneline --all -- ".env" -n 5', { 
      cwd: 'C:\\Users\\ogpsw\\Desktop\\quick-pt\\SS-PT' 
    });
    if (stdout.trim()) {
      console.log('Found .env in git history:');
      console.log(stdout);
      console.log('\n💡 You might be able to recover from git:');
      console.log('   git checkout HEAD~1 -- .env');
    }
  } catch (error) {
    console.log('   No git repository or .env in git history');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 RECOMMENDATIONS');
  console.log('='.repeat(60));
  console.log('\n1. Check the results above for any .env files found');
  console.log('2. If multiple .env files exist, your app uses the one in:');
  console.log('   a. /backend/.env (highest priority)');
  console.log('   b. /project-root/.env (second priority)');
  console.log('\n3. If no .env files found, create a new one:');
  console.log('   Location: C:\\Users\\ogpsw\\Desktop\\quick-pt\\SS-PT\\backend\\.env');
  console.log('\n4. Template for new .env file:');
  console.log('   PG_USER=swanadmin');
  console.log('   PG_PASSWORD=your_password_here');
  console.log('   PG_DB=swanstudios');
  console.log('   PG_HOST=localhost');
  console.log('   PG_PORT=5432');
  console.log('\n5. After creating/finding the .env file:');
  console.log('   - Update the PostgreSQL credentials');
  console.log('   - Test with: node scripts/test-postgres-connection.mjs');
}

deepEnvSearch().catch(console.error);