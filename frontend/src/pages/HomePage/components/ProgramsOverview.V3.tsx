import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled, { css } from "styled-components";
import { motion, useInView } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import GlowButton from "../../../components/ui/buttons/GlowButton";
import ParallaxImageBackground from "../../../components/ui/backgrounds/ParallaxImageBackground";
import paintAbImage from "../../../assets/paint-ab.png";

// ═══════════════════════════════════════════════════
// Programs Overview V3 — Ethereal Wilderness Theme
// ═══════════════════════════════════════════════════
// Cormorant Garamond headings, Source Sans 3 body,
// Ethereal Wilderness tokens, glass-morphism cards
// ═══════════════════════════════════════════════════

// --- Design Tokens (from EtherealWildernessTheme) ---
const T = {
  bg: '#0a0a1a',
  surface: 'rgba(15, 25, 35, 0.92)',
  primary: '#00D4AA',
  secondary: '#7851A9',
  accent: '#48E8C8',
  text: '#F0F8FF',
  textSecondary: '#8AA8B8',
} as const;

const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// === STYLED COMPONENTS ===

const Section = styled.section`
  padding: 6rem 2rem;
  position: relative;
  overflow: hidden;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 4rem;

  h2 {
    font-family: 'Cormorant Garamond', 'Georgia', serif;
    font-size: 3rem;
    font-weight: 600;
    font-style: italic;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, ${T.text} 0%, ${T.primary} 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;

    @media (max-width: 768px) {
      font-size: 2.2rem;
    }
  }

  p {
    color: ${T.textSecondary};
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.7;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-width: 450px;
    margin: 0 auto;
  }
`;

const Card = styled(motion.div)`
  position: relative;
  height: 600px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 212, 170, 0.12);
  background: ${T.surface};
  backdrop-filter: blur(12px);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  display: flex;
  flex-direction: column;
  ${noMotion}

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 50px -10px rgba(0, 212, 170, 0.15),
                0 0 30px rgba(0, 212, 170, 0.05);
    border-color: rgba(0, 212, 170, 0.3);
  }
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      to bottom,
      rgba(10, 10, 26, 0.3) 0%,
      rgba(10, 10, 26, 0.8) 50%,
      rgba(10, 10, 26, 0.98) 100%
    );
    z-index: 1;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.6;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.6;
    position: absolute;
    top: 0;
    left: 0;
  }
`;

const Content = styled.div`
  position: relative;
  z-index: 2;
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

const Badge = styled.div`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(0, 212, 170, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 212, 170, 0.25);
  padding: 0.5rem 1rem;
  border-radius: 50px;
  color: ${T.primary};
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  z-index: 3;
`;

const PlanName = styled.h3`
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 2rem;
  font-weight: 600;
  color: ${T.text};
  margin-bottom: 0.5rem;
`;

const Tagline = styled.div`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 1rem;
  color: ${T.primary};
  margin-bottom: 0.75rem;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
`;

const WhoFor = styled.div`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.9rem;
  color: ${T.textSecondary};
  margin-bottom: 1.5rem;
  font-style: italic;
`;

const OutcomesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
`;

const OutcomeItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: rgba(240, 248, 255, 0.9);
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.95rem;
  line-height: 1.4;

  svg {
    color: ${T.primary};
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const CTAFooter = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 3rem;
  padding-top: 2rem;

  @media (max-width: 768px) {
    margin-top: 2rem;
    padding: 0 1rem;

    button, div {
      width: 100%;
    }
  }
`;

// === COMPONENT ===

interface ProgramCardProps {
  title: string;
  tagline: string;
  outcomes: string[];
  whoFor: string;
  videoSrc?: string;
  imageSrc: string;
  badge?: string;
  delay: number;
  theme: 'primary' | 'cosmic' | 'emerald';
}

const ProgramCard: React.FC<ProgramCardProps> = ({
  title,
  tagline,
  outcomes,
  whoFor,
  videoSrc,
  imageSrc,
  badge,
  delay,
  theme
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const isInView = useInView(cardRef, { amount: 0.5 });

  useEffect(() => {
    if (videoRef.current) {
      if (isInView) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isInView]);

  return (
    <Card
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      <VideoBackground>
        <img src={imageSrc} alt={`${title} program background`} />
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={imageSrc}
            muted
            loop
            playsInline
            preload="none"
          />
        )}
      </VideoBackground>

      {badge && <Badge>{badge}</Badge>}

      <Content>
        <PlanName>{title}</PlanName>
        <Tagline>{tagline}</Tagline>
        <WhoFor>{whoFor}</WhoFor>

        <OutcomesList>
          {outcomes.map((outcome, idx) => (
            <OutcomeItem key={idx}>
              <Check size={18} />
              {outcome}
            </OutcomeItem>
          ))}
        </OutcomesList>

        <GlowButton
          text="View in Store"
          theme={theme}
          size="large"
          fullWidth
          onClick={() => navigate('/shop')}
          rightIcon={<ArrowRight size={18} />}
        />
      </Content>
    </Card>
  );
};

const ProgramsOverviewV3: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Section id="programs">
      <ParallaxImageBackground src={paintAbImage} overlayOpacity={0.85} />
      <Container>
        <Header>
          <h2>Discover Your Path</h2>
          <p>
            Every transformation begins with understanding your body. Our NASM-certified
            programs assess your movement patterns and craft a strategy that
            delivers lasting results. Explore packages and pricing in our store.
          </p>
        </Header>

        <Grid>
          {/* CARD 1: Express Precision */}
          <ProgramCard
            title="Express Precision"
            tagline="Refined for Busy Schedules"
            whoFor="Ideal for: Professionals who demand maximum efficiency"
            outcomes={[
              "30-minute high-intensity precision sessions",
              "Metabolic conditioning for rapid results",
              "Mobility + key compound lifts focus",
              "Flexible scheduling that fits your life"
            ]}
            imageSrc="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop"
            delay={0}
            theme="primary"
          />

          {/* CARD 2: Signature Performance */}
          <ProgramCard
            title="Signature Performance"
            tagline="The Premium Coaching Experience"
            whoFor="Ideal for: Serious athletes and goal-driven individuals"
            outcomes={[
              "60-minute expert biomechanical coaching",
              "Full NASM movement analysis (OHSA protocol)",
              "Strength + hypertrophy programming",
              "Optional AI performance tracking upgrade"
            ]}
            imageSrc="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop"
            badge="Most Popular"
            delay={0.2}
            theme="cosmic"
          />

          {/* CARD 3: Transformation Program */}
          <ProgramCard
            title="Transformation Programs"
            tagline="Commit to Lasting Change"
            whoFor="Ideal for: Clients ready for a meaningful lifestyle investment"
            outcomes={[
              "Multi-session commitment packages available",
              "Comprehensive NASM assessment included",
              "Priority scheduling + progress tracking",
              "Best value for serious transformation goals"
            ]}
            imageSrc="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1470&auto=format&fit=crop"
            badge="Best Value"
            delay={0.4}
            theme="emerald"
          />
        </Grid>

        <CTAFooter>
          <GlowButton
            text="View All Packages & Pricing"
            onClick={() => navigate('/shop')}
            size="large"
            theme="cosmic"
            rightIcon={<ArrowRight size={20} />}
          />
        </CTAFooter>
      </Container>
    </Section>
  );
};

export default ProgramsOverviewV3;
