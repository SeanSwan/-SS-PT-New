import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h2`
  font-size: 1.5rem;
  color: #fff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Section = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.2);
`;

const IconsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 15px;
  margin-top: 15px;
`;

const IconWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    background-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }
`;

const IconName = styled.span`
  margin-top: 8px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
`;

const IconSize = {
  small: '1rem',
  medium: '1.5rem',
  large: '2rem',
  xlarge: '3rem'
};

const StyledIcon = styled(FontAwesomeIcon)`
  color: ${props => props.color || '#00ffff'};
  font-size: ${props => IconSize[props.size] || IconSize.medium};
`;

const DifferentStyles = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-top: 15px;
`;

const StyleExample = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

const FontAwesomeExamples = () => {
  // Example fitness-related icons
  const fitnessIcons = [
    { icon: 'dumbbell', name: 'Dumbbell' },
    { icon: 'running', name: 'Running' },
    { icon: 'heartbeat', name: 'Heartbeat' },
    { icon: 'weight', name: 'Weight' },
    { icon: 'bicycle', name: 'Bicycle' },
    { icon: 'swimmer', name: 'Swimmer' },
    { icon: 'walking', name: 'Walking' },
    { icon: 'graduation-cap', name: 'Training' },
    { icon: 'trophy', name: 'Trophy' },
    { icon: 'fire', name: 'Calories' },
    { icon: 'chart-line', name: 'Progress' },
    { icon: 'award', name: 'Achievement' }
  ];

  // Example UI icons
  const uiIcons = [
    { icon: 'home', name: 'Home' },
    { icon: 'user', name: 'User' },
    { icon: 'cog', name: 'Settings' },
    { icon: 'search', name: 'Search' },
    { icon: 'shopping-cart', name: 'Cart' },
    { icon: 'bell', name: 'Notifications' },
    { icon: 'calendar-alt', name: 'Calendar' },
    { icon: 'edit', name: 'Edit' },
    { icon: 'save', name: 'Save' },
    { icon: 'trash', name: 'Delete' },
    { icon: 'plus', name: 'Add' },
    { icon: 'camera', name: 'Camera' }
  ];

  // Example brand icons
  const brandIcons = [
    { icon: ['fab', 'facebook-f'], name: 'Facebook' },
    { icon: ['fab', 'twitter'], name: 'Twitter' },
    { icon: ['fab', 'instagram'], name: 'Instagram' },
    { icon: ['fab', 'youtube'], name: 'YouTube' },
    { icon: ['fab', 'linkedin-in'], name: 'LinkedIn' },
    { icon: ['fab', 'pinterest-p'], name: 'Pinterest' },
    { icon: ['fab', 'tiktok'], name: 'TikTok' },
    { icon: ['fab', 'whatsapp'], name: 'WhatsApp' }
  ];

  return (
    <Container>
      <Title>
        <StyledIcon icon="font-awesome" size="medium" color="#00ffff" />
        Font Awesome Icons for Fitness App
      </Title>

      <Section>
        <Title>
          <StyledIcon icon="dumbbell" />
          Fitness Icons
        </Title>
        <IconsGrid>
          {fitnessIcons.map((item, index) => (
            <IconWrapper key={index}>
              <StyledIcon icon={item.icon} color="#00ffff" size="large" />
              <IconName>{item.name}</IconName>
            </IconWrapper>
          ))}
        </IconsGrid>
      </Section>

      <Section>
        <Title>
          <StyledIcon icon="cog" />
          UI Icons
        </Title>
        <IconsGrid>
          {uiIcons.map((item, index) => (
            <IconWrapper key={index}>
              <StyledIcon icon={item.icon} color="#7851a9" size="large" />
              <IconName>{item.name}</IconName>
            </IconWrapper>
          ))}
        </IconsGrid>
      </Section>

      <Section>
        <Title>
          <StyledIcon icon={['fab', 'instagram']} />
          Brand Icons
        </Title>
        <IconsGrid>
          {brandIcons.map((item, index) => (
            <IconWrapper key={index}>
              <StyledIcon icon={item.icon} color="#ff416c" size="large" />
              <IconName>{item.name}</IconName>
            </IconWrapper>
          ))}
        </IconsGrid>
      </Section>

      <Section>
        <Title>
          <StyledIcon icon="palette" />
          Different Styles and Sizes
        </Title>
        <DifferentStyles>
          <StyleExample>
            <StyledIcon icon="dumbbell" size="small" color="#00ffff" />
            <IconName>Small</IconName>
          </StyleExample>
          <StyleExample>
            <StyledIcon icon="dumbbell" size="medium" color="#00ffff" />
            <IconName>Medium</IconName>
          </StyleExample>
          <StyleExample>
            <StyledIcon icon="dumbbell" size="large" color="#00ffff" />
            <IconName>Large</IconName>
          </StyleExample>
          <StyleExample>
            <StyledIcon icon="dumbbell" size="xlarge" color="#00ffff" />
            <IconName>XLarge</IconName>
          </StyleExample>
          <StyleExample>
            <StyledIcon icon={['far', 'heart']} size="large" color="#ff416c" />
            <IconName>Regular Style</IconName>
          </StyleExample>
          <StyleExample>
            <StyledIcon icon="heart" size="large" color="#ff416c" />
            <IconName>Solid Style</IconName>
          </StyleExample>
        </DifferentStyles>
      </Section>

      <Section>
        <Title>
          <StyledIcon icon="info-circle" />
          Usage Examples
        </Title>
        <div style={{ marginTop: '15px', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.8)' }}>
          <p>To use Font Awesome icons in your components:</p>
          <pre style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
            {`import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// For solid icons
<FontAwesomeIcon icon="dumbbell" />

// For brand icons
<FontAwesomeIcon icon={['fab', 'instagram']} />

// For regular icons
<FontAwesomeIcon icon={['far', 'heart']} />

// With custom styling
<FontAwesomeIcon 
  icon="trophy" 
  style={{ color: '#ffd700', fontSize: '2rem' }} 
/>`}
          </pre>
        </div>
      </Section>
    </Container>
  );
};

export default FontAwesomeExamples;
