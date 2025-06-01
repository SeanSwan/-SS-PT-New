/**
 * Clean ProfileContainer Fix for UserDashboard.tsx
 * This file contains the corrected ProfileContainer styled component
 */

const ProfileContainer = styled(motion.div).withConfig({
  shouldForwardProp: (prop) => ![
    'whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition', 
    'performanceLevel', 'enableLuxury', 'devicePerformance'
  ].includes(prop as string)
})<{ performanceLevel?: string }>`
  min-height: 100vh;
  background: ${({ theme }) => theme.background.primary};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 80%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(120, 81, 169, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(255, 215, 0, 0.05) 0%, transparent 50%);
    animation: ${({ performanceLevel }) => {
      if (performanceLevel === 'weak') return 'none';
      if (performanceLevel === 'medium') return css`${simpleFade} 6s ease-in-out infinite`;
      return css`${nebulaPulse} 8s ease-in-out infinite`;
    }};
    pointer-events: none;
    z-index: 0;
    
    /* Respect system reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
  
  /* Performance-based styles */
  body.perf-weak &::before {
    animation: none;
    background: ${({ theme }) => theme.background.secondary};
  }
  
  body.perf-medium &::before {
    animation: ${simpleFade} 6s ease-in-out infinite;
  }
`;
