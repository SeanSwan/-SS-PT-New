import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const UniversalAuthForm = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    // Login fields
    username: '',
    password: '',
    // Registration fields
    firstName: '',
    lastName: '',
    email: '',
    role: 'client', // Default role
    phone: '',
    fitnessGoal: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes dynamically
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Client-side validation for registration
  const validateRegistrationData = () => {
    const { firstName, lastName, email, username, password } = formData;
    
    if (!firstName || !lastName || !email || !username || !password) {
      return 'Please fill in all required fields';
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please provide a valid email address';
    }
    
    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username) || username.length < 3 || username.length > 30) {
      return 'Username must be 3-30 characters, letters, numbers, and underscores only';
    }
    
    // Password validation
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumbers) {
      return 'Password must contain uppercase, lowercase, and numbers';
    }
    
    if (!hasSpecialChars) {
      return 'Password should include at least one special character';
    }
    
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        // Login validation
        if (!formData.username || !formData.password) {
          setError('Please provide username and password');
          return;
        }
        
        console.log('🔐 Attempting login with:', formData.username);
        const result = await login(formData.username, formData.password);
        
        if (result.success) {
          console.log('✅ Login successful');
          // AuthContext will handle redirect/state updates
        } else {
          setError(result.error || 'Login failed');
        }
      } else {
        // Registration validation
        const validationError = validateRegistrationData();
        if (validationError) {
          setError(validationError);
          return;
        }
        
        console.log('🚀 Attempting registration with:', {
          ...formData,
          password: '[REDACTED]'
        });
        
        const result = await register(formData);
        
        if (result.success) {
          console.log('✅ Registration successful, switching to login view');
          setIsLogin(true); // Switch to login view after successful registration
          setError('');
          // Reset registration fields
          setFormData({
            username: formData.username, // Keep username for login
            password: '',
            firstName: '',
            lastName: '',
            email: '',
            role: 'client',
            phone: '',
            fitnessGoal: ''
          });
        } else {
          setError(result.error || 'Registration failed');
        }
      }
    } catch (error) {
      console.error('❌ Auth error:', error);
      setError(error.response?.data?.message || error.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">
        {isLogin ? 'Login to Your Account' : 'Create a New Account'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Registration-only fields */}
        {!isLogin && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                name="firstName"
                placeholder="First Name *"
                required={!isLogin}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.firstName}
                onChange={handleChange}
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name *"
                required={!isLogin}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email Address *"
              required={!isLogin}
              className="block w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.email}
              onChange={handleChange}
            />
          </>
        )}

        {/* Username Input */}
        <input
          type="text"
          name="username"
          placeholder={isLogin ? "Username or Email" : "Username *"}
          required
          className="block w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={formData.username}
          onChange={handleChange}
        />

        {/* Password Input */}
        <input
          type="password"
          name="password"
          placeholder={isLogin ? "Password" : "Password *"}
          required
          className="block w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={formData.password}
          onChange={handleChange}
        />

        {/* Registration-only fields continued */}
        {!isLogin && (
          <>
            <select
              name="role"
              className="block w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="client">Client (Personal Training)</option>
              <option value="trainer">Trainer</option>
              <option value="user">General User</option>
            </select>

            <input
              type="tel"
              name="phone"
              placeholder="Phone Number (Optional)"
              className="block w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.phone}
              onChange={handleChange}
            />

            {formData.role === 'client' && (
              <input
                type="text"
                name="fitnessGoal"
                placeholder="Fitness Goal (Optional)"
                className="block w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={formData.fitnessGoal}
                onChange={handleChange}
              />
            )}

            <div className="text-xs text-gray-400 space-y-1">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>8+ characters</li>
                <li>Uppercase & lowercase letters</li>
                <li>Numbers and special characters</li>
              </ul>
            </div>
          </>
        )}

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isLogin ? 'Logging in...' : 'Creating Account...'}
            </>
          ) : (
            isLogin ? 'Login' : 'Create Account'
          )}
        </button>
      </form>

      {/* Toggle Between Login and Signup */}
      <button
        type="button"
        onClick={() => {
          setIsLogin(!isLogin);
          setError('');
          // Reset form data when switching
          setFormData({
            username: '',
            password: '',
            firstName: '',
            lastName: '',
            email: '',
            role: 'client',
            phone: '',
            fitnessGoal: ''
          });
        }}
        className="mt-6 w-full text-blue-400 hover:text-blue-300 underline text-center transition-colors duration-200"
      >
        {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
      </button>
    </div>
  );
};

export default UniversalAuthForm;