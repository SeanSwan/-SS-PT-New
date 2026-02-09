import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Flame, Disc, Radio, Zap, ChevronRight, MapPin, Phone, Mail } from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import { cyberpunkPremiumV2Theme as theme } from './CyberpunkPremiumV2Theme';

/* ─── Keyframe Animations ─── */
const retroSun = keyframes`
  0%, 100% {
    box-shadow: 0 0 60px rgba(255,110,199,0.4), 0 0 120px rgba(255,179,71,0.2);
  }
  50% {
    box-shadow: 0 0 80px rgba(255,110,199,0.6), 0 0 160px rgba(255,179,71,0.35),
                0 0 240px rgba(255,110,199,0.15);
  }
`;

const chromeShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const scanlines = keyframes`
  0% { top: -10%; }
  100% { top: 110%; }
`;

/* ─── Hero ─── */
const Hero = styled.section`
  min-height: 100vh;
  background: ${theme.gradients.hero};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 120px 24px 100px;
  position: relative;
  overflow: hidden;
`;

const RetroSunOrb = styled.div`
  position: absolute;
  top: 18%;
  left: 50%;
  transform: translateX(-50%);
  width: clamp(180px, 30vw, 320px);
  height: clamp(180px, 30vw, 320px);
  border-radius: 50%;
  background: radial-gradient(circle, ${theme.colors.secondary} 0%, ${theme.colors.primary} 60%, transparent 70%);
  animation: ${retroSun} 4s ease-in-out infinite;
  z-index: 0;
  opacity: 0.7;
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: repeating-linear-gradient(
      0deg, transparent 0px, transparent 6px,
      rgba(26,10,46,0.35) 6px, rgba(26,10,46,0.35) 8px
    );
  }
`;

const MountainSilhouette = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 20%;
  z-index: 1;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: -5%;
    width: 55%;
    height: 100%;
    background: ${theme.colors.background};
    clip-path: polygon(0% 100%, 50% 15%, 100% 100%);
  }
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: -10%;
    width: 65%;
    height: 100%;
    background: ${theme.colors.background};
    clip-path: polygon(0% 100%, 40% 5%, 75% 55%, 100% 25%, 100% 100%);
  }
`;

const ScanLineOverlay = styled.div`
  position: absolute;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(255,110,199,0.25), transparent);
  opacity: 0.6;
  animation: ${scanlines} 5s linear infinite;
  z-index: 2;
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const TrackLabel = styled.span`
  font-family: '${theme.fonts.body}', monospace;
  font-size: 0.85rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${theme.colors.secondary};
`;

const HeroTitle = styled(motion.h1)`
  font-family: '${theme.fonts.display}', monospace;
  font-size: clamp(1.2rem, 4vw, 2.2rem);
  color: ${theme.colors.text};
  margin: 20px 0 16px;
  line-height: 1.5;
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const PinkText = styled.span`
  color: ${theme.colors.primary};
  text-shadow: 0 0 25px rgba(255,110,199,0.5);
`;

const OrangeText = styled.span`
  color: ${theme.colors.secondary};
  text-shadow: 0 0 25px rgba(255,179,71,0.5);
`;

const HeroSubtitle = styled(motion.p)`
  font-family: '${theme.fonts.body}', monospace;
  font-size: clamp(0.9rem, 1.8vw, 1.1rem);
  color: ${theme.colors.textSecondary};
  max-width: 560px;
  margin: 0 0 40px;
  line-height: 1.7;
`;

const SunsetButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 40px;
  background: ${theme.gradients.cta};
  background-size: 200% 200%;
  color: ${theme.colors.textOnPrimary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.display}', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 3px;
  cursor: pointer;
  min-height: 52px;
  position: relative;
  overflow: hidden;
  animation: ${chromeShift} 6s ease-in-out infinite;
  transition: box-shadow 0.3s;
  &:hover {
    box-shadow: 0 0 30px rgba(255,110,199,0.4), 0 0 60px rgba(255,179,71,0.2);
  }
`;

/* ─── Shared Section ─── */
const Section = styled.section<{ $bg?: string }>`
  padding: 80px 24px;
  background: ${({ $bg }) => $bg || theme.colors.background};
  position: relative;
  @media (min-width: 768px) { padding: 120px 40px; }
`;

const SectionInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionLabel = styled.p`
  font-family: '${theme.fonts.body}', monospace;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: ${theme.colors.primary};
  margin: 0 0 8px;
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-family: '${theme.fonts.display}', monospace;
  font-size: clamp(0.9rem, 2.5vw, 1.3rem);
  color: ${theme.colors.text};
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0 0 48px;
  line-height: 1.6;
`;

/* ─── Programs ─── */
const ProgramGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  @media (min-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); }
`;

const CassetteCard = styled(motion.div)`
  background: ${theme.gradients.card};
  background-color: ${theme.colors.surface};
  border: 1px solid rgba(255,110,199,0.12);
  border-radius: ${theme.borderRadius};
  padding: 32px 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(8px);
  transition: all 0.3s;
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: ${theme.gradients.cta};
  }
  &:hover {
    border-color: rgba(255,110,199,0.35);
    box-shadow: 0 4px 32px rgba(255,110,199,0.12);
    transform: translateY(-4px);
  }
`;

const CardIcon = styled.div`
  width: 56px;
  height: 56px;
  border: 1px solid rgba(255,110,199,0.25);
  border-radius: ${theme.borderRadius};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: ${theme.colors.primary};
`;

const CardTitle = styled.h3`
  font-family: '${theme.fonts.display}', monospace;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${theme.colors.text};
  margin: 0 0 10px;
  line-height: 1.5;
`;

const CardDesc = styled.p`
  font-family: '${theme.fonts.body}', monospace;
  font-size: 0.88rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

/* ─── Stats ─── */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  @media (min-width: 768px) { grid-template-columns: repeat(4, 1fr); }
`;

const StatPanel = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid rgba(255,110,199,0.1);
  border-radius: ${theme.borderRadius};
  padding: 28px 16px;
  text-align: center;
  backdrop-filter: blur(8px);
`;

const StatNumber = styled.div`
  font-family: '${theme.fonts.display}', monospace;
  font-size: clamp(1.1rem, 3vw, 1.6rem);
  color: ${theme.colors.primary};
  text-shadow: 0 0 20px rgba(255,110,199,0.35);
  line-height: 1.3;
`;

const StatLabel = styled.div`
  font-family: '${theme.fonts.body}', monospace;
  font-size: 0.8rem;
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 8px;
`;

/* ─── CTA ─── */
const CTASection = styled.section`
  padding: 100px 24px;
  background: ${theme.gradients.cta};
  text-align: center;
  position: relative;
  overflow: hidden;
`;

const CTAOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg, transparent 0px, transparent 3px,
    rgba(26,10,46,0.06) 3px, rgba(26,10,46,0.06) 4px
  );
`;

const CTAContent = styled.div`
  position: relative;
  z-index: 1;
`;

const CTATitle = styled.h2`
  font-family: '${theme.fonts.display}', monospace;
  font-size: clamp(0.9rem, 2.5vw, 1.3rem);
  color: ${theme.colors.textOnPrimary};
  text-transform: uppercase;
  letter-spacing: 3px;
  margin: 0 0 16px;
  line-height: 1.6;
`;

const CTASubtext = styled.p`
  font-family: '${theme.fonts.body}', monospace;
  font-size: 1rem;
  color: rgba(26,10,46,0.75);
  max-width: 480px;
  margin: 0 auto 32px;
  line-height: 1.6;
`;

const CTAButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 40px;
  background: ${theme.colors.background};
  color: ${theme.colors.primary};
  border: 2px solid ${theme.colors.background};
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.display}', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 3px;
  cursor: pointer;
  min-height: 52px;
  transition: all 0.3s;
  &:hover {
    background: transparent;
    color: ${theme.colors.textOnPrimary};
    border-color: ${theme.colors.textOnPrimary};
    box-shadow: 0 0 30px rgba(26,10,46,0.25);
  }
`;

/* ─── Footer ─── */
const Footer = styled.footer`
  padding: 48px 24px;
  background: #0E0618;
  border-top: 1px solid rgba(255,110,199,0.1);
`;

const FooterInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  @media (min-width: 768px) { grid-template-columns: 2fr 1fr 1fr; }
`;

const FooterBrand = styled.div`
  h3 {
    font-family: '${theme.fonts.display}', monospace;
    font-size: 0.85rem;
    color: ${theme.colors.primary};
    text-transform: uppercase;
    letter-spacing: 3px;
    margin: 0 0 12px;
    line-height: 1.5;
  }
  p {
    font-family: '${theme.fonts.body}', monospace;
    font-size: 0.88rem;
    color: ${theme.colors.textSecondary};
    line-height: 1.7;
    margin: 0;
  }
`;

const FooterCol = styled.div`
  h4 {
    font-family: '${theme.fonts.display}', monospace;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: ${theme.colors.secondary};
    margin: 0 0 16px;
    line-height: 1.5;
  }
  a {
    display: block;
    color: ${theme.colors.textSecondary};
    text-decoration: none;
    font-family: '${theme.fonts.body}', monospace;
    font-size: 0.88rem;
    margin-bottom: 8px;
    transition: color 0.2s;
    &:hover { color: ${theme.colors.primary}; }
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: '${theme.fonts.body}', monospace;
  font-size: 0.82rem;
  color: ${theme.colors.textSecondary};
  margin-bottom: 10px;
`;

const Copyright = styled.div`
  text-align: center;
  padding-top: 32px;
  margin-top: 32px;
  border-top: 1px solid rgba(255,110,199,0.06);
  font-size: 0.7rem;
  color: ${theme.colors.textSecondary};
  font-family: '${theme.fonts.display}', monospace;
  letter-spacing: 2px;
  line-height: 1.6;
`;

/* ─── Component ─── */
const CyberpunkPremiumV2Homepage: React.FC = () => {
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
        <RetroSunOrb aria-hidden="true" />
        <MountainSilhouette aria-hidden="true" />
        <ScanLineOverlay aria-hidden="true" />
        <HeroContent>
          <TrackLabel>{'>'} NOW_PLAYING</TrackLabel>
          <HeroTitle {...fadeUp}>
            <PinkText>Ride the Wave</PinkText><br />
            to Your <OrangeText>Peak</OrangeText>
          </HeroTitle>
          <HeroSubtitle {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
            Retro-fueled training that hits different. Personal coaching
            with sunset vibes, chrome-plated results, and a soundtrack
            you can feel in your bones.
          </HeroSubtitle>
          <SunsetButton
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.4 }}
            onClick={() => navigate('/store')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Press Play <ChevronRight size={18} />
          </SunsetButton>
        </HeroContent>
      </Hero>

      {/* ─── Programs ─── */}
      <Section>
        <SectionInner>
          <SectionLabel>// TRACKS</SectionLabel>
          <SectionTitle>Select Your <PinkText>Mix</PinkText></SectionTitle>
          <ProgramGrid>
            <CassetteCard {...fadeUp}>
              <CardIcon><Flame size={24} /></CardIcon>
              <CardTitle>Burn.wav</CardTitle>
              <CardDesc>
                High-intensity intervals that torch fat and build
                endurance. Feel the heat, chase the afterburn.
              </CardDesc>
            </CassetteCard>
            <CassetteCard {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
              <CardIcon><Disc size={24} /></CardIcon>
              <CardTitle>Spin.mix</CardTitle>
              <CardDesc>
                Rhythm-driven cycling sessions. Pedal to the beat,
                climb to the drop, sprint through the chorus.
              </CardDesc>
            </CassetteCard>
            <CassetteCard {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
              <CardIcon><Radio size={24} /></CardIcon>
              <CardTitle>Pulse.fm</CardTitle>
              <CardDesc>
                Heart-rate guided training that keeps you locked
                in the zone. Every rep on frequency.
              </CardDesc>
            </CassetteCard>
            <CassetteCard {...fadeUp} transition={{ duration: 0.5, delay: 0.3 }}>
              <CardIcon><Zap size={24} /></CardIcon>
              <CardTitle>Shock.amp</CardTitle>
              <CardDesc>
                Explosive power and plyometric circuits. Amplify
                your output and shatter your limits.
              </CardDesc>
            </CassetteCard>
          </ProgramGrid>
        </SectionInner>
      </Section>

      {/* ─── Stats ─── */}
      <Section $bg="rgba(14, 6, 24, 0.95)">
        <SectionInner>
          <SectionLabel>// HIGHSCORES</SectionLabel>
          <SectionTitle>Performance <OrangeText>Leaderboard</OrangeText></SectionTitle>
          <StatsGrid>
            <StatPanel {...fadeUp}>
              <StatNumber>500+</StatNumber>
              <StatLabel>Players Active</StatLabel>
            </StatPanel>
            <StatPanel {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
              <StatNumber>98%</StatNumber>
              <StatLabel>Clear Rate</StatLabel>
            </StatPanel>
            <StatPanel {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
              <StatNumber>15+</StatNumber>
              <StatLabel>Seasons Live</StatLabel>
            </StatPanel>
            <StatPanel {...fadeUp} transition={{ duration: 0.5, delay: 0.3 }}>
              <StatNumber>24/7</StatNumber>
              <StatLabel>Always On</StatLabel>
            </StatPanel>
          </StatsGrid>
        </SectionInner>
      </Section>

      {/* ─── CTA ─── */}
      <CTASection>
        <CTAOverlay aria-hidden="true" />
        <CTAContent>
          <motion.div {...fadeUp}>
            <SectionLabel style={{ color: theme.colors.textOnPrimary }}>
              {'>'} INSERT_COIN
            </SectionLabel>
            <CTATitle>Press Start</CTATitle>
            <CTASubtext>
              Your next chapter has a killer soundtrack. Step onto
              the grid and let us turn you into a high score.
            </CTASubtext>
            <CTAButton
              onClick={() => navigate('/store')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Start Game <ChevronRight size={18} />
            </CTAButton>
          </motion.div>
        </CTAContent>
      </CTASection>

      {/* ─── Footer ─── */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <h3>SwanStudios</h3>
            <p>
              Retro-fueled personal training in Anaheim Hills, CA.
              Chrome-plated coaching, sunset-grade results.
            </p>
          </FooterBrand>
          <FooterCol>
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/store">Store</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </FooterCol>
          <FooterCol>
            <h4>Contact</h4>
            <ContactItem><MapPin size={14} /> Anaheim Hills, CA</ContactItem>
            <ContactItem><Phone size={14} /> (714) 947-3221</ContactItem>
            <ContactItem><Mail size={14} /> loveswanstudios@protonmail.com</ContactItem>
          </FooterCol>
        </FooterInner>
        <Copyright>{'<<'} 2026 SWANSTUDIOS {'//'}  ALL RIGHTS RESERVED {'>>'}</Copyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default CyberpunkPremiumV2Homepage;
