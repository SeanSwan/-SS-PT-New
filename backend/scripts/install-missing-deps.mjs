#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

console.log(chalk.blue.bold('🔧 Installing Missing Dependencies'));

async function installMissingDeps() {
  try {
    console.log(chalk.yellow('ℹ Installing ioredis dependency...'));
    
    // Change to backend directory
    process.chdir(join(__dirname, '..'));
    
    // Install ioredis
    const { stdout, stderr } = await execAsync('npm install ioredis@^5.4.1');
    
    if (stderr && !stderr.includes('warn')) {
      console.log(chalk.red('✗ Error installing dependencies:'));
      console.log(stderr);
      return false;
    }
    
    console.log(chalk.green('✓ ioredis installed successfully'));
    
    // Clear npm cache to ensure clean install
    console.log(chalk.yellow('ℹ Clearing npm cache...'));
    await execAsync('npm cache clean --force');
    console.log(chalk.green('✓ Cache cleared'));
    
    return true;
  } catch (error) {
    console.log(chalk.red('✗ Installation failed:'));
    console.log(error.message);
    return false;
  }
}

async function main() {
  const success = await installMissingDeps();
  
  if (success) {
    console.log(chalk.green.bold('✅ Missing dependencies installed successfully!'));
    console.log(chalk.blue('ℹ You can now restart the backend with:'));
    console.log(chalk.cyan('  npm run dev'));
    console.log('');
    console.log(chalk.yellow('ℹ Note: Redis server is required for gamification.'));
    console.log(chalk.yellow('If Redis is not running, the system will use database fallback.'));
  } else {
    console.log(chalk.red.bold('❌ Failed to install dependencies'));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});
