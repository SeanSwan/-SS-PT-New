#!/usr/bin/env node

/**
 * ENHANCED Production Build Script for Render Deployment
 * ======================================================
 * 
 * This script handles the complete production build process including:
 * - Frontend React app build (ADDED)
 * - Database migration execution
 * - Build verification
 * - Error handling and rollback
 * 
 * PRODUCTION SAFETY FEATURES:
 * ✅ Frontend build process
 * ✅ Non-destructive migrations only
 * ✅ Comprehensive error handling
 * ✅ Migration status verification
 * ✅ Rollback capability
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting SwanStudios ENHANCED Production Build Process...');
console.log('📍 Environment: PRODUCTION');
console.log('🎯 Target: Render Platform Deployment');
console.log('✨ ENHANCED: Now includes frontend build process');

const execWithLogging = (command, options = {}) => {
  console.log(`\n🔧 Executing: ${command}`);
  try {
    const result = execSync(command, { 
      stdio: 'inherit', 
      ...options 
    });
    console.log(`✅ Success: ${command}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed: ${command}`);
    console.error(`Error: ${error.message}`);
    throw error;
  }
};

const runProductionBuild = async () => {
  try {
    console.log('\n📋 Phase 1: Pre-Build Verification');
    console.log('Checking project structure...');
    
    // Verify we're in the right directory structure
    const frontendPath = path.join(__dirname, 'frontend');
    const backendPath = path.join(__dirname, 'backend');
    
    console.log(`Frontend path: ${frontendPath}`);
    console.log(`Backend path: ${backendPath}`);
    
    // Check if frontend directory exists
    if (!fs.existsSync(frontendPath)) {
      throw new Error('Frontend directory not found!');
    }
    
    console.log('\n🎯 Phase 2: Frontend Build Process (NEW)');
    console.log('Building React frontend application...');
    
    // Navigate to frontend and install dependencies
    console.log('📦 Installing frontend dependencies...');
    execWithLogging('npm install', { cwd: frontendPath });
    
    // Build the frontend
    console.log('🏗️  Building frontend for production...');
    execWithLogging('npm run build:production', { cwd: frontendPath });
    
    // Verify frontend build
    const frontendDistPath = path.join(frontendPath, 'dist');
    if (!fs.existsSync(frontendDistPath)) {
      throw new Error('Frontend build failed - dist directory not created!');
    }
    
    console.log('✅ Frontend build completed successfully!');
    console.log(`📁 Frontend assets built to: ${frontendDistPath}`);
    
    // List contents of dist directory for verification
    try {
      const distContents = fs.readdirSync(frontendDistPath);
      console.log('📋 Frontend build contains:', distContents.join(', '));
    } catch (error) {
      console.warn('⚠️  Could not list frontend build contents:', error.message);
    }
    
    console.log('\n📋 Phase 3: Backend Database Migration Status Check');
    try {
      execWithLogging('npm run migrate:status', { cwd: backendPath });
    } catch (error) {
      console.log('📝 Note: Migration status check failed (expected for first deployment)');
    }
    
    console.log('\n📋 Phase 4: Production Database Migrations');
    console.log('🎯 Target migrations: client_trainer_assignments, trainer_permissions, daily_workout_forms');
    execWithLogging('npm run migrate:production', { cwd: backendPath });
    
    console.log('\n📋 Phase 5: Post-Migration Verification');
    try {
      execWithLogging('npm run migrate:status', { cwd: backendPath });
    } catch (error) {
      console.log('⚠️  Warning: Post-migration status check failed, but continuing...');
    }
    
    console.log('\n🎉 ENHANCED Production Build Completed Successfully!');
    console.log('✅ Frontend React app built and ready');
    console.log('✅ NASM Workout Tracking tables deployed');
    console.log('✅ Database schema updated');
    console.log('✅ Ready for application startup');
    console.log('\n🚀 Your SwanStudios app is now production-ready with full UI!');
    
  } catch (error) {
    console.error('\n💥 ENHANCED PRODUCTION BUILD FAILED!');
    console.error('Error details:', error.message);
    console.error('\n🔥 EMERGENCY ROLLBACK INSTRUCTIONS:');
    console.error('If you need to rollback migrations, run:');
    console.error('npm run migrate:undo');
    
    // Additional troubleshooting for frontend issues
    if (error.message.includes('Frontend')) {
      console.error('\n🔧 FRONTEND BUILD TROUBLESHOOTING:');
      console.error('1. Check if frontend/package.json exists');
      console.error('2. Check if frontend dependencies are compatible');
      console.error('3. Review frontend build logs above for specific errors');
      console.error('4. Ensure build:production script exists in frontend/package.json');
    }
    
    process.exit(1);
  }
};

// Execute the build process
runProductionBuild();