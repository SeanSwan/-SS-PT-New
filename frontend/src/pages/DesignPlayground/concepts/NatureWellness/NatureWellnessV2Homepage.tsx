import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Mountain, Waves, TreePine, Wind, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import { natureWellnessV2Theme as theme } from './NatureWellnessV2Theme';

/* ─── Keyframe Animations ─── */

const inkWash = keyframes`
  0% {
    opacity: 0;
    filter: blur(8px);
  }
  60% {
    opacity: 0.8;
    filter: blur(2px);
  }
  100% {
    opacity: 1;
    filter: blur(0);
  }
`;

const stoneStack = keyframes`
  0% {
    opacity: 0;
    transform: translateY(24px);
  }
  60% {
    opacity: 1;
    transform: translateY(-4px);
  }
  80% {
    transform: translateY(2px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ripple = keyframes`
  0% {
    transform: scale(0.6);
    opacity: 0.6;
  }
  50% {
    transform: scale(1);
    opacity: 0.3;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
`;

/* ─── Hero ─── */

const Hero = styled.section`
  min-height: 100vh;
  background: radial-gradient(ellipse at 50% 30%, rgba(107, 143, 113, 0.15), transparent 50%),
    linear-gradient(180deg, ${theme.colors.background} 0%, #232B23 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 120px 24px 80px;
  position: relative;
  overflow: hidden;
`;

const EnsoCircle = styled.div`
  position: absolute;
  width: 320px;
  height: 320px;
  border: 3px solid rgba(107, 143, 113, 0.12);
  border-radius: 50%;
  border-top-color: rgba(196, 163, 90, 0.18);
  border-right-color: transparent;
  animation: ${inkWash} 3s ease-out forwards;
  z-index: 0;

  &::after {
    content: '';
    position: absolute;
    top: -8px;
    right: 40px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(196, 163, 90, 0.2);
  }

  @media (min-width: 768px) {
    width: 480px;
    height: 480px;

    &::after {
      top: -10px;
      right: 60px;
      width: 20px;
      height: 20px;
    }
  }
`;

const RippleRing = styled.div<{ $delay: string; $size: string }>`
  position: absolute;
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  border: 1px solid rgba(107, 143, 113, 0.08);
  border-radius: 50%;
  animation: ${ripple} 6s ease-out ${({ $delay }) => $delay} infinite;
  z-index: 0;
`;

const HeroTitle = styled(motion.h1)`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 700;
  color: ${theme.colors.text};
  margin: 0 0 20px;
  line-height: 1.15;
  letter-spacing: -0.02em;
  z-index: 1;
`;

const HeroAccent = styled.span`
  color: ${theme.colors.primary};
`;

const HeroTagline = styled(motion.p)`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.2rem);
  color: ${theme.colors.textSecondary};
  max-width: 520px;
  margin: 0 0 48px;
  line-height: 1.8;
  letter-spacing: 0.02em;
  z-index: 1;
`;

const HeroCTA = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 40px;
  background: linear-gradient(135deg, ${theme.colors.primary}, #5A7A60);
  color: ${theme.colors.textOnPrimary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 52px;
  z-index: 1;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(107, 143, 113, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

/* ─── Shared Section Components ─── */

const Section = styled.section<{ $bg?: string }>`
  padding: 80px 24px;
  background: ${({ $bg }) => $bg || theme.colors.background};

  @media (min-width: 768px) {
    padding: 120px 40px;
  }
`;

const SectionInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const SectionLabel = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: ${theme.colors.secondary};
  margin: 0 0 8px;
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 600;
  color: ${theme.colors.text};
  text-align: center;
  margin: 0 0 56px;
  letter-spacing: -0.01em;
`;

/* ─── Programs Section ─── */

const ProgramGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
`;

const ProgramCard = styled(motion.div)`
  background: ${theme.gradients.card};
  border-radius: ${theme.borderRadius};
  padding: 36px 28px;
  border-left: 3px solid ${theme.colors.secondary};
  transition: all 0.35s ease;
  animation: ${stoneStack} 0.8s ease-out backwards;

  &:nth-child(2) {
    animation-delay: 0.15s;
  }
  &:nth-child(3) {
    animation-delay: 0.3s;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(107, 143, 113, 0.1);
    border-left-color: ${theme.colors.primary};
  }
`;

const ProgramIconWrap = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: ${theme.colors.primary};
`;

const ProgramName = styled.h3`
  font-family: '${theme.fonts.display}', serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${theme.colors.text};
  margin: 0 0 10px;
`;

const ProgramDesc = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.92rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.7;
  margin: 0;
`;

/* ─── Testimonials ─── */

const TestimonialGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }
`;

const TestimonialCard = styled(motion.blockquote)`
  background: ${theme.colors.surface};
  border-radius: ${theme.borderRadius};
  padding: 36px 32px;
  margin: 0;
  border-left: 3px solid ${theme.colors.accent};
  position: relative;

  &::before {
    content: '\u201C';
    position: absolute;
    top: 12px;
    left: 16px;
    font-family: '${theme.fonts.display}', serif;
    font-size: 3rem;
    color: rgba(107, 143, 113, 0.15);
    line-height: 1;
  }
`;

const TestimonialText = styled.p`
  font-family: '${theme.fonts.display}', serif;
  font-size: 1.05rem;
  font-style: italic;
  color: ${theme.colors.text};
  line-height: 1.8;
  margin: 0 0 20px;
`;

const TestimonialAuthor = styled.cite`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  font-style: normal;
  font-weight: 500;
  color: ${theme.colors.secondary};
  letter-spacing: 0.5px;
`;

/* ─── CTA Section ─── */

const CTASection = styled.section`
  padding: 100px 24px;
  background: radial-gradient(
      ellipse at 50% 50%,
      rgba(107, 143, 113, 0.08),
      transparent 60%
    ),
    ${theme.colors.background};
  text-align: center;

  @media (min-width: 768px) {
    padding: 140px 40px;
  }
`;

const CTATitle = styled.h2`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 600;
  color: ${theme.colors.text};
  margin: 0 0 16px;
  letter-spacing: -0.01em;
`;

const CTASubtext = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1.05rem;
  color: ${theme.colors.textSecondary};
  max-width: 480px;
  margin: 0 auto 40px;
  line-height: 1.7;
`;

const CTADivider = styled.div`
  width: 48px;
  height: 2px;
  background: ${theme.colors.secondary};
  margin: 0 auto 32px;
  opacity: 0.6;
`;

/* ─── Footer ─── */

const Footer = styled.footer`
  padding: 56px 24px 32px;
  background: #151A15;
  color: ${theme.colors.text};
`;

const FooterInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 36px;

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr 1fr;
  }
`;

const FooterBrand = styled.div`
  h3 {
    font-family: '${theme.fonts.display}', serif;
    font-size: 1.4rem;
    font-weight: 600;
    color: ${theme.colors.text};
    margin: 0 0 10px;
  }

  p {
    font-family: '${theme.fonts.body}', sans-serif;
    font-size: 0.88rem;
    line-height: 1.7;
    color: ${theme.colors.textSecondary};
    max-width: 320px;
  }
`;

const FooterColumn = styled.div`
  h4 {
    font-family: '${theme.fonts.body}', sans-serif;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: ${theme.colors.secondary};
    margin: 0 0 18px;
  }

  a,
  a:visited {
    display: block;
    color: ${theme.colors.textSecondary};
    text-decoration: none;
    font-family: '${theme.fonts.body}', sans-serif;
    font-size: 0.88rem;
    margin-bottom: 10px;
    transition: color 0.2s ease;

    &:hover {
      color: ${theme.colors.text};
    }
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.88rem;
  color: ${theme.colors.textSecondary};
  margin-bottom: 10px;
`;

const Copyright = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  text-align: center;
  padding-top: 32px;
  margin-top: 40px;
  border-top: 1px solid rgba(107, 143, 113, 0.1);
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.82rem;
  color: ${theme.colors.textSecondary};
  opacity: 0.6;
`;

/* ─── Component ─── */

const NatureWellnessV2Homepage: React.FC = () => {
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
        <EnsoCircle aria-hidden="true" />
        <RippleRing $delay="0s" $size="200px" aria-hidden="true" />
        <RippleRing $delay="2s" $size="300px" aria-hidden="true" />
        <RippleRing $delay="4s" $size="420px" aria-hidden="true" />

        <HeroTitle {...fadeUp}>
          <HeroAccent>Stillness</HeroAccent> is
          <br />
          Strength
        </HeroTitle>
        <HeroTagline {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
          Dive deeper than you thought possible. Train with intention, move with purpose,
          and discover the quiet power within.
        </HeroTagline>
        <HeroCTA
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.4 }}
          onClick={() => navigate('/store')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Enter the Garden <ArrowRight size={18} />
        </HeroCTA>
      </Hero>

      {/* ─── Programs ─── */}
      <Section>
        <SectionInner>
          <motion.div {...fadeUp}>
            <SectionLabel>Our Paths</SectionLabel>
            <SectionTitle>Three Stones, One Cairn</SectionTitle>
          </motion.div>
          <ProgramGrid>
            <ProgramCard {...fadeUp}>
              <ProgramIconWrap>
                <Mountain size={28} strokeWidth={1.5} />
              </ProgramIconWrap>
              <ProgramName>Mountain Strength</ProgramName>
              <ProgramDesc>
                Rooted and immovable. Build foundational power through deliberate,
                compound movements. Each rep placed with the patience of stacking
                stones beside still water.
              </ProgramDesc>
            </ProgramCard>
            <ProgramCard {...fadeUp} transition={{ duration: 0.6, delay: 0.12 }}>
              <ProgramIconWrap>
                <Waves size={28} strokeWidth={1.5} />
              </ProgramIconWrap>
              <ProgramName>Flow & Flexibility</ProgramName>
              <ProgramDesc>
                Water finds its way. Restore range of motion and cultivate fluidity
                through mobility work, breathwork, and mindful stretching that
                honors the body's natural rhythms.
              </ProgramDesc>
            </ProgramCard>
            <ProgramCard {...fadeUp} transition={{ duration: 0.6, delay: 0.24 }}>
              <ProgramIconWrap>
                <TreePine size={28} strokeWidth={1.5} />
              </ProgramIconWrap>
              <ProgramName>Forest Endurance</ProgramName>
              <ProgramDesc>
                The bamboo bends but never breaks. Push your limits with sustained
                effort protocols that build cardiovascular resilience and the mental
                fortitude of old-growth timber.
              </ProgramDesc>
            </ProgramCard>
          </ProgramGrid>
        </SectionInner>
      </Section>

      {/* ─── Testimonials ─── */}
      <Section $bg="#1E261E">
        <SectionInner>
          <motion.div {...fadeUp}>
            <SectionLabel>Voices of the Garden</SectionLabel>
            <SectionTitle>Words Like Smooth Stones</SectionTitle>
          </motion.div>
          <TestimonialGrid>
            <TestimonialCard {...fadeUp}>
              <TestimonialText>
                "I came for the workouts but stayed for the stillness. There is a
                rare calm here that seeps into every part of your life. I move
                differently now — with intention, not urgency."
              </TestimonialText>
              <TestimonialAuthor>— Mika T., Client since 2024</TestimonialAuthor>
            </TestimonialCard>
            <TestimonialCard {...fadeUp} transition={{ duration: 0.6, delay: 0.12 }}>
              <TestimonialText>
                "SwanStudios taught me that strength isn't loud. The meditative
                approach to training has transformed not just my body but the way
                I breathe through every challenge."
              </TestimonialText>
              <TestimonialAuthor>— David L., Client since 2025</TestimonialAuthor>
            </TestimonialCard>
          </TestimonialGrid>
        </SectionInner>
      </Section>

      {/* ─── CTA ─── */}
      <CTASection>
        <motion.div {...fadeUp}>
          <SectionLabel>Begin</SectionLabel>
          <CTADivider aria-hidden="true" />
          <CTATitle>Find Your Center</CTATitle>
          <CTASubtext>
            Step onto the path. In the quiet space between effort and rest,
            you will discover what your body has always known.
          </CTASubtext>
          <HeroCTA
            onClick={() => navigate('/store')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            View Packages <ArrowRight size={18} />
          </HeroCTA>
        </motion.div>
      </CTASection>

      {/* ─── Footer ─── */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <h3>SwanStudios</h3>
            <p>
              Excellence in Performance Training. Where ancient calm meets modern
              strength in the hills of Anaheim, California.
            </p>
          </FooterBrand>
          <FooterColumn>
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/store">Store</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </FooterColumn>
          <FooterColumn>
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
          </FooterColumn>
        </FooterInner>
        <Copyright>&copy; 2026 SwanStudios. All rights reserved.</Copyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default NatureWellnessV2Homepage;
