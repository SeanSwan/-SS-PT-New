// complete-dashboard-setup.js - One script to handle all dashboard integration setup
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { exec } = require('child_process');
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

// Get database configuration from the user
async function getDatabaseConfig() {
  const host = await new Promise(resolve => {
    rl.question('PostgreSQL host (default: localhost): ', answer => resolve(answer || 'localhost'));
  });
  
  const port = await new Promise(resolve => {
    rl.question('PostgreSQL port (default: 5432): ', answer => resolve(parseInt(answer) || 5432));
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
    password: password || '' // Ensure empty string for empty password
  };
}

// Generate a hash for the password
function generatePasswordHash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
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
    if (client.end) {
      await client.end().catch(() => {});
    }
    logWithTime(`❌ Database connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Update client_progress table schema
async function updateClientProgressTable(client) {
  try {
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'client_progress'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      logWithTime('❌ client_progress table does not exist. Database may need initialization.');
      return false;
    }
    
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
      logWithTime('✅ All required columns already exist in client_progress table. No migration needed.');
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
    logWithTime('✅ client_progress table updated successfully!');
    
    return true;
  } catch (error) {
    try {
      // Rollback transaction on error
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logWithTime(`Error rolling back transaction: ${rollbackError.message}`);
    }
    
    logWithTime(`❌ Error updating client_progress table: ${error.message}`);
    return false;
  }
}

// Create development users for testing
async function createDevUsers(client) {
  try {
    // Check if users table exists
    const usersTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    if (!usersTableExists.rows[0].exists) {
      logWithTime('❌ users table does not exist. Database may need initialization.');
      return false;
    }
    
    logWithTime('Creating development users for testing...');
    
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
        return true;
      }
    }
    
    // Create admin user
    await client.query(`
      INSERT INTO users (
        id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt"
      ) VALUES (
        $1, 'admin@swanstudios.com', $2, 'Admin', 'User', 'admin', $3, $3
      )
      ON CONFLICT (email) DO UPDATE SET
        password = $2,
        "updatedAt" = $3;
    `, [adminId, password, now]);
    
    logWithTime('✅ Created admin user: admin@swanstudios.com (password: password123)');
    
    // Create trainer user
    await client.query(`
      INSERT INTO users (
        id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt"
      ) VALUES (
        $1, 'trainer@swanstudios.com', $2, 'Trainer', 'User', 'trainer', $3, $3
      )
      ON CONFLICT (email) DO UPDATE SET
        password = $2,
        "updatedAt" = $3;
    `, [trainerId, password, now]);
    
    logWithTime('✅ Created trainer user: trainer@swanstudios.com (password: password123)');
    
    // Create client user
    await client.query(`
      INSERT INTO users (
        id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt"
      ) VALUES (
        $1, 'client@swanstudios.com', $2, 'Client', 'User', 'client', $3, $3
      )
      ON CONFLICT (email) DO UPDATE SET
        password = $2,
        "updatedAt" = $3;
    `, [clientId, password, now]);
    
    logWithTime('✅ Created client user: client@swanstudios.com (password: password123)');
    
    // Check if client_progress table exists
    const clientProgressTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'client_progress'
      );
    `);
    
    if (clientProgressTableExists.rows[0].exists) {
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
            "glutesLevel", "calfsLevel", "shouldersLevel", "hamstringsLevel", "absLevel",
            "chestLevel", "bicepsLevel", "tricepsLevel", "tibialisAnteriorLevel", "serratusAnteriorLevel",
            "latissimusDorsiLevel", "hipsLevel", "lowerBackLevel", "wristsForearmLevel", "neckLevel",
            "squatsLevel", "lungesLevel", "planksLevel", "reversePlanksLevel",
            "createdAt", "updatedAt",
            "workoutData", "gamificationData", "lastSynced"
          ) VALUES (
            $1, $2, 5, 100, 5, 5, 5, 5, 5, 5, 5, 5, 5, 
            5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
            5, 5, 5, 5,
            $3, $3,
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
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logWithTime('✅ Development users created successfully!');
    return true;
  } catch (error) {
    try {
      // Rollback transaction on error
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logWithTime(`Error rolling back transaction: ${rollbackError.message}`);
    }
    
    logWithTime(`❌ Error creating development users: ${error.message}`);
    return false;
  }
}

// Update frontend components to use safe styling
function updateFrontendComponents() {
  try {
    logWithTime('Updating frontend components...');
    
    // Path to the new SafeMainContent component
    const safeMainContentPath = path.join(__dirname, 'frontend', 'src', 'components', 'ClientDashboard', 'SafeMainContent.tsx');
    
    // Create the SafeMainContent component if it doesn't exist
    if (!fs.existsSync(safeMainContentPath)) {
      // SafeMainContent implementation
      const safeMainContentCode = `import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

// Fallback theme values in case theme is undefined
const fallbackTheme = {
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px'
  },
  colors: {
    text: '#ffffff',
    primary: '#00ffff'
  },
  breakpoints: {
    xs: '0px',
    sm: '600px',
    md: '960px',
    lg: '1280px',
    xl: '1920px'
  },
  transitions: {
    short: 'all 0.2s ease',
    medium: 'all 0.3s ease-in-out'
  }
};

// Helper function to safely access theme properties
const getThemeValue = (props, path, fallback) => {
  try {
    // Split the path into parts (e.g., "spacing.lg" -> ["spacing", "lg"])
    const pathParts = path.split('.');
    
    // Start with the theme object or fallback if theme is missing
    let value = props.theme || fallbackTheme;
    
    // Navigate through the path parts
    for (const part of pathParts) {
      // If the current level exists and has the property, move to next level
      if (value && value[part] !== undefined) {
        value = value[part];
      } else {
        // Property not found in theme, use fallback
        return fallback;
      }
    }
    
    return value;
  } catch (error) {
    // If any error occurs, use fallback
    console.warn(\`Theme error: \${error.message}, using fallback value\`);
    return fallback;
  }
};

// Styled components using the safe accessor function
const MainWrapper = styled.div\`
  display: flex;
  flex-direction: column;
  gap: \${props => getThemeValue(props, 'spacing.lg', '24px')};
  height: 100%;
  width: 100%;
\`;

const ContentHeader = styled.div\`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: \${props => getThemeValue(props, 'spacing.md', '16px')};
\`;

const PageTitle = styled.h1\`
  font-size: 1.75rem;
  font-weight: 700;
  color: \${props => getThemeValue(props, 'colors.text', '#ffffff')};
  margin: 0;
  
  @media (max-width: \${props => getThemeValue(props, 'breakpoints.md', '960px')}) {
    font-size: 1.5rem;
  }
\`;

const HeaderActions = styled.div\`
  display: flex;
  gap: \${props => getThemeValue(props, 'spacing.sm', '8px')};
\`;

const ContentContainer = styled.div\`
  display: flex;
  flex-direction: column;
  gap: \${props => getThemeValue(props, 'spacing.md', '16px')};
  width: 100%;
\`;

// Animation variants for content transitions
const contentVariants = {
  hidden: { 
    opacity: 0,
    y: 20 
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2 
    }
  }
};

// Animation variants for individual cards/items
const itemVariants = {
  hidden: { 
    opacity: 0,
    y: 15 
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3
    }
  }
};

// Props interface
interface SafeMainContentProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * SafeMainContent Component
 * 
 * A safer version of ClientMainContent that handles theme errors gracefully.
 * Provides consistent layout, animations, and styling for all dashboard sections.
 * 
 * @param {string} title - The title of the current section
 * @param {ReactNode} actions - Optional buttons or actions to display in header
 * @param {ReactNode} children - The main content to display
 */
const SafeMainContent: React.FC<SafeMainContentProps> = ({
  title,
  actions,
  children
}) => {
  return (
    <MainWrapper>
      <ContentHeader>
        <PageTitle>{title}</PageTitle>
        {actions && <HeaderActions>{actions}</HeaderActions>}
      </ContentHeader>
      
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={contentVariants}
      >
        <ContentContainer>{children}</ContentContainer>
      </motion.div>
    </MainWrapper>
  );
};

export default SafeMainContent;

// Additional exports for reusable components with safe theme access
export const Card = styled(motion.div).attrs(() => ({
  variants: itemVariants
}))\`
  background-color: #1d1f2b;
  border-radius: \${props => getThemeValue(props, 'borderRadius.lg', '12px')};
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  padding: \${props => getThemeValue(props, 'spacing.lg', '24px')};
  transition: \${props => getThemeValue(props, 'transitions.medium', 'all 0.3s ease-in-out')};
  border: 1px solid rgba(66, 70, 93, 0.5);
  margin-bottom: \${props => getThemeValue(props, 'spacing.md', '16px')};
  
  &:hover {
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(80, 87, 122, 0.6);
  }
  
  @media (max-width: \${props => getThemeValue(props, 'breakpoints.md', '960px')}) {
    padding: \${props => getThemeValue(props, 'spacing.md', '16px')};
  }
\`;

export const CardHeader = styled.div\`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: \${props => getThemeValue(props, 'spacing.md', '16px')};
\`;

export const CardTitle = styled.h2\`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
\`;

export const CardContent = styled.div\`
  display: flex;
  flex-direction: column;
  gap: \${props => getThemeValue(props, 'spacing.md', '16px')};
\`;

export const CardFooter = styled.div\`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: \${props => getThemeValue(props, 'spacing.md', '16px')};
  padding-top: \${props => getThemeValue(props, 'spacing.md', '16px')};
  border-top: 1px solid rgba(120, 81, 169, 0.5);
\`;

export const Grid = styled.div<{ columns?: number }>\`
  display: grid;
  grid-template-columns: repeat(\${({ columns }) => columns || 3}, 1fr);
  gap: \${props => getThemeValue(props, 'spacing.md', '16px')};
  
  @media (max-width: \${props => getThemeValue(props, 'breakpoints.lg', '1280px')}) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: \${props => getThemeValue(props, 'breakpoints.md', '960px')}) {
    grid-template-columns: 1fr;
  }
\`;

export const Flex = styled.div<{ gap?: string, direction?: string, align?: string, justify?: string }>\`
  display: flex;
  flex-direction: \${({ direction }) => direction || 'row'};
  gap: \${props => props.gap || getThemeValue(props, 'spacing.md', '16px')};
  align-items: \${({ align }) => align || 'center'};
  justify-content: \${({ justify }) => justify || 'flex-start'};
  
  @media (max-width: \${props => getThemeValue(props, 'breakpoints.md', '960px')}) {
    flex-direction: \${({ direction }) => direction || 'column'};
  }
\`;

export const ProgressBar = styled.div<{ value: number; max?: number; color?: string }>\`
  width: 100%;
  height: 8px;
  background-color: rgba(48, 51, 78, 0.5);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: \${({ value, max = 100 }) => \`\${Math.min(100, (value / max) * 100)}%\`};
    background-color: \${props => props.color || getThemeValue(props, 'colors.primary', '#00ffff')};
    border-radius: 4px;
    transition: width 0.5s ease;
  }
\`;

export const Badge = styled.span<{ color?: string }>\`
  display: inline-block;
  padding: \${props => \`\${getThemeValue(props, 'spacing.xs', '4px')} \${getThemeValue(props, 'spacing.sm', '8px')}\`};
  background-color: \${({ color }) => color ? \`\${color}22\` : \`rgba(0, 255, 255, 0.15)\`};
  color: \${({ color }) => color || '#00ffff'};
  border-radius: \${props => getThemeValue(props, 'borderRadius.md', '8px')};
  font-size: 0.8rem;
  font-weight: 500;
\`;

export const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'outline' | 'text' }>\`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: \${props => getThemeValue(props, 'spacing.sm', '8px')};
  padding: \${props => \`\${getThemeValue(props, 'spacing.sm', '8px')} \${getThemeValue(props, 'spacing.md', '16px')}\`};
  border-radius: \${props => getThemeValue(props, 'borderRadius.md', '8px')};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: \${props => getThemeValue(props, 'transitions.short', 'all 0.2s ease')};
  
  \${({ variant }) => {
    switch (variant) {
      case 'primary':
        return \`
          background-color: #00ffff;
          color: #121212;
          border: none;
          
          &:hover, &:focus {
            background-color: #33ccff;
          }
        \`;
      case 'secondary':
        return \`
          background-color: #7851a9;
          color: #00ffff;
          border: none;
          
          &:hover, &:focus {
            background-color: #8a62ba;
          }
        \`;
      case 'outline':
        return \`
          background-color: transparent;
          color: #00ffff;
          border: 1px solid #00ffff;
          
          &:hover, &:focus {
            background-color: rgba(0, 255, 255, 0.1);
          }
        \`;
      case 'text':
        return \`
          background-color: transparent;
          color: #7851a9;
          border: none;
          padding: 4px 8px;
          
          &:hover, &:focus {
            background-color: rgba(0, 187, 255, 0.1);
          }
        \`;
      default:
        return \`
          background-color: #7851a9;
          color: #121212;
          border: none;
          
          &:hover, &:focus {
            background-color: #9068c0;
          }
        \`;
    }
  }}
  
  &:focus {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
\`;`;
      
      // Create the directories if they don't exist
      const dirPath = path.dirname(safeMainContentPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Write the SafeMainContent component
      fs.writeFileSync(safeMainContentPath, safeMainContentCode);
      logWithTime('✅ Created SafeMainContent component');
    } else {
      logWithTime('SafeMainContent component already exists');
    }
    
    // Path to the ProgressSection component
    const progressSectionPath = path.join(__dirname, 'frontend', 'src', 'components', 'ClientDashboard', 'ProgressSection.tsx');
    
    // Update the ProgressSection component if it exists
    if (fs.existsSync(progressSectionPath)) {
      let progressSectionContent = fs.readFileSync(progressSectionPath, 'utf8');
      
      // Check if it's already using SafeMainContent
      if (progressSectionContent.includes('SafeMainContent')) {
        logWithTime('ProgressSection already uses SafeMainContent');
      } else {
        // Update import statement
        progressSectionContent = progressSectionContent.replace(
          /import\s+ClientMainContent,\s+{/g,
          'import SafeMainContent, {'
        );
        
        // Update import path
        progressSectionContent = progressSectionContent.replace(
          /}\s+from\s+["']\.\/ClientMainContent["'];/g,
          '} from "./SafeMainContent";'
        );
        
        // Update component usage
        progressSectionContent = progressSectionContent.replace(
          /<ClientMainContent/g,
          '<SafeMainContent'
        );
        
        progressSectionContent = progressSectionContent.replace(
          /<\/ClientMainContent>/g,
          '</SafeMainContent>'
        );
        
        // Write the updated ProgressSection component
        fs.writeFileSync(progressSectionPath, progressSectionContent);
        logWithTime('✅ Updated ProgressSection to use SafeMainContent');
      }
    } else {
      logWithTime('⚠️ ProgressSection component not found');
    }
    
    logWithTime('✅ Frontend components updated successfully!');
    return true;
  } catch (error) {
    logWithTime(`❌ Error updating frontend components: ${error.message}`);
    return false;
  }
}

// Restart servers
async function restartServers() {
  try {
    logWithTime('Restarting servers...');
    
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
    return true;
  } catch (error) {
    logWithTime(`❌ Error restarting services: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  let client;
  
  try {
    logWithTime('SwanStudios Dashboard Integration Setup');
    logWithTime('This tool will set up everything needed for the client progress dashboard integration');
    
    // Get database configuration
    logWithTime('\nStep 1: Configure database connection');
    const config = await getDatabaseConfig();
    
    // Test connection
    const connectionResult = await testConnection(config);
    if (!connectionResult.success) {
      logWithTime('❌ Cannot proceed without database connection.');
      rl.close();
      return;
    }
    
    client = connectionResult.client;
    
    // Update client_progress table
    logWithTime('\nStep 2: Update client_progress table schema');
    const tableUpdateSuccess = await updateClientProgressTable(client);
    if (!tableUpdateSuccess) {
      logWithTime('❌ Failed to update client_progress table.');
      const continueAnyway = await new Promise(resolve => {
        rl.question('Continue with the remaining steps anyway? (y/n): ', answer => resolve(answer.toLowerCase() === 'y'));
      });
      
      if (!continueAnyway) {
        rl.close();
        return;
      }
    }
    
    // Create development users
    logWithTime('\nStep 3: Create development users');
    const createUsersSuccess = await createDevUsers(client);
    if (!createUsersSuccess) {
      logWithTime('❌ Failed to create development users.');
      const continueAnyway = await new Promise(resolve => {
        rl.question('Continue with the remaining steps anyway? (y/n): ', answer => resolve(answer.toLowerCase() === 'y'));
      });
      
      if (!continueAnyway) {
        rl.close();
        return;
      }
    }
    
    // Update frontend components
    logWithTime('\nStep 4: Update frontend components');
    const updateFrontendSuccess = updateFrontendComponents();
    if (!updateFrontendSuccess) {
      logWithTime('❌ Failed to update frontend components.');
      const continueAnyway = await new Promise(resolve => {
        rl.question('Continue with the remaining steps anyway? (y/n): ', answer => resolve(answer.toLowerCase() === 'y'));
      });
      
      if (!continueAnyway) {
        rl.close();
        return;
      }
    }
    
    // Ask to restart servers
    const restartServersConfirm = await new Promise(resolve => {
      rl.question('\nDo you want to restart the servers now? (y/n): ', answer => resolve(answer.toLowerCase() === 'y'));
    });
    
    if (restartServersConfirm) {
      logWithTime('\nStep 5: Restart servers');
      await restartServers();
    }
    
    logWithTime('\n🎉 Dashboard integration setup completed!');
    logWithTime('\nYou can now test the integration with these credentials:');
    logWithTime('- Admin: admin@swanstudios.com (password: password123)');
    logWithTime('- Trainer: trainer@swanstudios.com (password: password123)');
    logWithTime('- Client: client@swanstudios.com (password: password123)');
    
    logWithTime('\nNext steps:');
    logWithTime('1. Log in with the credentials above to test different role views');
    logWithTime('2. Use the client account to test progress synchronization');
    logWithTime('3. Verify that the sync status component appears correctly');
    logWithTime('4. Test data synchronization between client and admin dashboards');
    
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
