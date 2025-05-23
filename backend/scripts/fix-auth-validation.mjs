// backend/scripts/fix-auth-validation.mjs
// A script to fix authentication validation issues

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const validationMiddlewarePath = path.join(__dirname, '..', 'middleware', 'validationMiddleware.mjs');

console.log('🔍 Starting Auth Validation Fix...');

try {
  // Fix validation middleware
  console.log(`📝 Checking validation middleware at ${validationMiddlewarePath}`);
  
  if (fs.existsSync(validationMiddlewarePath)) {
    let content = fs.readFileSync(validationMiddlewarePath, 'utf8');
    
    // Check if the login validation needs to be fixed
    if (content.includes('body(\'email\')') && content.includes('withMessage(\'Email is required\')')) {
      console.log('⚠️ Found email validation that needs to be fixed');
      
      // Replace the email validation with username validation
      content = content.replace(
        /login: \[\s*body\('email'\)[\s\S]*?notEmpty\(\)\.withMessage\('Email is required'\)[\s\S]*?normalizeEmail\(\),/m,
        `login: [
    body('username')
      .trim()
      .notEmpty().withMessage('Username or email is required'),`
      );
      
      // Write the fixed content back
      fs.writeFileSync(validationMiddlewarePath, content, 'utf8');
      console.log('✅ Updated login validation to accept username');
    } else {
      console.log('✓ Login validation is already configured correctly');
    }
  } else {
    console.error('❌ Validation middleware file not found at', validationMiddlewarePath);
  }
  
  console.log('🎉 Auth validation fix completed successfully!');
} catch (error) {
  console.error('❌ Error fixing auth validation:', error);
}
