import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Zap, Shield, Target, TrendingUp, ChevronRight, MapPin, Phone, Mail } from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import { cyberpunkPremiumTheme as theme } from './CyberpunkPremiumTheme';

/* ─── Animations ─── */
const scanline = keyframes`
  0% { top: -100%; }
  100% { top: 100%; }
`;

const glitch = keyframes`
  0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
  20% { clip-path: inset(20% 0 60% 0); transform: translate(-3px, 2px); }
  40% { clip-path: inset(50% 0 20% 0); transform: translate(3px, -1px); }
  60% { clip-path: inset(10% 0 70% 0); transform: translate(-2px, 1px); }
  80% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.6), 0 0 80px rgba(0, 255, 255, 0.2); }
`;

const gridMove = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 50px 50px; }
`;

/* ─── Styled Components ─── */
const Hero = styled.section`
  min-height: 100vh;
  background: ${theme.gradients.hero};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 120px 24px 80px;
  position: relative;
  overflow: hidden;
`;

const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: ${gridMove} 8s linear infinite;
  z-index: 0;
`;

const ScanLine = styled.div`
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent);
  opacity: 0.4;
  animation: ${scanline} 4s linear infinite;
  z-index: 1;
`;

const TerminalPrefix = styled.span`
  color: ${theme.colors.primary};
  font-family: 'Rajdhani', monospace;
  font-size: 0.9rem;
  letter-spacing: 2px;
`;

const HeroTitle = styled(motion.h1)`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(2.2rem, 6vw, 4.5rem);
  font-weight: 900;
  color: ${theme.colors.text};
  margin: 16px 0 24px;
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: 2px;
  z-index: 2;
  position: relative;

  &:hover {
    animation: ${glitch} 0.3s ease-in-out;
  }
`;

const CyanText = styled.span`
  color: ${theme.colors.primary};
  text-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
`;

const MagentaText = styled.span`
  color: ${theme.colors.secondary};
  text-shadow: 0 0 30px rgba(255, 0, 255, 0.5);
`;

const HeroSubtitle = styled(motion.p)`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.2rem);
  color: ${theme.colors.textSecondary};
  max-width: 600px;
  margin: 0 0 40px;
  line-height: 1.6;
  z-index: 2;
`;

const NeonButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 40px;
  background: transparent;
  color: ${theme.colors.primary};
  border: 2px solid ${theme.colors.primary};
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 3px;
  cursor: pointer;
  transition: all 0.3s;
  animation: ${pulse} 3s ease-in-out infinite;
  min-height: 52px;
  z-index: 2;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.1), transparent);
    transition: left 0.5s;
  }

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    box-shadow: 0 0 40px rgba(0, 255, 255, 0.4), inset 0 0 40px rgba(0, 255, 255, 0.05);
    &::before { left: 100%; }
  }
`;

/* ─── Programs Section ─── */
const Section = styled.section<{ $bg?: string }>`
  padding: 80px 24px;
  background: ${({ $bg }) => $bg || theme.colors.background};
  position: relative;

  @media (min-width: 768px) {
    padding: 120px 40px;
  }
`;

const SectionInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionLabel = styled.p`
  font-family: '${theme.fonts.body}', monospace;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: ${theme.colors.primary};
  margin: 0 0 8px;
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 800;
  color: ${theme.colors.text};
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0 0 48px;
`;

const ProgramGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const HoloCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: ${theme.borderRadius};
  padding: 32px 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  backdrop-filter: blur(8px);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary});
  }

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.1);
    transform: translateY(-4px);
  }
`;

const CardIcon = styled.div`
  width: 56px;
  height: 56px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: ${theme.borderRadius};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: ${theme.colors.primary};
`;

const CardTitle = styled.h3`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${theme.colors.text};
  margin: 0 0 8px;
`;

const CardDesc = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.9rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.5;
  margin: 0;
`;

/* ─── Stats Section ─── */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatPanel = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid rgba(0, 255, 255, 0.1);
  border-radius: ${theme.borderRadius};
  padding: 24px;
  text-align: center;
  backdrop-filter: blur(8px);
`;

const StatNumber = styled.div`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 2.5rem;
  font-weight: 900;
  color: ${theme.colors.primary};
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
`;

const StatLabel = styled.div`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.875rem;
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 4px;
`;

/* ─── CTA ─── */
const CTASection = styled.section`
  padding: 100px 24px;
  background: ${theme.gradients.hero};
  text-align: center;
  position: relative;
  overflow: hidden;
`;

const CTATitle = styled.h2`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(1.8rem, 5vw, 3rem);
  font-weight: 900;
  color: ${theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 3px;
  margin: 0 0 16px;
`;

const CTASubtext = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1.05rem;
  color: ${theme.colors.textSecondary};
  max-width: 500px;
  margin: 0 auto 32px;
`;

/* ─── Footer ─── */
const Footer = styled.footer`
  padding: 48px 24px;
  background: #050508;
  border-top: 1px solid rgba(0, 255, 255, 0.1);
`;

const FooterInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr 1fr;
  }
`;

const FooterBrand = styled.div`
  h3 {
    font-family: '${theme.fonts.display}', sans-serif;
    font-size: 1.3rem;
    color: ${theme.colors.primary};
    text-transform: uppercase;
    letter-spacing: 3px;
    margin: 0 0 8px;
  }
  p {
    font-size: 0.9rem;
    color: ${theme.colors.textSecondary};
    line-height: 1.6;
  }
`;

const FooterCol = styled.div`
  h4 {
    font-family: '${theme.fonts.display}', sans-serif;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: ${theme.colors.secondary};
    margin: 0 0 16px;
  }
  a {
    display: block;
    color: ${theme.colors.textSecondary};
    text-decoration: none;
    font-family: '${theme.fonts.body}', sans-serif;
    font-size: 0.9rem;
    margin-bottom: 8px;
    transition: color 0.2s;
    &:hover { color: ${theme.colors.primary}; }
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: ${theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const Copyright = styled.div`
  text-align: center;
  padding-top: 32px;
  margin-top: 32px;
  border-top: 1px solid rgba(0, 255, 255, 0.05);
  font-size: 0.8125rem;
  color: ${theme.colors.textSecondary};
  font-family: '${theme.fonts.body}', monospace;
  letter-spacing: 2px;
`;

/* ─── Component ─── */
const CyberpunkPremiumHomepage: React.FC = () => {
  const navigate = useNavigate();

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: 0.5 },
  };

  return (
    <ConceptWrapper theme={theme}>
      {/* ─── Hero ─── */}
      <Hero>
        <GridOverlay aria-hidden="true" />
        <ScanLine aria-hidden="true" />
        <TerminalPrefix>{'>'} SYSTEM_UPGRADE_AVAILABLE</TerminalPrefix>
        <HeroTitle {...fadeUp}>
          <CyanText>Upgrade</CyanText> Your<br />
          <MagentaText>Operating System</MagentaText>
        </HeroTitle>
        <HeroSubtitle {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
          Your body is the most advanced machine you'll ever operate.
          It's time for a firmware update. Elite coaching. Data-driven results. Zero excuses.
        </HeroSubtitle>
        <NeonButton
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.4 }}
          onClick={() => navigate('/store')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Initialize <ChevronRight size={18} />
        </NeonButton>
      </Hero>

      {/* ─── Programs ─── */}
      <Section>
        <SectionInner>
          <SectionLabel>// MODULES</SectionLabel>
          <SectionTitle>Select Your <CyanText>Protocol</CyanText></SectionTitle>
          <ProgramGrid>
            <HoloCard {...fadeUp}>
              <CardIcon><Zap size={24} /></CardIcon>
              <CardTitle>Power.exe</CardTitle>
              <CardDesc>
                Maximum strength output. Progressive overload protocols optimized for peak performance.
              </CardDesc>
            </HoloCard>
            <HoloCard {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
              <CardIcon><Shield size={24} /></CardIcon>
              <CardTitle>Armor.sys</CardTitle>
              <CardDesc>
                Bulletproof your body. Injury prevention, mobility enhancement, structural integrity.
              </CardDesc>
            </HoloCard>
            <HoloCard {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
              <CardIcon><Target size={24} /></CardIcon>
              <CardTitle>Focus.dll</CardTitle>
              <CardDesc>
                Mind-muscle connection training. Precision movements, perfect form, zero wasted reps.
              </CardDesc>
            </HoloCard>
            <HoloCard {...fadeUp} transition={{ duration: 0.5, delay: 0.3 }}>
              <CardIcon><TrendingUp size={24} /></CardIcon>
              <CardTitle>Evolve.bat</CardTitle>
              <CardDesc>
                Continuous adaptation. Your program evolves as you do. AI-tracked progression.
              </CardDesc>
            </HoloCard>
          </ProgramGrid>
        </SectionInner>
      </Section>

      {/* ─── Stats ─── */}
      <Section $bg="rgba(10, 10, 20, 0.95)">
        <SectionInner>
          <SectionLabel>// SYSTEM_METRICS</SectionLabel>
          <SectionTitle>Performance <MagentaText>Data</MagentaText></SectionTitle>
          <StatsGrid>
            <StatPanel {...fadeUp}>
              <StatNumber>500+</StatNumber>
              <StatLabel>Systems Upgraded</StatLabel>
            </StatPanel>
            <StatPanel {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
              <StatNumber>98%</StatNumber>
              <StatLabel>Success Rate</StatLabel>
            </StatPanel>
            <StatPanel {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
              <StatNumber>15+</StatNumber>
              <StatLabel>Years Online</StatLabel>
            </StatPanel>
            <StatPanel {...fadeUp} transition={{ duration: 0.5, delay: 0.3 }}>
              <StatNumber>24/7</StatNumber>
              <StatLabel>Support Active</StatLabel>
            </StatPanel>
          </StatsGrid>
        </SectionInner>
      </Section>

      {/* ─── CTA ─── */}
      <CTASection>
        <GridOverlay aria-hidden="true" />
        <motion.div {...fadeUp}>
          <SectionLabel>{'>'} EXECUTE</SectionLabel>
          <CTATitle>Ready to <CyanText>Reboot</CyanText>?</CTATitle>
          <CTASubtext>
            Stop running outdated software. Your next-gen physique is one command away.
          </CTASubtext>
          <NeonButton
            onClick={() => navigate('/store')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Run upgrade.exe <ChevronRight size={18} />
          </NeonButton>
        </motion.div>
      </CTASection>

      {/* ─── Footer ─── */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <h3>SwanStudios</h3>
            <p>Elite performance engineering for the human machine. Based in Anaheim Hills, CA.</p>
          </FooterBrand>
          <FooterCol>
            <h4>Navigate</h4>
            <Link to="/">Home</Link>
            <Link to="/store">Store</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </FooterCol>
          <FooterCol>
            <h4>Connect</h4>
            <ContactItem><MapPin size={14} /> Anaheim Hills, CA</ContactItem>
            <ContactItem><Phone size={14} /> (714) 947-3221</ContactItem>
            <ContactItem><Mail size={14} /> loveswanstudios@protonmail.com</ContactItem>
          </FooterCol>
        </FooterInner>
        <Copyright>// 2026 SWANSTUDIOS — ALL RIGHTS RESERVED</Copyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default CyberpunkPremiumHomepage;
