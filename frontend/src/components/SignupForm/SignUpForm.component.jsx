import React, { useState } from 'react';
import axios from 'axios';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../ui/select';
import { Icons } from '../icons/icons.jsx'; // Custom icons component

const SignUpForm = () => {
  const [formData, setFormData] = useState({ username: '', password: '', role: 'guard' });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value.trim(),
    }));
  };

  // Handle role selection
  const handleRoleChange = (value) => {
    setFormData((prevState) => ({
      ...prevState,
      role: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
  
    // Basic client-side validation
    if (!formData.username || !formData.password || !formData.role) {
      setError('Please fill in all fields.');
      return;
    }
  
    try {
      await axios.post('http://localhost:5000/api/auth/register', formData);
      setSuccessMessage('Registration successful! Please log in.');
      // Reset form
      setFormData({ username: '', password: '', role: 'guard' });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {error && <p className="text-red-500">{error}</p>}
      {successMessage && <p className="text-green-500">{successMessage}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter your username"
            required
            autoComplete="username"
            className="w-full"
          />
        </div>
        <div className="space-y-2 relative">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            required
            autoComplete="new-password"
            className="w-full pr-10"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
            onClick={() => setShowPassword(prev => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <Icons.eyeOff className="h-5 w-5" />
            ) : (
              <Icons.eye className="h-5 w-5" />
            )}
          </button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={formData.role} onValueChange={handleRoleChange}>
            <SelectTrigger id="role" name="role" aria-label="Select your role">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="guard">Guard</SelectItem>
              <SelectItem value="regional_manager">Regional Manager</SelectItem>
              <SelectItem value="dispatch">Dispatch</SelectItem>
              <SelectItem value="operations_manager">Operations Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
              <SelectItem value="CTO">CTO</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="submit"
          className="w-full bg-gold-500 text-black hover:bg-gold-600 focus:ring-gold-500"
        >
          Sign Up
        </Button>
      </form>
    </div>
  );
};

export default SignUpForm;