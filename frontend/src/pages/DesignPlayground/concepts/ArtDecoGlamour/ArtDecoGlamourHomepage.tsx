import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Diamond, Crown, Star, Gem, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import { artDecoGlamourTheme as theme } from './ArtDecoGlamourTheme';

/* ─── Animations ─── */
const goldShimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const fanExpand = keyframes`
  0% { transform: scaleY(0); }
  100% { transform: scaleY(1); }
`;

const borderDraw = keyframes`
  0% { width: 0%; }
  100% { width: 100%; }
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
  padding: 120px 24px 80px;
  position: relative;
  overflow: hidden;
`;

const Sunburst = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0.04;
  &::before, &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
  }
  &::before {
    background: repeating-conic-gradient(from 0deg at 50% 100%, ${theme.colors.primary} 0deg 2deg, transparent 2deg 15deg);
    transform-origin: center bottom;
    animation: ${fanExpand} 1.5s ease-out forwards;
  }
  &::after {
    background: repeating-conic-gradient(from 180deg at 50% 0%, ${theme.colors.primary} 0deg 2deg, transparent 2deg 15deg);
    transform-origin: center top;
    animation: ${fanExpand} 1.5s ease-out 0.3s forwards;
    opacity: 0.5;
  }
`;

const GoldFrame = styled.div`
  position: absolute;
  inset: 24px;
  border: 1px solid rgba(201, 168, 76, 0.15);
  pointer-events: none;
  &::before, &::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    height: 1px;
    background: ${theme.colors.primary};
    animation: ${borderDraw} 1.2s ease-out forwards;
  }
  &::before { top: -1px; }
  &::after { bottom: -1px; animation-delay: 0.4s; }
`;

const DecoSeparator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 0 0 24px;
  z-index: 1;
  &::before, &::after {
    content: '';
    width: 40px;
    height: 1px;
    background: ${theme.colors.primary};
  }
`;

const DecoGem = styled.div`
  width: 8px;
  height: 8px;
  background: ${theme.colors.primary};
  transform: rotate(45deg);
`;

const HeroLabel = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 8px;
  color: ${theme.colors.primary};
  margin: 0 0 16px;
  z-index: 1;
`;

const HeroTitle = styled(motion.h1)`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2.8rem, 7vw, 5.5rem);
  font-weight: 700;
  color: ${theme.colors.text};
  margin: 0 0 24px;
  line-height: 1.05;
  letter-spacing: 4px;
  text-transform: uppercase;
  z-index: 1;
`;

const GoldText = styled.span`
  color: ${theme.colors.primary};
`;

const HeroSubtitle = styled(motion.p)`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.15rem);
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  max-width: 520px;
  margin: 0 0 40px;
  line-height: 1.8;
  letter-spacing: 1px;
  z-index: 1;
`;

const DecoButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 48px;
  background: ${theme.gradients.cta};
  color: ${theme.colors.textOnPrimary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.4s;
  min-height: 52px;
  z-index: 1;
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: none;
  }
  &:hover::before { animation: ${goldShimmer} 0.6s ease-out; }
  &:hover { box-shadow: 0 4px 24px rgba(201, 168, 76, 0.35); }
`;

/* ─── Sections ─── */
const Section = styled.section<{ $bg?: string }>`
  padding: 100px 24px;
  background: ${({ $bg }) => $bg || theme.colors.background};
  position: relative;
  @media (min-width: 768px) { padding: 140px 40px; }
`;

const SectionInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const SectionLabel = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 6px;
  color: ${theme.colors.primary};
  text-align: center;
  margin: 0 0 12px;
`;

const SectionTitle = styled.h2`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 700;
  color: ${theme.colors.text};
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 3px;
  margin: 0 0 16px;
`;

const SectionSubtitle = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.95rem;
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  text-align: center;
  margin: 0 0 64px;
  letter-spacing: 0.5px;
`;

/* ─── Programs ─── */
const ProgramGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
`;

const ProgramCard = styled(motion.div)`
  background: ${theme.gradients.card};
  border: 1px solid rgba(201, 168, 76, 0.12);
  border-top: 3px solid ${theme.colors.primary};
  border-radius: ${theme.borderRadius};
  padding: 40px 28px 36px;
  text-align: center;
  position: relative;
  transition: all 0.4s;
  &:hover {
    border-color: rgba(201, 168, 76, 0.3);
    box-shadow: 0 8px 40px rgba(201, 168, 76, 0.08);
    transform: translateY(-4px);
  }
`;

const IconContainer = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: ${theme.colors.primary};
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid rgba(201, 168, 76, 0.3);
    transform: rotate(45deg);
  }
`;

const ProgramName = styled.h3`
  font-family: '${theme.fonts.display}', serif;
  font-size: 1.35rem;
  font-weight: 600;
  color: ${theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0 0 12px;
`;

const ProgramDesc = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.95rem;
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  line-height: 1.7;
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
  border: 1px solid rgba(201, 168, 76, 0.1);
  border-radius: ${theme.borderRadius};
  padding: 32px 16px;
  text-align: center;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 2px;
    background: ${theme.colors.primary};
  }
`;

const StatNumber = styled.div`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-weight: 700;
  color: ${theme.colors.primary};
  letter-spacing: 2px;
`;

const StatLabel = styled.div`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8125rem;
  font-weight: 400;
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 8px;
`;

/* ─── CTA ─── */
const CTASection = styled.section`
  padding: 120px 24px;
  background: ${theme.colors.background};
  text-align: center;
  position: relative;
  overflow: hidden;
  &::before, &::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    height: 1px;
    width: 200px;
    background: linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent);
  }
  &::before { top: 0; }
  &::after { bottom: 0; }
`;

const CTATitle = styled.h2`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  color: ${theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 3px;
  margin: 0 0 16px;
`;

const CTASubtext = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1rem;
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  max-width: 480px;
  margin: 0 auto 40px;
  line-height: 1.7;
  letter-spacing: 0.5px;
`;

const CTAButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 48px;
  background: ${theme.gradients.cta};
  color: ${theme.colors.textOnPrimary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.4s;
  min-height: 52px;
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
    transition: none;
  }
  &:hover::before { animation: ${goldShimmer} 0.6s ease-out; }
  &:hover { box-shadow: 0 4px 24px rgba(201, 168, 76, 0.4); }
`;

/* ─── Footer ─── */
const Footer = styled.footer`
  padding: 64px 24px 32px;
  background: ${theme.colors.background};
  border-top: 1px solid rgba(201, 168, 76, 0.12);
`;

const FooterInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
  @media (min-width: 768px) { grid-template-columns: 2fr 1fr 1fr; }
`;

const FooterBrand = styled.div`
  h3 {
    font-family: '${theme.fonts.display}', serif;
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: ${theme.colors.primary};
    margin: 0 0 8px;
  }
  p {
    font-family: '${theme.fonts.body}', sans-serif;
    font-size: 0.9rem;
    font-weight: 300;
    color: ${theme.colors.textSecondary};
    line-height: 1.7;
  }
`;

const FooterCol = styled.div`
  h4 {
    font-family: '${theme.fonts.body}', sans-serif;
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: ${theme.colors.primary};
    margin: 0 0 20px;
  }
  a {
    display: block;
    color: ${theme.colors.textSecondary};
    text-decoration: none;
    font-family: '${theme.fonts.body}', sans-serif;
    font-size: 0.9rem;
    font-weight: 300;
    margin-bottom: 10px;
    letter-spacing: 1px;
    transition: color 0.3s;
    &:hover { color: ${theme.colors.primary}; }
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.9rem;
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  margin-bottom: 10px;
`;

const Copyright = styled.div`
  max-width: 1100px;
  margin: 40px auto 0;
  padding-top: 24px;
  border-top: 1px solid rgba(201, 168, 76, 0.08);
  text-align: center;
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8125rem;
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  letter-spacing: 3px;
  text-transform: uppercase;
`;

const CopyrightDeco = styled.div`
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent);
  margin: 0 auto 16px;
`;

/* ─── Component ─── */
const ArtDecoGlamourHomepage: React.FC = () => {
  const navigate = useNavigate();

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: 0.6 },
  };

  return (
    <ConceptWrapper theme={theme}>
      {/* ─── Hero ─── */}
      <Hero>
        <Sunburst aria-hidden="true" />
        <GoldFrame aria-hidden="true" />
        <HeroLabel>SwanStudios</HeroLabel>
        <DecoSeparator aria-hidden="true"><DecoGem /></DecoSeparator>
        <HeroTitle {...fadeUp}>
          Train Like<br />The <GoldText>Gatsby</GoldText> Era
        </HeroTitle>
        <HeroSubtitle {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
          Where geometric precision meets physical excellence.
          An elite training experience crafted with the opulence
          and discipline of the golden age.
        </HeroSubtitle>
        <DecoButton
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.4 }}
          onClick={() => navigate('/store')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Enter the Grand Hall <ArrowRight size={16} />
        </DecoButton>
      </Hero>

      {/* ─── Programs ─── */}
      <Section>
        <SectionInner>
          <DecoSeparator aria-hidden="true"><DecoGem /></DecoSeparator>
          <SectionLabel>Our Disciplines</SectionLabel>
          <SectionTitle>The <GoldText>Art</GoldText> of Training</SectionTitle>
          <SectionSubtitle>
            Three pillars of mastery, each refined with the precision of a master craftsman.
          </SectionSubtitle>
          <ProgramGrid>
            <ProgramCard {...fadeUp}>
              <IconContainer><Diamond size={26} /></IconContainer>
              <ProgramName>Sculpt &amp; Define</ProgramName>
              <ProgramDesc>
                Chisel your physique with geometric precision. Every angle measured,
                every rep sculpted toward your ideal form. Artistry meets anatomy.
              </ProgramDesc>
            </ProgramCard>
            <ProgramCard {...fadeUp} transition={{ duration: 0.6, delay: 0.15 }}>
              <IconContainer><Crown size={26} /></IconContainer>
              <ProgramName>Royal Endurance</ProgramName>
              <ProgramDesc>
                Build the stamina of champions. Endurance protocols designed for those
                who refuse to fade. Sustain your reign at the highest level.
              </ProgramDesc>
            </ProgramCard>
            <ProgramCard {...fadeUp} transition={{ duration: 0.6, delay: 0.3 }}>
              <IconContainer><Star size={26} /></IconContainer>
              <ProgramName>Elite Performance</ProgramName>
              <ProgramDesc>
                Peak output for peak individuals. Strength, speed, and power converge
                in a program worthy of the main stage. Your standing ovation awaits.
              </ProgramDesc>
            </ProgramCard>
          </ProgramGrid>
        </SectionInner>
      </Section>

      {/* ─── Stats ─── */}
      <Section $bg="rgba(15, 15, 15, 0.95)">
        <SectionInner>
          <DecoSeparator aria-hidden="true"><DecoGem /></DecoSeparator>
          <SectionLabel>By the Numbers</SectionLabel>
          <SectionTitle>A Legacy of <GoldText>Excellence</GoldText></SectionTitle>
          <SectionSubtitle>
            Decades of dedication distilled into results that speak for themselves.
          </SectionSubtitle>
          <StatsGrid>
            <StatPanel {...fadeUp}>
              <StatNumber>500+</StatNumber>
              <StatLabel>Clients Transformed</StatLabel>
            </StatPanel>
            <StatPanel {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}>
              <StatNumber>15+</StatNumber>
              <StatLabel>Years of Excellence</StatLabel>
            </StatPanel>
            <StatPanel {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
              <StatNumber>98%</StatNumber>
              <StatLabel>Client Retention</StatLabel>
            </StatPanel>
            <StatPanel {...fadeUp} transition={{ duration: 0.6, delay: 0.3 }}>
              <StatNumber>1000+</StatNumber>
              <StatLabel>Sessions Monthly</StatLabel>
            </StatPanel>
          </StatsGrid>
        </SectionInner>
      </Section>

      {/* ─── CTA ─── */}
      <CTASection>
        <motion.div {...fadeUp}>
          <DecoSeparator aria-hidden="true"><DecoGem /></DecoSeparator>
          <CTATitle>Your <GoldText>Gilded Era</GoldText><br />Begins Now</CTATitle>
          <CTASubtext>
            Step beyond the velvet rope. The grandeur of disciplined training
            and transformative results awaits those bold enough to claim it.
          </CTASubtext>
          <CTAButton
            onClick={() => navigate('/store')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Claim Your Place <ArrowRight size={16} />
          </CTAButton>
        </motion.div>
      </CTASection>

      {/* ─── Footer ─── */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <h3>SwanStudios</h3>
            <p>
              An elite training atelier in Anaheim Hills, California.
              Crafting champions with Art Deco precision since 2018.
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
        <Copyright>
          <CopyrightDeco aria-hidden="true" />
          2026 SwanStudios — All Rights Reserved
        </Copyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default ArtDecoGlamourHomepage;
