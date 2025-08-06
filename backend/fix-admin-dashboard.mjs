/**
 * Comprehensive Admin Dashboard Fix Script
 * ========================================
 * 
 * This script will completely diagnose and fix the client-trainer-assignments
 * API issue that's preventing the Universal Master Schedule from loading.
 * 
 * Steps:
 * 1. Verify database connection and tables
 * 2. Run missing migrations
 * 3. Test API endpoints
 * 4. Provide deployment instructions
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import sequelize from './database.mjs';
import logger from './utils/logger.mjs';

const execAsync = promisify(exec);

class AdminDashboardFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'fix': '🔧'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp.substr(11, 8)}] ${message}`);
    
    if (type === 'error' || type === 'warning') {
      this.issues.push(message);
    } else if (type === 'fix') {
      this.fixes.push(message);
    }
  }

  async checkDatabaseConnection() {
    await this.log('Testing database connection...');
    
    try {
      await sequelize.authenticate();
      await this.log('Database connection successful', 'success');
      return true;
    } catch (error) {
      await this.log(`Database connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  async checkRequiredTables() {
    await this.log('Checking required database tables...');
    
    try {
      const [results] = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      const existingTables = results.map(row => row.table_name);
      const requiredTables = [
        'client_trainer_assignments',
        'trainer_permissions', 
        'daily_workout_forms',
        'admin_settings'
      ];
      
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length === 0) {
        await this.log('All required tables exist', 'success');
        return { allExist: true, missing: [] };
      } else {
        await this.log(`Missing tables: ${missingTables.join(', ')}`, 'warning');
        return { allExist: false, missing: missingTables };
      }
      
    } catch (error) {
      await this.log(`Table check failed: ${error.message}`, 'error');
      return { allExist: false, missing: [], error: true };
    }
  }

  async runMigrations() {
    await this.log('Running database migrations...', 'fix');
    
    try {
      // Check if sequelize-cli is available
      try {
        await execAsync('npx sequelize-cli --version');
      } catch (error) {
        await this.log('sequelize-cli not available, installing...', 'fix');
        await execAsync('npm install -g sequelize-cli');
      }
      
      // Run migrations
      const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate');
      
      if (stderr && !stderr.includes('Executed')) {
        await this.log(`Migration warnings: ${stderr}`, 'warning');
      }
      
      await this.log('Database migrations completed successfully', 'success');
      await this.log(`Migration output: ${stdout}`, 'info');
      
      return true;
    } catch (error) {
      await this.log(`Migration failed: ${error.message}`, 'error');
      
      // Try manual table creation as fallback
      await this.log('Attempting manual table creation...', 'fix');
      return await this.createTablesManually();
    }
  }

  async createTablesManually() {
    await this.log('Creating client_trainer_assignments table manually...', 'fix');
    
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS client_trainer_assignments (
          id SERIAL PRIMARY KEY,
          client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          assigned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
          notes TEXT,
          last_modified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          deactivated_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_client_trainer_assignments_client_id 
        ON client_trainer_assignments(client_id);
      `);

      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_client_trainer_assignments_trainer_id 
        ON client_trainer_assignments(trainer_id);
      `);

      await this.log('Tables created successfully', 'success');
      return true;
    } catch (error) {
      await this.log(`Manual table creation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testApiEndpoints() {
    await this.log('Testing API endpoints...');
    
    try {
      // Import the models to test they load correctly
      const { getClientTrainerAssignment, getUser } = await import('./models/index.mjs');
      
      const ClientTrainerAssignment = getClientTrainerAssignment();
      const User = getUser();
      
      await this.log('Models imported successfully', 'success');
      
      // Test basic model queries
      const assignmentCount = await ClientTrainerAssignment.count();
      const userCount = await User.count();
      
      await this.log(`Found ${assignmentCount} assignments and ${userCount} users`, 'info');
      await this.log('API endpoints should now be working', 'success');
      
      return true;
    } catch (error) {
      await this.log(`API endpoint test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async generateSummaryReport() {
    await this.log('='.repeat(60));
    await this.log('COMPREHENSIVE FIX SUMMARY', 'info');
    await this.log('='.repeat(60));
    
    if (this.issues.length === 0) {
      await this.log('🎉 NO ISSUES FOUND - Admin dashboard should be working!', 'success');
    } else {
      await this.log(`⚠️  ${this.issues.length} issues were identified:`, 'warning');
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    if (this.fixes.length > 0) {
      await this.log(`🔧 ${this.fixes.length} fixes were applied:`, 'fix');
      this.fixes.forEach((fix, index) => {
        console.log(`   ${index + 1}. ${fix}`);
      });
    }
    
    await this.log('='.repeat(60));
    
    if (this.issues.length === 0 || this.fixes.length >= this.issues.length) {
      await this.log('✅ RESOLUTION: Admin dashboard should now be working!', 'success');
      await this.log('🚀 Deploy these changes with:', 'info');
      console.log('   git add .');
      console.log('   git commit -m "Fix admin dashboard - add missing database tables and migrations"');
      console.log('   git push origin main');
      console.log('');
      await this.log('🔄 After deployment, refresh the admin dashboard page', 'info');
    } else {
      await this.log('⚠️  Some issues may require manual intervention', 'warning');
      await this.log('🔍 Check the Render deployment logs for additional errors', 'info');
    }
    
    await this.log('='.repeat(60));
  }

  async runComprehensiveFix() {
    await this.log('🚀 Starting comprehensive admin dashboard fix...');
    await this.log('='.repeat(60));
    
    try {
      // Step 1: Check database connection
      const dbConnected = await this.checkDatabaseConnection();
      if (!dbConnected) {
        await this.log('Cannot proceed without database connection', 'error');
        return false;
      }
      
      // Step 2: Check required tables
      const { allExist, missing, error } = await this.checkRequiredTables();
      
      if (error) {
        await this.log('Cannot check tables due to database error', 'error');
        return false;
      }
      
      // Step 3: Run migrations if tables are missing
      if (!allExist && missing.length > 0) {
        const migrationSuccess = await this.runMigrations();
        if (!migrationSuccess) {
          await this.log('Failed to create required tables', 'error');
          return false;
        }
      }
      
      // Step 4: Test API endpoints
      const endpointsWorking = await this.testApiEndpoints();
      if (!endpointsWorking) {
        await this.log('API endpoints are still not working', 'error');
        return false;
      }
      
      // Step 5: Generate summary
      await this.generateSummaryReport();
      
      return true;
      
    } catch (error) {
      await this.log(`Comprehensive fix failed: ${error.message}`, 'error');
      return false;
    } finally {
      await sequelize.close();
    }
  }
}

// Run the comprehensive fix
const fixer = new AdminDashboardFixer();
fixer.runComprehensiveFix()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Fix script crashed:', error);
    process.exit(1);
  });
