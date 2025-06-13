// Backend system status checker
// Fixes missing script referenced in backend package.json

import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function checkSystemStatus() {
  console.log(chalk.blue('🔍 SwanStudios System Status Check'));
  console.log(chalk.gray('=' .repeat(40)));
  
  const checks = [];
  
  // Check environment files
  try {
    const envPath = path.resolve(__dirname, '../.env');
    await fs.access(envPath);
    checks.push({ name: 'Environment Config', status: 'OK', details: '.env file exists' });
  } catch {
    checks.push({ name: 'Environment Config', status: 'WARNING', details: '.env file missing' });
  }
  
  // Check database config
  try {
    const configPath = path.resolve(__dirname, '../config/config.cjs');
    await fs.access(configPath);
    checks.push({ name: 'Database Config', status: 'OK', details: 'config.cjs exists' });
  } catch {
    checks.push({ name: 'Database Config', status: 'ERROR', details: 'config.cjs missing' });
  }
  
  // Check models directory
  try {
    const modelsPath = path.resolve(__dirname, '../models');
    const models = await fs.readdir(modelsPath);
    const modelCount = models.filter(f => f.endsWith('.mjs')).length;
    checks.push({ name: 'Models', status: 'OK', details: `${modelCount} model files found` });
  } catch {
    checks.push({ name: 'Models', status: 'ERROR', details: 'Models directory inaccessible' });
  }
  
  // Check routes directory
  try {
    const routesPath = path.resolve(__dirname, '../routes');
    const routes = await fs.readdir(routesPath);
    const routeCount = routes.filter(f => f.endsWith('.mjs')).length;
    checks.push({ name: 'Routes', status: 'OK', details: `${routeCount} route files found` });
  } catch {
    checks.push({ name: 'Routes', status: 'ERROR', details: 'Routes directory inaccessible' });
  }
  
  // Display results
  checks.forEach(check => {
    const icon = check.status === 'OK' ? '✅' : 
                 check.status === 'WARNING' ? '⚠️' : '❌';
    const color = check.status === 'OK' ? chalk.green :
                  check.status === 'WARNING' ? chalk.yellow : chalk.red;
    
    console.log(`${icon} ${check.name.padEnd(20)} ${color(check.status)} - ${check.details}`);
  });
  
  const okCount = checks.filter(c => c.status === 'OK').length;
  const total = checks.length;
  
  console.log(chalk.gray('\n' + '='.repeat(40)));
  console.log(chalk.blue(`System Health: ${okCount}/${total} checks passed`));
  
  return checks;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkSystemStatus().catch(console.error);
}
