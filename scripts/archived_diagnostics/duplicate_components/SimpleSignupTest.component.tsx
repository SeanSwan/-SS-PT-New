import React, { useState } from 'react';
import axios from 'axios';

const SimpleSignupTest = () => {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    // Simple test user with all required fields in the correct format
    const testUser = {
      firstName: "Test",
      lastName: "User",
      email: "testuser@example.com",
      username: "testuser",
      password: "TestUser123!",
      phone: "555-555-5555",
      dateOfBirth: "1990-01-01",
      gender: "male",
      weight: "75",
      height: "180",
      fitnessGoal: "muscle-gain",
      trainingExperience: "beginner",
      healthConcerns: "none",
      emergencyContact: "Emergency Contact 555-555-5555"
    };

    try {
      console.log('Sending registration data:', testUser);
      
      // Make the API call directly
      const response = await axios.post('/api/auth/register', testUser);
      
      console.log('Registration successful!', response.data);
      setResult(response.data);
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Display detailed error information
      if (err.response) {
        setError(`Error ${err.response.status}: ${err.response.data?.message || 'Unknown error'}`);
        console.error('Error details:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
      } else if (err.request) {
        setError('No response received from server. Check network connection.');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Simple Registration Test</h1>
      <p>This is a simple test component that will attempt to register a test user with hardcoded data that meets all the validation requirements.</p>
      
      <button 
        onClick={handleSubmit} 
        disabled={isLoading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#4CAF50', 
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1
        }}
      >
        {isLoading ? 'Testing...' : 'Test Registration'}
      </button>
      
      {error && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: '#d4edda', 
          color: '#155724',
          borderRadius: '4px'
        }}>
          <strong>Success!</strong> User registered successfully.
          <pre style={{ marginTop: '10px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <h3>Test User Data:</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
{`{
  firstName: "Test",
  lastName: "User",
  email: "testuser@example.com",
  username: "testuser",
  password: "TestUser123!",
  phone: "555-555-5555",
  dateOfBirth: "1990-01-01",
  gender: "male",
  weight: "75",
  height: "180",
  fitnessGoal: "muscle-gain",
  trainingExperience: "beginner",
  healthConcerns: "none",
  emergencyContact: "Emergency Contact 555-555-5555"
}`}
        </pre>
      </div>
    </div>
  );
};

export default SimpleSignupTest;
