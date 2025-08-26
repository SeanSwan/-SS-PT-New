import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #334155 100%);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 4rem;
  font-weight: 700;
  color: #00ffff;
  margin-bottom: 1rem;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.5rem;
  margin-bottom: 3rem;
  max-width: 600px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #00ffff, #0099cc);
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0a0a1a;
  cursor: pointer;
  margin: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.3);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 800px;
  margin: 3rem 0;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  
  h3 {
    color: #00ffff;
    margin-bottom: 1rem;
  }
  
  p {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.5;
  }
`;

const EmergencyHomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <Title>SwanStudios</Title>
      <Subtitle>
        Transform Your Body, Elevate Your Mind, Achieve Your Goals
      </Subtitle>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
        <Button onClick={() => navigate('/store')}>
          Explore Store
        </Button>
        <Button onClick={() => navigate('/contact')}>
          Get Started
        </Button>
        <Button onClick={() => navigate('/about')}>
          Learn More
        </Button>
      </div>

      <Grid>
        <Card>
          <h3>Personal Training</h3>
          <p>Expert-led fitness programs tailored to your unique goals and lifestyle.</p>
        </Card>
        <Card>
          <h3>Premium Store</h3>
          <p>High-quality fitness equipment, supplements, and training packages.</p>
        </Card>
        <Card>
          <h3>Digital Platform</h3>
          <p>Advanced workout tracking, progress analytics, and gamified experiences.</p>
        </Card>
      </Grid>

      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
        <p>Professional fitness solutions • NASM-certified training • Premium experience</p>
      </div>
    </Container>
  );
};

export default EmergencyHomePage;