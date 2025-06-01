/**
 * ✅ AUTHENTICATION ERROR HANDLING FIXES
 * =====================================
 * 
 * This file contains comprehensive fixes for the authentication system
 * to resolve the 401 login errors and improve error handling.
 */

// 1. Enhanced API Service Error Handling
const enhancedApiServiceLogin = `
async login(credentials: { username: string; password: string }) {
  try {
    console.log('[API] Attempting login with enhanced error handling...');
    
    // Log the request being made (without password)
    console.log('[API] Login request:', {
      username: credentials.username,
      hasPassword: !!credentials.password,
      apiUrl: this.client.defaults.baseURL + '/api/auth/login'
    });
    
    const response = await this.client.post('/api/auth/login', credentials);
    
    console.log('[API] Login response status:', response.status);
    console.log('[API] Login response data:', response.data);
    
    if (response.data && (response.data.success || response.data.token)) {
      const { token, refreshToken, user } = response.data;
      
      if (token && user) {
        ProductionTokenManager.setToken(token);
        if (refreshToken) {
          ProductionTokenManager.setRefreshToken(refreshToken);
        }
        ProductionTokenManager.setUser(user);
        
        console.log('[API] Login successful, tokens stored');
        return response.data;
      } else {
        throw new Error('Invalid response: missing token or user data');
      }
    } else {
      throw new Error(response.data?.message || 'Login failed - invalid response format');
    }
  } catch (error) {
    console.error('[API] Login error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    });
    
    // Enhanced error message extraction
    let errorMessage = 'Login failed';
    
    if (error.response?.data) {
      // Try different ways to extract error message
      const data = error.response.data;
      
      if (typeof data === 'string') {
        errorMessage = data;
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.error) {
        errorMessage = data.error;
      } else if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        errorMessage = data.errors[0].message || data.errors[0];
      } else if (data.details) {
        errorMessage = data.details;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Handle specific HTTP status codes
    if (error.response?.status === 401) {
      errorMessage = 'Invalid username or password';
    } else if (error.response?.status === 429) {
      errorMessage = 'Too many login attempts. Please try again later.';
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
      errorMessage = 'Unable to connect to server. Please check your internet connection.';
    }
    
    console.error('[API] Final error message:', errorMessage);
    
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    enhancedError.status = error.response?.status;
    throw enhancedError;
  }
}`;

// 2. Enhanced AuthContext Error Handling
const enhancedAuthContextLogin = `
const login = async (username: string, password: string): Promise<{success: boolean, user: User | null, error?: string}> => {
  setLoading(true);
  setError(null);
  
  // Input validation
  if (!username || !password) {
    setLoading(false);
    return { success: false, user: null, error: 'Please provide both username and password' };
  }
  
  // Trim inputs
  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();
  
  console.log('[AuthContext] Login attempt for user:', trimmedUsername);
  
  // Development mode login handling
  if (!isProduction) {
    console.log('[DEV MODE] Development login flow');
    localStorage.setItem('bypass_admin_verification', 'true');
    
    // Try backend first, but fallback to mock on any error
    try {
      console.log('[DEV MODE] Attempting backend login...');
      const response = await apiService.login({ 
        username: trimmedUsername, 
        password: trimmedPassword 
      });
      
      if (response?.user && response?.token) {
        const { user: userData, token } = response;
        
        const formattedUser: User = {
          id: userData.id,
          email: userData.email,
          username: userData.username || trimmedUsername,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          role: userData.role || 'user',
          profileImageUrl: userData.profileImageUrl,
          isActive: userData.isActive !== false,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          trainerInfo: userData.trainerInfo,
          clientInfo: userData.clientInfo
        };
        
        tokenCleanup.storeToken(token, formattedUser);
        apiService.setAuthToken(token);
        setUser(formattedUser);
        setToken(token);
        
        if (dispatch) {
          dispatch(setReduxUser(formattedUser));
        }
        
        console.log('[DEV MODE] Backend login successful:', formattedUser.username);
        setLoading(false);
        return { success: true, user: formattedUser };
      }
    } catch (error) {
      console.log('[DEV MODE] Backend login failed, details:', {
        message: error.message,
        status: error.status,
        originalError: error.originalError
      });
      
      // If it's a network error or server error, use mock login
      if (error.status === 500 || error.code === 'ECONNREFUSED' || error.message.includes('Server error')) {
        console.log('[DEV MODE] Using mock login due to server issues');
        setLoading(false);
        return await performMockLogin(trimmedUsername, trimmedPassword);
      }
      
      // If it's a 401 (authentication error), show the real error
      if (error.status === 401) {
        setLoading(false);
        return { success: false, user: null, error: error.message };
      }
      
      // For other errors, fallback to mock
      console.log('[DEV MODE] Using mock login as fallback');
      setLoading(false);
      return await performMockLogin(trimmedUsername, trimmedPassword);
    }
  }
  
  try {
    // Production login attempt
    console.log('[PROD] Attempting production login...');
    const response = await apiService.login({ 
      username: trimmedUsername, 
      password: trimmedPassword 
    });
    
    if (response?.user && response?.token) {
      const { user: userData, token } = response;
      
      // Format user data
      const formattedUser: User = {
        id: userData.id,
        email: userData.email,
        username: userData.username || trimmedUsername,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        role: userData.role || 'user',
        profileImageUrl: userData.profileImageUrl,
        isActive: userData.isActive !== false,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        trainerInfo: userData.trainerInfo,
        clientInfo: userData.clientInfo
      };
      
      // Store token and user using cleanup utility
      tokenCleanup.storeToken(token, formattedUser);
      apiService.setAuthToken(token);
      
      setUser(formattedUser);
      setToken(token);
      
      // Update Redux if available
      if (dispatch) {
        dispatch(setReduxUser(formattedUser));
      }
      
      console.log('Login successful:', formattedUser.username, formattedUser.role);
      setLoading(false);
      return { success: true, user: formattedUser };
    } else {
      throw new Error('Invalid login response: missing user or token data');
    }
  } catch (error: any) {
    console.error('Production login failed:', {
      message: error.message,
      status: error.status,
      originalError: error.originalError
    });
    
    // Enhanced error message extraction
    let errorMessage = 'Login failed';
    
    if (error.message && error.message !== 'Login failed') {
      errorMessage = error.message;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.originalError?.message) {
      errorMessage = error.originalError.message;
    }
    
    // Fallback to mock login in development for server errors
    if (!isProduction && (error.status === 500 || error.code === 'ECONNREFUSED')) {
      console.log('[DEV MODE] Production login failed with server error, using mock login');
      setLoading(false);
      return await performMockLogin(trimmedUsername, trimmedPassword);
    }
    
    setError(errorMessage);
    setLoading(false);
    return { success: false, user: null, error: errorMessage };
  }
};`;

// 3. Server-side debugging enhancement
const serverDebuggingScript = \`
import User from '../models/User.mjs';
import bcrypt from 'bcryptjs';

// Enhanced login debugging endpoint
export const debugLogin = async (req, res) => {
  try {
    console.log('=== LOGIN DEBUG ENDPOINT ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing username or password',
        debug: {
          hasUsername: !!username,
          hasPassword: !!password,
          usernameType: typeof username,
          passwordType: typeof password
        }
      });
    }
    
    console.log('Searching for user:', username);
    
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email: username }
        ]
      }
    });
    
    if (!user) {
      console.log('User not found');
      return res.status(401).json({
        success: false,
        error: 'User not found',
        debug: {
          searchTerm: username,
          userFound: false
        }
      });
    }
    
    console.log('User found:', user.username, user.email);
    
    const isPasswordValid = await user.checkPassword(password);
    console.log('Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
        debug: {
          userFound: true,
          passwordValid: false
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Login debug successful',
      debug: {
        userFound: true,
        passwordValid: true,
        userId: user.id,
        userRole: user.role
      }
    });
    
  } catch (error) {
    console.error('Debug login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Debug endpoint error',
      debug: {
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack
      }
    });
  }
};
\`;

export const fixes = {
  enhancedApiServiceLogin,
  enhancedAuthContextLogin,
  serverDebuggingScript
};

console.log('Authentication fixes prepared. Ready to apply to actual files.');
