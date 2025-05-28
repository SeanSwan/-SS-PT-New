// Quick script to test password hashing directly
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

async function testPasswordHashing() {
  console.log('🔐 TESTING PASSWORD HASHING');
  console.log('=' .repeat(40));
  
  const testPassword = 'TempPassword123!';
  
  try {
    // Test bcrypt hashing
    console.log('Testing bcrypt hashing...');
    console.log(`Original password: ${testPassword}`);
    
    // Hash the password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(testPassword, salt);
    
    console.log(`Salt: ${salt}`);
    console.log(`Hashed password: ${hashedPassword}`);
    console.log(`Hash length: ${hashedPassword.length}`);
    console.log(`Hash format: ${hashedPassword.startsWith('$2') ? 'Valid bcrypt' : 'Invalid format'}`);
    
    // Test comparison
    console.log('\nTesting password comparison...');
    const isMatch = await bcrypt.compare(testPassword, hashedPassword);
    console.log(`Password matches: ${isMatch ? 'YES ✅' : 'NO ❌'}`);
    
    // Test with wrong password
    const wrongMatch = await bcrypt.compare('wrongpassword', hashedPassword);
    console.log(`Wrong password matches: ${wrongMatch ? 'YES ❌' : 'NO ✅'}`);
    
    console.log('\n🎉 Password hashing test completed successfully!');
    console.log('✅ bcrypt is working correctly');
    
  } catch (error) {
    console.error('❌ Password hashing test failed:', error.message);
  }
}

testPasswordHashing().catch(console.error);
