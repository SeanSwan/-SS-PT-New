/**
 * 🔧 AUTHENTICATION DIAGNOSTIC TOOL
 * ==================================
 * 
 * Run this script to diagnose authentication issues.
 * Open your browser's developer console and paste this script to test.
 */

// Authentication Diagnostic Tool
const authDiagnostic = {
  baseUrl: 'https://ss-pt-new.onrender.com',
  
  async testServerStatus() {
    console.log('🔍 Testing server status...');
    try {
      const response = await fetch(`${this.baseUrl}/api/debug/server-status`);
      const data = await response.json();
      
      console.log('✅ Server Status:', data);
      return data;
    } catch (error) {
      console.error('❌ Server status failed:', error);
      return { error: error.message };
    }
  },
  
  async testLoginDebug(username = 'admin', password = 'test123') {
    console.log(`🔍 Testing login debug for user: ${username}...`);
    try {
      const response = await fetch(`${this.baseUrl}/api/debug/login-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      console.log('🧪 Login Debug Result:', data);
      return data;
    } catch (error) {
      console.error('❌ Login debug failed:', error);
      return { error: error.message };
    }
  },
  
  async testActualLogin(username = 'admin', password = 'test123') {
    console.log(`🔍 Testing actual login for user: ${username}...`);
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      console.log('🔐 Actual Login Result:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      
      return { status: response.status, data };
    } catch (error) {
      console.error('❌ Actual login failed:', error);
      return { error: error.message };
    }
  },
  
  async runFullDiagnostic(username = 'admin', password = 'test123') {
    console.log('🚀 Running full authentication diagnostic...');
    console.log('='.repeat(50));
    
    // Test 1: Server Status
    console.log('\\n📡 Test 1: Server Status');
    const serverStatus = await this.testServerStatus();
    
    // Test 2: Login Debug
    console.log('\\n🧪 Test 2: Login Debug');
    const loginDebug = await this.testLoginDebug(username, password);
    
    // Test 3: Actual Login
    console.log('\\n🔐 Test 3: Actual Login');
    const actualLogin = await this.testActualLogin(username, password);
    
    // Summary
    console.log('\\n📋 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(50));
    
    const summary = {
      serverOnline: !serverStatus.error,
      databaseConnected: serverStatus.debug?.databaseConnected || false,
      userExists: loginDebug.debug?.userFound || false,
      passwordValid: loginDebug.debug?.passwordValid || false,
      canLogin: loginDebug.debug?.canLogin || false,
      actualLoginStatus: actualLogin.status,
      actualLoginSuccess: actualLogin.data?.success || false
    };
    
    console.log('Summary:', summary);
    
    // Recommendations
    console.log('\\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(50));
    
    if (!summary.serverOnline) {
      console.log('❌ Server is not responding. Check server deployment.');
    } else if (!summary.databaseConnected) {
      console.log('❌ Database connection failed. Check database configuration.');
    } else if (!summary.userExists) {
      console.log('❌ User not found. Try creating a user or check username.');
    } else if (!summary.passwordValid) {
      console.log('❌ Password is incorrect. Check password or reset it.');
    } else if (!summary.canLogin) {
      console.log('❌ User account may be locked or inactive.');
    } else if (summary.actualLoginStatus !== 200) {
      console.log('❌ Login endpoint is failing despite valid credentials.');
    } else {
      console.log('✅ Everything looks good! Login should work.');
    }
    
    return summary;
  },
  
  // Quick test functions
  async quickTest() {
    return await this.runFullDiagnostic();
  },
  
  async testWithCredentials(username, password) {
    return await this.runFullDiagnostic(username, password);
  }
};

// Make it available globally
window.authDiagnostic = authDiagnostic;

console.log(`
🔧 AUTHENTICATION DIAGNOSTIC TOOL LOADED
========================================

Available commands:
• authDiagnostic.quickTest() - Run full diagnostic with default credentials
• authDiagnostic.testWithCredentials('username', 'password') - Test with specific credentials
• authDiagnostic.testServerStatus() - Check if server is online
• authDiagnostic.testLoginDebug('username', 'password') - Debug login process
• authDiagnostic.testActualLogin('username', 'password') - Test actual login

Example usage:
authDiagnostic.quickTest()
authDiagnostic.testWithCredentials('your-username', 'your-password')
`);

// Auto-run quick test
console.log('🚀 Running automatic diagnostic...');
authDiagnostic.quickTest();