#!/usr/bin/env node

/**
 * Quick startup test to identify import/export issues
 */

import chalk from 'chalk';

async function testImports() {
  console.log(chalk.blue('🔍 Testing critical imports...'));
  
  const imports = [
    { name: 'authMiddleware', path: './middleware/authMiddleware.mjs' },
    { name: 'GamificationPersistence', path: './services/gamification/GamificationPersistence.mjs' },
    { name: 'GamificationEngine', path: './services/gamification/GamificationEngine.mjs' },
    { name: 'aiMonitoringRoutes', path: './routes/aiMonitoringRoutes.mjs' },
    { name: 'mcpRoutes', path: './routes/mcpRoutes.mjs' },
  ];
  
  for (const imp of imports) {
    try {
      console.log(chalk.yellow(`Testing ${imp.name}...`));
      const module = await import(imp.path);
      console.log(chalk.green(`✓ ${imp.name} imported successfully`));
      
      // Show available exports
      const exports = Object.keys(module);
      if (exports.length > 0) {
        console.log(chalk.gray(`  Exports: ${exports.join(', ')}`));
      }
    } catch (error) {
      console.log(chalk.red(`✗ ${imp.name} failed:`));
      console.log(chalk.red(`  ${error.message}`));
      console.log(chalk.gray(`  Stack: ${error.stack?.split('\n')[0]}`));
    }
  }
  
  console.log(chalk.blue('\n🔍 Testing database import...'));
  try {
    const sequelize = await import('./database.mjs');
    console.log(chalk.green('✓ Database module imported successfully'));
  } catch (error) {
    console.log(chalk.red('✗ Database import failed:'));
    console.log(chalk.red(`  ${error.message}`));
  }
}

testImports().catch(console.error);
