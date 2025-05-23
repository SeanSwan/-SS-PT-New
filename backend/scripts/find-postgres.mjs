// backend/scripts/find-postgres.mjs
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

async function findPostgreSQL() {
  console.log('🔍 Searching for PostgreSQL installations...\n');
  
  // Common PostgreSQL installation paths
  const commonPaths = [
    'C:\\Program Files\\PostgreSQL',
    'C:\\Program Files (x86)\\PostgreSQL',
    'C:\\PostgreSQL',
    'C:\\ProgramData\\PostgreSQL',
    process.env.PGROOT,
    process.env.PGHOME
  ].filter(Boolean);
  
  // Check for PostgreSQL in common paths
  console.log('1. Checking common installation paths...');
  for (const basePath of commonPaths) {
    if (fs.existsSync(basePath)) {
      console.log(`✅ Found PostgreSQL directory: ${basePath}`);
      
      // Look for bin directories
      const items = fs.readdirSync(basePath, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          const binPath = path.join(basePath, item.name, 'bin');
          if (fs.existsSync(binPath)) {
            const psqlPath = path.join(binPath, 'psql.exe');
            if (fs.existsSync(psqlPath)) {
              console.log(`🎯 Found psql.exe: ${psqlPath}`);
              
              // Test the executable
              try {
                const { stdout } = await execAsync(`"${psqlPath}" --version`);
                console.log(`✅ Version: ${stdout.trim()}`);
                console.log(`💡 Add to PATH: ${binPath}`);
              } catch (error) {
                console.log(`⚠️ Found but couldn't execute: ${error.message}`);
              }
            }
          }
        }
      }
    }
  }
  
  // Check Windows services
  console.log('\n2. Checking Windows services...');
  try {
    const { stdout } = await execAsync('sc query state= all | findstr postgresql', { encoding: 'utf8' });
    if (stdout) {
      console.log('✅ Found PostgreSQL services:');
      console.log(stdout);
    }
  } catch (error) {
    console.log('❌ No PostgreSQL services found');
  }
  
  // Check registry (Windows)
  console.log('\n3. Checking Windows registry...');
  try {
    const { stdout } = await execAsync('reg query "HKLM\\SOFTWARE\\PostgreSQL" /s', { encoding: 'utf8' });
    if (stdout) {
      console.log('✅ PostgreSQL entries in registry found');
      // Extract installation paths
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('Base Directory') || line.includes('Installation Directory')) {
          console.log(`📍 ${line.trim()}`);
        }
      }
    }
  } catch (error) {
    console.log('❌ No PostgreSQL entries in registry');
  }
  
  // Provide instructions
  console.log('\n🔧 Instructions:');
  console.log('If PostgreSQL is installed but not in PATH:');
  console.log('1. Open System Properties > Environment Variables');
  console.log('2. Edit PATH variable (System or User)');
  console.log('3. Add the PostgreSQL bin directory (e.g., C:\\Program Files\\PostgreSQL\\15\\bin)');
  console.log('4. Restart your command prompt/terminal');
  console.log('5. Test with: psql --version');
  
  console.log('\nIf PostgreSQL is not installed:');
  console.log('1. Download from: https://www.postgresql.org/download/windows/');
  console.log('2. Or use: node scripts/setup-sqlite-fallback.mjs (for temporary SQLite)');
}

findPostgreSQL().catch(console.error);