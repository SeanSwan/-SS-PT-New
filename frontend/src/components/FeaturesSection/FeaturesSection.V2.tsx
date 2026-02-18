// frontend/src/components/FeaturesSection/FeaturesSection.V2.tsx

/**
 * Features Section v2.0 — Ethereal Wilderness Theme
 *
 * Cormorant Garamond headings, Source Sans 3 body,
 * Ethereal Wilderness color tokens, FrostedCard glass,
 * ParallaxSectionWrapper depth, prefers-reduced-motion
 */

import React, { useRef } from "react";
import styled from "styled-components";
import { motion, useInView } from "framer-motion";
import {
  Dumbbell,
  Activity,
  Salad,
  Sparkles,
  Laptop,
  Users,
  Trophy,
  Briefcase,
} from "lucide-react";

// v2.0 Foundation Components
import FrostedCard from "../ui-kit/glass/FrostedCard";
import ParallaxSectionWrapper from "../ui-kit/parallax/ParallaxSectionWrapper";

// Hooks
import { useReducedMotion } from "../../hooks/useReducedMotion";
import ParallaxImageBackground from "../ui/backgrounds/ParallaxImageBackground";
import paintAb1Image from "../../assets/paint-ab1.png";

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

// --- TypeScript Interfaces ---

interface Feature {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
  theme: "primary" | "secondary" | "emerald";
  linkTo: string;
}

// --- Styled Components ---

const SectionContainer = styled.section`
  padding: 6rem 2rem;
  background: linear-gradient(
    135deg,
    ${T.bg} 0%,
    rgba(15, 20, 35, 1) 100%
  );
  position: relative;
  overflow: hidden;
  border-top: 1px solid rgba(0, 212, 170, 0.25);
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
`;

const BackgroundGlow = styled.div`
  position: absolute;
  width: 80vh;
  height: 80vh;
  background: radial-gradient(
    ellipse at center,
    rgba(0, 212, 170, 0.08) 0%,
    rgba(120, 81, 169, 0.04) 50%,
    transparent 70%
  );
  border-radius: 50%;
  top: 5%;
  left: 60%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.5;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const SectionTitle = styled(motion.h2)`
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 2.8rem;
  font-weight: 600;
  font-style: italic;
  text-align: center;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, ${T.text} 0%, ${T.primary} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SectionSubtitle = styled(motion.p)`
  text-align: center;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 1.15rem;
  margin-bottom: 3rem;
  color: ${T.textSecondary};
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.7;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const FeaturesGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-top: 3rem;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 1023px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const FeatureCardWrapper = styled.div`
  cursor: pointer;
  transition: transform 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;

  /* Stretch FrostedCard to fill available height */
  > * {
    flex: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:hover {
    transform: translateY(-8px);
  }
`;

const FeatureCardContent = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  height: 100%;
  min-height: 280px;
`;

const IconContainer = styled.div<{ $color: string }>`
  width: 72px;
  height: 72px;
  margin-bottom: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: ${({ $color }) => $color}15;
  box-shadow: 0 0 20px ${({ $color }) => $color}30;

  svg {
    width: 36px;
    height: 36px;
    color: ${({ $color }) => $color};
    filter: drop-shadow(0 0 8px ${({ $color }) => $color}50);
  }
`;

const FeatureTitle = styled.h3`
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: ${T.text};
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const FeatureDescription = styled.p`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.95rem;
  line-height: 1.7;
  color: ${T.textSecondary};
  flex-grow: 1;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

// --- Features Data (Ethereal Wilderness palette) ---

const features: Feature[] = [
  {
    id: 1,
    title: "Elite Personal Training",
    description:
      "Experience personalized coaching from NASM-certified experts with over 25 years of experience. Our science-based approach is tailored to your unique goals and needs.",
    icon: <Dumbbell />,
    iconColor: T.primary,
    theme: "primary",
    linkTo: "/services/personal-training",
  },
  {
    id: 2,
    title: "Performance Assessment",
    description:
      "Our comprehensive evaluation uses cutting-edge technology to analyze your movement patterns, strength imbalances, and metabolic efficiency to create your optimal program.",
    icon: <Activity />,
    iconColor: T.secondary,
    theme: "secondary",
    linkTo: "/services/assessment",
  },
  {
    id: 3,
    title: "Nutrition Coaching",
    description:
      "Transform your relationship with food through our evidence-based nutrition protocols, personalized macro planning, and sustainable eating strategies.",
    icon: <Salad />,
    iconColor: T.accent,
    theme: "emerald",
    linkTo: "/services/nutrition",
  },
  {
    id: 4,
    title: "Recovery & Mobility",
    description:
      "Optimize your body's repair process with cutting-edge recovery techniques including mobility training, myofascial release, and specialized regeneration protocols.",
    icon: <Sparkles />,
    iconColor: T.secondary,
    theme: "secondary",
    linkTo: "/services/recovery",
  },
  {
    id: 5,
    title: "Online Coaching",
    description:
      "Get expert guidance anywhere with customized training programs, nutrition plans, and regular check-ins through our premium coaching platform.",
    icon: <Laptop />,
    iconColor: T.primary,
    theme: "primary",
    linkTo: "/services/online-coaching",
  },
  {
    id: 6,
    title: "Group Performance",
    description:
      "Join our exclusive small-group sessions combining the energy of group workouts with personalized attention for maximum results at a more accessible price point.",
    icon: <Users />,
    iconColor: T.secondary,
    theme: "secondary",
    linkTo: "/services/group-training",
  },
  {
    id: 7,
    title: "Sports-Specific Training",
    description:
      "Elevate your athletic performance with specialized programs designed for your sport, focusing on the specific skills, movements, and energy systems you need to excel.",
    icon: <Trophy />,
    iconColor: T.accent,
    theme: "emerald",
    linkTo: "/services/sports-training",
  },
  {
    id: 8,
    title: "Corporate Wellness",
    description:
      "Boost team productivity and morale with our comprehensive corporate wellness programs including on-site fitness sessions, workshops, and wellness challenges.",
    icon: <Briefcase />,
    iconColor: T.secondary,
    theme: "secondary",
    linkTo: "/services/corporate-wellness",
  },
];

// --- Component ---

const FeaturesSectionV2: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const prefersReducedMotion = useReducedMotion();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: "easeOut",
      },
    },
  };

  const titleVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <SectionContainer id="services" ref={ref}>
      <ParallaxImageBackground src={paintAb1Image} overlayOpacity={0.5} overlayGradient="linear-gradient(135deg, rgba(9, 4, 30, 0.5), rgba(26, 26, 60, 0.5))" />
      <BackgroundGlow />

      {/* v2.0 Parallax wrapper for mid-ground depth */}
      <ParallaxSectionWrapper speed="medium" disabledOnMobile={true}>
        <ContentWrapper>
          {/* Section Header */}
          <SectionTitle
            variants={titleVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            Premium Services
          </SectionTitle>

          <SectionSubtitle
            variants={titleVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            Comprehensive fitness solutions designed to transform your body,
            elevate your performance, and optimize your well-being
          </SectionSubtitle>

          {/* Features Grid */}
          <FeaturesGrid
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            {features.map((feature) => (
              <motion.div key={feature.id} variants={itemVariants} style={{ height: '100%' }}>
                <FeatureCardWrapper
                  onClick={() => {
                    window.location.href = feature.linkTo;
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      window.location.href = feature.linkTo;
                    }
                  }}
                  aria-label={`Learn more about ${feature.title}`}
                >
                  <FrostedCard
                    glassLevel="mid"
                    elevation={2}
                    interactive={true}
                    borderVariant="elegant"
                  >
                    <FeatureCardContent>
                      {/* Icon */}
                      <IconContainer $color={feature.iconColor}>
                        {feature.icon}
                      </IconContainer>

                      {/* Title */}
                      <FeatureTitle>{feature.title}</FeatureTitle>

                      {/* Description */}
                      <FeatureDescription>
                        {feature.description}
                      </FeatureDescription>
                    </FeatureCardContent>
                  </FrostedCard>
                </FeatureCardWrapper>
              </motion.div>
            ))}
          </FeaturesGrid>
        </ContentWrapper>
      </ParallaxSectionWrapper>
    </SectionContainer>
  );
};

export default FeaturesSectionV2;
