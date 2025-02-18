import React from 'react';
import styled from 'styled-components';
import { FaDumbbell, FaLaptop, FaUsers, FaRegClock } from 'react-icons/fa';

/*
  FeaturesSection Component
  -------------------------
  Displays a grid of feature cards that highlight the key services offered by the platform.
  Each card shows an icon, a title, and a short description.
*/

// Container for the entire features section
const FeaturesContainer = styled.section`
  padding: 4rem 2rem;
  background: #111;
  text-align: center;
`;

// Title for the features section
const FeaturesTitle = styled.h2`
  font-size: 2.5rem;
  color: var(--neon-blue);
  margin-bottom: 2rem;
`;

// Grid layout to hold the feature cards
const FeaturesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
`;

// Individual feature card styling
const FeatureCard = styled.div`
  background: rgba(0, 0, 0, 0.8);
  padding: 2rem;
  border-radius: 10px;
  flex: 1 1 250px;
  max-width: 300px;
`;

// Icon styling for the feature card
const FeatureIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--royal-purple);
`;

// Title styling for the feature card
const FeatureTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--silver);
`;

// Text styling for the feature card description
const FeatureText = styled.p`
  font-size: 1rem;
  color: var(--grey);
`;

// FeaturesSection component definition
const FeaturesSection: React.FC = () => {
  return (
    <FeaturesContainer id="features">
      <FeaturesTitle>Our Services</FeaturesTitle>
      <FeaturesGrid>
        <FeatureCard>
          <FeatureIcon>
            <FaDumbbell />
          </FeatureIcon>
          <FeatureTitle>Custom Training Programs</FeatureTitle>
          <FeatureText>Personalized plans to suit your goals.</FeatureText>
        </FeatureCard>
        <FeatureCard>
          <FeatureIcon>
            <FaLaptop />
          </FeatureIcon>
          <FeatureTitle>Online Coaching</FeatureTitle>
          <FeatureText>Interactive live and recorded sessions.</FeatureText>
        </FeatureCard>
        <FeatureCard>
          <FeatureIcon>
            <FaUsers />
          </FeatureIcon>
          <FeatureTitle>Community Support</FeatureTitle>
          <FeatureText>Join a vibrant community for motivation.</FeatureText>
        </FeatureCard>
        <FeatureCard>
          <FeatureIcon>
            <FaRegClock />
          </FeatureIcon>
          <FeatureTitle>Flexible Scheduling</FeatureTitle>
          <FeatureText>Workout on your own time.</FeatureText>
        </FeatureCard>
      </FeaturesGrid>
    </FeaturesContainer>
  );
};

export default FeaturesSection;