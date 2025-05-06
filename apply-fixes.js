/**
 * Script to apply the fixes for cart and client progress errors
 * Run with: node apply-fixes.js
 */
const fs = require('fs');
const path = require('path');

console.log('🔧 Applying fixes for cart and client progress errors...');

// List of files to apply fixes to
const filesToFix = [
  {
    original: 'frontend/src/context/CartContext.tsx',
    fixed: 'frontend/src/context/CartContext.tsx.fix'
  },
  {
    original: 'frontend/src/context/AuthContext.tsx',
    fixed: 'frontend/src/context/AuthContext.tsx.fix'
  },
  {
    original: 'frontend/src/services/client-progress-service.ts',
    fixed: 'frontend/src/services/client-progress-service.ts.fix'
  }
];

// Function to copy files
function copyFile(source, destination) {
  try {
    // First make a backup of the original file
    const backupPath = `${destination}.backup`;
    if (fs.existsSync(destination) && !fs.existsSync(backupPath)) {
      fs.copyFileSync(destination, backupPath);
      console.log(`✅ Backup created: ${backupPath}`);
    }

    // Copy the fixed file to the original location
    fs.copyFileSync(source, destination);
    console.log(`✅ Fixed file applied: ${destination}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error copying file from ${source} to ${destination}:`, error.message);
    return false;
  }
}

// Apply fixes
let successCount = 0;
let errorCount = 0;

filesToFix.forEach(file => {
  const sourcePath = path.resolve(__dirname, file.fixed);
  const destPath = path.resolve(__dirname, file.original);
  
  if (fs.existsSync(sourcePath)) {
    const success = copyFile(sourcePath, destPath);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  } else {
    console.error(`❌ Source file not found: ${sourcePath}`);
    errorCount++;
  }
});

// Check if we need to create the mock-client-progress.ts file if it doesn't exist
const mockClientProgressPath = path.resolve(__dirname, 'frontend/src/services/mock-client-progress.ts');
if (!fs.existsSync(mockClientProgressPath)) {
  console.log('Creating mock client progress service...');
  try {
    // Create this file by copying from the fix file
    copyFile(
      path.resolve(__dirname, 'frontend/src/services/mock-client-progress.ts'),
      mockClientProgressPath
    );
    successCount++;
  } catch (error) {
    console.error('❌ Error creating mock client progress file:', error.message);
    errorCount++;
  }
}

console.log('\n========== FIX RESULTS ==========');
console.log(`✅ ${successCount} files fixed successfully`);
if (errorCount > 0) {
  console.log(`❌ ${errorCount} errors encountered`);
}
console.log('\n🚀 Next steps:');
console.log('1. Restart your application: npm start');
console.log('2. Test the cart functionality and client progress page');
console.log('3. If you encounter any issues, the original files are backed up with .backup extension');
console.log('\nMade with ❤️ by Claude');
