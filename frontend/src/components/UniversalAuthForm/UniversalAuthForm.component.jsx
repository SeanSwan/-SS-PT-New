import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext'; // Import AuthContext

const UniversalAuthForm = () => {
  const { login, register } = useAuth(); // Access login and register from context
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and signup
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '', // Additional field for signup if needed
  });

  // Handle input changes dynamically
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(formData.username, formData.password); // Call login from context
        alert('Login successful!');
      } else {
        await register(formData); // Call register from context
        alert('Registration successful! Please log in.');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'An error occurred.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 border rounded shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">
        {isLogin ? 'Login to Your Account' : 'Create a New Account'}
      </h2>

      {/* Form Section */}
      <form onSubmit={handleSubmit}>
        {/* Username Input */}
        <input
          type="text"
          name="username"
          placeholder="Username"
          required
          className="block w-full mb-3 p-2 border rounded"
          value={formData.username}
          onChange={handleChange}
        />

        {/* Password Input */}
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          className="block w-full mb-3 p-2 border rounded"
          value={formData.password}
          onChange={handleChange}
        />

        {/* Email Input (only for signup) */}
        {!isLogin && (
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            className="block w-full mb-3 p-2 border rounded"
            value={formData.email}
            onChange={handleChange}
          />
        )}

        {/* Submit Button */}
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>

      {/* Toggle Between Login and Signup */}
      <button
        onClick={() => setIsLogin(!isLogin)}
        className="mt-4 text-blue-500 underline block text-center"
      >
        {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
      </button>
    </div>
  );
};

export default UniversalAuthForm;