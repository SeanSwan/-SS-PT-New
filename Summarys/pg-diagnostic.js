// pg-diagnostic.js - PostgreSQL connection diagnostic tool
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

// Create readline interface for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Log with timestamp
function logWithTime(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Load .env file manually to check its content
function loadEnvFile() {
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      console.log(`Found .env file at: ${envPath}`);
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      // Extract DB-related variables
      const dbVars = {};
      envLines.forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            if (key.includes('PG_') || key.includes('DB_') || key.includes('DATABASE')) {
              dbVars[key] = value;
            }
          }
        }
      });
      
      return { exists: true, content: envContent, dbVars };
    } else {
      return { exists: false };
    }
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

// Test PostgreSQL connection with various configurations
async function testConnection(config) {
  const client = new Client(config);
  try {
    logWithTime(`Testing connection with: ${JSON.stringify({...config, password: config.password ? '*****' : '(empty string)'})}`);
    await client.connect();
    logWithTime('✅ CONNECTION SUCCESSFUL!');
    
    // Check if client_progress table exists
    const tableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'client_progress'
      );
    `);
    
    if (tableResult.rows[0].exists) {
      logWithTime('✅ client_progress table exists!');
      
      // Check for columns
      const columnResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'client_progress';
      `);
      
      logWithTime(`Found ${columnResult.rows.length} columns in client_progress table:`);
      console.log(columnResult.rows.map(row => row.column_name).join(', '));
      
      // Check for MCP columns
      const mcpColumns = columnResult.rows
        .map(row => row.column_name)
        .filter(name => ['workoutData', 'gamificationData', 'lastSynced'].includes(name));
      
      if (mcpColumns.length > 0) {
        logWithTime(`✅ Found ${mcpColumns.length} MCP columns: ${mcpColumns.join(', ')}`);
      } else {
        logWithTime('❌ MCP columns are missing! Need to add: workoutData, gamificationData, lastSynced');
      }
    } else {
      logWithTime('❌ client_progress table does not exist!');
    }
    
    return { success: true, config };
  } catch (error) {
    logWithTime(`❌ Connection failed: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await client.end().catch(() => {});
  }
}

// Get password interactively
function getPassword() {
  return new Promise((resolve) => {
    rl.question('Enter PostgreSQL password (leave empty if none): ', (answer) => {
      resolve(answer);
    });
  });
}

// Execute migration with the working configuration
async function executeMigration(config) {
  const client = new Client(config);
  
  try {
    logWithTime('Connecting to database to execute migration...');
    await client.connect();
    
    // Check which columns already exist
    const columnCheckResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'client_progress' 
      AND column_name IN ('workoutData', 'gamificationData', 'lastSynced');
    `);
    
    const existingColumns = columnCheckResult.rows.map(row => row.column_name);
    logWithTime(`Found existing columns: ${existingColumns.join(', ') || 'none'}`);
    
    // Add missing columns
    const requiredColumns = ['workoutData', 'gamificationData', 'lastSynced'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      logWithTime('All required columns already exist. No migration needed.');
      return true;
    }
    
    logWithTime(`Adding missing columns: ${missingColumns.join(', ')}`);
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Add each missing column
    for (const column of missingColumns) {
      let sql;
      if (column === 'workoutData' || column === 'gamificationData') {
        sql = `ALTER TABLE client_progress ADD COLUMN IF NOT EXISTS "${column}" TEXT NULL;`;
      } else if (column === 'lastSynced') {
        sql = `ALTER TABLE client_progress ADD COLUMN IF NOT EXISTS "lastSynced" TIMESTAMP WITH TIME ZONE NULL;`;
      }
      
      if (sql) {
        logWithTime(`Executing SQL: ${sql}`);
        await client.query(sql);
        logWithTime(`Added column: ${column}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Verify the columns were added
    const finalColumnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'client_progress' 
      AND column_name IN ('workoutData', 'gamificationData', 'lastSynced');
    `);
    
    const finalColumns = finalColumnCheck.rows.map(row => row.column_name);
    const addedColumns = finalColumns.filter(col => !existingColumns.includes(col));
    
    logWithTime(`Successfully added columns: ${addedColumns.join(', ')}`);
    logWithTime('✅ Migration completed successfully!');
    
    return true;
  } catch (error) {
    if (client.query) {
      // Try to rollback if transaction was started
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logWithTime(`Error during rollback: ${rollbackError.message}`);
      }
    }
    
    logWithTime(`❌ Error during migration: ${error.message}`);
    return false;
  } finally {
    // Close client connection
    if (client.end) {
      await client.end().catch(() => {});
    }
  }
}

// Write successful config to file for future use
function saveWorkingConfig(config) {
  try {
    const configPath = path.resolve(__dirname, 'working-pg-config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      ...config,
      passwordSet: !!config.password // Don't store actual password
    }, null, 2));
    logWithTime(`Saved working configuration parameters to: ${configPath}`);
  } catch (error) {
    logWithTime(`Error saving configuration: ${error.message}`);
  }
}

// Create a special .env file patch for the working configuration
function createEnvPatch(workingConfig) {
  try {
    const patchContent = `
# PostgreSQL connection settings that worked with diagnostic tool
# Added on ${new Date().toISOString()}
PG_HOST=${workingConfig.host}
PG_PORT=${workingConfig.port}
PG_DB=${workingConfig.database}
PG_USER=${workingConfig.user}
${workingConfig.password ? `PG_PASSWORD=${workingConfig.password}` : '# No password was used successfully'}
# End of PostgreSQL patch
`;
    
    const patchPath = path.resolve(__dirname, 'pg-env-patch.txt');
    fs.writeFileSync(patchPath, patchContent);
    logWithTime(`Created environment patch file: ${patchPath}`);
    logWithTime('You can add these variables to your .env file if needed');
  } catch (error) {
    logWithTime(`Error creating env patch: ${error.message}`);
  }
}

// Update frontend to use SafeMainContent
function updateFrontend() {
  try {
    // Check if SafeMainContent exists
    const safeMainContentPath = path.resolve(__dirname, 'frontend', 'src', 'components', 'ClientDashboard', 'SafeMainContent.tsx');
    
    if (!fs.existsSync(safeMainContentPath)) {
      logWithTime('SafeMainContent.tsx not found, skipping frontend update.');
      return false;
    }
    
    // Check if ProgressSection uses SafeMainContent
    const progressSectionPath = path.resolve(__dirname, 'frontend', 'src', 'components', 'ClientDashboard', 'ProgressSection.tsx');
    
    if (!fs.existsSync(progressSectionPath)) {
      logWithTime('ProgressSection.tsx not found, skipping frontend update.');
      return false;
    }
    
    const progressContent = fs.readFileSync(progressSectionPath, 'utf8');
    
    if (progressContent.includes('SafeMainContent')) {
      logWithTime('ProgressSection already uses SafeMainContent.');
      return true;
    }
    
    logWithTime('Updating ProgressSection to use SafeMainContent...');
    
    // Very careful update to avoid breaking syntax
    let updatedContent = progressContent;
    
    // Update import
    updatedContent = updatedContent.replace(
      /import ClientMainContent, {/g,
      'import SafeMainContent, {'
    );
    
    // Update component reference
    updatedContent = updatedContent.replace(
      /} from "\.\/ClientMainContent";/g,
      '} from "./SafeMainContent";'
    );
    
    // Update component usage
    updatedContent = updatedContent.replace(
      /<ClientMainContent/g,
      '<SafeMainContent'
    );
    
    updatedContent = updatedContent.replace(
      /<\/ClientMainContent>/g,
      '</SafeMainContent>'
    );
    
    fs.writeFileSync(progressSectionPath, updatedContent);
    logWithTime('✅ Successfully updated ProgressSection to use SafeMainContent');
    
    return true;
  } catch (error) {
    logWithTime(`Error updating frontend: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  logWithTime('PostgreSQL Connection Diagnostic Tool');
  logWithTime('This tool will help identify and fix the database connection issues');
  
  // Check environment variables
  const envInfo = loadEnvFile();
  if (envInfo.exists) {
    console.log('\nDatabase-related environment variables:');
    console.table(envInfo.dbVars);
  } else if (envInfo.error) {
    logWithTime(`Error reading .env file: ${envInfo.error}`);
  } else {
    logWithTime('No .env file found!');
  }
  
  // Basic configurations to try
  let configs = [
    // Try 1: Empty password
    {
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DB || 'swanstudios',
      user: process.env.PG_USER || 'swanadmin',
      password: ''
    },
    // Try 2: Using connection string with empty password
    {
      connectionString: `postgres://${process.env.PG_USER || 'swanadmin'}@${process.env.PG_HOST || 'localhost'}:${process.env.PG_PORT || 5432}/${process.env.PG_DB || 'swanstudios'}`
    }
  ];
  
  // Add environment password if it exists
  if (process.env.PG_PASSWORD) {
    configs.push({
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DB || 'swanstudios',
      user: process.env.PG_USER || 'swanadmin',
      password: process.env.PG_PASSWORD
    });
  }
  
  // Test each config
  let success = false;
  let workingConfig = null;
  
  for (const config of configs) {
    const result = await testConnection(config);
    if (result.success) {
      success = true;
      workingConfig = config;
      break;
    }
  }
  
  // If all default configs failed, ask user for password
  if (!success) {
    logWithTime('All default configurations failed. Let\'s try with a manual password.');
    const password = await getPassword();
    
    const manualConfig = {
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DB || 'swanstudios',
      user: process.env.PG_USER || 'swanadmin',
      password: password
    };
    
    const result = await testConnection(manualConfig);
    if (result.success) {
      success = true;
      workingConfig = manualConfig;
    }
  }
  
  // If a working configuration was found
  if (success && workingConfig) {
    logWithTime('🎉 Found a working PostgreSQL configuration!');
    
    // Save the working configuration
    saveWorkingConfig(workingConfig);
    createEnvPatch(workingConfig);
    
    // Ask if we should proceed with migration
    rl.question('Do you want to proceed with the database migration? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        const migrationSuccess = await executeMigration(workingConfig);
        
        if (migrationSuccess) {
          // Update frontend if needed
          const frontendSuccess = updateFrontend();
          
          logWithTime('Database migration completed successfully!');
          logWithTime('\nNext steps:');
          logWithTime('1. Use the working configuration parameters in your application');
          logWithTime('2. Restart your server to apply the model changes');
          logWithTime('3. Verify the client progress tab shows synchronized data');
          
          // Ask if we should restart servers
          rl.question('Do you want to restart the servers now? (y/n): ', async (restartAnswer) => {
            if (restartAnswer.toLowerCase() === 'y') {
              try {
                // Kill any running node processes
                try {
                  await new Promise((resolve, reject) => {
                    exec('taskkill /f /im node.exe', (error, stdout, stderr) => {
                      if (error && error.code !== 128) {
                        reject(error);
                      } else {
                        resolve(stdout);
                      }
                    });
                  });
                  logWithTime('Terminated existing Node.js processes.');
                } catch (error) {
                  logWithTime('No Node.js processes to terminate or unable to terminate.');
                }
                
                // Wait for processes to terminate
                logWithTime('Waiting for processes to terminate...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Start the backend in a new process
                exec('start cmd /c "cd backend && npm start"');
                logWithTime('Started backend server in a new process.');
                
                // Wait for backend to initialize
                logWithTime('Waiting for backend to initialize...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Start the frontend in a new process
                exec('start cmd /c "cd frontend && npm run dev"');
                logWithTime('Started frontend server in a new process.');
                
                logWithTime('✅ Services restarted successfully.');
              } catch (error) {
                logWithTime(`❌ Error restarting services: ${error.message}`);
              }
            }
            
            rl.close();
          });
        } else {
          logWithTime('❌ Migration failed. Check the error messages above.');
          rl.close();
        }
      } else {
        logWithTime('Migration cancelled by user.');
        rl.close();
      }
    });
  } else {
    logWithTime('❌ Could not find a working PostgreSQL configuration.');
    logWithTime('\nPossible solutions:');
    logWithTime('1. Check if PostgreSQL is running');
    logWithTime('2. Verify user credentials');
    logWithTime('3. Try with a different PostgreSQL client tool (e.g., pgAdmin, psql)');
    logWithTime('4. Check your pg_hba.conf file for authentication methods');
    rl.close();
  }
}

// Run the diagnostic
main();
