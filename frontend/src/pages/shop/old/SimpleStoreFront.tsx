// Simple StoreFront fallback component for testing
import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 3rem;
  margin-bottom: 1rem;
  background: linear-gradient(to right, #00ffff, #ff00ff);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
`;

const Subtitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: rgba(255, 255, 255, 0.8);
`;

const Message = styled.p`
  font-size: 1.2rem;
  line-height: 1.6;
  max-width: 600px;
  margin-bottom: 2rem;
`;

const Button = styled.button`
  background: linear-gradient(135deg, #00ffff, #ff00ff);
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const SimpleStoreFront: React.FC = () => {
  return (
    <Container>
      <Title>SwanStudios Store</Title>
      <Subtitle>Premium Training Packages</Subtitle>
      <Message>
        Welcome to SwanStudios! Our store is currently being optimized. 
        This is a temporary page while we resolve the loading issue.
      </Message>
      <Message>
        <strong>Available Packages:</strong><br/>
        • Single Session - $175<br/>
        • Silver Package (8 sessions) - $1,360<br/>
        • Gold Package (20 sessions) - $3,300<br/>
        • 3-Month Program - $7,440<br/>
        • 6-Month Program - $14,400<br/>
        • 9-Month Program - $20,880<br/>
        • 12-Month Program - $26,880
      </Message>
      <Button onClick={() => window.location.reload()}>
        Reload Page
      </Button>
    </Container>
  );
};

export default SimpleStoreFront;