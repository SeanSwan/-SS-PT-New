import crypto from 'crypto';

console.log('🔐 GENERATING SECURE JWT SECRETS FOR PRODUCTION');
console.log('===============================================');
console.log('');

console.log('🔑 JWT_SECRET:');
console.log(crypto.randomBytes(32).toString('hex'));
console.log('');

console.log('🔑 JWT_REFRESH_SECRET:');
console.log(crypto.randomBytes(32).toString('hex'));
console.log('');

console.log('🔑 ADMIN_ACCESS_CODE (suggestion):');
console.log('SwanAdmin2024!Secure' + Math.floor(Math.random() * 1000));
console.log('');

console.log('📋 INSTRUCTIONS:');
console.log('1. Copy the values above');
console.log('2. Go to Render Dashboard → swan-studios-api → Environment');
console.log('3. Update JWT_SECRET with the first value');
console.log('4. Update JWT_REFRESH_SECRET with the second value');
console.log('5. Update ADMIN_ACCESS_CODE with the third value');
console.log('6. Click "Save Changes"');
console.log('7. Click "Manual Deploy" → "Deploy Latest Commit"');
console.log('8. Wait 2-3 minutes for deployment');
console.log('9. Run: .\\VERIFY-BACKEND-IS-RUNNING.bat');
