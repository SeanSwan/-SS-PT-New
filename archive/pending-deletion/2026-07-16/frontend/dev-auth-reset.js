/**
 * Development Authentication Reset Script
 * =====================================
 * Run this script to reset authentication and create proper mock admin tokens
 * Usage: node dev-auth-reset.js
 */

console.log('🔧 Development Authentication Reset Script');
console.log('==========================================');

const resetInstructions = `
To reset authentication in development mode:

1. Open your browser developer console on http://localhost:5173
2. Run the following commands:

   // Clear all auth data
   localStorage.clear();
   sessionStorage.clear();
   
   // Create mock admin token and user
   const mockAdmin = {
     id: 'mock-admin-' + Date.now(),
     username: 'admin',
     email: 'admin@swanstudios.com',
     firstName: 'Admin',
     lastName: 'Dev',
     role: 'admin',
     isActive: true,
     permissions: ['admin:all'],
     createdAt: new Date().toISOString(),
     updatedAt: new Date().toISOString()
   };
   
   const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(JSON.stringify({
     id: mockAdmin.id,
     username: mockAdmin.username,
     role: mockAdmin.role,
     exp: Math.floor(Date.now()/1000) + (24*60*60)
   })) + '.mock-admin-token';
   
   localStorage.setItem('token', mockToken);
   localStorage.setItem('tokenTimestamp', Date.now().toString());
   localStorage.setItem('user', JSON.stringify(mockAdmin));
   localStorage.setItem('bypass_admin_verification', 'true');
   
   console.log('✅ Mock admin token created successfully');
   
   // Reload the page
   window.location.reload();

3. Alternatively, if the above commands are already built into the API service, 
   just refresh the page and the mock admin token should be created automatically.

4. Navigate to the Admin dashboard and try accessing Package Management.

🚀 The admin package management should now work with mock data!
`;

console.log(resetInstructions);

export default {
  resetInstructions
};
