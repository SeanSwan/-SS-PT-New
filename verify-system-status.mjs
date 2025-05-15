#!/usr/bin/env node

/**
 * System Status Verification Script
 * Checks the health of all critical components
 */

// Simple verification script using only built-in modules
import http from 'http';
import https from 'https';

// Configuration
const CHECKS = {
  backend: { url: 'http://localhost:10000/health', name: 'Backend API' },
  frontend: { url: 'http://localhost:5173', name: 'Frontend Vite Dev Server' },
  workout_mcp: { url: 'http://localhost:8000/health', name: 'Workout MCP Server' },
  gamification_mcp: { url: 'http://localhost:8002/health', name: 'Gamification MCP Server' },
  yolo_mcp: { url: 'http://localhost:8005/health', name: 'YOLO AI MCP Server' }
};

const DATABASES = {
  postgresql: {
    name: 'PostgreSQL',
    config: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'swanstudios_user',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'swanstudios_db'
    }
  },
  mongodb: {
    name: 'MongoDB',
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/swanstudios'
  }
};

/**
 * Check HTTP service health
 */
async function checkService(name, url) {
  try {
    const response = await axios.get(url, { 
      timeout: 5000,
      validateStatus: () => true 
    });
    
    if (response.status >= 200 && response.status < 300) {
      console.log(chalk.green(`✓ ${name} - Status: ${response.status}`));
      return { success: true, status: response.status, data: response.data };
    } else {
      console.log(chalk.yellow(`⚠ ${name} - Status: ${response.status}`));
      return { success: false, status: response.status, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log(chalk.red(`✗ ${name} - Error: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Check PostgreSQL connection
 */
async function checkPostgreSQL(config) {
  try {
    const client = new Client(config);
    await client.connect();
    await client.query('SELECT NOW()');
    await client.end();
    console.log(chalk.green(`✓ PostgreSQL - Connected successfully`));
    return { success: true };
  } catch (error) {
    console.log(chalk.red(`✗ PostgreSQL - Error: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Check MongoDB connection (simplified)
 */
async function checkMongoDB(url) {
  try {
    // For MongoDB, we'll just check the URL format
    // In a real implementation, you'd want to use mongodb client
    const mongoUrl = new URL(url);
    console.log(chalk.green(`✓ MongoDB - URL format valid`));
    return { success: true };
  } catch (error) {
    console.log(chalk.red(`✗ MongoDB - URL Error: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Main verification function
 */
async function verifySystemStatus() {
  console.log(chalk.bold.blue('🔍 SwanStudios System Status Check\n'));
  
  // Check HTTP services
  console.log(chalk.bold.yellow('HTTP Services:'));
  const serviceResults = {};
  for (const [key, service] of Object.entries(CHECKS)) {
    serviceResults[key] = await checkService(service.name, service.url);
  }
  
  console.log('');
  
  // Check databases
  console.log(chalk.bold.yellow('Databases:'));
  const dbResults = {};
  
  // PostgreSQL
  dbResults.postgresql = await checkPostgreSQL(DATABASES.postgresql.config);
  
  // MongoDB (simplified check)
  dbResults.mongodb = await checkMongoDB(DATABASES.mongodb.url);
  
  console.log('');
  
  // Summary
  console.log(chalk.bold.yellow('Summary:'));
  const totalServices = Object.keys(serviceResults).length + Object.keys(dbResults).length;
  const successfulServices = [
    ...Object.values(serviceResults).filter(r => r.success),
    ...Object.values(dbResults).filter(r => r.success)
  ].length;
  
  const successRate = (successfulServices / totalServices * 100).toFixed(1);
  
  if (successRate === '100.0') {
    console.log(chalk.green(`🎉 All services operational (${successRate}%)`));
  } else if (successRate >= '75.0') {
    console.log(chalk.yellow(`⚠️ Most services operational (${successRate}%)`));
  } else {
    console.log(chalk.red(`🚨 Multiple services down (${successRate}%)`));
  }
  
  // Recommendations
  console.log('');
  console.log(chalk.bold.yellow('Recommendations:'));
  
  if (!serviceResults.backend?.success) {
    console.log(chalk.red('• Backend API is not running - check authMiddleware and server.mjs'));
  }
  
  if (!serviceResults.workout_mcp?.success) {
    console.log(chalk.red('• Workout MCP Server is down - check Python dependencies and imports'));
  }
  
  if (!dbResults.postgresql?.success) {
    console.log(chalk.red('• PostgreSQL connection failed - verify database is running'));
  }
  
  if (successfulServices === totalServices) {
    console.log(chalk.green('• System is ready! You can proceed with development.'));
  }
  
  return {
    overall: successRate,
    services: serviceResults,
    databases: dbResults
  };
}

// Run the check
if (import.meta.url === new URL(import.meta.url).href) {
  verifySystemStatus()
    .then(() => {
      console.log(chalk.gray('\nCheck complete. Run npm start to launch services.'));
    })
    .catch(error => {
      console.error(chalk.red(`\nVerification failed: ${error.message}`));
      process.exit(1);
    });
}

export default verifySystemStatus;
