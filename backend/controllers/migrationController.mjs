/**
 * Migration Trigger Endpoint
 * Simple HTTP endpoint to run migrations in production
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const runMigrations = async (req, res) => {
  try {
    console.log('🔄 Starting database migrations...');
    
    // Only allow in production
    if (process.env.NODE_ENV !== 'production') {
      return res.status(403).json({
        success: false,
        message: 'Migrations can only be run in production environment'
      });
    }
    
    // Run migrations
    const { stdout, stderr } = await execAsync(
      'npx sequelize-cli db:migrate --config config/config.cjs --env production'
    );
    
    console.log('✅ Migrations completed successfully');
    
    res.status(200).json({
      success: true,
      message: 'Database migrations completed successfully',
      output: stdout,
      warnings: stderr || null
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message,
      output: error.stdout || null,
      stderr: error.stderr || null
    });
  }
};
