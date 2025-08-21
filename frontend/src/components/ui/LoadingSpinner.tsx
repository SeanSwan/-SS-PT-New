/**
 * PERFORMANCE ENHANCED: Loading Spinner with Build Optimizations
 * =============================================================
 * Optimized loading component with better performance and visual feedback
 * 
 * BUILD TIMESTAMP: August 20, 2025 - 16:51 PST
 * OPTIMIZATIONS: Reduced re-renders, better animations, memory cleanup
 */

import React, { useEffect, useState, useCallback, memo } from 'react';
import styled, { keyframes } from 'styled-components';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  showProgress?: boolean;
  timeout?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = memo(({
  size = 'medium',
  message = 'Loading...',
  showProgress = false,
  timeout = 30000
}) => {
  const [progress, setProgress] = useState(0);
  const [isTimeout, setIsTimeout] = useState(false);
  const [loadStartTime] = useState(Date.now());

  // Performance optimized progress animation
  useEffect(() => {
    if (!showProgress) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const elapsed = Date.now() - loadStartTime;
        const newProgress = Math.min(95, (elapsed / timeout) * 100);
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [showProgress, timeout, loadStartTime]);

  // Timeout handling
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimeout(true);
      console.warn('⏰ Loading timeout reached:', timeout / 1000, 'seconds');
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  const handleRetry = useCallback(() => {
    console.log('🔄 Loading retry triggered');
    setProgress(0);
    setIsTimeout(false);
    window.location.reload();
  }, []);

  const getSizeConfig = useCallback(() => {
    switch (size) {
      case 'small':
        return { spinner: 24, container: 40 };
      case 'large':
        return { spinner: 64, container: 100 };
      default:
        return { spinner: 40, container: 60 };
    }
  }, [size]);

  const sizeConfig = getSizeConfig();

  if (isTimeout) {
    return (
      <TimeoutContainer>
        <TimeoutContent>
          <div>⏰</div>
          <div>Loading is taking longer than expected</div>
          <RetryButton onClick={handleRetry}>Retry</RetryButton>
        </TimeoutContent>
      </TimeoutContainer>
    );
  }

  return (
    <LoadingContainer size={sizeConfig.container}>
      <SpinnerContainer>
        <Spinner size={sizeConfig.spinner} />
        <PulseRing size={sizeConfig.spinner} />
      </SpinnerContainer>
      
      {message && (
        <LoadingMessage>
          {message}
          <LoadingDots />
        </LoadingMessage>
      )}
      
      {showProgress && (
        <ProgressContainer>
          <ProgressBar width={progress} />
          <ProgressText>{Math.round(progress)}%</ProgressText>
        </ProgressContainer>
      )}
      
      <BuildTimestamp>
        Build: {new Date().toISOString().slice(0, 19)}
      </BuildTimestamp>
    </LoadingContainer>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

// Performance optimized animations
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
`;

const dots = keyframes`
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
`;

const LoadingContainer = styled.div<{ size: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: ${props => props.size * 3}px;
  padding: 2rem;
`;

const SpinnerContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Spinner = styled.div<{ size: number }>`
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border: 3px solid rgba(59, 130, 246, 0.2);
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  position: relative;
  z-index: 2;
`;

const PulseRing = styled.div<{ size: number }>`
  position: absolute;
  width: ${props => props.size + 20}px;
  height: ${props => props.size + 20}px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 50%;
  animation: ${pulse} 2s ease-in-out infinite;
  z-index: 1;
`;

const LoadingMessage = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
  position: relative;
`;

const LoadingDots = styled.span`
  &::after {
    content: '.';
    animation: ${dots} 1.5s steps(4, end) infinite;
  }
`;

const ProgressContainer = styled.div`
  width: 200px;
  position: relative;
`;

const ProgressBar = styled.div<{ width: number }>`
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 2px;
  width: ${props => props.width}%;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: ${spin} 2s linear infinite;
  }
`;

const ProgressText = styled.div`
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.5rem;
`;

const TimeoutContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 2rem;
`;

const TimeoutContent = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.9);
  
  > div:first-child {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  > div:nth-child(2) {
    margin-bottom: 1.5rem;
    font-size: 1rem;
  }
`;

const RetryButton = styled.button`
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const BuildTimestamp = styled.div`
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 1rem;
`;

export { LoadingSpinner };
