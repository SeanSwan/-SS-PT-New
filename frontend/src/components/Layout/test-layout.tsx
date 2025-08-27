/**
 * MINIMAL LAYOUT TEST - Bypasses complex Header
 * This will help identify if the Header is causing the blank page
 */
import React from 'react';
import styled from 'styled-components';

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const SimpleHeader = styled.header`
  height: 56px;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-top: 56px;
`;

const Content = styled.main`
  flex: 1;
`;

const TestLayout = ({ children }) => {
  console.log('✅ TEST LAYOUT: Rendering with minimal header...');
  
  return (
    <MainContainer>
      <SimpleHeader>
        <h2>🧪 SwanStudios - TEST MODE (Header Bypassed)</h2>
      </SimpleHeader>
      
      <ContentWrapper>
        <Content>
          {children}
        </Content>
      </ContentWrapper>
    </MainContainer>
  );
};

export default TestLayout;
