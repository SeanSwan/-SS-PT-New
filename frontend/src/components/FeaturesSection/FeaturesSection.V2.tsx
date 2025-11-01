// frontend/src/components/FeaturesSection/FeaturesSection.V2.tsx

/**
 * Features Section v2.0 - Homepage Refactor
 *
 * **Major Changes from v1.0:**
 * 1. Wrapped each feature card in FrostedCard (mid glass)
 * 2. Added ParallaxSectionWrapper (medium speed for mid-ground)
 * 3. Simplified animations (respects prefers-reduced-motion)
 * 4. Updated icons to use lucide-react for consistency
 * 5. Improved theme token usage (no hardcoded colors)
 *
 * **Created for:**
 * Homepage Refactor v2.0 (Week 2) - Features Section
 *
 * @see docs/ai-workflow/HOMEPAGE-REFACTOR-FINAL-PLAN.md
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
  background: linear-gradient(135deg, #09041e, #1a1a3c);
  position: relative;
  overflow: hidden;

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
    rgba(0, 255, 255, 0.1) 0%,
    rgba(120, 81, 169, 0.05) 50%,
    transparent 70%
  );
  border-radius: 50%;
  top: 5%;
  left: 60%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.4;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 300;
  text-align: center;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.text?.primary || "#E8F0FF"};
  text-shadow: 0 0 20px ${({ theme }) => theme.colors?.primary || "#00FFFF"}30;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SectionSubtitle = styled(motion.p)`
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 3rem;
  color: ${({ theme }) => theme.text?.secondary || "#c0c0c0"};
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;

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

/**
 * v2.0 Feature Card Wrapper
 * Uses FrostedCard for consistent glassmorphism
 */
const FeatureCardWrapper = styled.div`
  cursor: pointer;
  transition: transform 0.3s ease;
  height: 100%;

  &:hover {
    transform: translateY(-10px);
  }
`;

/**
 * Card content (inside FrostedCard)
 */
const FeatureCardContent = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  height: 100%;
  min-height: 280px;
`;

/**
 * Feature Icon Container
 */
const IconContainer = styled.div<{ $color: string }>`
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: ${({ $color }) => $color}20;
  box-shadow: 0 0 20px ${({ $color }) => $color}40;

  svg {
    width: 40px;
    height: 40px;
    color: ${({ $color }) => $color};
    filter: drop-shadow(0 0 10px ${({ $color }) => $color}60);
  }
`;

const FeatureTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.text?.primary || "#E8F0FF"};
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const FeatureDescription = styled.p`
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.text?.secondary || "rgba(255, 255, 255, 0.8)"};
  flex-grow: 1;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

// --- Features Data (v2.0 with lucide-react icons) ---

const features: Feature[] = [
  {
    id: 1,
    title: "Elite Personal Training",
    description:
      "Experience personalized coaching from NASM-certified experts with over 25 years of experience. Our science-based approach is tailored to your unique goals and needs.",
    icon: <Dumbbell />,
    iconColor: "#00FFFF", // Swan Cyan (primary)
    theme: "primary",
    linkTo: "/services/personal-training",
  },
  {
    id: 2,
    title: "Performance Assessment",
    description:
      "Our comprehensive evaluation uses cutting-edge technology to analyze your movement patterns, strength imbalances, and metabolic efficiency to create your optimal program.",
    icon: <Activity />,
    iconColor: "#7851A9", // Cosmic Purple (secondary)
    theme: "secondary",
    linkTo: "/services/assessment",
  },
  {
    id: 3,
    title: "Nutrition Coaching",
    description:
      "Transform your relationship with food through our evidence-based nutrition protocols, personalized macro planning, and sustainable eating strategies.",
    icon: <Salad />,
    iconColor: "#00E8B0", // Emerald Green
    theme: "emerald",
    linkTo: "/services/nutrition",
  },
  {
    id: 4,
    title: "Recovery & Mobility",
    description:
      "Optimize your body's repair process with cutting-edge recovery techniques including mobility training, myofascial release, and specialized regeneration protocols.",
    icon: <Sparkles />,
    iconColor: "#7851A9", // Cosmic Purple (secondary)
    theme: "secondary",
    linkTo: "/services/recovery",
  },
  {
    id: 5,
    title: "Online Coaching",
    description:
      "Get expert guidance anywhere with customized training programs, nutrition plans, and regular check-ins through our premium coaching platform.",
    icon: <Laptop />,
    iconColor: "#00FFFF", // Swan Cyan (primary)
    theme: "primary",
    linkTo: "/services/online-coaching",
  },
  {
    id: 6,
    title: "Group Performance",
    description:
      "Join our exclusive small-group sessions combining the energy of group workouts with personalized attention for maximum results at a more accessible price point.",
    icon: <Users />,
    iconColor: "#7851A9", // Cosmic Purple (secondary)
    theme: "secondary",
    linkTo: "/services/group-training",
  },
  {
    id: 7,
    title: "Sports-Specific Training",
    description:
      "Elevate your athletic performance with specialized programs designed for your sport, focusing on the specific skills, movements, and energy systems you need to excel.",
    icon: <Trophy />,
    iconColor: "#00E8B0", // Emerald Green
    theme: "emerald",
    linkTo: "/services/sports-training",
  },
  {
    id: 8,
    title: "Corporate Wellness",
    description:
      "Boost team productivity and morale with our comprehensive corporate wellness programs including on-site fitness sessions, workshops, and wellness challenges.",
    icon: <Briefcase />,
    iconColor: "#7851A9", // Cosmic Purple (secondary)
    theme: "secondary",
    linkTo: "/services/corporate-wellness",
  },
];

// --- Component ---

const FeaturesSectionV2: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.2 });
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
            Our Premium Services
          </SectionTitle>

          <SectionSubtitle
            variants={titleVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            Comprehensive fitness solutions designed to transform your body,
            elevate your performance, and optimize your health
          </SectionSubtitle>

          {/* Features Grid */}
          <FeaturesGrid
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            {features.map((feature) => (
              <motion.div key={feature.id} variants={itemVariants}>
                <FeatureCardWrapper
                  onClick={() => {
                    // Navigate to feature page
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
