/**
 * Admin Login Debug Component
 * ===========================
 * A debug tool to diagnose admin login issues
 * Add this to your app temporarily to debug the login flow
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import tokenCleanup from '../utils/tokenCleanup';

const AdminLoginDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const { user, login, logout } = useAuth();

  const debugAdminLogin = async () => {
    setIsDebugging(true);
    const debugData: any = {};

    try {
      console.log('🐛 Starting admin login debug...');
      
      // Step 1: Check current auth state
      debugData.currentUser = user;
      debugData.isAuthenticated = !!user;
      debugData.currentRole = user?.role;
      
      // Step 2: Clean up any existing tokens
      console.log('🧹 Cleaning up existing tokens...');
      tokenCleanup.cleanupAllTokens();
      logout();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Get token info before login
      debugData.beforeLogin = {
        tokenInfo: tokenCleanup.getTokenInfo(),
        storedToken: localStorage.getItem('token'),
        storedUser: localStorage.getItem('user')
      };
      
      // Step 4: Attempt API call directly
      console.log('🌐 Testing direct API call...');
      try {
        const directApiResponse = await apiService.post('/api/auth/login', {
          username: 'admin',
          password: 'admin123'
        });
        
        debugData.directApiCall = {
          success: true,
          status: directApiResponse.status,
          data: directApiResponse.data,
          userRole: directApiResponse.data?.user?.role,
          token: directApiResponse.data?.token
        };
        
        // Verify the JWT token
        if (directApiResponse.data?.token) {
          try {
            const tokenPayload = JSON.parse(atob(directApiResponse.data.token.split('.')[1]));
            debugData.directApiCall.tokenPayload = tokenPayload;
            debugData.directApiCall.roleInToken = tokenPayload.role;
          } catch (e) {
            debugData.directApiCall.tokenDecodeError = e.message;
          }
        }
        
      } catch (apiError: any) {
        debugData.directApiCall = {
          success: false,
          error: apiError.message,
          response: apiError.response?.data,
          status: apiError.response?.status
        };
      }
      
      // Step 5: Use auth context login
      console.log('🔐 Testing auth context login...');
      const loginResult = await login('admin', 'admin123');
      
      debugData.authContextLogin = {
        success: loginResult.success,
        user: loginResult.user,
        role: loginResult.user?.role,
        error: loginResult.error
      };
      
      // Step 6: Check final state
      debugData.afterLogin = {
        currentUser: user,
        userRole: user?.role,
        tokenInfo: tokenCleanup.getTokenInfo(),
        storedToken: localStorage.getItem('token'),
        storedUser: localStorage.getItem('user')
      };
      
      console.log('🐛 Debug complete! Check the debug panel.');
      
    } catch (error: any) {
      debugData.error = {
        message: error.message,
        stack: error.stack
      };
    } finally {
      setDebugInfo(debugData);
      setIsDebugging(false);
    }
  };

  const checkCurrentState = () => {
    const state = {
      user,
      role: user?.role,
      isAuthenticated: !!user,
      tokenInfo: tokenCleanup.getTokenInfo(),
      storedData: {
        token: localStorage.getItem('token')?.substring(0, 50) + '...',
        user: localStorage.getItem('user')
      }
    };
    
    console.log('Current Auth State:', state);
    setDebugInfo({ currentState: state });
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg border rounded-lg p-4 max-w-md">
      <h3 className="font-bold text-lg mb-3">🐛 Admin Login Debug</h3>
      
      <div className="space-y-2 mb-4">
        <div>
          <strong>Current User:</strong> {user?.username || 'None'}
        </div>
        <div>
          <strong>Current Role:</strong> {user?.role || 'None'}
        </div>
        <div>
          <strong>Expected:</strong> admin
        </div>
        <div className={`font-bold ${user?.role === 'admin' ? 'text-green-600' : 'text-red-600'}`}>
          Status: {user?.role === 'admin' ? '✅ Correct' : '❌ Incorrect'}
        </div>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={debugAdminLogin}
          disabled={isDebugging}
          className="w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isDebugging ? 'Debugging...' : 'Debug Admin Login'}
        </button>
        
        <button
          onClick={checkCurrentState}
          className="w-full bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600"
        >
          Check Current State
        </button>
        
        {debugInfo && (
          <button
            onClick={() => {
              console.log('🐛 Full Debug Info:', debugInfo);
              alert('Debug info logged to console. Press F12 to view.');
            }}
            className="w-full bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
          >
            Log Debug Info
          </button>
        )}
      </div>
      
      {debugInfo && (
        <div className="mt-3 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default AdminLoginDebug;
