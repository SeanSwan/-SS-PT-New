import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Award, Shield, Gem, Crown, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import { marbleLuxuryV2Theme as theme } from './MarbleLuxuryV2Theme';

/* ============================================================
   Animations
   ============================================================ */

const goldVein = keyframes`
  0%   { width: 0%; }
  100% { width: 100%; }
`;

const foilStamp = keyframes`
  0%   { transform: scale(0.98); box-shadow: 0 0 0 rgba(212, 175, 55, 0); }
  50%  { transform: scale(0.98); box-shadow: 0 0 20px rgba(212, 175, 55, 0.3); }
  100% { transform: scale(1);    box-shadow: 0 0 0 rgba(212, 175, 55, 0); }
`;

const flicker = keyframes`
  0%, 100% { opacity: 1; }
  25%      { opacity: 0.92; }
  50%      { opacity: 0.97; }
  75%      { opacity: 0.90; }
`;

/* ============================================================
   Hero
   ============================================================ */

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

const GoldVeinLine = styled.div`
  position: absolute;
  top: 50%;
  left: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    ${theme.colors.primary} 20%,
    ${theme.colors.secondary} 50%,
    ${theme.colors.primary} 80%,
    transparent 100%
  );
  animation: ${goldVein} 4s ease-out forwards;
  opacity: 0.35;
  pointer-events: none;
`;

const GoldDivider = styled.div`
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent);
  margin: 0 auto 24px;
`;

const HeroLabel = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 6px;
  color: ${theme.colors.primary};
  margin: 0 0 24px;
  z-index: 1;
`;

const HeroTitle = styled(motion.h1)`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2.8rem, 7vw, 5.5rem);
  font-weight: 700;
  color: ${theme.colors.text};
  margin: 0 0 24px;
  line-height: 1.05;
  letter-spacing: 2px;
  z-index: 1;
`;

const HeroSubtitle = styled(motion.p)`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.15rem);
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  max-width: 560px;
  margin: 0 0 48px;
  line-height: 1.8;
  letter-spacing: 0.5px;
  z-index: 1;
`;

const GoldCTAButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 52px;
  background: ${theme.gradients.cta};
  color: ${theme.colors.textOnPrimary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 4px;
  cursor: pointer;
  min-height: 52px;
  z-index: 1;
  transition: box-shadow 0.4s ease;

  &:hover {
    box-shadow: 0 0 30px rgba(212, 175, 55, 0.35);
  }

  &:active {
    animation: ${foilStamp} 0.35s ease-out;
  }
`;

/* ============================================================
   Shared Section Primitives
   ============================================================ */

const Section = styled.section<{ $bg?: string }>`
  padding: 100px 24px;
  background: ${({ $bg }) => $bg || theme.colors.background};

  @media (min-width: 768px) {
    padding: 140px 40px;
  }
`;

const SectionInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const SectionLabel = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.75rem;
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

/* ============================================================
   Programs Section (Our Atelier)
   ============================================================ */

const ProgramGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ProgramCard = styled(motion.div)`
  background: ${theme.gradients.card};
  border-top: 2px solid ${theme.colors.primary};
  border-radius: ${theme.borderRadius};
  padding: 48px 32px;
  position: relative;
  transition: box-shadow 0.4s ease;

  &:hover {
    box-shadow: 0 0 40px rgba(212, 175, 55, 0.08);
  }
`;

const ProgramIconWrap = styled.div`
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: ${theme.colors.primary};
`;

const ProgramName = styled.h3`
  font-family: '${theme.fonts.display}', serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${theme.colors.text};
  margin: 0 0 16px;
`;

const ProgramDesc = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.95rem;
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  line-height: 1.8;
  margin: 0;
`;

/* ============================================================
   Stats Section (By The Numbers)
   ============================================================ */

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
  border-radius: ${theme.borderRadius};
  padding: 40px 24px;
  text-align: center;
  border: 1px solid rgba(212, 175, 55, 0.1);
  transition: border-color 0.4s ease;

  &:hover {
    border-color: rgba(212, 175, 55, 0.25);
  }
`;

const StatNumber = styled.span`
  display: block;
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  color: ${theme.colors.primary};
  line-height: 1;
  margin-bottom: 8px;
  animation: ${flicker} 6s ease-in-out infinite;
`;

const StatLabel = styled.span`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8125rem;
  font-weight: 400;
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 3px;
`;

/* ============================================================
   CTA Section (Claim Your Legacy)
   ============================================================ */

const CTASection = styled.section`
  padding: 120px 24px;
  background: ${theme.colors.background};
  text-align: center;
  position: relative;
  overflow: hidden;
`;

const CTAVein = styled.div`
  position: absolute;
  bottom: 40%;
  left: 0;
  height: 1px;
  width: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(212, 175, 55, 0.15) 30%,
    rgba(212, 175, 55, 0.15) 70%,
    transparent 100%
  );
  pointer-events: none;
`;

const CTATitle = styled.h2`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  color: ${theme.colors.text};
  margin: 0 0 16px;
  z-index: 1;
  position: relative;
`;

const CTASubtext = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1rem;
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  max-width: 520px;
  margin: 0 auto 40px;
  line-height: 1.7;
  letter-spacing: 0.5px;
  z-index: 1;
  position: relative;
`;

const ShimmerButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 52px;
  background: ${theme.gradients.cta};
  color: ${theme.colors.textOnPrimary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 4px;
  cursor: pointer;
  min-height: 52px;
  position: relative;
  z-index: 1;
  overflow: hidden;
  transition: box-shadow 0.4s ease;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    transition: left 0.6s ease;
  }

  &:hover {
    box-shadow: 0 0 30px rgba(212, 175, 55, 0.35);
    &::after {
      left: 100%;
    }
  }

  &:active {
    animation: ${foilStamp} 0.35s ease-out;
  }
`;

/* ============================================================
   Footer
   ============================================================ */

const Footer = styled.footer`
  padding: 64px 24px 32px;
  background: #080808;
  border-top: 1px solid rgba(212, 175, 55, 0.12);
`;

const FooterInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr 1fr;
  }
`;

const FooterBrand = styled.div`
  h3 {
    font-family: '${theme.fonts.display}', serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: ${theme.colors.text};
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
    transition: color 0.3s;
    &:hover {
      color: ${theme.colors.primary};
    }
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

  svg {
    color: ${theme.colors.accent};
    flex-shrink: 0;
  }
`;

const FooterSeparator = styled.div`
  max-width: 1100px;
  margin: 40px auto 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(212, 175, 55, 0.2),
    transparent
  );
`;

const Copyright = styled.div`
  max-width: 1100px;
  margin: 24px auto 0;
  text-align: center;
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8125rem;
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  letter-spacing: 2px;
  text-transform: uppercase;
`;

/* ============================================================
   Data
   ============================================================ */

const programs = [
  {
    icon: Award,
    name: 'Prestige Sculpting',
    description:
      'An elite body-composition program engineered for visible, lasting transformation. Every rep calibrated, every meal mapped, every result measured.',
  },
  {
    icon: Shield,
    name: 'Executive Guard',
    description:
      'Stress-proof conditioning for high-performers. Build resilience, sharpen focus, and maintain peak readiness no matter what your schedule demands.',
  },
  {
    icon: Gem,
    name: 'Diamond Standard',
    description:
      'Our most exclusive tier: unlimited private sessions, priority scheduling, and white-glove wellness concierge. For those who accept nothing less than the finest.',
  },
];

const stats = [
  { value: '500+', label: 'Elite Clients' },
  { value: '15+', label: 'Years of Mastery' },
  { value: '98%', label: 'Client Loyalty' },
  { value: '1000+', label: 'Monthly Sessions' },
];

/* ============================================================
   Component
   ============================================================ */

const MarbleLuxuryV2Homepage: React.FC = () => {
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
        <GoldVeinLine aria-hidden="true" />
        <HeroLabel>Swan Studios</HeroLabel>
        <GoldDivider aria-hidden="true" />
        <HeroTitle {...fadeUp}>
          Forged in Darkness,
          <br />
          Finished in Gold
        </HeroTitle>
        <HeroSubtitle {...fadeUp} transition={{ duration: 0.6, delay: 0.15 }}>
          An exclusive training atelier where discipline meets dark luxury.
          No shortcuts. No compromises. Only mastery.
        </HeroSubtitle>
        <GoldCTAButton
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.3 }}
          onClick={() => navigate('/store')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          Enter the Atelier <ArrowRight size={16} />
        </GoldCTAButton>
      </Hero>

      {/* ─── Programs ─── */}
      <Section>
        <SectionInner>
          <SectionLabel>Our Atelier</SectionLabel>
          <GoldDivider aria-hidden="true" />
          <SectionTitle>Crafted Programs</SectionTitle>
          <SectionSubtitle>
            Three disciplines, one philosophy: uncompromising excellence.
          </SectionSubtitle>

          <ProgramGrid>
            {programs.map((program, idx) => {
              const Icon = program.icon;
              return (
                <ProgramCard
                  key={program.name}
                  {...fadeUp}
                  transition={{ duration: 0.6, delay: idx * 0.12 }}
                >
                  <ProgramIconWrap aria-hidden="true">
                    <Icon size={32} strokeWidth={1.5} />
                  </ProgramIconWrap>
                  <ProgramName>{program.name}</ProgramName>
                  <ProgramDesc>{program.description}</ProgramDesc>
                </ProgramCard>
              );
            })}
          </ProgramGrid>
        </SectionInner>
      </Section>

      {/* ─── Stats ─── */}
      <Section $bg={theme.colors.surface}>
        <SectionInner>
          <SectionLabel>By The Numbers</SectionLabel>
          <GoldDivider aria-hidden="true" />
          <SectionTitle>Proven Authority</SectionTitle>
          <SectionSubtitle>
            Results forged over years of relentless dedication to our craft.
          </SectionSubtitle>

          <StatsGrid>
            {stats.map((stat, idx) => (
              <StatPanel
                key={stat.label}
                {...fadeUp}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <StatNumber>{stat.value}</StatNumber>
                <StatLabel>{stat.label}</StatLabel>
              </StatPanel>
            ))}
          </StatsGrid>
        </SectionInner>
      </Section>

      {/* ─── CTA ─── */}
      <CTASection>
        <CTAVein aria-hidden="true" />
        <motion.div {...fadeUp}>
          <Crown
            size={36}
            strokeWidth={1.2}
            color={theme.colors.primary}
            style={{ marginBottom: 24 }}
            aria-hidden="true"
          />
          <CTATitle>Claim Your Legacy</CTATitle>
          <CTASubtext>
            Greatness is not given. It is earned in the dark, and revealed in gold.
            Your transformation begins with a single decision.
          </CTASubtext>
          <ShimmerButton
            onClick={() => navigate('/store')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            View Packages <ArrowRight size={16} />
          </ShimmerButton>
        </motion.div>
      </CTASection>

      {/* ─── Footer ─── */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <h3>SwanStudios</h3>
            <p>
              A private training atelier in Anaheim Hills, California.
              Dark luxury fitness, refined over fifteen years of mastery.
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
            <ContactItem>
              <MapPin size={14} /> Anaheim Hills, CA
            </ContactItem>
            <ContactItem>
              <Phone size={14} /> (714) 947-3221
            </ContactItem>
            <ContactItem>
              <Mail size={14} /> loveswanstudios@protonmail.com
            </ContactItem>
          </FooterCol>
        </FooterInner>
        <FooterSeparator aria-hidden="true" />
        <Copyright>&copy; 2026 Swan Studios &mdash; All Rights Reserved</Copyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default MarbleLuxuryV2Homepage;
