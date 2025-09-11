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

const FlexBox = styled.div<{ 
  $direction?: 'row' | 'column';
  $justify?: 'center' | 'space-between' | 'flex-start' | 'flex-end';
  $align?: 'center' | 'flex-start' | 'flex-end';
  $textAlign?: 'center' | 'left' | 'right';
  $py?: number;
  $mb?: number;
  $mt?: number;
  $p?: number;
  $maxWidth?: number;
  $mx?: string;
}>>`
  display: flex;
  flex-direction: ${({ $direction }) => $direction || 'row'};
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'stretch'};
  text-align: ${({ $textAlign }) => $textAlign || 'inherit'};
  
  ${({ $py }) => $py && `padding-top: ${$py * 0.5}rem; padding-bottom: ${$py * 0.5}rem;`}
  ${({ $mb }) => $mb && `margin-bottom: ${$mb * 0.5}rem;`}
  ${({ $mt }) => $mt && `margin-top: ${$mt * 0.5}rem;`}
  ${({ $p }) => $p && `padding: ${$p * 0.5}rem;`}
  ${({ $maxWidth }) => $maxWidth && `max-width: ${$maxWidth}px;`}
  ${({ $mx }) => $mx === 'auto' && 'margin-left: auto; margin-right: auto;'}
`;

const ContentBox = styled.div<{
  $background?: string;
  $p?: number;
  $borderRadius?: number;
  $maxWidth?: number;
  $mx?: string;
  $mb?: number;
  $mt?: number;
}>>`
  ${({ $background }) => $background && `background: ${$background};`}
  ${({ $p }) => $p && `padding: ${$p * 0.5}rem;`}
  ${({ $borderRadius }) => $borderRadius && `border-radius: ${$borderRadius * 4}px;`}
  ${({ $maxWidth }) => $maxWidth && `max-width: ${$maxWidth}px;`}
  ${({ $mx }) => $mx === 'auto' && 'margin-left: auto; margin-right: auto;'}
  ${({ $mb }) => $mb && `margin-bottom: ${$mb * 0.5}rem;`}
  ${({ $mt }) => $mt && `margin-top: ${$mt * 0.5}rem;`}
`;

// Typography Components
const Heading = styled.h1<{ $variant?: 'h4' | 'h5' | 'h6'; $color?: string; $mb?: number; }>>`
  margin: 0;
  ${({ $mb }) => $mb && `margin-bottom: ${$mb * 0.5}rem;`}
  color: ${({ $color }) => $color || '#ffffff'};
  display: flex;
  align-items: center;
  
  ${({ $variant }) => {
    switch ($variant) {
      case 'h4':
        return 'font-size: 2rem; font-weight: 600;';
      case 'h5':
        return 'font-size: 1.5rem; font-weight: 600;';
      case 'h6':
        return 'font-size: 1.25rem; font-weight: 600;';
      default:
        return 'font-size: 1.5rem; font-weight: 600;';
    }
  }}
`;

const Text = styled.p<{ 
  $variant?: 'body1' | 'body2'; 
  $color?: string; 
  $mb?: number;
  $textAlign?: 'center' | 'left' | 'right';
}>>`
  margin: 0;
  ${({ $mb }) => $mb && `margin-bottom: ${$mb * 0.5}rem;`}
  color: ${({ $color }) => $color || '#ffffff'};
  ${({ $textAlign }) => $textAlign && `text-align: ${$textAlign};`}
  
  ${({ $variant }) => {
    switch ($variant) {
      case 'body1':
        return 'font-size: 1rem; line-height: 1.5;';
      case 'body2':
        return 'font-size: 0.875rem; line-height: 1.4;';
      default:
        return 'font-size: 1rem; line-height: 1.5;';
    }
  }}
`;

// Button Component
const StyledButton = styled.button<{ $disabled?: boolean }>>`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ $disabled }) => $disabled ? 0.6 : 1};
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:hover {
    opacity: ${({ $disabled }) => $disabled ? 0.6 : 0.8};
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
        <FlexBox $direction="column">
          <Heading $variant="h4" $color={theme.text.primary} $mb={1}>
            <Calendar size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            Universal Master Schedule
          </Heading>
          <Text $variant="body2" $color={theme.text.secondary}>
            Emergency Safe Mode - Integration in Progress
          </Text>
        </FlexBox>
        <StyledButton
          onClick={handleRefresh}
          $disabled={loading}
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

      <FlexBox $direction="column" $align="center" $py={16}>
        <Heading $variant="h5" $color={theme.text.primary} $mb={4}>
          🚧 Universal Master Schedule Under Construction
        </Heading>
        <Text $variant="body1" $color={theme.text.secondary} $mb={8}>
          The schedule integration is being finalized. This safe version ensures your site stays online
          while we complete the Redux and WebSocket connections.
        </Text>
        
        <ContentBox 
          $background={theme.background.elevated}
          $p={6}
          $borderRadius={2}
          $maxWidth={600}
          $mx="auto"
        >
          <Heading $variant="h6" $color={theme.primary.main} $mb={4}>
            ✅ What's Working:
          </Heading>
          <Text $variant="body2" $color={theme.text.primary} $textAlign="left">
            • Backend APIs are operational<br/>
            • Database models are complete<br/>
            • Redux store is configured<br/>
            • Service layer is ready<br/>
            • Admin routing is connected
          </Text>
        </ContentBox>

        <ContentBox $mt={6}>
          <Text $variant="body2" $color={theme.text.secondary}>
            Full schedule management will be available shortly. Thank you for your patience!
          </Text>
        </ContentBox>
      </FlexBox>
    </ScheduleContainer>
  );
};

export default EmergencyAdminScheduleIntegration;
