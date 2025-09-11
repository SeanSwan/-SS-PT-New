/**
 * Emergency Admin Schedule Integration - MINIMAL SAFE VERSION
 * ==========================================================
 * 
 * Minimal version that won't break the build while we debug
 * Uses only confirmed working dependencies
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

// Safe icons
import {
  Calendar,
  RefreshCw,
  Loader2
} from 'lucide-react';

// ===================== Styled Components =====================

// Loading Spinner Animation
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div`
  animation: ${spin} 1s linear infinite;
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
`;

// Layout Components
const Container = styled.div`
  background: #0a0a0f;
  color: #ffffff;
  padding: 1.5rem;
  border-radius: 12px;
  min-height: 400px;
`;

// Simplified Flex Container
const FlexBox = styled.div`
  display: flex;
  
  &.column {
    flex-direction: column;
  }
  
  &.center {
    align-items: center;
  }
  
  &.space-between {
    justify-content: space-between;
  }
  
  &.text-center {
    text-align: center;
  }
  
  &.py-16 {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }
`;

// Simple Content Box
const ContentBox = styled.div`
  &.elevated {
    background: #1e1e3f;
    padding: 1.5rem;
    border-radius: 8px;
    max-width: 600px;
    margin: 0 auto;
  }
  
  &.mt-6 {
    margin-top: 1.5rem;
  }
`;

// Typography Components
const Heading = styled.h1`
  margin: 0;
  color: #ffffff;
  display: flex;
  align-items: center;
  font-size: 2rem;
  font-weight: 600;
  
  &.h4 {
    font-size: 2rem;
  }
  
  &.h5 {
    font-size: 1.5rem;
  }
  
  &.h6 {
    font-size: 1.25rem;
  }
  
  &.mb-1 {
    margin-bottom: 0.5rem;
  }
  
  &.mb-4 {
    margin-bottom: 2rem;
  }
  
  &.primary {
    color: #3b82f6;
  }
  
  &.secondary {
    color: #94a3b8;
  }
`;

const Text = styled.p`
  margin: 0;
  color: #ffffff;
  font-size: 1rem;
  line-height: 1.5;
  
  &.body1 {
    font-size: 1rem;
  }
  
  &.body2 {
    font-size: 0.875rem;
    line-height: 1.4;
  }
  
  &.mb-8 {
    margin-bottom: 2rem;
  }
  
  &.text-center {
    text-align: center;
  }
  
  &.text-left {
    text-align: left;
  }
  
  &.secondary {
    color: #94a3b8;
  }
`;

// Button Component
const StyledButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  opacity: 1;
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    opacity: 0.8;
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  &:disabled:hover {
    opacity: 0.6;
  }
`;

// Safe theme import
const theme = {
  background: {
    primary: '#0a0a0f',
    elevated: '#1e1e3f'
  },
  text: {
    primary: '#ffffff',
    secondary: '#94a3b8'
  },
  primary: {
    main: '#3b82f6'
  },
  spacing: {
    lg: '1.5rem',
    xl: '2rem'
  }
};

const ScheduleContainer = styled.div`
  background: ${theme.background.primary};
  color: ${theme.text.primary};
  padding: ${theme.spacing.lg};
  border-radius: 12px;
  min-height: 400px;
`;

const ScheduleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};
  padding: ${theme.spacing.lg};
  background: ${theme.background.elevated};
  border-radius: 12px;
`;

const EmergencyAdminScheduleIntegration: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <ScheduleContainer>
      <ScheduleHeader>
        <FlexBox className="column">
          <Heading className="h4 mb-1">
            <Calendar size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            Universal Master Schedule
          </Heading>
          <Text className="body2 secondary">
            Emergency Safe Mode - Integration in Progress
          </Text>
        </FlexBox>
        <StyledButton
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? (
            <SpinnerContainer>
              <Loader2 size={18} />
            </SpinnerContainer>
          ) : (
            <RefreshCw size={18} style={{ marginRight: 8 }} />
          )}
          Refresh
        </StyledButton>
      </ScheduleHeader>

      <FlexBox className="column center py-16">
        <Heading className="h5 mb-4">
          🚧 Universal Master Schedule Under Construction
        </Heading>
        <Text className="body1 secondary mb-8">
          The schedule integration is being finalized. This safe version ensures your site stays online
          while we complete the Redux and WebSocket connections.
        </Text>
        
        <ContentBox className="elevated">
          <Heading className="h6 primary mb-4">
            ✅ What's Working:
          </Heading>
          <Text className="body2 text-left">
            • Backend APIs are operational<br/>
            • Database models are complete<br/>
            • Redux store is configured<br/>
            • Service layer is ready<br/>
            • Admin routing is connected
          </Text>
        </ContentBox>

        <ContentBox className="mt-6">
          <Text className="body2 secondary">
            Full schedule management will be available shortly. Thank you for your patience!
          </Text>
        </ContentBox>
      </FlexBox>
    </ScheduleContainer>
  );
};

export default EmergencyAdminScheduleIntegration;
