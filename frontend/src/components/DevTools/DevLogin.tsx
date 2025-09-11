import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { 
  LogIn,
  User,
  AlertCircle,
  CheckCircle,
  Info,
  Loader2
} from 'lucide-react';

// ===================== Styled Components =====================

// Spinner Animation
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div`
  animation: ${spin} 1s linear infinite;
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
`;

// Layout Components
const Container = styled.div`
  max-width: 500px;
  margin: 0 auto;
`;

const Paper = styled.div`
  padding: 24px;
  background-color: #31304D;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const Section = styled.div`
  margin-bottom: 24px;
  
  &.mb-2 {
    margin-bottom: 16px;
  }
  
  &.mb-3 {
    margin-bottom: 24px;
  }
`;

// Typography
const Title = styled.h2`
  display: flex;
  align-items: center;
  margin: 0 0 16px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
`;

const Subtitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
`;

const Text = styled.p`
  margin: 0 0 16px 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: #e0e0e0;
`;

// Alert Components
const Alert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  
  &.info {
    background-color: rgba(23, 162, 184, 0.1);
    border: 1px solid rgba(23, 162, 184, 0.3);
    color: #17a2b8;
  }
  
  &.error {
    background-color: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
    color: #f44336;
  }
  
  &.success {
    background-color: rgba(40, 167, 69, 0.1);
    border: 1px solid rgba(40, 167, 69, 0.3);
    color: #28a745;
  }
`;

const AlertIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AlertContent = styled.div`
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.4;
`;

// Form Components
const FormGroup = styled.div`
  margin-bottom: 16px;
  width: 100%;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #e0e0e0;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 0.875rem;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 0.875rem;
  box-sizing: border-box;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
  
  option {
    background-color: #31304D;
    color: #ffffff;
  }
`;

// Button Components
const Button = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &.primary {
    background-color: #00ffff;
    color: #1a1a2e;
  }
  
  &.secondary {
    background-color: #7851A9;
    color: #ffffff;
  }
  
  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

// Divider
const Divider = styled.hr`
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  margin: 24px 0;
  width: 100%;
`;

/**
 * DevLogin Component
 * 
 * A developer tool for quickly testing different user roles and authentication states.
 */
const DevLogin: React.FC = () => {
  const [role, setRole] = useState<string>('client');
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle login with role - now uses actual backend login
  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Clear any existing authentication first
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Get credentials for the selected role
      const credentials = {
        username: role === 'admin' ? 'admin' : 
                 role === 'trainer' ? 'trainer@test.com' :
                 'client@test.com',
        password: role === 'admin' ? 'admin123' : 'password123'
      };
      
      console.log(`DevTools: Attempting login as ${credentials.username}`);
      
      // Make actual login request to backend
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        throw new Error(errorData.message || `Login failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Login response:', data);
      
      // Store the actual token from the backend
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('tokenTimestamp', Date.now().toString());
        
        setSuccess(`✅ Successfully logged in as ${data.user.role} user (${data.user.username})`);
        
        // Reload to apply the new authentication state
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error('Invalid response from server: missing token or user data');
      }
    } catch (err: any) {
      console.error('Dev login error:', err);
      setError(`❌ Failed to login: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create test user with specified role
  const handleCreateTestUser = async () => {
    if (!username) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // This would call your backend API to create a test user
      const response = await fetch('/api/dev/create-test-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          role,
          firstName: `Test${role.charAt(0).toUpperCase() + role.slice(1)}`,
          lastName: 'User',
          email: `${username}@test.com`,
          password: 'password123'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create test user');
      }
      
      const data = await response.json();
      setSuccess(`Successfully created test ${role} user: ${username}`);
    } catch (err) {
      setError('Failed to create test user. Check if development server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Paper>
        <Title>
          <User size={20} style={{ marginRight: 8 }} />
          Dev Login Tool
        </Title>
        
        <Text>
          This tool allows you to quickly login as different user roles for testing. It uses actual backend authentication.
        </Text>
        
        <Alert className="info">
          <AlertIcon>
            <Info size={16} />
          </AlertIcon>
          <AlertContent>
            <strong>Available Credentials:</strong><br />
            • Admin: username=admin, password=admin123<br />
            • Trainer: username=trainer@test.com, password=password123<br />
            • Client: username=client@test.com, password=password123<br />
            <br />
            <strong>Note:</strong> This connects to the real backend on port 10000
          </AlertContent>
        </Alert>
        
        {error && (
          <Alert className="error">
            <AlertIcon>
              <AlertCircle size={16} />
            </AlertIcon>
            <AlertContent>
              {error}
            </AlertContent>
          </Alert>
        )}
        
        {success && (
          <Alert className="success">
            <AlertIcon>
              <CheckCircle size={16} />
            </AlertIcon>
            <AlertContent>
              {success}
            </AlertContent>
          </Alert>
        )}
        
        <Section className="mb-3">
          <FormGroup>
            <Label htmlFor="role-select">Role</Label>
            <Select
              id="role-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="client">Client</option>
              <option value="trainer">Trainer</option>
              <option value="admin">Admin</option>
            </Select>
          </FormGroup>
          
          <Button
            className="primary"
            onClick={handleDevLogin}
            disabled={loading}
          >
            {loading ? (
              <SpinnerContainer>
                <Loader2 size={20} />
              </SpinnerContainer>
            ) : (
              <LogIn size={20} />
            )}
            {loading ? 'Logging in...' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </Button>
        </Section>
        
        <Divider />
        
        <Subtitle>
          Create Test User
        </Subtitle>
        
        <FormGroup>
          <Label htmlFor="username-input">Username</Label>
          <Input
            id="username-input"
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </FormGroup>
        
        <Button
          className="secondary"
          onClick={handleCreateTestUser}
          disabled={loading || !username}
        >
          {loading ? (
            <SpinnerContainer>
              <Loader2 size={20} />
            </SpinnerContainer>
          ) : null}
          {loading ? 'Creating...' : `Create Test ${role.charAt(0).toUpperCase() + role.slice(1)}`}
        </Button>
      </Paper>
    </Container>
  );
};

export default DevLogin;
