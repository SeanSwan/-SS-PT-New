/**
 * PremiumServicesSection.tsx
 * Elite Training Services showcase component
 *
 * Uses Galaxy-Swan theme tokens for consistent styling
 * Mobile-first responsive design with accessibility support
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Zap, Shield } from 'lucide-react';
import { galaxySwanTheme, mediaQueries } from '../../styles/galaxy-swan-theme';

// === STYLED COMPONENTS ===

const Section = styled.section`
  position: relative;
  padding: 48px 16px;
  background: linear-gradient(135deg, ${galaxySwanTheme.galaxy.void} 0%, ${galaxySwanTheme.galaxy.stardust} 100%);
  overflow: hidden;
  min-height: 600px;

  ${mediaQueries.desktop} {
    padding: 80px 32px;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 48px;

  h2 {
    font-family: 'Playfair Display', serif;
    font-size: 2.5rem;
    color: ${galaxySwanTheme.text.primary};
    margin-bottom: 16px;
    background: linear-gradient(to right, ${galaxySwanTheme.swan.pure}, ${galaxySwanTheme.primary.main});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;

    ${mediaQueries.mobile} {
      font-size: 2rem;
    }
  }

  p {
    color: ${galaxySwanTheme.text.muted};
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  ${mediaQueries.tablet} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${mediaQueries.desktop} {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Card = styled(motion.article)`
  background: ${galaxySwanTheme.components.card.background};
  backdrop-filter: blur(10px);
  border: ${galaxySwanTheme.components.card.border};
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 300px;

  &:hover {
    transform: translateY(-5px);
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
    border-color: ${galaxySwanTheme.components.card.hoverBorder};
  }

  &:active {
    transform: scale(0.98);
  }

  /* Gradient accent bar */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: ${galaxySwanTheme.gradients.swanCosmic};
  }
`;

const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(0, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: ${galaxySwanTheme.primary.main};
`;

const CardTitle = styled.h3`
  font-size: 1.5rem;
  color: ${galaxySwanTheme.text.primary};
  margin-bottom: 16px;
`;

const CardDescription = styled.p`
  color: ${galaxySwanTheme.text.muted};
  margin-bottom: 24px;
  flex-grow: 1;
  line-height: 1.6;
`;

const Button = styled.button`
  background: transparent;
  border: 1px solid ${galaxySwanTheme.primary.main};
  color: ${galaxySwanTheme.primary.main};
  padding: 12px 24px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  min-height: 44px; /* Touch target accessibility */
  width: 100%;

  &:hover {
    background: ${galaxySwanTheme.primary.main};
    color: ${galaxySwanTheme.galaxy.void};
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
  }
`;

// === SERVICE DATA ===

const services = [
  {
    id: 1,
    title: 'Personal Training',
    description: "One-on-one coaching tailored to your specific goals, whether it's weight loss, muscle gain, or athletic performance.",
    icon: <Star size={24} />,
    link: '/services/personal-training'
  },
  {
    id: 2,
    title: 'Online Coaching',
    description: 'Get a personalized workout plan and nutrition guidance delivered straight to your phone, anywhere in the world.',
    icon: <Zap size={24} />,
    link: '/services/online-coaching'
  },
  {
    id: 3,
    title: 'Nutrition Planning',
    description: 'Fuel your body right with custom meal plans designed by certified nutritionists to support your training.',
    icon: <Shield size={24} />,
    link: '/services/nutrition'
  }
];

// === COMPONENT ===

const PremiumServicesSection: React.FC = () => {
  return (
    <Section aria-label="Premium Services">
      <Container>
        <Header>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Elite Training Services
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Experience the gold standard in fitness with our comprehensive coaching programs.
          </motion.p>
        </Header>

        <Grid>
          {services.map((service, index) => (
            <Card
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <IconWrapper>
                {service.icon}
              </IconWrapper>
              <CardTitle>{service.title}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
              <Button aria-label={`Learn more about ${service.title}`}>
                Learn More <ArrowRight size={16} />
              </Button>
            </Card>
          ))}
        </Grid>
      </Container>
    </Section>
  );
};

export default PremiumServicesSection;
