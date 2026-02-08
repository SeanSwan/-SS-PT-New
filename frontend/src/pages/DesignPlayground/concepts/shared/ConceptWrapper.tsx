import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import styled from 'styled-components';
import type { ConceptTheme } from './ConceptTypes';

interface ConceptWrapperProps {
  theme: ConceptTheme;
  children: React.ReactNode;
}

const ConceptContainer = styled.div<{ $bg: string; $font: string }>`
  min-height: 100vh;
  background-color: ${({ $bg }) => $bg};
  font-family: ${({ $font }) => `'${$font}', sans-serif`};
  overflow-x: hidden;
  width: 100%;
`;

const ConceptWrapper: React.FC<ConceptWrapperProps> = ({ theme, children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={theme.fonts.googleImportUrl} rel="stylesheet" />
        <title>{`SwanStudios — ${theme.name} Concept`}</title>
      </Helmet>
      <ConceptContainer $bg={theme.colors.background} $font={theme.fonts.body}>
        {children}
      </ConceptContainer>
    </>
  );
};

export default ConceptWrapper;
