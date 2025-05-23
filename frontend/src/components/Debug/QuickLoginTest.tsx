/**
 * Quick Login Test Component
 * ==========================
 * Simple component to test admin login directly
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const QuickLoginTest: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const { login, user, logout } = useAuth();

  const testAdminLogin = async () => {
    setResult('Testing admin login...');
    
    try {
      // First logout
      logout();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to login as admin
      const result = await login('admin', 'admin123');
      
      console.log('Login result:', result);
      console.log('Current user after login:', user);
      
      setResult(JSON.stringify({
        success: result.success,
        userRole: result.user?.role,
        userName: result.user?.username,
        error: result.error,
        currentUser: user
      }, null, 2));
      
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    }
  };

  return (
    <div className="p-4 border rounded bg-gray-50">
      <h3 className="font-bold mb-3">Quick Admin Login Test</h3>
      
      <div className="mb-3">
        <div><strong>Current User:</strong> {user?.username || 'None'}</div>
        <div><strong>Current Role:</strong> {user?.role || 'None'}</div>
      </div>
      
      <button
        onClick={testAdminLogin}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-3"
      >
        Test Admin Login
      </button>
      
      {result && (
        <div className="bg-white p-3 rounded border">
          <strong>Result:</strong>
          <pre className="mt-2 text-sm">{result}</pre>
        </div>
      )}
    </div>
  );
};

export default QuickLoginTest;
