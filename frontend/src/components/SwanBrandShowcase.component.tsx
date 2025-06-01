/**
 * SwanBrandShowcase.component.tsx
 * =================================
 * 
 * Example component demonstrating the Galaxy-Swan theme integration
 * Showcases how Swan brand elements blend seamlessly with Galaxy aesthetics
 * 
 * This component serves as:
 * - Implementation reference for other developers
 * - Visual demonstration of the theme capabilities
 * - Testing ground for theme consistency
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// Import the new Galaxy-Swan theme system
import { galaxySwanTheme, mediaQueries } from '../styles/galaxy-swan-theme';
import { 
  SwanContainer, 
  SwanHeading, 
  GalaxySwanText,
  ThemedGlowButton as SwanButton, // Use ThemedGlowButton as SwanButton
  SwanCard,
  responsiveAnimation,
  accessibleHover
} from '../styles/swan-theme-utils.tsx';

// === SHOWCASE-SPECIFIC STYLED COMPONENTS ===

const ShowcaseWrapper = styled.div`
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(
    135deg, 
    ${galaxySwanTheme.background.primary} 0%,
    ${galaxySwanTheme.background.secondary} 50%,
    ${galaxySwanTheme.galaxy.stardust} 100%
  );
  
  ${mediaQueries.mobile} {
    padding: 1rem;
  }
`;

const ShowcaseHeader = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  
  ${mediaQueries.mobile} {
    margin-bottom: 2rem;
  }
`;

const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  
  ${mediaQueries.mobile} {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const ColorPalette = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
`;

const ColorSwatch = styled.div<{ color: string; label: string }>`
  height: 80px;
  background: ${props => props.color};
  border-radius: 8px;
  border: 2px solid ${galaxySwanTheme.borders.elegant};
  position: relative;
  display: flex;
  align-items: flex-end;
  
  ${accessibleHover(`
    transform: translateY(-4px);
    box-shadow: ${galaxySwanTheme.shadows.swanGlow};
  `)}
  
  &::after {
    content: '${props => props.label}';
    position: absolute;
    bottom: 0.5rem;
    left: 0.5rem;
    font-size: 0.75rem;
    color: ${galaxySwanTheme.text.primary};
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    font-weight: 600;
  }
`;

const DemoSection = styled(motion.div)`
  background: ${galaxySwanTheme.background.overlay};
  border: ${galaxySwanTheme.borders.elegant};
  border-radius: 15px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  
  ${mediaQueries.mobile} {
    padding: 1.5rem;
  }
`;

const InteractiveDemo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  margin: 1.5rem 0;
`;

const GradientShowcase = styled.div<{ gradient: string }>`
  height: 100px;
  background: ${props => props.gradient};
  border-radius: 10px;
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1rem 0;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 10px;
    background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
    background-size: 200% 200%;
    ${responsiveAnimation('background-position 3s ease-in-out infinite')}
    background-position: -100% -100%;
    
    &:hover {
      background-position: 100% 100%;
    }
  }
  
  span {
    position: relative;
    z-index: 1;
    color: ${galaxySwanTheme.text.primary};
    font-weight: 600;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
  }
`;

const AnimationExample = styled(motion.div)`
  width: 60px;
  height: 60px;
  background: ${galaxySwanTheme.gradients.swanCosmic};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${galaxySwanTheme.text.primary};
  font-weight: bold;
  border: 2px solid ${galaxySwanTheme.swan.cyan};
  cursor: pointer;
`;

// === ANIMATION VARIANTS ===
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

const floatAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

// === MAIN COMPONENT ===
const SwanBrandShowcase: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<'colors' | 'gradients' | 'animations'>('colors');
  const [animationActive, setAnimationActive] = useState(false);

  const swanColors = [
    { color: galaxySwanTheme.swan.pure, label: 'Pure' },
    { color: galaxySwanTheme.swan.silver, label: 'Silver' },
    { color: galaxySwanTheme.swan.blue, label: 'Blue' },
    { color: galaxySwanTheme.swan.cyan, label: 'Cyan' },
    { color: galaxySwanTheme.swan.gold, label: 'Gold' }
  ];

  const galaxyColors = [
    { color: galaxySwanTheme.galaxy.cosmic, label: 'Cosmic' },
    { color: galaxySwanTheme.galaxy.nebula, label: 'Nebula' },
    { color: galaxySwanTheme.galaxy.stardust, label: 'Stardust' },
    { color: galaxySwanTheme.galaxy.starlight, label: 'Starlight' },
    { color: galaxySwanTheme.galaxy.pink, label: 'Pink' }
  ];

  const gradientExamples = [
    { name: 'Swan Cosmic', gradient: galaxySwanTheme.gradients.swanCosmic },
    { name: 'Pearl Nebula', gradient: galaxySwanTheme.gradients.pearlNebula },
    { name: 'Silver Stardust', gradient: galaxySwanTheme.gradients.silverStardust },
    { name: 'Cosmic Swan', gradient: galaxySwanTheme.gradients.cosmicSwan }
  ];

  return (
    <ShowcaseWrapper>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <ShowcaseHeader>
          <SwanHeading level={1}>
            <GalaxySwanText>Galaxy-Swan</GalaxySwanText> Theme Showcase
          </SwanHeading>
          <p style={{ 
            color: galaxySwanTheme.text.secondary, 
            fontSize: '1.2rem',
            marginBottom: '2rem'
          }}>
            Demonstrating the elegant fusion of Swan brand identity with Galaxy cosmic aesthetics
          </p>
        </ShowcaseHeader>

        <ThemeGrid>
          {/* Color Palette Demo */}
          <motion.div variants={itemVariants}>
            <DemoSection>
              <h3 style={{ color: galaxySwanTheme.swan.cyan, marginBottom: '1rem' }}>
                🦢 Swan Brand Colors
              </h3>
              <ColorPalette>
                {swanColors.map((color, index) => (
                  <ColorSwatch 
                    key={index}
                    color={color.color}
                    label={color.label}
                  />
                ))}
              </ColorPalette>
              
              <h3 style={{ color: galaxySwanTheme.galaxy.nebula, marginBottom: '1rem', marginTop: '2rem' }}>
                🌌 Galaxy Cosmic Colors
              </h3>
              <ColorPalette>
                {galaxyColors.map((color, index) => (
                  <ColorSwatch 
                    key={index}
                    color={color.color}
                    label={color.label}
                  />
                ))}
              </ColorPalette>
            </DemoSection>
          </motion.div>

          {/* Gradient Showcase */}
          <motion.div variants={itemVariants}>
            <DemoSection>
              <h3 style={{ color: galaxySwanTheme.swan.gold, marginBottom: '1rem' }}>
                ✨ Signature Gradients
              </h3>
              {gradientExamples.map((example, index) => (
                <GradientShowcase key={index} gradient={example.gradient}>
                  <span>{example.name}</span>
                </GradientShowcase>
              ))}
            </DemoSection>
          </motion.div>

          {/* Interactive Components */}
          <motion.div variants={itemVariants}>
            <DemoSection>
              <h3 style={{ color: galaxySwanTheme.swan.cyan, marginBottom: '1rem' }}>
                🎛️ Interactive Components
              </h3>
              
              <InteractiveDemo>
                <SwanButton 
                  variant="primary" 
                  size="large"
                  text="Toggle Animation Demo"
                  onClick={() => setAnimationActive(!animationActive)}
                />
                
                <AnimatePresence>
                  {animationActive && (
                    <AnimationExample
                      initial={{ scale: 0, rotate: 0 }}
                      animate={{ 
                        scale: 1, 
                        rotate: 360,
                        ...floatAnimation
                      }}
                      exit={{ scale: 0, rotate: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      🦢
                    </AnimationExample>
                  )}
                </AnimatePresence>

                <SwanCard interactive>
                  <h4 style={{ color: galaxySwanTheme.text.primary, marginBottom: '0.5rem' }}>
                    Interactive Card
                  </h4>
                  <p style={{ color: galaxySwanTheme.text.secondary, fontSize: '0.9rem' }}>
                    Hover or tap to see the Galaxy-Swan hover effects in action. 
                    Notice how the elegant Swan styling combines with cosmic Galaxy energy.
                  </p>
                </SwanCard>
              </InteractiveDemo>
            </DemoSection>
          </motion.div>

          {/* Typography Demo */}
          <motion.div variants={itemVariants}>
            <DemoSection>
              <h3 style={{ color: galaxySwanTheme.galaxy.pink, marginBottom: '1rem' }}>
                📝 Typography & Text Effects
              </h3>
              
              <div style={{ textAlign: 'center' }}>
                <SwanHeading level={2}>
                  Elegant <GalaxySwanText>Cosmic</GalaxySwanText> Headlines
                </SwanHeading>
                
                <p style={{ 
                  color: galaxySwanTheme.text.primary,
                  fontSize: '1.1rem',
                  lineHeight: '1.6',
                  marginBottom: '1rem'
                }}>
                  The Galaxy-Swan theme creates a sophisticated visual hierarchy that enhances readability while maintaining the platform's cosmic energy.
                </p>
                
                <p style={{ 
                  color: galaxySwanTheme.text.secondary,
                  fontSize: '1rem',
                  fontStyle: 'italic'
                }}>
                  Secondary text maintains elegance with subtle Galaxy accents, ensuring perfect balance between Swan refinement and cosmic wonder.
                </p>
              </div>
            </DemoSection>
          </motion.div>

          {/* Performance & Accessibility */}
          <motion.div variants={itemVariants}>
            <DemoSection>
              <h3 style={{ color: galaxySwanTheme.swan.sage, marginBottom: '1rem' }}>
                ♿ Accessibility & Performance
              </h3>
              
              <div style={{ color: galaxySwanTheme.text.secondary, lineHeight: '1.6' }}>
                <p style={{ marginBottom: '1rem' }}>
                  ✅ <strong>Motion Sensitivity</strong>: Respects `prefers-reduced-motion`
                </p>
                <p style={{ marginBottom: '1rem' }}>
                  ✅ <strong>High Contrast</strong>: Enhanced visibility for visual impairments
                </p>
                <p style={{ marginBottom: '1rem' }}>
                  ✅ <strong>Performance Tiers</strong>: Optimized for all device capabilities
                </p>
                <p style={{ marginBottom: '1rem' }}>
                  ✅ <strong>Touch Friendly</strong>: Accessible interactions on all devices
                </p>
              </div>
            </DemoSection>
          </motion.div>

          {/* Implementation Example */}
          <motion.div variants={itemVariants}>
            <DemoSection>
              <h3 style={{ color: galaxySwanTheme.swan.rose, marginBottom: '1rem' }}>
                💻 Implementation Example
              </h3>
              
              <div style={{ 
                background: galaxySwanTheme.background.primary,
                border: `1px solid ${galaxySwanTheme.borders.subtle}`,
                borderRadius: '8px',
                padding: '1rem',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: galaxySwanTheme.text.primary,
                overflow: 'auto'
              }}>
                <div style={{ color: galaxySwanTheme.swan.cyan }}>
                  {`// Import the Galaxy-Swan theme`}
                </div>
                <div style={{ color: galaxySwanTheme.text.secondary }}>
                  {`import { galaxySwanTheme } from './styles/galaxy-swan-theme';`}
                </div>
                <br />
                <div style={{ color: galaxySwanTheme.swan.cyan }}>
                  {`// Use in styled components`}
                </div>
                <div style={{ color: galaxySwanTheme.text.secondary }}>
                  {`const StyledComponent = styled.div\``}
                </div>
                <div style={{ color: galaxySwanTheme.galaxy.starlight, paddingLeft: '1rem' }}>
                  {`background: \${galaxySwanTheme.gradients.swanCosmic};`}
                </div>
                <div style={{ color: galaxySwanTheme.galaxy.starlight, paddingLeft: '1rem' }}>
                  {`border: \${galaxySwanTheme.borders.elegant};`}
                </div>
                <div style={{ color: galaxySwanTheme.text.secondary }}>
                  {`\`;`}
                </div>
              </div>
            </DemoSection>
          </motion.div>
        </ThemeGrid>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <SwanButton 
            variant="primary" 
            size="large"
            text="📚 View Full Documentation"
            onClick={() => window.open('/GALAXY-SWAN-THEME-DOCS.md', '_blank')}
          />
        </div>
      </motion.div>
    </ShowcaseWrapper>
  );
};

export default SwanBrandShowcase;