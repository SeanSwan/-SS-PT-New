import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Import letter components
import LetterS from './SwanStudiosSVG2/S-svg.component';
import LetterW from './SwanStudiosSVG2/W-svg.component';
import LetterA from './SwanStudiosSVG2/A-svg.component';
import LetterN from './SwanStudiosSVG2/N-svg.component';
import LetterT from './SwanStudiosSVG2/T-svg.component';
import LetterU from './SwanStudiosSVG2/U-svg.component';
import LetterD from './SwanStudiosSVG2/D-svg.component';
import LetterI from './SwanStudiosSVG2/I-svg.component';
import LetterO from './SwanStudiosSVG2/O-svg.component';

// Create shared animated path styles for the neon effect
export const flicker = keyframes`
  0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% {
    opacity: 1;
    filter: drop-shadow(0 0 5px var(--color)) 
            drop-shadow(0 0 15px var(--color)) 
            drop-shadow(0 0 30px var(--color));
  }
  20%, 21.999%, 63%, 63.999%, 65%, 69.999% {
    opacity: 0.6;
    filter: none;
  }
`;

export const glow = keyframes`
  0% {
    filter: drop-shadow(0 0 2px var(--color)) 
            drop-shadow(0 0 5px var(--color));
  }
  50% {
    filter: drop-shadow(0 0 7px var(--color)) 
            drop-shadow(0 0 15px var(--color)) 
            drop-shadow(0 0 25px var(--color));
  }
  100% {
    filter: drop-shadow(0 0 2px var(--color)) 
            drop-shadow(0 0 5px var(--color));
  }
`;

export const AnimatedPath = styled.path`
  fill: ${props => props.fill || 'none'};
  stroke: ${props => props.strokeColor || '#00ffff'};
  stroke-width: 2;
  --color: ${props => props.strokeColor || '#00ffff'};
  animation: ${flicker} 5s infinite alternate, ${glow} 3s infinite;
  transition: all 0.3s ease;
  vector-effect: non-scaling-stroke;
`;

// Container for the entire neon sign
const SignContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: ${props => props.maxWidth || '900px'};
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    flex-direction: column;
    max-width: 90%;
  }
`;

// SVG container to ensure proper scaling
const SVGWrapper = styled.div`
  display: flex;
  width: 100%;
  justify-content: center;
  
  svg {
    height: auto;
    max-width: 100%;
  }
`;

// Sequential lighting animation
const turnOnSequentially = keyframes`
  0% {
    opacity: 0;
    filter: none;
  }
  100% {
    opacity: 1;
    filter: drop-shadow(0 0 7px var(--color)) 
            drop-shadow(0 0 15px var(--color));
  }
`;

// Container for each letter with animation delay
const LetterContainer = styled.div`
  position: relative;
  display: inline-flex;
  margin: 0 -10px; // Adjust letter spacing
  opacity: 0;
  animation: ${turnOnSequentially} 0.3s ease forwards;
  animation-delay: ${props => props.delay || '0s'};
  
  svg {
    width: ${props => props.letterWidth || '80px'};
    height: auto;
    
    @media (max-width: 768px) {
      width: ${props => props.mobileWidth || '50px'};
    }
  }
`;

// Glass tube effect overlay (optional)
const GlassTubeEffect = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0) 70%
  );
  z-index: 2;
  pointer-events: none;
`;

/**
 * SwanStudiosNeonSign Component
 * @param {Object} props - Component props
 * @param {Array} props.colors - Array of colors for the letters
 * @param {string} props.mainColor - Primary color for the neon effect
 * @param {string} props.accentColor - Secondary color for the neon effect
 * @param {string} props.maxWidth - Maximum width of the sign
 * @param {string} props.letterWidth - Width of each letter on desktop
 * @param {string} props.mobileWidth - Width of each letter on mobile
 * @param {boolean} props.animateOnLoad - Whether to animate the sign on load
 * @param {number} props.animationDuration - Duration of the animation in seconds
 * @param {string} props.glowIntensity - Intensity of the glow effect ("low", "medium", "high")
 */
const SwanStudiosNeonSign = ({
  colors = ['#00ffff', '#7851a9'], // Default cyan and purple
  mainColor = '#00ffff',
  accentColor = '#7851a9',
  maxWidth = '900px',
  letterWidth = '80px',
  mobileWidth = '50px',
  animateOnLoad = true,
  animationDuration = 1.5,
  glowIntensity = 'medium',
}) => {
  const [isVisible, setIsVisible] = useState(!animateOnLoad);
  
  // Animation for sign turning on
  useEffect(() => {
    if (animateOnLoad) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [animateOnLoad]);

  // Customize glow intensity
  const getGlowStyle = () => {
    switch (glowIntensity) {
      case 'low':
        return css`
          filter: drop-shadow(0 0 2px var(--color)) 
                  drop-shadow(0 0 5px var(--color));
        `;
      case 'high':
        return css`
          filter: drop-shadow(0 0 10px var(--color)) 
                  drop-shadow(0 0 20px var(--color)) 
                  drop-shadow(0 0 40px var(--color));
        `;
      case 'medium':
      default:
        return css`
          filter: drop-shadow(0 0 5px var(--color)) 
                  drop-shadow(0 0 15px var(--color)) 
                  drop-shadow(0 0 25px var(--color));
        `;
    }
  };

  // Alternate colors between main and accent
  const letterColorList = [
    mainColor, accentColor, mainColor, accentColor, mainColor,
    accentColor, mainColor, accentColor, mainColor, accentColor
  ];

  return (
    <SignContainer maxWidth={maxWidth}>
      <SVGWrapper>
        {/* First part: SWAN */}
        <LetterContainer 
          delay={`${animateOnLoad ? 0.1 : 0}s`} 
          letterWidth={letterWidth}
          mobileWidth={mobileWidth}
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <LetterS colors={[letterColorList[0]]} />
        </LetterContainer>
        
        <LetterContainer 
          delay={`${animateOnLoad ? 0.2 : 0}s`} 
          letterWidth={letterWidth}
          mobileWidth={mobileWidth}
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <LetterW colors={[letterColorList[1]]} />
        </LetterContainer>
        
        <LetterContainer 
          delay={`${animateOnLoad ? 0.3 : 0}s`} 
          letterWidth={letterWidth}
          mobileWidth={mobileWidth}
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <LetterA colors={[letterColorList[2]]} />
        </LetterContainer>
        
        <LetterContainer 
          delay={`${animateOnLoad ? 0.4 : 0}s`} 
          letterWidth={letterWidth}
          mobileWidth={mobileWidth}
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <LetterN colors={[letterColorList[3]]} />
        </LetterContainer>
        
        {/* Second part: STUDIOS */}
        <LetterContainer 
          delay={`${animateOnLoad ? 0.5 : 0}s`} 
          letterWidth={letterWidth}
          mobileWidth={mobileWidth}
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <LetterS colors={[letterColorList[4]]} />
        </LetterContainer>
        
        <LetterContainer 
          delay={`${animateOnLoad ? 0.6 : 0}s`} 
          letterWidth={letterWidth}
          mobileWidth={mobileWidth}
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <LetterT colors={[letterColorList[5]]} />
        </LetterContainer>
        
        <LetterContainer 
          delay={`${animateOnLoad ? 0.7 : 0}s`} 
          letterWidth={letterWidth}
          mobileWidth={mobileWidth}
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <LetterU colors={[letterColorList[6]]} />
        </LetterContainer>
        
        <LetterContainer 
          delay={`${animateOnLoad ? 0.8 : 0}s`} 
          letterWidth={letterWidth}
          mobileWidth={mobileWidth}
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <LetterD colors={[letterColorList[7]]} />
        </LetterContainer>
        
        <LetterContainer 
          delay={`${animateOnLoad ? 0.9 : 0}s`} 
          letterWidth={letterWidth}
          mobileWidth={mobileWidth}
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <LetterI colors={[letterColorList[8]]} />
        </LetterContainer>
        
        <LetterContainer 
          delay={`${animateOnLoad ? 1.0 : 0}s`} 
          letterWidth={letterWidth}
          mobileWidth={mobileWidth}
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <LetterO colors={[letterColorList[9]]} />
        </LetterContainer>
        
        <LetterContainer 
          delay={`${animateOnLoad ? 1.1 : 0}s`} 
          letterWidth={letterWidth}
          mobileWidth={mobileWidth}
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          <LetterS colors={[letterColorList[0]]} />
        </LetterContainer>
      </SVGWrapper>
      
      {/* Glass tube effect overlay */}
      <GlassTubeEffect />
    </SignContainer>
  );
};

export default SwanStudiosNeonSign;