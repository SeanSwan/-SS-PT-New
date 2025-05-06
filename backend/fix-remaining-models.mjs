/**
 * Fix Remaining Models Script
 * ===========================
 * This script focuses on fixing any remaining missing model files and export issues.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to ensure a directory exists
async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Function to create a file if it doesn't exist
async function createFileIfMissing(filePath, content) {
  try {
    await fs.access(filePath);
    console.log(`File already exists: ${filePath}`);
  } catch (error) {
    await fs.writeFile(filePath, content);
    console.log(`Created file: ${filePath}`);
  }
}

async function main() {
  console.log('🔧 Running Fix Remaining Models Script...');
  
  // Ensure required directories exist
  await ensureDir(path.join(__dirname, 'models'));
  
  // Check associations.mjs imports
  const associationsPath = path.join(__dirname, 'models', 'associations.mjs');
  
  try {
    const associationsContent = await fs.readFile(associationsPath, 'utf8');
    
    // Parse imports from associations.mjs
    const importRegex = /import\s+(\w+)\s+from\s+['"]\.\/(\w+)\.mjs['"]/g;
    const imports = [];
    let match;
    
    while ((match = importRegex.exec(associationsContent)) !== null) {
      imports.push({
        variableName: match[1],
        fileName: match[2]
      });
    }
    
    // Check for any missing model files
    for (const importInfo of imports) {
      const modelPath = path.join(__dirname, 'models', `${importInfo.fileName}.mjs`);
      
      try {
        await fs.access(modelPath);
        // File exists, continue
      } catch (error) {
        console.log(`Missing model file detected: ${importInfo.fileName}.mjs`);
        
        // Create the missing model file based on its name
        await createSimplifiedModel(modelPath, importInfo.fileName);
      }
    }
    
    // Create Gamification.mjs if it doesn't exist
    const gamificationPath = path.join(__dirname, 'models', 'Gamification.mjs');
    const gamificationContent = `/**
 * Gamification Model
 * =================
 * Stores user-specific gamification data like experience points, level progress,
 * achievement tracking, and other gamification elements.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const Gamification = db.define('Gamification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  experience: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalXP: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  streakCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  achievements: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  badges: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  lastUpdateDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalWorkouts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalExercises: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  longestStreak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  currentTier: {
    type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'),
    allowNull: false,
    defaultValue: 'bronze'
  },
  nextTierProgress: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  activityLog: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  }
}, {
  timestamps: true
});

export default Gamification;`;

    await createFileIfMissing(gamificationPath, gamificationContent);

    // Create or verify UserAchievement, UserReward, and UserMilestone models
    await ensureJunctionModels();
    
  } catch (error) {
    console.error(`Error processing associations.mjs: ${error.message}`);
  }
  
  // Check for association export mismatches
  await checkAssociationExports();
  
  // Check for missing exports in middleware files
  await checkMiddlewareExports();

  // Verify the GamificationSettings model is properly exported
  await verifyGamificationSettingsExport();
  
  console.log('\n✅ Fix Remaining Models Script completed successfully.');
}

/**
 * Ensure junction/through models exist
 */
async function ensureJunctionModels() {
  console.log('\nEnsuring junction models exist...');
  
  // UserAchievement model
  const userAchievementPath = path.join(__dirname, 'models', 'UserAchievement.mjs');
  const userAchievementContent = `/**
 * UserAchievement Model
 * =================
 * Junction model representing the relation between Users and Achievements.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const UserAchievement = db.define('UserAchievement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  achievementId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Achievements',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  progress: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  earnedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  pointsAwarded: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'achievementId']
    }
  ]
});

export default UserAchievement;`;

  await createFileIfMissing(userAchievementPath, userAchievementContent);

  // UserReward model
  const userRewardPath = path.join(__dirname, 'models', 'UserReward.mjs');
  const userRewardContent = `/**
 * UserReward Model
 * =================
 * Tracks rewards redeemed by users.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const UserReward = db.define('UserReward', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  rewardId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Rewards',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  redeemedAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'fulfilled', 'canceled', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  pointsCost: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fulfilledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true
});

export default UserReward;`;

  await createFileIfMissing(userRewardPath, userRewardContent);

  // UserMilestone model
  const userMilestonePath = path.join(__dirname, 'models', 'UserMilestone.mjs');
  const userMilestoneContent = `/**
 * UserMilestone Model
 * =================
 * Tracks milestones achieved by users.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const UserMilestone = db.define('UserMilestone', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  milestoneId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Milestones',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  reachedAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  bonusPointsAwarded: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'milestoneId']
    }
  ]
});

export default UserMilestone;`;

  await createFileIfMissing(userMilestonePath, userMilestoneContent);
}

/**
 * Verify GamificationSettings model is properly exported
 */
async function verifyGamificationSettingsExport() {
  console.log('\nVerifying GamificationSettings export...');
  
  // First check if the model exists
  const gamificationSettingsPath = path.join(__dirname, 'models', 'GamificationSettings.mjs');
  
  try {
    // Check if the file exists and create it if it doesn't
    try {
      await fs.access(gamificationSettingsPath);
    } catch (error) {
      const gamificationSettingsContent = `/**
 * GamificationSettings Model
 * =========================
 * Global settings for the gamification system.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const GamificationSettings = db.define('GamificationSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  pointsPerWorkout: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50
  },
  pointsPerExercise: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  pointsPerStreak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20
  },
  pointsPerLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100
  },
  pointsPerReview: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 15
  },
  pointsPerReferral: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 200
  },
  tierThresholds: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      bronze: 0,
      silver: 1000,
      gold: 5000,
      platinum: 20000
    }
  },
  levelRequirements: {
    type: DataTypes.JSON,
    allowNull: true
  },
  pointsMultiplier: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0
  },
  enableLeaderboards: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  enableNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  autoAwardAchievements: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  timestamps: true
});

export default GamificationSettings;`;
      
      await fs.writeFile(gamificationSettingsPath, gamificationSettingsContent);
      console.log(`Created GamificationSettings model file at ${gamificationSettingsPath}`);
    }
    
    // Now verify it's properly exported from associations.mjs
    const associationsPath = path.join(__dirname, 'models', 'associations.mjs');
    const associationsContent = await fs.readFile(associationsPath, 'utf8');
    
    // Check if it's imported
    if (!associationsContent.includes("import GamificationSettings from './GamificationSettings.mjs'")) {
      console.log('GamificationSettings import is missing in associations.mjs');
      
      // Add the import
      const newContent = associationsContent.replace(
        /import .* from '\.\/.*\.mjs';(\s+)$/,
        match => match + "import GamificationSettings from './GamificationSettings.mjs';\n"
      );
      
      await fs.writeFile(associationsPath, newContent);
      console.log('Added GamificationSettings import to associations.mjs');
    }
    
    // Check if it's exported
    if (!associationsContent.includes('GamificationSettings')) {
      console.log('GamificationSettings export is missing in associations.mjs');
      
      // Add to export block
      const exportRegex = /export\s+\{([^}]*)\}/;
      const exportMatch = exportRegex.exec(associationsContent);
      
      if (exportMatch) {
        const exportBlock = exportMatch[0];
        const exportItems = exportMatch[1].trim().split(',').map(item => item.trim()).filter(item => item);
        
        if (!exportItems.includes('GamificationSettings')) {
          exportItems.push('GamificationSettings');
          
          const newExportBlock = `export {\n  ${exportItems.join(',\n  ')}\n}`;
          const newContent = associationsContent.replace(exportRegex, newExportBlock);
          
          await fs.writeFile(associationsPath, newContent);
          console.log('Added GamificationSettings to exports in associations.mjs');
        }
      }
    }
    
    console.log('GamificationSettings export verification complete');
  } catch (error) {
    console.error(`Error verifying GamificationSettings export: ${error.message}`);
  }
}

/**
 * Check for missing exports in associations.mjs
 */
async function checkAssociationExports() {
  console.log('\nChecking for missing exports in associations.mjs...');
  
  const associationsPath = path.join(__dirname, 'models', 'associations.mjs');
  
  try {
    const associationsContent = await fs.readFile(associationsPath, 'utf8');
    
    // Find all imports
    const importRegex = /import\s+(\w+)\s+from\s+['"]\.\/([\w]+)\.mjs['"];/g;
    const imports = [];
    let match;
    
    while ((match = importRegex.exec(associationsContent)) !== null) {
      imports.push(match[1]);
    }
    
    // Find exported items
    const exportRegex = /export\s+\{([^}]*)\}/;
    const exportMatch = exportRegex.exec(associationsContent);
    
    if (exportMatch) {
      const exportedItems = exportMatch[1].split(',').map(item => item.trim()).filter(item => item !== '');
      
      // Find imports that are not exported
      const missingExports = imports.filter(importItem => !exportedItems.includes(importItem));
      
      if (missingExports.length > 0) {
        console.log(`Found ${missingExports.length} imports that are not exported: ${missingExports.join(', ')}`);
        
        // Update the exports section - include all original exports plus missing ones
        const allExports = [...exportedItems, ...missingExports].filter(item => item !== '');
        
        const newExports = `export {
  ${allExports.join(',\n  ')}
};`;
        
        const newContent = associationsContent.replace(/export\s+\{[^}]*\}/s, newExports);
        
        await fs.writeFile(associationsPath, newContent);
        console.log('✅ Updated associations.mjs to export all imported models');
      } else {
        console.log('✅ All imports are properly exported in associations.mjs');
      }
    } else {
      console.log('⚠️ Could not find export section in associations.mjs');
    }
  } catch (error) {
    console.error(`Error checking/updating associations.mjs: ${error.message}`);
  }
}

/**
 * Check middleware files for missing exports
 */
async function checkMiddlewareExports() {
  console.log('\nChecking middleware files for missing exports...');
  
  // Check authMiddleware.mjs for missing authorize function
  const authMiddlewarePath = path.join(__dirname, 'middleware', 'authMiddleware.mjs');
  try {
    const authMiddlewareContent = await fs.readFile(authMiddlewarePath, 'utf8');
    
    // Check if authorize function exists
    if (!authMiddlewareContent.includes('export const authorize')) {
      console.log('Adding missing authorize function to authMiddleware.mjs');
      
      // Find the position to insert the function (before adminOnly function)
      const insertPosition = authMiddlewareContent.indexOf('* Admin-only access middleware');
      
      if (insertPosition !== -1) {
        // Insert the authorize function before adminOnly function
        const newContent = authMiddlewareContent.slice(0, insertPosition) + 
          `/**
 * Role-based authorization middleware
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
export const authorize = (roles = []) => {
  return (req, res, next) => {
    // Must be used after protect middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // Check if user's role is included in the allowed roles
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    // If we get here, user is not authorized
    logger.warn('Role-based access denied', { 
      userId: req.user.id, 
      userRole: req.user.role,
      requiredRoles: roles,
      path: req.path, 
      method: req.method 
    });
    
    return res.status(403).json({
      success: false,
      message: \`Access denied: Must have one of these roles: \${roles.join(', ')}\`
    });
  };
};

/**
` + authMiddlewareContent.slice(insertPosition);
        
        await fs.writeFile(authMiddlewarePath, newContent);
        console.log('✅ Added missing authorize function to authMiddleware.mjs');
      } else {
        console.log('⚠️ Could not find insertion point for authorize function');
      }
    }
  } catch (error) {
    console.error(`Error checking/updating authMiddleware.mjs: ${error.message}`);
  }
}

/**
 * Function to create a simplified model based on its name
 */
async function createSimplifiedModel(filePath, modelName) {
  const content = `/**
 * ${modelName} Model (Auto-generated)
 * ==============
 * This is an auto-generated model file created by the fix script.
 * You may need to update it with the correct fields and associations.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const ${modelName} = db.define('${modelName}', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Auto-generated with common fields
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  timestamps: true
});

export default ${modelName};`;

  await createFileIfMissing(filePath, content);
}

// Run the main function
main().catch(error => {
  console.error('❌ Error running fix script:', error);
  process.exit(1);
});
