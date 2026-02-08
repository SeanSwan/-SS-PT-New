import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Dna, Brain, Activity, Sprout, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import { hybridNatureTechTheme as theme } from './HybridNatureTechTheme';

/* ─── Animations ─── */
const bioGlow = keyframes`
  0%, 100% { opacity: 0.4; filter: blur(60px); }
  50% { opacity: 0.7; filter: blur(80px); }
`;

const cellGrow = keyframes`
  0% { transform: scale(0.8); opacity: 0.3; }
  50% { transform: scale(1.1); opacity: 0.6; }
  100% { transform: scale(0.8); opacity: 0.3; }
`;

const neuralPulse = keyframes`
  0%, 100% { stroke-dashoffset: 100; }
  50% { stroke-dashoffset: 0; }
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

const BioOrb = styled.div<{ $color: string; $size: string; $top: string; $left: string; $delay: string }>`
  position: absolute;
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  border-radius: 50%;
  background: ${({ $color }) => $color};
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  animation: ${bioGlow} ${({ $delay }) => `${5 + parseInt($delay)}s`} ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  z-index: 0;
`;

const CellSvg = styled.svg`
  position: absolute;
  width: 200px;
  height: 200px;
  opacity: 0.15;
  z-index: 0;

  circle {
    fill: none;
    stroke: ${theme.colors.primary};
    stroke-width: 1;
    animation: ${cellGrow} 6s ease-in-out infinite;
  }
`;

const HeroLabel = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: ${theme.colors.primary};
  margin: 0 0 16px;
  z-index: 1;
`;

const HeroTitle = styled(motion.h1)`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 700;
  color: ${theme.colors.text};
  margin: 0 0 20px;
  line-height: 1.15;
  z-index: 1;
`;

const GreenText = styled.span`
  color: ${theme.colors.primary};
`;

const BlueText = styled.span`
  color: ${theme.colors.secondary};
`;

const HeroSubtitle = styled(motion.p)`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: ${theme.colors.textSecondary};
  max-width: 580px;
  margin: 0 0 40px;
  line-height: 1.7;
  z-index: 1;
`;

const GradientButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 36px;
  background: ${theme.gradients.cta};
  color: ${theme.colors.textOnPrimary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 52px;
  z-index: 1;

  &:hover {
    box-shadow: 0 8px 32px rgba(88, 214, 141, 0.3), 0 8px 32px rgba(93, 173, 226, 0.2);
    transform: translateY(-2px);
  }
`;

/* ─── Programs ─── */
const Section = styled.section<{ $bg?: string }>`
  padding: 80px 24px;
  background: ${({ $bg }) => $bg || theme.colors.background};

  @media (min-width: 768px) {
    padding: 120px 40px;
  }
`;

const SectionInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionLabel = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: ${theme.colors.primary};
  margin: 0 0 8px;
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  color: ${theme.colors.text};
  text-align: center;
  margin: 0 0 48px;
`;

const ProgramGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const OrganicCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border: 1px solid rgba(88, 214, 141, 0.1);
  border-radius: ${theme.borderRadius};
  padding: 32px 24px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(8px);
  transition: all 0.3s;

  &:hover {
    border-color: rgba(88, 214, 141, 0.3);
    box-shadow: 0 0 24px rgba(88, 214, 141, 0.08);
    transform: translateY(-4px);
  }

  &::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 20%;
    right: 20%;
    height: 2px;
    background: ${theme.gradients.cta};
    border-radius: 0 0 4px 4px;
  }
`;

const CardIconContainer = styled.div<{ $color: string }>`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: ${({ $color }) => $color}15;
  border: 1px solid ${({ $color }) => $color}30;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: ${({ $color }) => $color};
`;

const CardTitle = styled.h3`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: ${theme.colors.text};
  margin: 0 0 8px;
`;

const CardDesc = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.95rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

/* ─── Growth Chart Section ─── */
const GrowthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const GrowthCard = styled(motion.div)`
  text-align: center;
  padding: 24px;
  background: ${theme.colors.surface};
  border: 1px solid rgba(88, 214, 141, 0.08);
  border-radius: ${theme.borderRadius};
  backdrop-filter: blur(8px);
`;

const GrowthNumber = styled.div`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  background: ${theme.gradients.cta};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const GrowthLabel = styled.div`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8rem;
  color: ${theme.colors.textSecondary};
  margin-top: 4px;
`;

/* ─── Testimonials ─── */
const TestimonialCard = styled(motion.blockquote)`
  background: ${theme.colors.surface};
  border: 1px solid rgba(88, 214, 141, 0.08);
  border-left: 3px solid ${theme.colors.primary};
  border-radius: ${theme.borderRadius};
  padding: 32px;
  margin: 0 0 24px;
  backdrop-filter: blur(8px);
`;

const TestimonialText = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1.05rem;
  color: ${theme.colors.text};
  line-height: 1.7;
  margin: 0 0 12px;
`;

const TestimonialAuthor = styled.cite`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 0.85rem;
  font-style: normal;
  font-weight: 500;
  color: ${theme.colors.primary};
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
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  color: ${theme.colors.text};
  margin: 0 0 16px;
`;

const CTASubtext = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1.05rem;
  color: ${theme.colors.textSecondary};
  max-width: 500px;
  margin: 0 auto 32px;
  line-height: 1.6;
`;

/* ─── Footer ─── */
const Footer = styled.footer`
  padding: 48px 24px;
  background: #080C12;
  border-top: 1px solid rgba(88, 214, 141, 0.1);
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
    font-weight: 600;
    background: ${theme.gradients.cta};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
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
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: ${theme.colors.accent};
    margin: 0 0 16px;
  }
  a {
    display: block;
    color: ${theme.colors.textSecondary};
    text-decoration: none;
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
  border-top: 1px solid rgba(88, 214, 141, 0.05);
  font-size: 0.75rem;
  color: ${theme.colors.textSecondary};
`;

/* ─── Component ─── */
const HybridNatureTechHomepage: React.FC = () => {
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
        <BioOrb $color="rgba(88, 214, 141, 0.15)" $size="400px" $top="20%" $left="10%" $delay="0" />
        <BioOrb $color="rgba(93, 173, 226, 0.1)" $size="300px" $top="40%" $left="70%" $delay="2" />
        <BioOrb $color="rgba(247, 220, 111, 0.05)" $size="200px" $top="70%" $left="30%" $delay="4" />

        <HeroLabel>Bio-Engineered Fitness</HeroLabel>
        <HeroTitle {...fadeUp}>
          Where <GreenText>Biology</GreenText><br />
          Meets <BlueText>Engineering</BlueText>
        </HeroTitle>
        <HeroSubtitle {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
          Your body is the most sophisticated biological system on the planet.
          We combine organic intelligence with precision engineering to unlock
          your full evolutionary potential.
        </HeroSubtitle>
        <GradientButton
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.4 }}
          onClick={() => navigate('/store')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          Evolve Now <ArrowRight size={18} />
        </GradientButton>
      </Hero>

      {/* ─── Programs ─── */}
      <Section>
        <SectionInner>
          <SectionLabel>Biological Systems</SectionLabel>
          <SectionTitle>Your <GreenText>Evolution</GreenText> Protocol</SectionTitle>
          <ProgramGrid>
            <OrganicCard {...fadeUp}>
              <CardIconContainer $color={theme.colors.primary}><Dna size={24} /></CardIconContainer>
              <CardTitle>Strength System</CardTitle>
              <CardDesc>
                Activate dormant muscle fibers through progressive neural adaptation.
                Our protocols are based on the latest research in biomechanics and motor
                learning — your DNA already has the blueprint for strength.
              </CardDesc>
            </OrganicCard>
            <OrganicCard {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}>
              <CardIconContainer $color={theme.colors.secondary}><Brain size={24} /></CardIconContainer>
              <CardTitle>Neural Optimization</CardTitle>
              <CardDesc>
                Train your nervous system to recruit muscles faster and more efficiently.
                Mind-muscle connection isn't just a cliché — it's neuroscience.
                We engineer the pathways.
              </CardDesc>
            </OrganicCard>
            <OrganicCard {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
              <CardIconContainer $color={theme.colors.accent}><Activity size={24} /></CardIconContainer>
              <CardTitle>Endurance Protocol</CardTitle>
              <CardDesc>
                Optimize your aerobic and anaerobic energy systems. Mitochondrial density,
                VO2 max, lactate threshold — we measure, we improve, we evolve.
              </CardDesc>
            </OrganicCard>
            <OrganicCard {...fadeUp} transition={{ duration: 0.6, delay: 0.3 }}>
              <CardIconContainer $color={theme.colors.primary}><Sprout size={24} /></CardIconContainer>
              <CardTitle>Recovery Cycle</CardTitle>
              <CardDesc>
                Growth happens between sessions. Our recovery protocols leverage sleep science,
                nutrition timing, and active recovery to maximize your adaptation rate.
              </CardDesc>
            </OrganicCard>
          </ProgramGrid>
        </SectionInner>
      </Section>

      {/* ─── Growth Stats ─── */}
      <Section $bg="rgba(13, 17, 23, 0.95)">
        <SectionInner>
          <SectionLabel>System Metrics</SectionLabel>
          <SectionTitle>Growth <BlueText>Data</BlueText></SectionTitle>
          <GrowthGrid>
            <GrowthCard {...fadeUp}>
              <GrowthNumber>500+</GrowthNumber>
              <GrowthLabel>Organisms Evolved</GrowthLabel>
            </GrowthCard>
            <GrowthCard {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}>
              <GrowthNumber>97%</GrowthNumber>
              <GrowthLabel>Adaptation Rate</GrowthLabel>
            </GrowthCard>
            <GrowthCard {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
              <GrowthNumber>15yr</GrowthNumber>
              <GrowthLabel>Research Applied</GrowthLabel>
            </GrowthCard>
            <GrowthCard {...fadeUp} transition={{ duration: 0.6, delay: 0.3 }}>
              <GrowthNumber>360°</GrowthNumber>
              <GrowthLabel>Holistic Approach</GrowthLabel>
            </GrowthCard>
          </GrowthGrid>
        </SectionInner>
      </Section>

      {/* ─── Testimonials ─── */}
      <Section>
        <SectionInner>
          <SectionLabel>Field Reports</SectionLabel>
          <SectionTitle>From the <GreenText>Community</GreenText></SectionTitle>
          <TestimonialCard {...fadeUp}>
            <TestimonialText>
              "The combination of science and intuition here is incredible. My trainer understands
              both the data and the human behind it. I've seen improvements I didn't think were
              possible at my age."
            </TestimonialText>
            <TestimonialAuthor>— David L., Member since 2024</TestimonialAuthor>
          </TestimonialCard>
          <TestimonialCard {...fadeUp}>
            <TestimonialText>
              "SwanStudios doesn't just train your body — they educate you. I now understand
              WHY every exercise matters, and that knowledge compounds over time."
            </TestimonialText>
            <TestimonialAuthor>— Rachel K., Member since 2025</TestimonialAuthor>
          </TestimonialCard>
        </SectionInner>
      </Section>

      {/* ─── CTA ─── */}
      <CTASection>
        <BioOrb $color="rgba(88, 214, 141, 0.1)" $size="300px" $top="30%" $left="5%" $delay="0" />
        <BioOrb $color="rgba(93, 173, 226, 0.08)" $size="250px" $top="20%" $left="75%" $delay="3" />
        <motion.div {...fadeUp} style={{ position: 'relative', zIndex: 1 }}>
          <SectionLabel>Next Step</SectionLabel>
          <CTATitle>Ready to <GreenText>Evolve</GreenText>?</CTATitle>
          <CTASubtext>
            Your body has been waiting millions of years for this upgrade.
            Let's activate your potential.
          </CTASubtext>
          <GradientButton
            onClick={() => navigate('/store')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            View Packages <ArrowRight size={18} />
          </GradientButton>
        </motion.div>
      </CTASection>

      {/* ─── Footer ─── */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <h3>SwanStudios</h3>
            <p>Bio-engineered fitness in Anaheim Hills, California. Where biology meets engineering.</p>
          </FooterBrand>
          <FooterCol>
            <h4>Navigate</h4>
            <a href="/">Home</a>
            <a href="/store">Store</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </FooterCol>
          <FooterCol>
            <h4>Connect</h4>
            <ContactItem><MapPin size={14} /> Anaheim Hills, CA</ContactItem>
            <ContactItem><Phone size={14} /> (714) 947-3221</ContactItem>
            <ContactItem><Mail size={14} /> loveswanstudios@protonmail.com</ContactItem>
          </FooterCol>
        </FooterInner>
        <Copyright>2026 SwanStudios. All rights reserved.</Copyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default HybridNatureTechHomepage;
