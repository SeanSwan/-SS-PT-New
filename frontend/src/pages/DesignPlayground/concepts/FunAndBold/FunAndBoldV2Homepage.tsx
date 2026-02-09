import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Rocket, Sparkles, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import ConceptWrapper from '../shared/ConceptWrapper';
import { funAndBoldV2Theme as theme } from './FunAndBoldV2Theme';

/* ─── Keyframe Animations ─── */
const neonFlicker = keyframes`
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
    opacity: 1;
    text-shadow: 0 0 7px ${theme.colors.primary}, 0 0 20px ${theme.colors.primary},
      0 0 40px ${theme.colors.primary}, 0 0 80px ${theme.colors.primary};
  }
  20%, 24%, 55% { opacity: 0.6; text-shadow: none; }
`;

const bounce = keyframes`
  0% { transform: translateY(0); }
  30% { transform: translateY(-18px); }
  50% { transform: translateY(-4px); }
  70% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
`;

const confettiBurst = keyframes`
  0% { transform: scale(0) rotate(0deg); opacity: 1; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
  100% { transform: scale(0) rotate(360deg); opacity: 0; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(5deg); }
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

const NeonShape = styled.div<{ $type: 'circle' | 'diamond' | 'triangle'; $top: string; $left: string }>`
  position: absolute;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  opacity: 0.4;
  animation: ${float} 5s ease-in-out infinite;

  ${({ $type }) => $type === 'circle' && `
    width: 100px; height: 100px;
    border: 3px solid ${theme.colors.secondary};
    border-radius: 50%;
    box-shadow: 0 0 10px ${theme.colors.secondary}, 0 0 30px ${theme.colors.secondary},
      inset 0 0 10px ${theme.colors.secondary};
    @media (max-width: 768px) { width: 50px; height: 50px; }
  `}

  ${({ $type }) => $type === 'diamond' && `
    width: 36px; height: 36px;
    border: 2px solid ${theme.colors.primary};
    transform: rotate(45deg);
    box-shadow: 0 0 8px ${theme.colors.primary}, inset 0 0 8px ${theme.colors.primary};
    animation-delay: 2s;
  `}

  ${({ $type }) => $type === 'triangle' && `
    width: 0; height: 0;
    border-left: 35px solid transparent;
    border-right: 35px solid transparent;
    border-bottom: 60px solid ${theme.colors.accent}33;
    filter: drop-shadow(0 0 8px ${theme.colors.accent});
    animation-delay: 1s;
    @media (max-width: 768px) { border-left-width: 18px; border-right-width: 18px; border-bottom-width: 30px; }
  `}
`;

const ConfettiDot = styled.div<{ $color: string; $top: string; $left: string; $delay: string; $size: string }>`
  position: absolute;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  background: ${({ $color }) => $color};
  border-radius: 2px;
  animation: ${confettiBurst} 3s ease-out ${({ $delay }) => $delay} infinite;
  opacity: 0;
`;

const HeroLabel = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: rgba(255, 56, 100, 0.15);
  border: 1px solid ${theme.colors.primary};
  color: ${theme.colors.primary};
  border-radius: 50px;
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 28px;
  z-index: 1;
  box-shadow: 0 0 15px rgba(255, 56, 100, 0.2);
`;

const HeroTitle = styled(motion.h1)`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(3rem, 9vw, 6.5rem);
  font-weight: 900;
  color: ${theme.colors.text};
  margin: 0 0 12px;
  line-height: 1.0;
  z-index: 1;
  text-transform: uppercase;
`;

const NeonWord = styled.span`
  color: ${theme.colors.primary};
  animation: ${neonFlicker} 3s ease-in-out 1s forwards;
  text-shadow: 0 0 7px ${theme.colors.primary}, 0 0 20px ${theme.colors.primary},
    0 0 40px ${theme.colors.primary};
`;

const CyanWord = styled.span`
  color: ${theme.colors.secondary};
  text-shadow: 0 0 7px ${theme.colors.secondary}, 0 0 20px ${theme.colors.secondary};
`;

const HeroTagline = styled(motion.p)`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(1.1rem, 2.5vw, 1.5rem);
  font-weight: 600;
  color: ${theme.colors.accent};
  margin: 0 0 16px;
  z-index: 1;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const HeroSubtitle = styled(motion.p)`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: ${theme.colors.textSecondary};
  max-width: 520px;
  margin: 0 0 40px;
  line-height: 1.7;
  z-index: 1;
`;

const ArcadeButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 18px 44px;
  background: ${theme.gradients.cta};
  color: ${theme.colors.textOnPrimary};
  border: none;
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  min-height: 52px;
  z-index: 1;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 6px 30px rgba(255, 56, 100, 0.4), 0 0 15px rgba(255, 56, 100, 0.2);
  transition: box-shadow 0.3s;
  &:hover {
    box-shadow: 0 8px 40px rgba(255, 56, 100, 0.6), 0 0 25px rgba(255, 56, 100, 0.3);
  }
`;

/* ─── Shared Section ─── */
const Section = styled.section<{ $bg?: string }>`
  padding: 80px 24px;
  background: ${({ $bg }) => $bg || theme.colors.background};
  @media (min-width: 768px) { padding: 120px 40px; }
`;

const SectionInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionLabel = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${theme.colors.secondary};
  margin: 0 0 8px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 3px;
`;

const SectionTitle = styled.h2`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  color: ${theme.colors.text};
  text-align: center;
  margin: 0 0 56px;
  text-transform: uppercase;
`;

/* ─── Programs ─── */
const ProgramGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
`;

const ProgramCard = styled(motion.div)<{ $borderColor: string }>`
  background: ${theme.gradients.card};
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-top: 4px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${theme.borderRadius};
  padding: 36px 28px;
  text-align: center;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: default;
  &:hover {
    transform: translateY(-8px) perspective(600px) rotateX(2deg) rotateY(-2deg);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 20px ${({ $borderColor }) => $borderColor}33;
  }
`;

const CardIconWrap = styled.div<{ $glowColor: string }>`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: ${({ $glowColor }) => `${$glowColor}15`};
  border: 1px solid ${({ $glowColor }) => `${$glowColor}33`};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  box-shadow: 0 0 20px ${({ $glowColor }) => `${$glowColor}22`};
`;

const CardTitle = styled.h3`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 1.3rem;
  font-weight: 800;
  color: ${theme.colors.text};
  margin: 0 0 10px;
  text-transform: uppercase;
`;

const CardDesc = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

/* ─── Stats / Leaderboard ─── */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  @media (min-width: 768px) { grid-template-columns: repeat(4, 1fr); }
`;

const StatPanel = styled(motion.div)<{ $accentColor: string }>`
  background: ${theme.colors.surface};
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${theme.borderRadius};
  padding: 36px 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 3px;
    background: ${({ $accentColor }) => $accentColor};
    border-radius: 0 0 4px 4px;
    box-shadow: 0 0 12px ${({ $accentColor }) => $accentColor};
  }
`;

const StatNumber = styled.div<{ $color: string }>`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  color: ${({ $color }) => $color};
  margin-bottom: 8px;
  text-shadow: 0 0 20px ${({ $color }) => `${$color}66`};
`;

const StatLabel = styled.div`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

/* ─── CTA ─── */
const CTASection = styled.section`
  padding: 100px 24px;
  background: ${theme.colors.background};
  text-align: center;
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, ${theme.colors.primary}15 0%, ${theme.colors.secondary}08 40%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }
`;

const CTATitle = styled.h2`
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: clamp(2.5rem, 7vw, 4.5rem);
  font-weight: 900;
  color: ${theme.colors.text};
  margin: 0 0 8px;
  text-transform: uppercase;
  position: relative;
  z-index: 1;
`;

const CTANeonText = styled.span`
  color: ${theme.colors.secondary};
  text-shadow: 0 0 10px ${theme.colors.secondary}, 0 0 30px ${theme.colors.secondary},
    0 0 60px ${theme.colors.secondary};
`;

const CTASubtext = styled.p`
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: ${theme.colors.textSecondary};
  max-width: 460px;
  margin: 16px auto 40px;
  line-height: 1.7;
  position: relative;
  z-index: 1;
`;

const CTAButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 18px 44px;
  background: transparent;
  color: ${theme.colors.secondary};
  border: 2px solid ${theme.colors.secondary};
  border-radius: ${theme.borderRadius};
  font-family: '${theme.fonts.display}', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  cursor: pointer;
  min-height: 52px;
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 15px ${theme.colors.secondary}33, inset 0 0 15px ${theme.colors.secondary}11;
  transition: all 0.3s;
  &:hover {
    background: ${theme.colors.secondary};
    color: ${theme.colors.textOnPrimary};
    box-shadow: 0 0 30px ${theme.colors.secondary}66, 0 8px 30px rgba(0, 0, 0, 0.3);
  }
`;

/* ─── Footer ─── */
const Footer = styled.footer`
  padding: 56px 24px 32px;
  background: #0A0A14;
  color: ${theme.colors.textSecondary};
`;

const FooterInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 36px;
  @media (min-width: 768px) { grid-template-columns: 2fr 1fr 1fr; }
`;

const FooterBrand = styled.div`
  h3 {
    font-family: '${theme.fonts.display}', sans-serif;
    font-size: 1.6rem;
    font-weight: 900;
    color: ${theme.colors.text};
    margin: 0 0 6px;
    text-transform: uppercase;
    span { color: ${theme.colors.primary}; text-shadow: 0 0 10px ${theme.colors.primary}66; }
  }
  p {
    font-family: '${theme.fonts.body}', sans-serif;
    font-size: 0.9rem;
    line-height: 1.6;
    color: ${theme.colors.textSecondary};
    margin: 0;
    max-width: 300px;
  }
`;

const FooterCol = styled.div`
  h4 {
    font-family: '${theme.fonts.display}', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    color: ${theme.colors.secondary};
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 0 0 16px;
  }
  a {
    display: block;
    color: ${theme.colors.textSecondary};
    text-decoration: none;
    font-family: '${theme.fonts.body}', sans-serif;
    font-size: 0.9rem;
    margin-bottom: 10px;
    transition: color 0.2s, text-shadow 0.2s;
    &:hover {
      color: ${theme.colors.primary};
      text-shadow: 0 0 8px ${theme.colors.primary}44;
    }
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.85rem;
  color: ${theme.colors.textSecondary};
  margin-bottom: 10px;
  svg { color: ${theme.colors.accent}; flex-shrink: 0; }
`;

const Copyright = styled.div`
  max-width: 1200px;
  margin: 40px auto 0;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  text-align: center;
  font-family: '${theme.fonts.body}', sans-serif;
  font-size: 0.8rem;
  color: ${theme.colors.textSecondary};
  opacity: 0.6;
  span { color: ${theme.colors.primary}; font-weight: 700; }
`;

/* ─── Component ─── */
const FunAndBoldV2Homepage: React.FC = () => {
  const navigate = useNavigate();

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: 0.5 },
  };

  const programs = [
    {
      icon: Gamepad2,
      title: 'Boss Mode Training',
      desc: 'Full-body strength battles that level you up every single session. Defeat your limits. Unlock your final form.',
      color: theme.colors.primary,
    },
    {
      icon: Trophy,
      title: 'Achievement Unlocked',
      desc: 'Goal-based programs with real milestones. Track your XP, earn achievements, and celebrate every personal record.',
      color: theme.colors.secondary,
    },
    {
      icon: Rocket,
      title: 'Rocket Fuel Cardio',
      desc: 'High-octane cardio that launches your endurance into orbit. Fast, intense, and never boring.',
      color: theme.colors.accent,
    },
  ];

  const stats = [
    { value: '500+', label: 'Players Joined', color: theme.colors.primary },
    { value: '98%', label: 'Win Rate', color: theme.colors.secondary },
    { value: '15+', label: 'Seasons', color: theme.colors.accent },
    { value: '1M+', label: 'XP Earned', color: theme.colors.primary },
  ];

  return (
    <ConceptWrapper theme={theme}>
      {/* ─── Hero ─── */}
      <Hero>
        <NeonShape $type="circle" $top="10%" $left="82%" aria-hidden="true" />
        <NeonShape $type="triangle" $top="72%" $left="6%" aria-hidden="true" />
        <NeonShape $type="diamond" $top="45%" $left="12%" aria-hidden="true" />

        <ConfettiDot $color={theme.colors.primary} $top="20%" $left="25%" $delay="0s" $size="6px" aria-hidden="true" />
        <ConfettiDot $color={theme.colors.secondary} $top="70%" $left="80%" $delay="0.5s" $size="5px" aria-hidden="true" />
        <ConfettiDot $color={theme.colors.accent} $top="35%" $left="70%" $delay="1s" $size="7px" aria-hidden="true" />
        <ConfettiDot $color={theme.colors.primary} $top="80%" $left="15%" $delay="1.5s" $size="4px" aria-hidden="true" />
        <ConfettiDot $color={theme.colors.secondary} $top="15%" $left="55%" $delay="2s" $size="5px" aria-hidden="true" />
        <ConfettiDot $color={theme.colors.accent} $top="55%" $left="40%" $delay="2.5s" $size="6px" aria-hidden="true" />

        <HeroLabel {...fadeUp}>
          <Sparkles size={16} /> Insert Coin to Begin
        </HeroLabel>

        <HeroTitle {...fadeUp}>
          <NeonWord>GAME</NeonWord><br />
          <CyanWord>ON.</CyanWord>
        </HeroTitle>

        <HeroTagline {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }}>
          {theme.tagline}
        </HeroTagline>

        <HeroSubtitle {...fadeUp} transition={{ duration: 0.5, delay: 0.25 }}>
          This isn't your average gym. It's a neon-lit arena where every
          rep is a power-up and every session is a new high score. Ready to play?
        </HeroSubtitle>

        <ArcadeButton
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.4 }}
          onClick={() => navigate('/store')}
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.95 }}
        >
          START GAME <ArrowRight size={20} />
        </ArcadeButton>
      </Hero>

      {/* ─── Programs ─── */}
      <Section>
        <SectionInner>
          <SectionLabel>Select Your Class</SectionLabel>
          <SectionTitle>
            Choose Your <NeonWord style={{ fontSize: 'inherit' }}>Game</NeonWord>
          </SectionTitle>
          <ProgramGrid>
            {programs.map((program, i) => (
              <ProgramCard
                key={program.title}
                $borderColor={program.color}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <CardIconWrap $glowColor={program.color}>
                  <program.icon size={28} color={program.color} />
                </CardIconWrap>
                <CardTitle>{program.title}</CardTitle>
                <CardDesc>{program.desc}</CardDesc>
              </ProgramCard>
            ))}
          </ProgramGrid>
        </SectionInner>
      </Section>

      {/* ─── Stats / Leaderboard ─── */}
      <Section $bg="#0A0A14">
        <SectionInner>
          <SectionLabel>Global Rankings</SectionLabel>
          <SectionTitle>Leaderboard</SectionTitle>
          <StatsGrid>
            {stats.map((stat, i) => (
              <StatPanel
                key={stat.label}
                $accentColor={stat.color}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <StatNumber $color={stat.color}>{stat.value}</StatNumber>
                <StatLabel>{stat.label}</StatLabel>
              </StatPanel>
            ))}
          </StatsGrid>
        </SectionInner>
      </Section>

      {/* ─── CTA ─── */}
      <CTASection>
        <motion.div {...fadeUp}>
          <CTATitle>
            READY<br />
            <CTANeonText>PLAYER ONE?</CTANeonText>
          </CTATitle>
          <CTASubtext>
            The arena is waiting. Your character is built. All that's
            left is to press start and begin your transformation quest.
          </CTASubtext>
          <CTAButton
            onClick={() => navigate('/store')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            PRESS START <ArrowRight size={20} />
          </CTAButton>
        </motion.div>
      </CTASection>

      {/* ─── Footer ─── */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <h3>Swan<span>Studios</span></h3>
            <p>
              Neon-powered fitness in Anaheim Hills, California.
              Every session is a new high score.
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
          &copy; 2026 <span>SwanStudios</span> &mdash; All Rights Reserved. GG.
        </Copyright>
      </Footer>
    </ConceptWrapper>
  );
};

export default FunAndBoldV2Homepage;
