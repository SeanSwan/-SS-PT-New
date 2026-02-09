import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Anchor, Compass, Fish, Waves, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import { hybridNatureTechV2Theme as theme } from './HybridNatureTechV2Theme';

/* ─── Keyframe Animations ─── */
const jellyFloat = keyframes`
  0% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-18px) rotate(2deg); }
  50% { transform: translateY(-8px) rotate(-1deg); }
  75% { transform: translateY(-22px) rotate(1.5deg); }
  100% { transform: translateY(0) rotate(0deg); }
`;

const bubbleRise = keyframes`
  0% { transform: translateY(100%) translateX(0); opacity: 0; }
  10% { opacity: 0.6; }
  50% { transform: translateY(40%) translateX(8px); opacity: 0.4; }
  80% { opacity: 0.2; }
  100% { transform: translateY(-20%) translateX(-4px); opacity: 0; }
`;

const biolumPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(0, 180, 216, 0.15), 0 0 60px rgba(0, 180, 216, 0.05); }
  50% { box-shadow: 0 0 30px rgba(0, 180, 216, 0.3), 0 0 80px rgba(0, 180, 216, 0.1); }
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

const Jellyfish = styled.div<{
  $size: string;
  $top: string;
  $left: string;
  $delay: number;
  $duration: number;
}>`
  position: absolute;
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  border-radius: 50% 50% 40% 40%;
  background: radial-gradient(
    ellipse at 50% 40%,
    rgba(0, 180, 216, 0.12),
    rgba(72, 202, 228, 0.06) 50%,
    transparent 70%
  );
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  animation: ${jellyFloat} ${({ $duration }) => $duration}s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  filter: blur(1px);
  z-index: 0;

  &::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: 20%;
    width: 60%;
    height: 40%;
    background: linear-gradient(
      180deg,
      rgba(0, 180, 216, 0.08),
      transparent
    );
    filter: blur(4px);
  }
`;

const Bubble = styled.div<{
  $size: string;
  $left: string;
  $delay: number;
  $duration: number;
}>`
  position: absolute;
  bottom: 0;
  left: ${({ $left }) => $left};
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(72, 202, 228, 0.25),
    rgba(0, 180, 216, 0.08) 60%,
    transparent
  );
  border: 1px solid rgba(72, 202, 228, 0.1);
  animation: ${bubbleRise} ${({ $duration }) => $duration}s ease-in infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  z-index: 0;
`;

const HeroLabel = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: ${theme.colors.primary};
  margin: 0 0 16px;
  z-index: 1;
`;

const HeroTitle = styled(motion.h1)`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 800;
  color: ${theme.colors.text};
  margin: 0 0 20px;
  line-height: 1.1;
  z-index: 1;
`;

const OceanText = styled.span`
  color: ${theme.colors.primary};
`;

const CoralText = styled.span`
  color: ${theme.colors.secondary};
`;

const HeroSubtitle = styled(motion.p)`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: ${theme.colors.textSecondary};
  max-width: 560px;
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
    box-shadow: 0 8px 32px rgba(0, 180, 216, 0.35), 0 4px 16px rgba(0, 150, 199, 0.2);
    transform: translateY(-2px);
  }
`;

/* ─── Shared Section Layout ─── */
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
  font-size: 0.875rem;
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

/* ─── Programs ─── */
const ProgramGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const DepthCard = styled(motion.div)`
  background: ${theme.gradients.card};
  border: 1px solid rgba(0, 180, 216, 0.12);
  border-radius: ${theme.borderRadius};
  padding: 36px 28px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(8px);
  transition: all 0.3s;

  &:hover {
    border-color: rgba(0, 180, 216, 0.3);
    box-shadow: 0 0 24px rgba(0, 180, 216, 0.1);
    transform: translateY(-4px);
  }

  &::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 15%;
    right: 15%;
    height: 2px;
    background: ${theme.gradients.cta};
    border-radius: 0 0 4px 4px;
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover::before {
    opacity: 1;
  }
`;

const CardIconContainer = styled.div<{ $color: string }>`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${({ $color }) => $color}12;
  border: 1px solid ${({ $color }) => $color}25;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: ${({ $color }) => $color};
  animation: ${biolumPulse} 4s ease-in-out infinite;
`;

const CardTitle = styled.h3`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${theme.colors.text};
  margin: 0 0 10px;
`;

const CardDesc = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.95rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.65;
  margin: 0;
`;

/* ─── Testimonials ─── */
const TestimonialGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const TestimonialCard = styled(motion.blockquote)`
  background: ${theme.colors.surface};
  border: 1px solid rgba(0, 180, 216, 0.08);
  border-left: 3px solid ${theme.colors.secondary};
  border-radius: ${theme.borderRadius};
  padding: 32px;
  margin: 0;
  backdrop-filter: blur(8px);
  transition: border-color 0.3s;

  &:hover {
    border-left-color: ${theme.colors.primary};
  }
`;

const TestimonialText = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1.05rem;
  color: ${theme.colors.text};
  line-height: 1.7;
  margin: 0 0 16px;
  font-style: italic;
`;

const TestimonialAuthor = styled.cite`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 0.85rem;
  font-style: normal;
  font-weight: 600;
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

const CTAGlow = styled.div`
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(0, 180, 216, 0.12),
    transparent 70%
  );
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ${biolumPulse} 5s ease-in-out infinite;
  z-index: 0;
`;

const CTATitle = styled.h2`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  color: ${theme.colors.text};
  margin: 0 0 16px;
`;

const CTASubtext = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1.05rem;
  color: ${theme.colors.textSecondary};
  max-width: 520px;
  margin: 0 auto 36px;
  line-height: 1.65;
`;

/* ─── Footer ─── */
const Footer = styled.footer`
  padding: 48px 24px;
  background: #030A14;
  border-top: 1px solid rgba(0, 180, 216, 0.1);
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
    font-weight: 700;
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
    margin: 0;
  }
`;

const FooterCol = styled.div`
  h4 {
    font-family: '${theme.fonts.display}', sans-serif;
    font-size: 0.875rem;
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
    &:hover {
      color: ${theme.colors.primary};
    }
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: ${theme.colors.textSecondary};
  margin-bottom: 10px;

  svg {
    color: ${theme.colors.primary};
    flex-shrink: 0;
  }
`;

const Copyright = styled.div`
  text-align: center;
  padding-top: 32px;
  margin-top: 32px;
  border-top: 1px solid rgba(0, 180, 216, 0.06);
  font-size: 0.8125rem;
  color: ${theme.colors.textSecondary};
`;

/* ─── Component ─── */
const HybridNatureTechV2Homepage: React.FC = () => {
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
        {/* Decorative jellyfish */}
        <Jellyfish
          $size="280px"
          $top="8%"
          $left="5%"
          $delay={0}
          $duration={8}
          aria-hidden="true"
        />
        <Jellyfish
          $size="200px"
          $top="35%"
          $left="75%"
          $delay={2}
          $duration={10}
          aria-hidden="true"
        />
        <Jellyfish
          $size="150px"
          $top="60%"
          $left="15%"
          $delay={4}
          $duration={9}
          aria-hidden="true"
        />
        <Jellyfish
          $size="120px"
          $top="15%"
          $left="60%"
          $delay={1}
          $duration={11}
          aria-hidden="true"
        />

        {/* Decorative bubbles */}
        <Bubble $size="6px" $left="20%" $delay={0} $duration={7} aria-hidden="true" />
        <Bubble $size="4px" $left="35%" $delay={2} $duration={9} aria-hidden="true" />
        <Bubble $size="8px" $left="55%" $delay={1} $duration={8} aria-hidden="true" />
        <Bubble $size="5px" $left="70%" $delay={3} $duration={10} aria-hidden="true" />
        <Bubble $size="3px" $left="85%" $delay={5} $duration={6} aria-hidden="true" />
        <Bubble $size="7px" $left="10%" $delay={4} $duration={11} aria-hidden="true" />
        <Bubble $size="4px" $left="45%" $delay={6} $duration={8} aria-hidden="true" />
        <Bubble $size="5px" $left="90%" $delay={2} $duration={9} aria-hidden="true" />

        <HeroLabel>Deep Ocean Training</HeroLabel>
        <HeroTitle {...fadeUp}>
          Dive <OceanText>Deeper</OceanText> Than
          <br />
          You Thought <CoralText>Possible</CoralText>
        </HeroTitle>
        <HeroSubtitle {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
          Beneath the surface lies untapped strength. Our deep ocean protocols
          push you past perceived limits, building resilience forged under
          pressure and power that surfaces when it counts.
        </HeroSubtitle>
        <GradientButton
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.4 }}
          onClick={() => navigate('/store')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          Begin Your Descent <ArrowRight size={18} />
        </GradientButton>
      </Hero>

      {/* ─── Programs ─── */}
      <Section>
        <SectionInner>
          <SectionLabel>Depth Protocols</SectionLabel>
          <SectionTitle>
            Your <OceanText>Training</OceanText> Expeditions
          </SectionTitle>
          <ProgramGrid>
            <DepthCard {...fadeUp}>
              <CardIconContainer $color={theme.colors.primary}>
                <Anchor size={26} />
              </CardIconContainer>
              <CardTitle>Deep Dive Strength</CardTitle>
              <CardDesc>
                Anchor yourself to foundational power. Progressive overload
                protocols designed to build strength from the ocean floor up
                — compound movements, heavy lifts, and pressure-tested
                technique that forges unshakable resilience.
              </CardDesc>
            </DepthCard>
            <DepthCard {...fadeUp} transition={{ duration: 0.6, delay: 0.15 }}>
              <CardIconContainer $color={theme.colors.secondary}>
                <Compass size={26} />
              </CardIconContainer>
              <CardTitle>Navigate & Endure</CardTitle>
              <CardDesc>
                Chart your course through demanding endurance circuits. Like
                navigating deep currents, our cardio protocols build the
                stamina and mental fortitude to keep moving forward when
                the pressure mounts and others surface.
              </CardDesc>
            </DepthCard>
            <DepthCard {...fadeUp} transition={{ duration: 0.6, delay: 0.3 }}>
              <CardIconContainer $color={theme.colors.accent}>
                <Fish size={26} />
              </CardIconContainer>
              <CardTitle>Adaptive Flow</CardTitle>
              <CardDesc>
                Move with the fluidity of ocean life. Mobility, flexibility,
                and functional movement patterns that let your body adapt to
                any environment. Recovery-focused sessions that restore
                balance and prepare you for the next deep dive.
              </CardDesc>
            </DepthCard>
          </ProgramGrid>
        </SectionInner>
      </Section>

      {/* ─── Testimonials ─── */}
      <Section $bg="rgba(4, 13, 26, 0.95)">
        <SectionInner>
          <SectionLabel>Echoes from the Deep</SectionLabel>
          <SectionTitle>
            What Our <CoralText>Explorers</CoralText> Say
          </SectionTitle>
          <TestimonialGrid>
            <TestimonialCard {...fadeUp}>
              <TestimonialText>
                "I came in thinking I knew my limits. Three months later, I
                realize I was only at the surface. The depth-based training
                philosophy here is unlike anything I've experienced — every
                session pushes me further, and every rest day builds me
                stronger."
              </TestimonialText>
              <TestimonialAuthor>
                — Marcus T., Explorer since 2024
              </TestimonialAuthor>
            </TestimonialCard>
            <TestimonialCard {...fadeUp} transition={{ duration: 0.6, delay: 0.15 }}>
              <TestimonialText>
                "SwanStudios understands that real transformation happens under
                pressure. Their trainers don't just push you — they guide you
                through the deep waters and make sure you come up stronger
                every single time."
              </TestimonialText>
              <TestimonialAuthor>
                — Elena R., Explorer since 2025
              </TestimonialAuthor>
            </TestimonialCard>
          </TestimonialGrid>
        </SectionInner>
      </Section>

      {/* ─── CTA ─── */}
      <CTASection>
        <CTAGlow aria-hidden="true" />
        <motion.div
          {...fadeUp}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <SectionLabel>Ready?</SectionLabel>
          <CTATitle>
            Take the <OceanText>Plunge</OceanText>
          </CTATitle>
          <CTASubtext>
            The deepest waters hold the greatest rewards. Stop treading at
            the surface and discover what your body is truly capable of
            when you commit to going deeper.
          </CTASubtext>
          <GradientButton
            onClick={() => navigate('/store')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Explore Packages <ArrowRight size={18} />
          </GradientButton>
        </motion.div>
      </CTASection>

      {/* ─── Footer ─── */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <h3>SwanStudios</h3>
            <p>
              Deep ocean fitness in Anaheim Hills, California. Dive deeper
              than you thought possible.
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
        <Copyright>
          &copy; {new Date().getFullYear()} SwanStudios. All rights reserved.
        </Copyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default HybridNatureTechV2Homepage;
