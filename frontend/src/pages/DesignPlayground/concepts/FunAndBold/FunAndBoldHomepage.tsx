import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Flame, Dumbbell, Users, Zap, ArrowRight, MapPin, Phone, Mail, Heart } from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import { funAndBoldTheme as theme } from './FunAndBoldTheme';

/* ─── Animations ─── */
const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

const wiggle = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(3deg); }
  75% { transform: rotate(-3deg); }
`;

const pop = keyframes`
  0% { transform: scale(0); }
  80% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const confetti = keyframes`
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-200px) rotate(720deg); opacity: 0; }
`;

/* ─── Styled Components ─── */
const Hero = styled.section`
  min-height: 100vh;
  background: ${theme.colors.background};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 120px 24px 80px;
  position: relative;
  overflow: hidden;
`;

const HeroGradientBlob = styled.div<{ $color: string; $top: string; $left: string; $size: string }>`
  position: absolute;
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  border-radius: 50%;
  background: ${({ $color }) => $color};
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  filter: blur(80px);
  opacity: 0.3;
  z-index: 0;
`;

const FloatingShape = styled.div<{ $top: string; $right: string; $delay: string }>`
  position: absolute;
  top: ${({ $top }) => $top};
  right: ${({ $right }) => $right};
  animation: ${bounce} 3s ease-in-out ${({ $delay }) => $delay} infinite;
  z-index: 0;
`;

const HeroLabel = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: ${theme.colors.primary};
  color: ${theme.colors.textOnPrimary};
  border-radius: 50px;
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 24px;
  z-index: 1;
`;

const HeroTitle = styled(motion.h1)`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 800;
  color: ${theme.colors.text};
  margin: 0 0 24px;
  line-height: 1.05;
  z-index: 1;
`;

const OrangeText = styled.span`
  color: ${theme.colors.primary};
`;

const TealText = styled.span`
  color: ${theme.colors.secondary};
`;

const TiltedWord = styled.span`
  display: inline-block;
  transform: rotate(-3deg);
  color: ${theme.colors.primary};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    right: 0;
    height: 6px;
    background: ${theme.colors.accent};
    border-radius: 3px;
    z-index: -1;
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.2rem);
  color: ${theme.colors.textSecondary};
  max-width: 550px;
  margin: 0 0 40px;
  line-height: 1.7;
  z-index: 1;
`;

const BoldButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 18px 40px;
  background: ${theme.gradients.cta};
  color: ${theme.colors.textOnPrimary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 56px;
  z-index: 1;
  box-shadow: 0 6px 24px rgba(255, 107, 53, 0.3);

  &:hover {
    box-shadow: 0 8px 32px rgba(255, 107, 53, 0.5);
  }
`;

/* ─── Programs Section ─── */
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
  font-size: 0.85rem;
  font-weight: 600;
  color: ${theme.colors.primary};
  margin: 0 0 8px;
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
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

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const ColorCard = styled(motion.div)<{ $bg: string; $textColor: string }>`
  background: ${({ $bg }) => $bg};
  color: ${({ $textColor }) => $textColor};
  border-radius: ${theme.borderRadius};
  padding: 32px 24px;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: default;

  &:hover {
    transform: translateY(-8px) rotate(-1deg);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
  }
`;

const CardIconWrap = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
`;

const CardTitle = styled.h3`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 8px;
`;

const CardDesc = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
  opacity: 0.9;
`;

/* ─── Testimonials ─── */
const TestimonialGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const BubbleCard = styled(motion.div)<{ $accentColor: string }>`
  background: ${theme.colors.surface};
  border-radius: ${theme.borderRadius};
  padding: 28px;
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);

  &::before {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    border-radius: 23px;
    background: ${({ $accentColor }) => $accentColor};
    z-index: -1;
  }
`;

const BubbleText = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.95rem;
  color: ${theme.colors.text};
  line-height: 1.6;
  margin: 0 0 12px;
`;

const BubbleAuthor = styled.div`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${theme.colors.primary};
`;

/* ─── CTA Section ─── */
const CTASection = styled.section`
  padding: 100px 24px;
  background: ${theme.colors.secondary};
  text-align: center;
  position: relative;
  overflow: hidden;
`;

const WaveTop = styled.div`
  position: absolute;
  top: -1px;
  left: 0;
  right: 0;

  svg {
    display: block;
    width: 100%;
    height: 60px;
  }
`;

const CTATitle = styled.h2`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(2rem, 6vw, 4rem);
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 16px;
`;

const CTASubtext = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.85);
  max-width: 500px;
  margin: 0 auto 32px;
  line-height: 1.6;
`;

const WhiteButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 18px 40px;
  background: #ffffff;
  color: ${theme.colors.secondary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 56px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);

  &:hover {
    background: ${theme.colors.accent};
    color: ${theme.colors.text};
    transform: translateY(-2px);
  }
`;

/* ─── Footer ─── */
const Footer = styled.footer`
  padding: 48px 24px;
  background: ${theme.colors.text};
  color: rgba(255, 255, 255, 0.7);
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
    font-size: 1.5rem;
    font-weight: 800;
    color: ${theme.colors.primary};
    margin: 0 0 8px;
  }
  p {
    font-size: 0.9rem;
    line-height: 1.6;
    opacity: 0.7;
  }
`;

const FooterCol = styled.div`
  h4 {
    font-family: '${theme.fonts.display}', sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    color: ${theme.colors.secondary};
    margin: 0 0 16px;
  }
  a {
    display: block;
    color: rgba(255, 255, 255, 0.6);
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
  margin-bottom: 8px;
`;

const Copyright = styled.div`
  text-align: center;
  padding-top: 32px;
  margin-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.8rem;
  opacity: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`;

/* ─── Component ─── */
const FunAndBoldHomepage: React.FC = () => {
  const navigate = useNavigate();

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
  };

  const springUp = {
    initial: { opacity: 0, y: 40, scale: 0.95 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, margin: '-50px' },
    transition: { type: 'spring', stiffness: 200, damping: 20 },
  };

  return (
    <ConceptWrapper theme={theme}>
      {/* ─── Hero ─── */}
      <Hero>
        <HeroGradientBlob $color={theme.colors.accent} $top="10%" $left="5%" $size="400px" />
        <HeroGradientBlob $color={theme.colors.primary} $top="50%" $left="60%" $size="350px" />
        <HeroGradientBlob $color={theme.colors.secondary} $top="30%" $left="80%" $size="250px" />

        <FloatingShape $top="15%" $right="15%" $delay="0s">
          <svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill={theme.colors.accent} opacity="0.5" /></svg>
        </FloatingShape>
        <FloatingShape $top="60%" $right="10%" $delay="0.5s">
          <svg width="30" height="30" viewBox="0 0 30 30"><rect width="24" height="24" x="3" y="3" rx="4" fill={theme.colors.secondary} opacity="0.4" transform="rotate(15, 15, 15)" /></svg>
        </FloatingShape>
        <FloatingShape $top="40%" $right="85%" $delay="1s">
          <svg width="24" height="24" viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 16,14 18,22 12,17 6,22 8,14 2,9 9,9" fill={theme.colors.primary} opacity="0.4" /></svg>
        </FloatingShape>

        <HeroLabel {...fadeUp}>
          <Flame size={16} /> Welcome to the good stuff
        </HeroLabel>
        <HeroTitle {...fadeUp}>
          FITNESS<br />
          SHOULD FEEL<br />
          <TiltedWord>LIKE THIS</TiltedWord>
        </HeroTitle>
        <HeroSubtitle {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
          Forget the boring gym vibes. We're building a fitness experience that's as fun
          as it is effective. Good sweat, great people, zero judgment.
        </HeroSubtitle>
        <BoldButton
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.4 }}
          onClick={() => navigate('/store')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          LET'S GO <ArrowRight size={20} />
        </BoldButton>
      </Hero>

      {/* ─── Programs ─── */}
      <Section>
        <SectionInner>
          <SectionLabel>What We Do</SectionLabel>
          <SectionTitle>
            Pick Your <OrangeText>Vibe</OrangeText>
          </SectionTitle>
          <ProgramGrid>
            <ColorCard $bg={theme.colors.primary} $textColor="#ffffff" {...springUp}>
              <CardIconWrap><Flame size={24} color="#ffffff" /></CardIconWrap>
              <CardTitle>Burn Mode</CardTitle>
              <CardDesc>
                High-intensity, high-energy sessions that torch calories and leave you feeling invincible.
              </CardDesc>
            </ColorCard>
            <ColorCard $bg={theme.colors.secondary} $textColor="#ffffff" {...springUp} transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}>
              <CardIconWrap><Dumbbell size={24} color="#ffffff" /></CardIconWrap>
              <CardTitle>Build Mode</CardTitle>
              <CardDesc>
                Strength training that sculpts and empowers. Progressive, smart, and surprisingly fun.
              </CardDesc>
            </ColorCard>
            <ColorCard $bg={theme.colors.accent} $textColor={theme.colors.text} {...springUp} transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}>
              <CardIconWrap><Users size={24} color={theme.colors.text} /></CardIconWrap>
              <CardTitle>Squad Mode</CardTitle>
              <CardDesc>
                Group training with friends, family, or brand-new workout buddies. More fun together.
              </CardDesc>
            </ColorCard>
            <ColorCard $bg="#9B59B6" $textColor="#ffffff" {...springUp} transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}>
              <CardIconWrap><Zap size={24} color="#ffffff" /></CardIconWrap>
              <CardTitle>Flow Mode</CardTitle>
              <CardDesc>
                Mobility, flexibility, and recovery. Because rest days should still feel amazing.
              </CardDesc>
            </ColorCard>
          </ProgramGrid>
        </SectionInner>
      </Section>

      {/* ─── Testimonials ─── */}
      <Section $bg="#FFF0E6">
        <SectionInner>
          <SectionLabel>Real People, Real Vibes</SectionLabel>
          <SectionTitle>
            What the <TealText>Squad</TealText> Says
          </SectionTitle>
          <TestimonialGrid>
            <BubbleCard $accentColor={theme.colors.primary} {...fadeUp}>
              <BubbleText>
                "I used to HATE the gym. Now I actually look forward to my sessions. The energy
                here is completely different — it's like working out with friends."
              </BubbleText>
              <BubbleAuthor>Jessica P.</BubbleAuthor>
            </BubbleCard>
            <BubbleCard $accentColor={theme.colors.secondary} {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
              <BubbleText>
                "Down 30lbs and up a whole lot of confidence. The trainers here actually make
                it FUN. Who knew fitness could feel this good?"
              </BubbleText>
              <BubbleAuthor>Marcus T.</BubbleAuthor>
            </BubbleCard>
            <BubbleCard $accentColor={theme.colors.accent} {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
              <BubbleText>
                "Best vibes. Best community. Best results. That's it. That's the review."
              </BubbleText>
              <BubbleAuthor>Sam K.</BubbleAuthor>
            </BubbleCard>
          </TestimonialGrid>
        </SectionInner>
      </Section>

      {/* ─── CTA ─── */}
      <CTASection>
        <WaveTop>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0,60 C360,0 1080,0 1440,60 L1440,0 L0,0 Z" fill="#FFF0E6" />
          </svg>
        </WaveTop>
        <motion.div {...fadeUp} style={{ position: 'relative', zIndex: 1 }}>
          <CTATitle>READY TO<br />GET STARTED?</CTATitle>
          <CTASubtext>
            Your future self is already high-fiving you. Let's make it official.
          </CTASubtext>
          <WhiteButton
            onClick={() => navigate('/store')}
            whileHover={{ scale: 1.05, rotate: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            VIEW PACKAGES <ArrowRight size={20} />
          </WhiteButton>
        </motion.div>
      </CTASection>

      {/* ─── Footer ─── */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <h3>SwanStudios</h3>
            <p>Fitness that feels good. Based in Anaheim Hills, California.</p>
          </FooterBrand>
          <FooterCol>
            <h4>Links</h4>
            <a href="/">Home</a>
            <a href="/store">Store</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </FooterCol>
          <FooterCol>
            <h4>Contact</h4>
            <ContactItem><MapPin size={14} /> Anaheim Hills, CA</ContactItem>
            <ContactItem><Phone size={14} /> (714) 947-3221</ContactItem>
            <ContactItem><Mail size={14} /> loveswanstudios@protonmail.com</ContactItem>
          </FooterCol>
        </FooterInner>
        <Copyright>Made with <Heart size={12} color={theme.colors.primary} /> in California — 2026 SwanStudios</Copyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default FunAndBoldHomepage;
