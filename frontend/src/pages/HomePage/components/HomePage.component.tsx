// src/pages/homepage/HomePage.component.tsx - SIMPLIFIED WORKING VERSION
import React, { useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

// Simple styled components without complex theme access
const HomePageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #334155 100%);
  color: white;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 4rem;
  font-weight: 700;
  color: #00ffff;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.5rem;
  margin-bottom: 3rem;
  max-width: 800px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 4rem;
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #00ffff, #0099cc);
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0a0a1a;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.3);
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 2rem 0;
`;

const FeatureCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    border-color: rgba(0, 255, 255, 0.5);
    box-shadow: 0 10px 30px rgba(0, 255, 255, 0.1);
  }

  h3 {
    color: #00ffff;
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.6;
  }
`;

const VideoSection = styled.div`
  position: relative;
  width: 100%;
  max-width: 800px;
  height: 400px;
  margin: 3rem 0;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid rgba(0, 255, 255, 0.3);

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 768px) {
    height: 250px;
  }
`;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [videoError, setVideoError] = useState(false);

  return (
    <>
      <Helmet>
        <title>SwanStudios - Transform Your Fitness Journey</title>
        <meta
          name="description"
          content="Transform your body and elevate your mind with SwanStudios' professional fitness training, premium equipment, and gamified platform."
        />
      </Helmet>

      <HomePageContainer>
        <Title>SwanStudios</Title>

        <Subtitle>
          Transform Your Body, Elevate Your Mind, Achieve Your Goals with Professional
          NASM-Certified Training and Premium Fitness Solutions
        </Subtitle>

        <ButtonGroup>
          <ActionButton onClick={() => navigate('/store')}>Browse Store</ActionButton>
          <ActionButton onClick={() => navigate('/contact')}>Start Training</ActionButton>
          <ActionButton onClick={() => navigate('/about')}>Learn More</ActionButton>
        </ButtonGroup>

        <VideoSection>
          {!videoError ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              onError={() => setVideoError(true)}
              poster="/swan-tile.png"
            >
              <source src="/swan.mp4" type="video/mp4" />
              <source src="/Swans.mp4" type="video/mp4" />
            </video>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              background: 'linear-gradient(135deg, #00ffff20, #0099cc20)',
              fontSize: '1.2rem',
              color: '#00ffff'
            }}>
              SwanStudios Premium Fitness
            </div>
          )}
        </VideoSection>

        <FeaturesGrid>
          <FeatureCard>
            <h3>Personal Training Excellence</h3>
            <p>
              Expert NASM-certified trainers provide personalized workout programs
              tailored to your unique fitness goals and lifestyle.
            </p>
          </FeatureCard>

          <FeatureCard>
            <h3>Premium Equipment & Supplements</h3>
            <p>
              High-quality fitness equipment, professional-grade supplements, and
              comprehensive training packages available in our store.
            </p>
          </FeatureCard>

          <FeatureCard>
            <h3>Digital Platform & Analytics</h3>
            <p>
              Advanced workout tracking, progress analytics, gamified challenges,
              and real-time performance monitoring.
            </p>
          </FeatureCard>

          <FeatureCard>
            <h3>Holistic Wellness Approach</h3>
            <p>
              Complete fitness ecosystem combining physical training, nutrition guidance,
              mental wellness, and community support.
            </p>
          </FeatureCard>

          <FeatureCard>
            <h3>Flexible Training Options</h3>
            <p>
              Choose from in-person sessions, virtual training, group classes,
              or self-guided programs that fit your schedule.
            </p>
          </FeatureCard>

          <FeatureCard>
            <h3>Results-Driven Programs</h3>
            <p>
              Scientifically-backed training methodologies with proven track record
              of helping clients achieve lasting transformation.
            </p>
          </FeatureCard>
        </FeaturesGrid>

        <div style={{
          marginTop: '3rem',
          fontSize: '0.9rem',
          color: 'rgba(255, 255, 255, 0.6)',
          textAlign: 'center'
        }}>
          <p>Professional Fitness Solutions • NASM-Certified Training • Premium Experience</p>
          <p>Transform Your Body • Elevate Your Mind • Achieve Your Goals</p>
        </div>
      </HomePageContainer>
    </>
  );
};

export default HomePage;
