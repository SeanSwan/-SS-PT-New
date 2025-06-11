# 🚀 Frontend Integration Guide - SwanStudios Platform

## 📊 Current Production Status
✅ **Backend Authentication**: Fully functional on Render  
✅ **Database**: PostgreSQL connected and stable  
✅ **JWT Tokens**: Generated and validated successfully  
✅ **CORS**: Configured for frontend integration  
✅ **P0 Backend Issues**: Resolved (hybrid architecture fixed)  

---

## 🔗 API Endpoints Reference

### Base URL
```
Production: https://ss-pt-new.onrender.com
Local Dev:  http://localhost:10000
```

### Authentication Endpoints

#### 🔐 Login
```javascript
POST /api/auth/login
Content-Type: application/json

Body:
{
  "username": "admin",     // Note: uses username, not email
  "password": "admin123"
}

Response:
{
  "success": true,
  "user": {
    "id": 1,
    "firstName": "Admin",
    "lastName": "User", 
    "email": "admin@swanstudios.com",
    "username": "admin",
    "role": "admin",
    "createdAt": "2025-06-06T18:44:01.396Z",
    "lastActive": "2025-06-06T19:53:38.005Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 👤 Get Current User  
```javascript
GET /api/auth/me
Authorization: Bearer {jwt_token}

Response:
{
  "id": 1,
  "username": "admin",
  "email": "admin@swanstudios.com", 
  "role": "admin",
  // ... user data
}
```

#### 🛍️ Storefront (Public)
```javascript
GET /api/storefront

Response:
{
  "items": [...],
  "categories": [...]
}
```

---

## 🔧 Frontend Implementation Examples

### React Login Component Example

```jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const LoginForm = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://ss-pt-new.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      if (data.success) {
        // Store tokens
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        // Update auth context
        login(data.user, data.token);
        
        // Redirect to dashboard
        navigate('/dashboard');
      }
      
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="Username"
        value={credentials.username}
        onChange={(e) => setCredentials({
          ...credentials,
          username: e.target.value
        })}
        required
      />
      
      <input
        type="password" 
        placeholder="Password"
        value={credentials.password}
        onChange={(e) => setCredentials({
          ...credentials,
          password: e.target.value
        })}
        required
      />
      
      {error && <div className="error">{error}</div>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

### Auth Context Provider

```jsx
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          const response = await fetch('https://ss-pt-new.onrender.com/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setToken(storedToken);
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      loading,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### API Service Helper

```javascript
// services/api.js
const API_BASE_URL = 'https://ss-pt-new.onrender.com';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, handle refresh or logout
          this.handleUnauthorized();
        }
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async login(username, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  async getCurrentUser() {
    return this.request('/api/auth/me');
  }

  async getStorefront() {
    return this.request('/api/storefront');
  }

  handleUnauthorized() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
}

export default new ApiService();
```

---

## 🎯 Testing Checklist

### Before Frontend Integration
- [ ] Run `TEST-PRODUCTION-READINESS.bat` successfully
- [ ] Confirm all endpoints return expected responses
- [ ] Verify CORS headers allow your frontend domain

### Frontend Integration Steps
1. [ ] Implement authentication context
2. [ ] Create login form
3. [ ] Add API service layer  
4. [ ] Test login flow
5. [ ] Implement protected routes
6. [ ] Add token refresh logic
7. [ ] Test logout functionality

### Post-Integration Testing
- [ ] Login/logout flows work
- [ ] Protected routes properly secured
- [ ] Token persistence across browser sessions
- [ ] Error handling for invalid tokens
- [ ] CORS issues resolved

---

## 🛡️ Security Considerations

### Token Management
- Store JWT token securely (localStorage for now, consider httpOnly cookies for production)
- Implement automatic token refresh
- Clear tokens on logout
- Handle token expiration gracefully

### CORS Configuration
Current CORS setup allows cross-origin requests. Verify your frontend domain is properly configured.

### API Security
- All requests require proper Content-Type headers
- Protected endpoints require Authorization header
- Username field is required for login (not email)

---

## 🚨 Common Issues & Solutions

### "Route not found" 
- Ensure you're using correct endpoint paths
- Verify backend server is running
- Check for typos in URL

### "Not authorized, no token"
- Include Authorization header: `Bearer {token}`
- Verify token is not expired
- Check token format (JWT)

### CORS Errors
- Verify Origin header matches configured domains
- Check preflight OPTIONS requests
- Ensure all required headers are allowed

### Login Issues
- Use `username` field, not `email`
- Verify admin user exists (run `create-admin-prod.mjs`)
- Check password formatting

---

## 📞 Support Commands

```bash
# Test protected endpoints locally
node test-protected-endpoints.mjs

# Test external connectivity  
node test-external-connectivity.mjs

# Complete production test
TEST-PRODUCTION-READINESS.bat

# Create/verify admin user
node backend/create-admin-prod.mjs
```

---

## 🎉 You're Ready!

Your backend is **production-ready** and fully functional. The authentication system is working, CORS is configured, and all endpoints are accessible. Time to build that amazing frontend! 🚀
