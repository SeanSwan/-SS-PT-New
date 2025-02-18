// src/pages/LoginPage.jsx
import React, { useState, useContext } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { AuthContext } from '../context/AuthContext';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #000;
  padding: 20px;
  animation: ${fadeIn} 0.8s ease-out;
`;

const FormWrapper = styled.form`
  background: rgba(20, 20, 20, 0.9);
  padding: 40px;
  border-radius: 10px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
`;

const Title = styled.h2`
  color: var(--neon-blue);
  text-align: center;
  margin-bottom: 24px;
  font-size: 2rem;
`;

const InputField = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 16px;
  border: 2px solid var(--royal-purple);
  border-radius: 5px;
  background: #111;
  color: #fff;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: var(--neon-blue);
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  background: var(--neon-blue);
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  color: #000;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: var(--royal-purple);
  }
`;

const ErrorMessage = styled.p`
  color: red;
  text-align: center;
  margin-bottom: 16px;
`;

const LoginPage = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState('');

  if (user) {
    // If already logged in, redirect to the dashboard.
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Reset any previous error
    try {
      await login(credentials.username, credentials.password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <Container>
      <FormWrapper onSubmit={handleSubmit}>
        <Title>Login</Title>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <InputField
          type="text"
          name="username"
          placeholder="Username"
          value={credentials.username}
          onChange={handleChange}
          required
        />
        <InputField
          type="password"
          name="password"
          placeholder="Password"
          value={credentials.password}
          onChange={handleChange}
          required
        />
        <Button type="submit">Login</Button>
      </FormWrapper>
    </Container>
  );
};

export default LoginPage;