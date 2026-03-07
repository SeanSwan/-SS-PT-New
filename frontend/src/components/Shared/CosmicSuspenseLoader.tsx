import React from 'react';
import styled, { keyframes } from 'styled-components';

const pulseNebula = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.4); transform: scale(0.95); }
  70% { box-shadow: 0 0 0 20px rgba(120, 81, 169, 0); transform: scale(1); }
  100% { box-shadow: 0 0 0 0 rgba(120, 81, 169, 0); transform: scale(0.95); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const LoaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  width: 100%;
  background: transparent;
`;

const SwanCore = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00FFFF 0%, #7851A9 100%);
  animation: ${pulseNebula} 2s infinite cubic-bezier(0.45, 0, 0.55, 1);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: #0a0a1a;
  }
`;

const LoadingText = styled.div`
  margin-top: 24px;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, #00FFFF 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% auto;
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

interface CosmicSuspenseLoaderProps {
  text?: string;
}

const CosmicSuspenseLoader: React.FC<CosmicSuspenseLoaderProps> = ({ text = 'Orchestrating Workspace' }) => (
  <LoaderContainer>
    <SwanCore />
    <LoadingText>{text}</LoadingText>
  </LoaderContainer>
);

export default CosmicSuspenseLoader;
