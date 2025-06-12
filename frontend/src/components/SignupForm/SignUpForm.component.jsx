import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
import { Icons } from '../icons/icons.jsx';

const SignUpForm = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    role: 'client', // Default to client role
    phone: '',
    fitnessGoal: '',
    trainingExperience: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Client-side password validation
  const validatePassword = (password) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!hasUppercase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowercase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChars) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    // Client-side validation
    const requiredFields = ['firstName', 'lastName', 'email', 'username', 'password'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setIsSubmitting(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please provide a valid email address');
      setIsSubmitting(false);
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      setIsSubmitting(false);
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores');
      setIsSubmitting(false);
      return;
    }

    if (formData.username.length < 3 || formData.username.length > 30) {
      setError('Username must be between 3 and 30 characters');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('🚀 Attempting registration with:', {
        ...formData,
        password: '[REDACTED]'
      });

      const result = await register(formData);
      
      if (result.success) {
        setSuccessMessage('Registration successful! You are now logged in.');
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          username: '',
          password: '',
          role: 'client',
          phone: '',
          fitnessGoal: '',
          trainingExperience: ''
        });
        
        // Redirect logic could be added here
        console.log('✅ Registration successful, user:', result.user);
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('❌ Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg">
          {successMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Required Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Enter your first name"
              required
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter your last name"
              required
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email address"
            required
            autoComplete="email"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Choose a username"
            required
            autoComplete="username"
            className="w-full"
          />
          <p className="text-sm text-gray-400">
            3-30 characters, letters, numbers, and underscores only
          </p>
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            required
            autoComplete="new-password"
            className="w-full pr-10"
          />
          <button
            type="button"
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-200"
            onClick={() => setShowPassword(prev => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <Icons.eyeOff className="h-5 w-5" />
            ) : (
              <Icons.eye className="h-5 w-5" />
            )}
          </button>
          <p className="text-sm text-gray-400">
            8+ characters, uppercase, lowercase, numbers, and special characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Account Type</Label>
          <Select value={formData.role} onValueChange={handleRoleChange}>
            <SelectTrigger id="role" name="role">
              <SelectValue placeholder="Select your account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client">Client (Personal Training)</SelectItem>
              <SelectItem value="trainer">Trainer</SelectItem>
              <SelectItem value="user">General User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Optional Fields */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number (Optional)</Label>
          <Input
            id="phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter your phone number"
            className="w-full"
          />
        </div>

        {formData.role === 'client' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="fitnessGoal">Fitness Goal (Optional)</Label>
              <Input
                id="fitnessGoal"
                type="text"
                name="fitnessGoal"
                value={formData.fitnessGoal}
                onChange={handleChange}
                placeholder="e.g., Lose weight, Build muscle, General fitness"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trainingExperience">Training Experience (Optional)</Label>
              <Input
                id="trainingExperience"
                type="text"
                name="trainingExperience"
                value={formData.trainingExperience}
                onChange={handleChange}
                placeholder="e.g., Beginner, Intermediate, Advanced"
                className="w-full"
              />
            </div>
          </>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Icons.spinner className="animate-spin h-4 w-4 mr-2" />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
    </div>
  );
};

export default SignUpForm;