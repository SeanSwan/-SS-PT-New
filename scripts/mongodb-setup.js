/**
 * MongoDB Setup Script
 * Ensures MongoDB is running before starting the application
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

async function checkMongoStatus() {
  try {
    // Check if MongoDB is already running
    const { stdout } = await execAsync('netstat -an | findstr :27017');
    if (stdout.includes('27017')) {
      console.log(chalk.green('✅ MongoDB is already running on port 27017'));
      return true;
    }
  } catch (error) {
    // Not running, will start it
  }
  return false;
}

async function startMongoDB() {
  const isRunning = await checkMongoStatus();
  
  if (!isRunning) {
    console.log(chalk.yellow('🚀 Starting MongoDB...'));
    
    try {
      // Try to start MongoDB as a service first
      await execAsync('net start MongoDB');
      console.log(chalk.green('✅ MongoDB service started successfully'));
    } catch (error) {
      console.log(chalk.blue('ℹ️  Starting MongoDB manually...'));
      
      // Start MongoDB manually if service doesn't exist
      const mongoProcess = spawn('mongod', ['--dbpath=C:\\data\\db'], {
        detached: true,
        stdio: 'ignore'
      });
      
      mongoProcess.unref();
      
      // Wait a moment for MongoDB to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const isNowRunning = await checkMongoStatus();
      if (isNowRunning) {
        console.log(chalk.green('✅ MongoDB started successfully'));
      } else {
        console.log(chalk.red('❌ Failed to start MongoDB'));
        console.log(chalk.blue('💡 Try running: mongod --dbpath=C:\\data\\db'));
      }
    }
  }
}

startMongoDB().catch(console.error);
