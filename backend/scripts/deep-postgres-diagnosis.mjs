// backend/scripts/deep-postgres-diagnosis.mjs
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execAsync = promisify(exec);

async function deepPostgresDiagnosis() {
  console.log('🔍 Deep PostgreSQL Diagnosis for SwanStudios\n');
  console.log('Checking what might have changed with your PostgreSQL setup...\n');
  
  // 1. Check current PATH variable
  console.log('1. 📍 Current PATH Analysis:');
  const currentPath = process.env.PATH;
  const pathEntries = currentPath.split(';').filter(p => p);
  
  console.log(`Total PATH entries: ${pathEntries.length}`);
  console.log('\nPostgreSQL-related paths:');
  const pgPaths = pathEntries.filter(p => 
    p.toLowerCase().includes('postgresql') || 
    p.toLowerCase().includes('postgres') ||
    p.toLowerCase().includes('pg')
  );
  
  if (pgPaths.length > 0) {
    pgPaths.forEach(p => console.log(`  ✓ ${p}`));
  } else {
    console.log('  ❌ No PostgreSQL paths found in current PATH');
  }
  
  // 2. Search for PostgreSQL installations
  console.log('\n2. 🔍 Finding PostgreSQL Installations:');
  const searchPaths = [
    'C:\\Program Files\\PostgreSQL',
    'C:\\Program Files (x86)\\PostgreSQL',
    'C:\\PostgreSQL'
  ];
  
  const foundInstallations = [];
  
  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      console.log(`\n📁 Found PostgreSQL directory: ${searchPath}`);
      
      try {
        const versions = fs.readdirSync(searchPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        console.log(`   Versions found: ${versions.join(', ')}`);
        
        for (const version of versions) {
          const binPath = path.join(searchPath, version, 'bin');
          const psqlPath = path.join(binPath, 'psql.exe');
          
          if (fs.existsSync(psqlPath)) {
            console.log(`   ✅ psql.exe found in: ${binPath}`);
            
            // Test if it's executable
            try {
              const { stdout } = await execAsync(`"${psqlPath}" --version`);
              console.log(`   🔧 Version: ${stdout.trim()}`);
              foundInstallations.push({
                version,
                binPath,
                psqlPath,
                working: true
              });
            } catch (error) {
              console.log(`   ⚠️ Cannot execute: ${error.message}`);
              foundInstallations.push({
                version,
                binPath,
                psqlPath,
                working: false
              });
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Error reading directory: ${error.message}`);
      }
    }
  }
  
  // 3. Check Windows services
  console.log('\n3. 🚀 PostgreSQL Service Status:');
  try {
    const { stdout } = await execAsync('sc query state= all | findstr /i postgres');
    if (stdout.trim()) {
      console.log('✅ PostgreSQL services found:');
      const services = stdout.split('\n').filter(line => line.trim());
      for (const service of services) {
        console.log(`   ${service.trim()}`);
      }
      
      // Get detailed status for each service
      const serviceNames = services
        .map(s => s.split(':')[1]?.trim())
        .filter(Boolean);
      
      for (const serviceName of serviceNames) {
        try {
          const { stdout: detail } = await execAsync(`sc query "${serviceName}"`);
          console.log(`\nService Details for ${serviceName}:`);
          console.log(detail);
        } catch (error) {
          console.log(`⚠️ Cannot query ${serviceName}: ${error.message}`);
        }
      }
    } else {
      console.log('❌ No PostgreSQL services found');
    }
  } catch (error) {
    console.log(`❌ Error checking services: ${error.message}`);
  }
  
  // 4. Check environment variables in registry
  console.log('\n4. 📝 System Environment Variables:');
  try {
    const { stdout } = await execAsync('reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" /v PATH');
    if (stdout.includes('PostgreSQL')) {
      console.log('✅ PostgreSQL found in System PATH:');
      const pathMatch = stdout.match(/PATH\s+REG_EXPAND_SZ\s+(.+)/);
      if (pathMatch) {
        const systemPath = pathMatch[1];
        const pgEntries = systemPath.split(';').filter(p => 
          p.toLowerCase().includes('postgresql')
        );
        pgEntries.forEach(entry => console.log(`   ${entry}`));
      }
    } else {
      console.log('❌ PostgreSQL not found in System PATH');
    }
  } catch (error) {
    console.log(`❌ Cannot read system PATH: ${error.message}`);
  }
  
  // 5. Check user environment variables
  console.log('\n5. 👤 User Environment Variables:');
  try {
    const { stdout } = await execAsync('reg query "HKCU\\Environment" /v PATH');
    if (stdout.includes('PostgreSQL')) {
      console.log('✅ PostgreSQL found in User PATH');
    } else {
      console.log('❌ PostgreSQL not found in User PATH');
    }
  } catch (error) {
    console.log(`❌ Cannot read user PATH: ${error.message}`);
  }
  
  // 6. Generate solution
  console.log('\n6. 🔧 RECOMMENDED SOLUTIONS:\n');
  
  if (foundInstallations.length > 0) {
    const workingInstall = foundInstallations.find(i => i.working);
    if (workingInstall) {
      console.log(`✨ Solution Found! Use this PostgreSQL installation:`);
      console.log(`📍 Binary Path: ${workingInstall.binPath}`);
      console.log(`\n🛠️ To fix your PATH:\n`);
      
      // Create a batch file to fix PATH
      const fixScript = `@echo off
echo Adding PostgreSQL to PATH...
setx PATH "${workingInstall.binPath};%PATH%" /M
echo PostgreSQL added to system PATH!
echo Please restart your command prompt/IDE and try again.
pause`;
      
      const scriptPath = path.join(process.cwd(), 'fix-postgres-path.bat');
      fs.writeFileSync(scriptPath, fixScript);
      console.log(`Created fix script: ${scriptPath}`);
      console.log('🚨 Run as Administrator: fix-postgres-path.bat');
    }
  } else {
    console.log('❌ No working PostgreSQL installation found');
    console.log('💡 Consider reinstalling PostgreSQL or installing using your preferred method');
  }
  
  // 7. Alternative quick fix
  console.log(`\n7. 🚀 QUICK TEMPORARY FIX:\n`);
  if (foundInstallations.length > 0) {
    const firstInstall = foundInstallations[0];
    console.log('Add this to your current session:');
    console.log(`set PATH=${firstInstall.binPath};%PATH%`);
    console.log('\nOr export in PowerShell:');
    console.log(`$env:PATH = "${firstInstall.binPath};$env:PATH"`);
  }
  
  console.log('\n8. 📋 Test Commands After Fix:');
  console.log('psql --version');
  console.log('psql -U postgres -l');
  console.log('node scripts/check-storefront-packages.mjs');
}

deepPostgresDiagnosis().catch(console.error);