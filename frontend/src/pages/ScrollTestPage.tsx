// Test page to verify ScrollToTop is working
import React from 'react';
import styled from 'styled-components';
import { SimpleScrollToTop } from '../components/common';

const TestContainer = styled.div`
  padding: 20px;
  background: linear-gradient(to bottom, #0a0a1a, #1a1a2e);
  color: white;
  min-height: 100vh;
`;

const Section = styled.div`
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: ${({ bg }) => bg || 'transparent'};
  border: 2px solid #00ffff;
  margin: 20px 0;
  border-radius: 10px;
`;

const ScrollTestPage = () => {
  return (
    <TestContainer>
      <h1>🚀 SCROLL TO TOP TEST PAGE</h1>
      <p>Scroll down to see the scroll-to-top button appear!</p>
      
      <Section bg="rgba(0, 255, 255, 0.1)">
        <div>
          <h2>Section 1</h2>
          <p>This is the first section. Keep scrolling down!</p>
        </div>
      </Section>
      
      <Section bg="rgba(120, 81, 169, 0.1)">
        <div>
          <h2>Section 2</h2>
          <p>You should see the scroll button by now!</p>
        </div>
      </Section>
      
      <Section bg="rgba(255, 46, 99, 0.1)">
        <div>
          <h2>Section 3</h2>
          <p>Click the floating button to scroll back to top!</p>
        </div>
      </Section>
      
      <Section bg="rgba(0, 255, 255, 0.1)">
        <div>
          <h2>Section 4</h2>
          <p>Test the smooth scroll behavior!</p>
        </div>
      </Section>
      
      <Section bg="rgba(120, 81, 169, 0.1)">
        <div>
          <h2>Section 5 - BOTTOM</h2>
          <p>This is the bottom. The button should be clearly visible!</p>
          <p style={{ fontSize: '1rem', color: '#00ffff' }}>
            Look for a circular button with an up arrow in the bottom-right corner
          </p>
        </div>
      </Section>
      
      {/* Force the SimpleScrollToTop to render for testing */}
      <SimpleScrollToTop scrollThreshold={100} />
    </TestContainer>
  );
};

export default ScrollTestPage;