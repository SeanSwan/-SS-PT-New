#!/usr/bin/env node

// Test login after fixes
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚀 TESTING SWANSTUDIOS LOGIN AFTER FIXES');
console.log('=' .repeat(50));

const testLogin = () => {
  return new Promise((resolve) => {
    const curl = `curl -X POST http://localhost:10000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}' \\
  --connect-timeout 10 \\
  --max-time 30 \\
  -w "\\nHTTP Status: %{http_code}\\nResponse Time: %{time_total}s\\n"`;
    
    console.log('📤 Sending login request...');
    console.log('🔗 URL: http://localhost:10000/api/auth/login');
    console.log('📝 Data: {"username":"admin","password":"admin123"}');
    console.log('');
    
    exec(curl, (error, stdout, stderr) => {
      if (error) {
        console.log('❌ CURL ERROR:');
        console.log('Error:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
          console.log('');
          console.log('💡 SERVER NOT RUNNING');
          console.log('To start the server:');
          console.log('1. cd C:\\Users\\ogpsw\\Desktop\\quick-pt\\SS-PT\\backend');
          console.log('2. npm start');
          console.log('   or');
          console.log('   node server.mjs');
        }
        resolve();
        return;
      }
      
      console.log('📥 RESPONSE:');
      console.log(stdout);
      
      if (stderr) {
        console.log('⚠️ STDERR:');
        console.log(stderr);
      }
      
      // Try to parse JSON response
      try {
        const lines = stdout.split('\\n');
        const jsonLine = lines.find(line => line.trim().startsWith('{'));
        
        if (jsonLine) {
          const response = JSON.parse(jsonLine);
          
          if (response.success) {
            console.log('');
            console.log('✅ LOGIN SUCCESS!');
            console.log('👤 User ID:', response.user?.id);
            console.log('👤 Username:', response.user?.username);
            console.log('👤 Role:', response.user?.role);
            console.log('🔑 Token:', response.token ? 'Generated' : 'Missing');
          } else {
            console.log('');
            console.log('❌ LOGIN FAILED!');
            console.log('Error:', response.message);
            if (response.error) {
              console.log('Details:', response.error);
            }
          }
        }
      } catch (parseError) {
        console.log('⚠️ Could not parse JSON response');
      }
      
      resolve();
    });
  });
};

// Run the test
testLogin().then(() => {
  console.log('');
  console.log('🏁 TEST COMPLETE');
  console.log('');
  console.log('💡 NEXT STEPS:');
  console.log('1. If login works: Test with frontend');
  console.log('2. If still fails: Check server logs');
  console.log('3. Run: npm start in backend directory');
  console.log('');
});