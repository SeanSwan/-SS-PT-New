import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Award, Clock, MapPin, Phone, Mail } from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import { marbleLuxuryTheme as theme } from './MarbleLuxuryTheme';

/* ─── Animations ─── */
const goldShine = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const marbleShift = keyframes`
  0% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
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
`;

const MarbleTexture = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0.04;
  background: repeating-conic-gradient(
    from 45deg at 50% 50%,
    #d4c5a9 0deg 30deg,
    transparent 30deg 60deg,
    #c9a959 60deg 90deg,
    transparent 90deg 120deg
  );
  background-size: 200px 200px;
  animation: ${marbleShift} 30s ease-in-out infinite;
`;

const GoldDivider = styled.div`
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, ${theme.colors.secondary}, transparent);
  margin: 0 auto 24px;
`;

const HeroLabel = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 6px;
  color: ${theme.colors.secondary};
  margin: 0 0 24px;
  z-index: 1;
`;

const HeroTitle = styled(motion.h1)`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(3rem, 7vw, 5.5rem);
  font-weight: 400;
  font-style: italic;
  color: ${theme.colors.text};
  margin: 0 0 24px;
  line-height: 1.1;
  z-index: 1;
`;

const HeroSubtitle = styled(motion.p)`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.15rem);
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  max-width: 550px;
  margin: 0 0 40px;
  line-height: 1.8;
  letter-spacing: 0.5px;
  z-index: 1;
`;

const LuxuryButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 48px;
  background: ${theme.colors.primary};
  color: ${theme.colors.textOnPrimary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.4s;
  min-height: 52px;
  z-index: 1;

  &:hover {
    background: ${theme.colors.secondary};
    color: ${theme.colors.primary};
    letter-spacing: 5px;
  }
`;

/* ─── Programs Section ─── */
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

const SectionTitle = styled.h2`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 400;
  font-style: italic;
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

const ProgramRow = styled(motion.div)<{ $reverse?: boolean }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
  margin-bottom: 80px;
  align-items: center;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
    direction: ${({ $reverse }) => ($reverse ? 'rtl' : 'ltr')};
    & > * { direction: ltr; }
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const ProgramImage = styled.div<{ $accent: string }>`
  height: 350px;
  background: linear-gradient(135deg, #E8E4DD 0%, ${({ $accent }) => $accent}22 100%);
  border-radius: ${theme.borderRadius};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ $accent }) => $accent};
  }
`;

const ProgramImageIcon = styled.div`
  color: ${theme.colors.secondary};
  opacity: 0.3;
`;

const ProgramContent = styled.div`
  padding: 16px 0;
`;

const ProgramNumber = styled.span`
  font-family: '${theme.fonts.display}', serif;
  font-size: 4rem;
  font-weight: 300;
  color: ${theme.colors.secondary};
  opacity: 0.3;
  line-height: 1;
`;

const ProgramName = styled.h3`
  font-family: '${theme.fonts.display}', serif;
  font-size: 1.8rem;
  font-weight: 500;
  color: ${theme.colors.text};
  margin: 8px 0 16px;
`;

const ProgramDesc = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1rem;
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  line-height: 1.8;
  margin: 0;
`;

/* ─── Testimonials ─── */
const TestimonialSection = styled(Section)`
  text-align: center;
`;

const PullQuote = styled(motion.blockquote)`
  max-width: 800px;
  margin: 0 auto 48px;
  padding: 0;
`;

const QuoteText = styled.p`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(1.3rem, 3vw, 1.8rem);
  font-style: italic;
  font-weight: 400;
  color: ${theme.colors.text};
  line-height: 1.7;
  margin: 0 0 24px;
`;

const QuoteAuthor = styled.cite`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.9rem;
  font-style: normal;
  font-weight: 500;
  color: ${theme.colors.secondary};
  letter-spacing: 2px;
  text-transform: uppercase;
`;

/* ─── CTA ─── */
const CTASection = styled.section`
  padding: 120px 24px;
  background: ${theme.colors.primary};
  text-align: center;
`;

const CTATitle = styled.h2`
  font-family: '${theme.fonts.display}', serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  font-style: italic;
  color: ${theme.colors.textOnPrimary};
  margin: 0 0 16px;
`;

const CTASubtext = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 1rem;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.7);
  max-width: 500px;
  margin: 0 auto 40px;
  line-height: 1.7;
  letter-spacing: 0.5px;
`;

const InvertedButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 48px;
  background: ${theme.colors.textOnPrimary};
  color: ${theme.colors.primary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.4s;
  min-height: 52px;

  &:hover {
    background: ${theme.colors.secondary};
    color: ${theme.colors.primary};
  }
`;

/* ─── Footer ─── */
const Footer = styled.footer`
  padding: 64px 24px 32px;
  background: ${theme.colors.background};
  border-top: 1px solid #E8E4DD;
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
    font-style: italic;
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
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: ${theme.colors.secondary};
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
    &:hover { color: ${theme.colors.secondary}; }
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
  border-top: 1px solid #E8E4DD;
  text-align: center;
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.75rem;
  font-weight: 300;
  color: ${theme.colors.textSecondary};
  letter-spacing: 2px;
  text-transform: uppercase;
`;

/* ─── Component ─── */
const MarbleLuxuryHomepage: React.FC = () => {
  const navigate = useNavigate();

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  };

  return (
    <ConceptWrapper theme={theme}>
      {/* ─── Hero ─── */}
      <Hero>
        <MarbleTexture />
        <HeroLabel>Swan Studios — Est. 2018</HeroLabel>
        <GoldDivider />
        <HeroTitle {...fadeUp}>
          Where Excellence<br />Meets Elegance
        </HeroTitle>
        <HeroSubtitle {...fadeUp} transition={{ duration: 0.7, delay: 0.2 }}>
          A private training atelier where every session is crafted with the precision of a master artisan.
          This is not a gym. This is your sanctuary.
        </HeroSubtitle>
        <LuxuryButton
          {...fadeUp}
          transition={{ duration: 0.7, delay: 0.4 }}
          onClick={() => navigate('/store')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Discover Excellence <ArrowRight size={16} />
        </LuxuryButton>
      </Hero>

      {/* ─── Programs ─── */}
      <Section>
        <SectionInner>
          <GoldDivider />
          <SectionTitle>The Art of Training</SectionTitle>
          <SectionSubtitle>Three pillars of our approach, refined over years of dedicated practice.</SectionSubtitle>

          <ProgramRow {...fadeUp}>
            <ProgramImage $accent={theme.colors.secondary}>
              <ProgramImageIcon><Star size={64} /></ProgramImageIcon>
            </ProgramImage>
            <ProgramContent>
              <ProgramNumber>01</ProgramNumber>
              <ProgramName>Bespoke Strength</ProgramName>
              <ProgramDesc>
                Every program is tailored to your unique physiology, goals, and lifestyle.
                We don't believe in templates — only in craftsmanship. Your body deserves
                a training program as unique as your fingerprint.
              </ProgramDesc>
            </ProgramContent>
          </ProgramRow>

          <ProgramRow $reverse {...fadeUp}>
            <ProgramImage $accent={theme.colors.accent}>
              <ProgramImageIcon><Award size={64} /></ProgramImageIcon>
            </ProgramImage>
            <ProgramContent>
              <ProgramNumber>02</ProgramNumber>
              <ProgramName>Restorative Wellness</ProgramName>
              <ProgramDesc>
                Recovery is not passive — it is an art form. Our integrated approach combines
                mobility work, nutrition science, and mindfulness practices to ensure your body
                performs at its absolute finest.
              </ProgramDesc>
            </ProgramContent>
          </ProgramRow>

          <ProgramRow {...fadeUp}>
            <ProgramImage $accent={theme.colors.secondary}>
              <ProgramImageIcon><Clock size={64} /></ProgramImageIcon>
            </ProgramImage>
            <ProgramContent>
              <ProgramNumber>03</ProgramNumber>
              <ProgramName>Enduring Performance</ProgramName>
              <ProgramDesc>
                We build athletes for life, not just for the season. Our progressive methodology
                ensures sustainable results that compound year after year, creating a legacy
                of vitality and strength.
              </ProgramDesc>
            </ProgramContent>
          </ProgramRow>
        </SectionInner>
      </Section>

      {/* ─── Testimonial ─── */}
      <TestimonialSection $bg="#F5F3EE">
        <SectionInner>
          <GoldDivider />
          <PullQuote {...fadeUp}>
            <QuoteText>
              "Training at SwanStudios is unlike anything else. The attention to detail,
              the personalized approach, the environment — it's luxury fitness redefined.
              I've never felt more confident in my body."
            </QuoteText>
            <QuoteAuthor>— Alexandra K., Member since 2024</QuoteAuthor>
          </PullQuote>
          <PullQuote {...fadeUp}>
            <QuoteText>
              "Sean doesn't just train bodies — he transforms mindsets. Every session feels
              like an investment in my future self. The results speak for themselves."
            </QuoteText>
            <QuoteAuthor>— Michael T., Member since 2023</QuoteAuthor>
          </PullQuote>
        </SectionInner>
      </TestimonialSection>

      {/* ─── CTA ─── */}
      <CTASection>
        <motion.div {...fadeUp}>
          <GoldDivider />
          <CTATitle>Begin Your Journey</CTATitle>
          <CTASubtext>
            Excellence is not a destination — it is a practice. Allow us to guide yours.
          </CTASubtext>
          <InvertedButton
            onClick={() => navigate('/store')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            View Packages <ArrowRight size={16} />
          </InvertedButton>
        </motion.div>
      </CTASection>

      {/* ─── Footer ─── */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <h3>SwanStudios</h3>
            <p>
              A private training atelier in Anaheim Hills, California.
              Excellence in performance training since 2018.
            </p>
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
        <Copyright>2026 Swan Studios — All Rights Reserved</Copyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default MarbleLuxuryHomepage;
