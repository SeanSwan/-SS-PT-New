// src/components/common/ScrollToTopDemo.tsx
import React from 'react';
import styled from 'styled-components';
import { ScrollToTop } from './';
import GlowButton from '../Button/glowButton';
import { FaRocket, FaChevronUp, FaArrowCircleUp } from 'react-icons/fa';

const DemoContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Section = styled.section`
  margin-bottom: 40px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  backdrop-filter: blur(10px);
`;

const Title = styled.h2`
  color: #fff;
  margin-bottom: 20px;
`;

const DemoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const DemoItem = styled.div`
  position: relative;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  text-align: center;
`;

const DemoLabel = styled.p`
  color: #ccc;
  margin-bottom: 15px;
  font-size: 14px;
`;

const ContentSection = styled.div`
  height: 400px;
  background: linear-gradient(45deg, rgba(133, 77, 255, 0.1), rgba(255, 46, 99, 0.1));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  margin: 20px 0;
`;

const addContent = () => {
  const content = document.createElement('div');
  content.style.height = '1000px';
  content.style.background = 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.05))';
  content.style.marginTop = '20px';
  content.innerHTML = '<h3 style="color: #fff; text-align: center; padding-top: 100px;">Scroll down to test ScrollToTop button</h3>';
  document.querySelector('#scroll-demo')?.appendChild(content);
};

/**
 * ScrollToTop Demo Component
 * Demonstrates different configurations of the ScrollToTop component
 */
const ScrollToTopDemo: React.FC = () => {
  React.useEffect(() => {
    // Add extra content for scrolling demo
    addContent();
  }, []);

  return (
    <DemoContainer>
      <Title>ScrollToTop Component Demo</Title>
      
      <Section>
        <h3 style={{ color: '#fff', marginBottom: '15px' }}>Theme Variations</h3>
        <DemoGrid>
          <DemoItem>
            <DemoLabel>Cosmic Theme</DemoLabel>
            <ScrollToTop 
              theme="cosmic"
              size="medium"
              scrollThreshold={200}
            />
          </DemoItem>
          
          <DemoItem>
            <DemoLabel>Purple Theme</DemoLabel>
            <ScrollToTop 
              theme="purple"
              size="medium"
              scrollThreshold={200}
            />
          </DemoItem>
          
          <DemoItem>
            <DemoLabel>Emerald Theme</DemoLabel>
            <ScrollToTop 
              theme="emerald"
              size="medium"
              scrollThreshold={200}
            />
          </DemoItem>
          
          <DemoItem>
            <DemoLabel>Ruby Theme</DemoLabel>
            <ScrollToTop 
              theme="ruby"
              size="medium"
              scrollThreshold={200}
            />
          </DemoItem>
        </DemoGrid>
      </Section>

      <Section>
        <h3 style={{ color: '#fff', marginBottom: '15px' }}>Size Variations</h3>
        <DemoGrid>
          <DemoItem>
            <DemoLabel>Small</DemoLabel>
            <ScrollToTop 
              theme="cosmic"
              size="small"
              scrollThreshold={200}
            />
          </DemoItem>
          
          <DemoItem>
            <DemoLabel>Medium</DemoLabel>
            <ScrollToTop 
              theme="cosmic"
              size="medium"
              scrollThreshold={200}
            />
          </DemoItem>
          
          <DemoItem>
            <DemoLabel>Large</DemoLabel>
            <ScrollToTop 
              theme="cosmic"
              size="large"
              scrollThreshold={200}
            />
          </DemoItem>
        </DemoGrid>
      </Section>

      <Section>
        <h3 style={{ color: '#fff', marginBottom: '15px' }}>Custom Icons</h3>
        <DemoGrid>
          <DemoItem>
            <DemoLabel>Rocket Icon</DemoLabel>
            <ScrollToTop 
              theme="cosmic"
              size="medium"
              scrollThreshold={200}
              icon={<FaRocket size={18} />}
            />
          </DemoItem>
          
          <DemoItem>
            <DemoLabel>Chevron Up</DemoLabel>
            <ScrollToTop 
              theme="purple"
              size="medium"
              scrollThreshold={200}
              icon={<FaChevronUp size={16} />}
            />
          </DemoItem>
          
          <DemoItem>
            <DemoLabel>Circle Arrow</DemoLabel>
            <ScrollToTop 
              theme="emerald"
              size="medium"
              scrollThreshold={200}
              icon={<FaArrowCircleUp size={20} />}
            />
          </DemoItem>
        </DemoGrid>
      </Section>

      <Section id="scroll-demo">
        <h3 style={{ color: '#fff' }}>Scroll Test Area</h3>
        <p style={{ color: '#ccc' }}>
          This area is meant to demonstrate the scroll-to-top functionality. 
          The button will appear after scrolling down 400px (or your configured threshold).
        </p>
        
        <ContentSection>
          <div>
            <h4>Content Section 1</h4>
            <p>Scroll down to see more content and test the scroll-to-top button.</p>
          </div>
        </ContentSection>
        
        <ContentSection>
          <div>
            <h4>Content Section 2</h4>
            <p>Keep scrolling to fully test the ScrollToTop component.</p>
          </div>
        </ContentSection>
        
        <ContentSection>
          <div>
            <h4>Content Section 3</h4>
            <p>Now try clicking the scroll-to-top button when it appears!</p>
          </div>
        </ContentSection>
      </Section>

      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <GlowButton
          text="Generate More Content"
          theme="cosmic"
          size="medium"
          onClick={addContent}
        />
      </div>
    </DemoContainer>
  );
};

export default ScrollToTopDemo;