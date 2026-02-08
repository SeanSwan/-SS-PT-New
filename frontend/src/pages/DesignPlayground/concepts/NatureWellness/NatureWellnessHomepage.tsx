import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Leaf, Sun, Droplets, Wind, Heart, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import { natureWellnessTheme as theme } from './NatureWellnessTheme';

/* ─── Animations ─── */
const breathe = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.15); opacity: 1; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
`;

const sway = keyframes`
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
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

const BotanicalSilhouette = styled.div`
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(46, 125, 50, 0.12) 0%, transparent 70%);
  animation: ${breathe} 6s ease-in-out infinite;
  z-index: 0;

  @media (min-width: 768px) {
    width: 450px;
    height: 450px;
  }
`;

const BreathePrompt = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  color: ${theme.colors.primary};
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 16px;
  animation: ${breathe} 6s ease-in-out infinite;
  z-index: 1;
`;

const HeroTitle = styled(motion.h1)`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 800;
  color: ${theme.colors.text};
  margin: 0 0 16px;
  line-height: 1.15;
  z-index: 1;
`;

const HeroAccent = styled.span`
  color: ${theme.colors.primary};
`;

const HeroSubtitle = styled(motion.p)`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: ${theme.colors.textSecondary};
  max-width: 600px;
  margin: 0 0 40px;
  line-height: 1.7;
  z-index: 1;
`;

const HeroCTA = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 36px;
  background: ${theme.gradients.cta};
  color: ${theme.colors.textOnPrimary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 52px;
  z-index: 1;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 36px rgba(46, 125, 50, 0.35);
  }
`;

const FloatingLeaf = styled.div<{ $top: string; $left: string; $delay: string }>`
  position: absolute;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  animation: ${float} 4s ease-in-out ${({ $delay }) => $delay} infinite,
    ${sway} 3s ease-in-out ${({ $delay }) => $delay} infinite;
  opacity: 0.3;
  z-index: 0;
  color: ${theme.colors.primary};
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
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: ${theme.colors.primary};
  margin: 0 0 8px;
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-family: '${theme.fonts.display}', serif;
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
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ProgramCard = styled(motion.div)`
  background: ${theme.colors.surface};
  border-radius: ${theme.borderRadius};
  padding: 32px 24px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  transition: all 0.3s;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 40px rgba(46, 125, 50, 0.12);
  }
`;

const ProgramIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(46, 125, 50, 0.1), rgba(91, 155, 213, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: ${theme.colors.primary};
`;

const ProgramName = styled.h3`
  font-family: '${theme.fonts.display}', serif;
  font-size: 1.3rem;
  font-weight: 600;
  color: ${theme.colors.text};
  margin: 0 0 8px;
`;

const ProgramDesc = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.95rem;
  color: ${theme.colors.textSecondary};
  line-height: 1.6;
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
  border-radius: ${theme.borderRadius};
  padding: 32px;
  margin: 0;
  border-left: 4px solid ${theme.colors.accent};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
`;

const TestimonialText = styled.p`
  font-family: '${theme.fonts.display}', serif;
  font-size: 1.1rem;
  font-style: italic;
  color: ${theme.colors.text};
  line-height: 1.7;
  margin: 0 0 16px;
`;

const TestimonialAuthor = styled.cite`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.9rem;
  font-style: normal;
  font-weight: 600;
  color: ${theme.colors.primary};
`;

/* ─── CTA Section ─── */
const CTASection = styled.section`
  padding: 100px 24px;
  background: linear-gradient(180deg, ${theme.colors.background} 0%, #E8F5E9 50%, ${theme.colors.background} 100%);
  text-align: center;
`;

const CTATitle = styled.h2`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  color: ${theme.colors.text};
  margin: 0 0 16px;
`;

const CTASubtext = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1.1rem;
  color: ${theme.colors.textSecondary};
  max-width: 500px;
  margin: 0 auto 32px;
  line-height: 1.6;
`;

/* ─── Footer ─── */
const Footer = styled.footer`
  padding: 48px 24px;
  background: #2E4A2E;
  color: #d4e8d4;
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
    font-family: '${theme.fonts.display}', serif;
    font-size: 1.5rem;
    color: #ffffff;
    margin: 0 0 8px;
  }
  p {
    font-size: 0.9rem;
    line-height: 1.6;
    opacity: 0.8;
  }
`;

const FooterLinks = styled.div`
  h4 {
    font-family: '${theme.fonts.body}', sans-serif;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: ${theme.colors.accent};
    margin: 0 0 16px;
  }
  a, a:visited {
    display: block;
    color: #d4e8d4;
    text-decoration: none;
    font-size: 0.9rem;
    margin-bottom: 8px;
    transition: color 0.2s;
    &:hover { color: #ffffff; }
  }
`;

const FooterContact = styled.div`
  h4 {
    font-family: '${theme.fonts.body}', sans-serif;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: ${theme.colors.accent};
    margin: 0 0 16px;
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  margin-bottom: 8px;
  opacity: 0.8;
`;

const Copyright = styled.div`
  text-align: center;
  padding-top: 32px;
  margin-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.8rem;
  opacity: 0.6;
`;

/* ─── Component ─── */
const NatureWellnessHomepage: React.FC = () => {
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
        <FloatingLeaf $top="15%" $left="10%" $delay="0s"><Leaf size={32} /></FloatingLeaf>
        <FloatingLeaf $top="25%" $left="85%" $delay="1s"><Leaf size={24} /></FloatingLeaf>
        <FloatingLeaf $top="70%" $left="15%" $delay="2s"><Leaf size={20} /></FloatingLeaf>
        <FloatingLeaf $top="60%" $left="80%" $delay="0.5s"><Leaf size={28} /></FloatingLeaf>

        <BotanicalSilhouette />
        <BreathePrompt>Breathe with us</BreathePrompt>
        <HeroTitle {...fadeUp}>
          Train in <HeroAccent>Harmony</HeroAccent><br />
          with Nature
        </HeroTitle>
        <HeroSubtitle {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
          Experience fitness as it was meant to be — holistic, intentional, and deeply connected
          to the natural world. Your body is a garden; let us help it flourish.
        </HeroSubtitle>
        <HeroCTA
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.4 }}
          onClick={() => navigate('/store')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          Begin Your Journey <ArrowRight size={18} />
        </HeroCTA>
      </Hero>

      {/* ─── Programs ─── */}
      <Section>
        <SectionInner>
          <SectionLabel>Our Programs</SectionLabel>
          <SectionTitle>Rooted in Science, Inspired by Nature</SectionTitle>
          <ProgramGrid>
            <ProgramCard {...fadeUp}>
              <ProgramIcon><Sun size={28} /></ProgramIcon>
              <ProgramName>Strength & Vitality</ProgramName>
              <ProgramDesc>
                Build functional strength through movement patterns inspired by natural biomechanics.
                Progressive overload meets mindful execution.
              </ProgramDesc>
            </ProgramCard>
            <ProgramCard {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}>
              <ProgramIcon><Droplets size={28} /></ProgramIcon>
              <ProgramName>Recovery & Flow</ProgramName>
              <ProgramDesc>
                Restore balance with mobility work, breathwork, and active recovery sessions.
                Because growth happens in the rest between storms.
              </ProgramDesc>
            </ProgramCard>
            <ProgramCard {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }}>
              <ProgramIcon><Wind size={28} /></ProgramIcon>
              <ProgramName>Endurance & Spirit</ProgramName>
              <ProgramDesc>
                Challenge your cardiovascular system with varied, engaging protocols.
                Run further, breathe deeper, live fuller.
              </ProgramDesc>
            </ProgramCard>
          </ProgramGrid>
        </SectionInner>
      </Section>

      {/* ─── Testimonials ─── */}
      <Section $bg="#F0EDE5">
        <SectionInner>
          <SectionLabel>Stories of Growth</SectionLabel>
          <SectionTitle>From Our Community</SectionTitle>
          <TestimonialGrid>
            <TestimonialCard {...fadeUp}>
              <TestimonialText>
                "Training at SwanStudios changed how I see fitness. It's no longer something I dread —
                it's the most peaceful, empowering part of my day."
              </TestimonialText>
              <TestimonialAuthor>— Sarah M., Client since 2024</TestimonialAuthor>
            </TestimonialCard>
            <TestimonialCard {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}>
              <TestimonialText>
                "The holistic approach here is unmatched. My trainer understands that wellness is
                mind, body, and spirit. I've never felt stronger or more balanced."
              </TestimonialText>
              <TestimonialAuthor>— James R., Client since 2025</TestimonialAuthor>
            </TestimonialCard>
          </TestimonialGrid>
        </SectionInner>
      </Section>

      {/* ─── CTA ─── */}
      <CTASection>
        <motion.div {...fadeUp}>
          <SectionLabel>Ready?</SectionLabel>
          <CTATitle>Your Transformation Starts Here</CTATitle>
          <CTASubtext>
            Join a community of people who believe fitness should nourish, not punish.
          </CTASubtext>
          <HeroCTA
            onClick={() => navigate('/store')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
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
              Excellence in Performance Training. Transforming lives through personalized,
              nature-inspired fitness programs in Anaheim Hills, California.
            </p>
          </FooterBrand>
          <FooterLinks>
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/store">Store</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </FooterLinks>
          <FooterContact>
            <h4>Contact</h4>
            <ContactItem><MapPin size={14} /> Anaheim Hills, CA</ContactItem>
            <ContactItem><Phone size={14} /> (714) 947-3221</ContactItem>
            <ContactItem><Mail size={14} /> loveswanstudios@protonmail.com</ContactItem>
          </FooterContact>
        </FooterInner>
        <Copyright>2026 SwanStudios. All rights reserved.</Copyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default NatureWellnessHomepage;
