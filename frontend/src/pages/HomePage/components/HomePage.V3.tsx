import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users,
  Target, Building2, Star, ChevronDown, ChevronUp,
  Sparkles, Clock, Award, TrendingUp,
} from 'lucide-react';

import GlowButton from '../../../components/ui/buttons/GlowButton';
import OrientationForm from '../../../components/OrientationForm/orientationForm';
import ParallaxHero from '../../../components/ui-kit/cinematic/ParallaxHero';
import ScrollReveal from '../../../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../../../components/ui-kit/cinematic/TypewriterText';
import SectionDivider from '../../../components/ui-kit/cinematic/SectionDivider';
import logoImg from '../../../assets/Logo.png';

/* ═══════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════ */

const features = [
  {
    icon: <Dumbbell size={28} />,
    title: 'Elite Personal Training',
    description:
      'Personalized coaching from NCEP-certified experts trained in NASM protocols, with over 25 years of experience. Science-based programming tailored to your goals.',
  },
  {
    icon: <Activity size={28} />,
    title: 'Performance Assessment',
    description:
      'Comprehensive evaluation using NASM OPT model principles to analyze movement patterns, identify imbalances, and build your optimal program.',
  },
  {
    icon: <Apple size={28} />,
    title: 'Nutrition Coaching',
    description:
      'Evidence-based nutrition protocols, personalized macro planning, and sustainable eating strategies that fuel your training and recovery.',
  },
  {
    icon: <Heart size={28} />,
    title: 'Recovery & Mobility',
    description:
      'Corrective exercise strategies, mobility training, and myofascial release techniques guided by NASM CES principles for injury prevention.',
  },
  {
    icon: <Monitor size={28} />,
    title: 'Online Coaching',
    description:
      'Expert guidance anywhere with customized training programs, nutrition plans, and regular check-ins through our AI-powered coaching platform.',
  },
  {
    icon: <Users size={28} />,
    title: 'Group Performance',
    description:
      'Exclusive small-group sessions combining group energy with personalized attention for maximum results at an accessible price point.',
  },
  {
    icon: <Target size={28} />,
    title: 'Sports-Specific Training',
    description:
      'Specialized programs targeting the specific skills, movements, and energy systems your sport demands. Built on periodization best practices.',
  },
  {
    icon: <Building2 size={28} />,
    title: 'Corporate Wellness',
    description:
      'Comprehensive corporate wellness programs including on-site fitness sessions, workshops, and wellness challenges to boost team performance.',
  },
];

const programs = [
  {
    title: 'Express Precision',
    tagline: '30-Minute Sessions',
    description: 'Maximum efficiency for busy professionals. Targeted, time-optimized training.',
    badge: null,
  },
  {
    title: 'Signature Performance',
    tagline: '60-Minute Sessions',
    description: 'Full biomechanical coaching with movement analysis using NASM OHSA protocol.',
    badge: 'Most Popular',
  },
  {
    title: 'Transformation Programs',
    tagline: 'Multi-Session Packages',
    description: 'Comprehensive assessment using NASM guidelines with priority scheduling and progress tracking.',
    badge: 'Best Value',
  },
];

const testimonials = [
  {
    name: 'Sarah J.',
    descriptor: 'Corporate Executive',
    rating: 5,
    quote:
      'Thanks to SwanStudios personal training, I achieved an incredible transformation. The tailored workouts and nutrition plan helped me lose 42 lbs, and I feel more energetic and confident than ever.',
    result: 'Lost 42 lbs in 7 months',
  },
  {
    name: 'Carlos M.',
    descriptor: 'Semi-Pro Soccer Player',
    rating: 5,
    quote:
      'SwanStudios coaching not only accelerated my recovery but also boosted my performance on the field. Their expert guidance and personalized approach made all the difference.',
    result: 'Sprint time improved 15%',
  },
  {
    name: 'David C.',
    descriptor: 'Tech Entrepreneur',
    rating: 4.9,
    quote:
      'The personalized training at SwanStudios truly transformed my lifestyle. I built strength, improved my overall wellness, and gained the confidence to balance my busy schedule.',
    result: 'Bench press: 95 → 205 lbs',
  },
];

const stats = [
  { value: '25+', label: 'Years Experience', icon: <Award size={24} /> },
  { value: '500+', label: 'Clients Transformed', icon: <Users size={24} /> },
  { value: '10,000+', label: 'Sessions Delivered', icon: <TrendingUp size={24} /> },
  { value: '98%', label: 'Client Satisfaction', icon: <Star size={24} /> },
];

const creativeCards = [
  {
    title: 'Dance & Movement',
    description: 'Express yourself through rhythm and movement. Build core strength, coordination, and confidence through dance-inspired fitness.',
    icon: <Sparkles size={28} />,
  },
  {
    title: 'Art & Expression',
    description: 'Channel your inner artist. Creativity and fitness intersect to build discipline, focus, and a deeper mind-body connection.',
    icon: <Activity size={28} />,
  },
  {
    title: 'Community & Heart',
    description: 'Join a tribe that celebrates every win. Our community promotes love, unity, and positive motivation on your fitness journey.',
    icon: <Heart size={28} />,
  },
];

/* ═══════════════════════════════════════════════════════
   STYLED COMPONENTS — All theme-aware, zero hardcoded colors
   ═══════════════════════════════════════════════════════ */

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.text.body};
`;

const HeroLogo = styled.img`
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 0 20px ${({ theme }) =>
    theme.effects.glowIntensity !== 'none'
      ? `${theme.colors.primary}40`
      : 'transparent'});
`;

const HeroHeadline = styled.h1`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin-bottom: 1rem;
  line-height: 1.2;
`;

const HeroSubtitle = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 2rem;
  letter-spacing: 0.5px;
`;

const HeroButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const Section = styled.section<{ $alt?: boolean }>`
  width: 100%;
  padding: 5rem 1.5rem;
  background: ${({ theme, $alt }) =>
    $alt ? theme.background.secondary : theme.background.primary};

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
`;

const SectionInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  text-align: center;
  margin-bottom: 0.75rem;
`;

const SectionSubtitle = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  color: ${({ theme }) => theme.text.secondary};
  text-align: center;
  max-width: 700px;
  margin: 0 auto 3rem;
  line-height: 1.6;
`;

/* Features Grid */
const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(12px)' : 'none'};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 16px;
  padding: 2rem 1.5rem;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) =>
      theme.effects.glowIntensity !== 'none'
        ? theme.shadows.glow
        : theme.shadows.elevation};
  }
`;

const FeatureIcon = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
`;

const FeatureTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin-bottom: 0.75rem;
`;

const FeatureDesc = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text.muted};
  line-height: 1.55;
`;

/* Programs Grid */
const ProgramsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ProgramCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(12px)' : 'none'};
  border: ${({ theme }) => theme.borders.elegant};
  border-radius: 16px;
  padding: 2.5rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-4px);
  }
`;

const ProgramBadge = styled.span`
  position: absolute;
  top: 16px;
  right: 16px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) =>
    theme.id === 'crystalline-light' ? '#FFFFFF' : theme.background.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProgramTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin-bottom: 0.5rem;
`;

const ProgramTagline = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 600;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ProgramDesc = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text.secondary};
  line-height: 1.6;
`;

/* About/Bio Section */
const AboutGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 3rem;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const AboutText = styled.div`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1rem;
  color: ${({ theme }) => theme.text.body};
  line-height: 1.7;

  p {
    margin-bottom: 1.25rem;
  }

  strong {
    color: ${({ theme }) => theme.text.heading};
  }
`;

const AboutLogoWrapper = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const AboutLogo = styled.img`
  width: 220px;
  height: 220px;
  object-fit: contain;
  filter: drop-shadow(0 0 30px ${({ theme }) =>
    theme.effects.glowIntensity !== 'none'
      ? `${theme.colors.primary}30`
      : 'transparent'});
`;

/* Testimonials */
const TestimonialsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TestimonialCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(12px)' : 'none'};
  border: ${({ theme }) => theme.borders.elegant};
  border-radius: 16px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StarRating = styled.div`
  display: flex;
  gap: 4px;
  color: ${({ theme }) => theme.colors.accent || '#C6A84B'};
`;

const TestimonialQuote = styled.div`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 1rem;
  font-style: italic;
  color: ${({ theme }) => theme.text.body};
  line-height: 1.65;
  flex: 1;
  min-height: 120px;
`;

const ClientName = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
`;

const ResultBadge = styled.span`
  display: inline-block;
  background: ${({ theme }) =>
    theme.effects.glowIntensity !== 'none'
      ? `${theme.colors.primary}15`
      : `${theme.colors.primary}10`};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.8rem;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}30`};
  align-self: flex-start;
`;

/* Stats */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(10px)' : 'none'};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 16px;
  padding: 2rem 1.5rem;
  text-align: center;
`;

const StatIcon = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: center;
`;

const StatValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 2.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text.heading};
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.text.muted};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

/* Creative Section */
const CreativeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CreativeCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(10px)' : 'none'};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 16px;
  padding: 2rem 1.5rem;
  text-align: center;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-3px);
  }
`;

/* CTA Section */
const CTASection = styled.section`
  width: 100%;
  padding: 5rem 1.5rem;
  background: ${({ theme }) => theme.background.secondary};
  text-align: center;
`;

const CTAInner = styled.div`
  max-width: 700px;
  margin: 0 auto;
`;

const CTAText = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const CTAButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */

const HomePageV3: React.FC = () => {
  const navigate = useNavigate();
  const [showOrientation, setShowOrientation] = useState(false);

  return (
    <PageWrapper>
      <Helmet>
        <title>SwanStudios | Elite Personal Training & Creative Wellness</title>
        <meta
          name="description"
          content="Transform your fitness journey with SwanStudios' elite personal training. NCEP-certified coaching using NASM guidelines with over 25 years of experience in performance, dance, and creative wellness."
        />
        <meta
          name="keywords"
          content="personal training, fitness, NCEP certified, NASM protocols, dance, creative expression, wellness, performance training, elite coaching"
        />
        <meta property="og:title" content="SwanStudios | Elite Personal Training" />
        <meta
          property="og:description"
          content="Experience the world's first Fitness Social Ecosystem with NCEP-certified expert trainers and AI-powered tracking."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/Logo.png" />
        <link rel="canonical" href="https://sswanstudios.com" />
      </Helmet>

      {/* ── 1. HERO ──────────────────────────────────── */}
      <ParallaxHero videoSrc="/Swans.mp4" overlayOpacity={0.6} minHeight="100vh">
        <HeroLogo src={logoImg} alt="SwanStudios Logo" />
        <HeroHeadline>
          <TypewriterText text="Where Excellence Meets Precision" as="span" speed={50} />
        </HeroHeadline>
        <HeroSubtitle>
          NCEP-Certified Personal Training · 25+ Years of Experience · NASM-Guided Protocols
        </HeroSubtitle>
        <HeroButtons>
          <GlowButton
            text="Start My Fitness Journey"
            variant="primary"
            size="large"
            onClick={() => navigate('/shop')}
            animateOnRender
          />
          <GlowButton
            text="Book Free Consultation"
            variant="accent"
            size="large"
            onClick={() => setShowOrientation(true)}
            animateOnRender
          />
        </HeroButtons>
      </ParallaxHero>

      <SectionDivider />

      {/* ── 2. FEATURES ─────────────────────────────── */}
      <Section>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>Our Services</SectionTitle>
            <SectionSubtitle>
              Comprehensive fitness solutions built on NASM best practices and over
              25 years of hands-on coaching experience.
            </SectionSubtitle>
          </ScrollReveal>

          <FeaturesGrid>
            {features.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.08}>
                <FeatureCard>
                  <FeatureIcon>{f.icon}</FeatureIcon>
                  <FeatureTitle>{f.title}</FeatureTitle>
                  <FeatureDesc>{f.description}</FeatureDesc>
                </FeatureCard>
              </ScrollReveal>
            ))}
          </FeaturesGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 3. PROGRAMS ─────────────────────────────── */}
      <Section $alt>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>Discover Your Path</SectionTitle>
            <SectionSubtitle>
              Every transformation begins with understanding your body. Our NCEP-certified
              coaches use NASM-guided protocols to assess your movement patterns and craft
              a strategy that delivers lasting results.
            </SectionSubtitle>
          </ScrollReveal>

          <ProgramsGrid>
            {programs.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.1}>
                <ProgramCard>
                  {p.badge && <ProgramBadge>{p.badge}</ProgramBadge>}
                  <ProgramTitle>{p.title}</ProgramTitle>
                  <ProgramTagline>{p.tagline}</ProgramTagline>
                  <ProgramDesc>{p.description}</ProgramDesc>
                </ProgramCard>
              </ScrollReveal>
            ))}
          </ProgramsGrid>

          <div style={{ textAlign: 'center' }}>
            <GlowButton
              text="View All Packages"
              variant="primary"
              size="medium"
              onClick={() => navigate('/shop')}
            />
          </div>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 4. ABOUT / BIO ──────────────────────────── */}
      <Section>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>About Sean Swan</SectionTitle>
            <SectionSubtitle>
              A legacy of transforming lives through science-backed fitness.
            </SectionSubtitle>
          </ScrollReveal>

          <AboutGrid>
            <ScrollReveal direction="left">
              <AboutText>
                <p>
                  <strong>Sean Swan</strong> is an NCEP-certified personal trainer
                  (National College of Exercise Professionals, 1998) with{' '}
                  <strong>25+ years of experience</strong> helping clients transform
                  their lives. Trained in NASM protocols and workshops, Sean applies the
                  NASM Optimum Performance Training (OPT) model to every program he builds.
                </p>
                <p>
                  His career spans elite fitness brands including LA Fitness, Gold's Gym,
                  24 Hour Fitness, and Bodies in Motion. His time as a physical therapy aid
                  at Kerlan Jobe Health South deepened his expertise in injury prevention,
                  corrective exercise, and rehabilitation — principles he applies daily.
                </p>
                <p>
                  In 2013, Sean and his wife <strong>Jasmine</strong> founded SwanStudios
                  with a vision to blend elite coaching with technology. In 2018, Sean
                  completed a full-stack development bootcamp to create AI-assisted programs
                  that deliver measurable results for every committed client.
                </p>
              </AboutText>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <AboutLogoWrapper
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <AboutLogo src={logoImg} alt="SwanStudios" />
              </AboutLogoWrapper>
            </ScrollReveal>
          </AboutGrid>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <GlowButton
              text="Learn More"
              variant="ghost"
              size="medium"
              onClick={() => navigate('/about')}
            />
          </div>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 5. TESTIMONIALS (no photos) ─────────────── */}
      <Section $alt>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>
              <TypewriterText text="Client Success Stories" as="span" speed={40} />
            </SectionTitle>
            <SectionSubtitle>
              Real results from real people. No shortcuts — just elite-level
              coaching that works.
            </SectionSubtitle>
          </ScrollReveal>

          <TestimonialsGrid>
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 0.15}>
                <TestimonialCard>
                  <StarRating>
                    {Array.from({ length: 5 }, (_, j) => (
                      <Star
                        key={j}
                        size={18}
                        fill={j < Math.floor(t.rating) ? 'currentColor' : 'none'}
                      />
                    ))}
                  </StarRating>
                  <TestimonialQuote>
                    <TypewriterText
                      text={`"${t.quote}"`}
                      as="p"
                      speed={25}
                      cursor={false}
                    />
                  </TestimonialQuote>
                  <ClientName>— {t.name}, {t.descriptor}</ClientName>
                  <ResultBadge>{t.result}</ResultBadge>
                </TestimonialCard>
              </ScrollReveal>
            ))}
          </TestimonialsGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 6. STATS ────────────────────────────────── */}
      <Section>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>By the Numbers</SectionTitle>
          </ScrollReveal>

          <StatsGrid>
            {stats.map((s, i) => (
              <ScrollReveal key={s.label} delay={i * 0.1}>
                <StatCard>
                  <StatIcon>{s.icon}</StatIcon>
                  <StatValue>{s.value}</StatValue>
                  <StatLabel>{s.label}</StatLabel>
                </StatCard>
              </ScrollReveal>
            ))}
          </StatsGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 7. CREATIVE EXPRESSION ───────────────────── */}
      <Section $alt>
        <SectionInner>
          <ScrollReveal>
            <SectionTitle>Beyond the Gym</SectionTitle>
            <SectionSubtitle>
              Fitness is more than reps and sets. We believe in building warriors
              and artists through holistic wellness, creative expression, and community.
            </SectionSubtitle>
          </ScrollReveal>

          <CreativeGrid>
            {creativeCards.map((c, i) => (
              <ScrollReveal key={c.title} delay={i * 0.1}>
                <CreativeCard>
                  <FeatureIcon>{c.icon}</FeatureIcon>
                  <FeatureTitle>{c.title}</FeatureTitle>
                  <FeatureDesc>{c.description}</FeatureDesc>
                </CreativeCard>
              </ScrollReveal>
            ))}
          </CreativeGrid>
        </SectionInner>
      </Section>

      <SectionDivider />

      {/* ── 8. FINAL CTA ─────────────────────────────── */}
      <CTASection>
        <CTAInner>
          <ScrollReveal>
            <SectionTitle>
              <TypewriterText text="Ready to Transform?" as="span" speed={45} />
            </SectionTitle>
            <CTAText>
              Your journey to a stronger, healthier, more confident you starts with
              a single step. Let our NCEP-certified coaches guide you with proven
              NASM protocols and 25+ years of expertise.
            </CTAText>
            <CTAButtons>
              <GlowButton
                text="Start Today"
                variant="primary"
                size="large"
                onClick={() => navigate('/shop')}
              />
              <GlowButton
                text="Contact Us"
                variant="ghost"
                size="large"
                onClick={() => navigate('/contact')}
              />
            </CTAButtons>
          </ScrollReveal>
        </CTAInner>
      </CTASection>

      {/* ── ORIENTATION MODAL ─────────────────────────── */}
      <AnimatePresence>
        {showOrientation && (
          <OrientationForm onClose={() => setShowOrientation(false)} />
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

export default HomePageV3;
