// setup-dev-users.js - Create development users for testing
const { Client } = require('pg');
const crypto = require('crypto');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

// Generate a hash for the password
function generatePasswordHash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Get database configuration from the user
async function getDatabaseConfig() {
  // Try to load from working config if it exists
  const configPath = path.resolve(__dirname, 'working-pg-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      logWithTime('Found saved database configuration from diagnostic tool.');
      
      // If password is not saved, ask for it
      if (!config.password && config.passwordSet) {
        config.password = await new Promise(resolve => {
          rl.question('Enter PostgreSQL password: ', answer => resolve(answer));
        });
      }
      
      return config;
    } catch (error) {
      logWithTime(`Error loading saved config: ${error.message}`);
    }
  }
  
  // Otherwise, ask for configuration
  const host = await new Promise(resolve => {
    rl.question('PostgreSQL host (default: localhost): ', answer => resolve(answer || 'localhost'));
  });
  
  const port = await new Promise(resolve => {
    rl.question('PostgreSQL port (default: 5432): ', answer => resolve(answer || '5432'));
  });
  
  const database = await new Promise(resolve => {
    rl.question('PostgreSQL database name (default: swanstudios): ', answer => resolve(answer || 'swanstudios'));
  });
  
  const user = await new Promise(resolve => {
    rl.question('PostgreSQL user (default: swanadmin): ', answer => resolve(answer || 'swanadmin'));
  });
  
  const password = await new Promise(resolve => {
    rl.question('PostgreSQL password (leave empty if none): ', answer => resolve(answer));
  });
  
  return {
    host,
    port,
    database,
    user,
    password
  };
}

// Test connection to the database
async function testConnection(config) {
  const client = new Client(config);
  try {
    logWithTime('Testing database connection...');
    await client.connect();
    logWithTime('✅ Database connection successful!');
    return { success: true, client };
  } catch (error) {
    logWithTime(`❌ Database connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Check if users table exists
async function checkUsersTable(client) {
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    return result.rows[0].exists;
  } catch (error) {
    logWithTime(`Error checking users table: ${error.message}`);
    return false;
  }
}

// Check if client_progress table exists
async function checkClientProgressTable(client) {
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'client_progress'
      );
    `);
    
    return result.rows[0].exists;
  } catch (error) {
    logWithTime(`Error checking client_progress table: ${error.message}`);
    return false;
  }
}

// Create the development users
async function createDevUsers(client) {
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Generate unique IDs for the users
    const adminId = uuidv4();
    const trainerId = uuidv4();
    const clientId = uuidv4();
    
    // Fixed simple password for dev users
    const password = generatePasswordHash('password123');
    
    // Current timestamp
    const now = new Date().toISOString();
    
    // Check if users already exist
    const existingUsers = await client.query(`
      SELECT * FROM users 
      WHERE email IN ('admin@swanstudios.com', 'trainer@swanstudios.com', 'client@swanstudios.com');
    `);
    
    if (existingUsers.rows.length > 0) {
      logWithTime(`Found ${existingUsers.rows.length} existing dev users:`);
      existingUsers.rows.forEach(user => {
        logWithTime(`- ${user.email} (${user.role})`);
      });
      
      const deleteExisting = await new Promise(resolve => {
        rl.question('Delete existing dev users and create new ones? (y/n): ', answer => resolve(answer.toLowerCase() === 'y'));
      });
      
      if (deleteExisting) {
        await client.query(`
          DELETE FROM users 
          WHERE email IN ('admin@swanstudios.com', 'trainer@swanstudios.com', 'client@swanstudios.com');
        `);
        logWithTime('Deleted existing dev users.');
      } else {
        logWithTime('Keeping existing dev users.');
        await client.query('COMMIT');
        return {
          admin: existingUsers.rows.find(u => u.email === 'admin@swanstudios.com'),
          trainer: existingUsers.rows.find(u => u.email === 'trainer@swanstudios.com'),
          client: existingUsers.rows.find(u => u.email === 'client@swanstudios.com')
        };
      }
    }
    
    // Create admin user
    await client.query(`
      INSERT INTO users (
        id, email, password, firstName, lastName, role, createdAt, updatedAt
      ) VALUES (
        $1, 'admin@swanstudios.com', $2, 'Admin', 'User', 'admin', $3, $3
      )
      ON CONFLICT (email) DO UPDATE SET
        password = $2,
        updatedAt = $3;
    `, [adminId, password, now]);
    
    logWithTime('✅ Created admin user: admin@swanstudios.com (password: password123)');
    
    // Create trainer user
    await client.query(`
      INSERT INTO users (
        id, email, password, firstName, lastName, role, createdAt, updatedAt
      ) VALUES (
        $1, 'trainer@swanstudios.com', $2, 'Trainer', 'User', 'trainer', $3, $3
      )
      ON CONFLICT (email) DO UPDATE SET
        password = $2,
        updatedAt = $3;
    `, [trainerId, password, now]);
    
    logWithTime('✅ Created trainer user: trainer@swanstudios.com (password: password123)');
    
    // Create client user
    await client.query(`
      INSERT INTO users (
        id, email, password, firstName, lastName, role, createdAt, updatedAt
      ) VALUES (
        $1, 'client@swanstudios.com', $2, 'Client', 'User', 'client', $3, $3
      )
      ON CONFLICT (email) DO UPDATE SET
        password = $2,
        updatedAt = $3;
    `, [clientId, password, now]);
    
    logWithTime('✅ Created client user: client@swanstudios.com (password: password123)');
    
    // Check if client_progress table exists
    const hasClientProgressTable = await checkClientProgressTable(client);
    
    // Create client progress entry if needed
    if (hasClientProgressTable) {
      // Check if client already has progress entry
      const existingProgress = await client.query(`
        SELECT * FROM client_progress WHERE "userId" = $1;
      `, [clientId]);
      
      if (existingProgress.rows.length === 0) {
        // Create basic progress entry for the client
        await client.query(`
          INSERT INTO client_progress (
            id, "userId", "overallLevel", "experiencePoints", "coreLevel", "balanceLevel",
            "stabilityLevel", "flexibilityLevel", "calisthenicsLevel", "isolationLevel",
            "stabilizersLevel", "injuryPreventionLevel", "injuryRecoveryLevel", 
            "createdAt", "updatedAt",
            "workoutData", "gamificationData", "lastSynced"
          ) VALUES (
            $1, $2, 5, 100, 5, 5, 5, 5, 5, 5, 5, 5, 5, $3, $3,
            $4, $5, $3
          );
        `, [
          uuidv4(), 
          clientId, 
          now,
          JSON.stringify({ progress: { level: 5, experiencePoints: 100, exercises: [] } }),
          JSON.stringify({ profile: { level: 5, points: 100 }, achievements: [] })
        ]);
        
        logWithTime('✅ Created initial progress data for client user');
      } else {
        logWithTime('Client user already has progress data');
      }
    } else {
      logWithTime('⚠️ client_progress table not found, skipping progress data creation');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    return {
      admin: { id: adminId, email: 'admin@swanstudios.com', role: 'admin' },
      trainer: { id: trainerId, email: 'trainer@swanstudios.com', role: 'trainer' },
      client: { id: clientId, email: 'client@swanstudios.com', role: 'client' }
    };
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    logWithTime(`❌ Error creating dev users: ${error.message}`);
    throw error;
  }
}

// Main function
async function main() {
  let client;
  
  try {
    logWithTime('SwanStudios Development User Setup');
    logWithTime('This tool will create admin, trainer, and client users for development testing');
    
    // Get database configuration
    const config = await getDatabaseConfig();
    
    // Test connection
    const connectionResult = await testConnection(config);
    if (!connectionResult.success) {
      logWithTime('❌ Cannot proceed without database connection.');
      rl.close();
      return;
    }
    
    client = connectionResult.client;
    
    // Check if users table exists
    const hasUsersTable = await checkUsersTable(client);
    if (!hasUsersTable) {
      logWithTime('❌ Users table not found in database. Migration may be needed first.');
      rl.close();
      return;
    }
    
    // Create dev users
    const users = await createDevUsers(client);
    
    logWithTime('\n🎉 Development users have been set up successfully!');
    logWithTime('\nYou can now use these credentials to log in:');
    logWithTime('- Admin: admin@swanstudios.com (password: password123)');
    logWithTime('- Trainer: trainer@swanstudios.com (password: password123)');
    logWithTime('- Client: client@swanstudios.com (password: password123)');
    
    logWithTime('\nNext steps:');
    logWithTime('1. Restart your server if it\'s currently running');
    logWithTime('2. Log in with the credentials above to test different role views');
    logWithTime('3. Use the client account to test progress synchronization');
    
    const restartServers = await new Promise(resolve => {
      rl.question('Do you want to restart the servers now? (y/n): ', answer => resolve(answer.toLowerCase() === 'y'));
    });
    
    if (restartServers) {
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
  } catch (error) {
    logWithTime(`❌ An error occurred: ${error.message}`);
  } finally {
    // Close database connection
    if (client) {
      await client.end();
    }
    
    // Close readline interface
    rl.close();
  }
}

// Run the main function
main();
