// frontend/src/pages/HomePage/components/PackageSection.V2.tsx

/**
 * Package Section v2.0 - Homepage Refactor
 *
 * **Major Changes from v1.0:**
 * 1. **REMOVED ALL PRICING** (per user requirement)
 * 2. Replaced pricing with icons + benefits + expanded descriptions
 * 3. Wrapped each card in FrostedCard (mid glass)
 * 4. Added GlowButton CTAs to each card
 * 5. Enhanced visual hierarchy with icons
 * 6. Maintained urgency/social proof section
 *
 * **User Requirement:**
 * "Remove all package pricing from homepage. Replace with icons + benefits + expanded descriptions."
 *
 * **Created for:**
 * Homepage Refactor v2.0 (Week 2) - Package Cards Section
 *
 * @see docs/ai-workflow/HOMEPAGE-REFACTOR-FINAL-PLAN.md
 */

import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Target,
  Trophy,
  Users,
  Heart,
  Star,
  TrendingUp,
  Award,
  Flame,
} from "lucide-react";

// v2.0 Foundation Components
import FrostedCard from "../../../components/ui-kit/glass/FrostedCard";
import GlowButton from "../../../components/ui/buttons/GlowButton";

// Hooks
import { useReducedMotion } from "../../../hooks/useReducedMotion";

// --- Styled Components ---

const PackagePreviewSection = styled.section`
  padding: 5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
`;

const PackagePreviewTitle = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 300;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.text?.primary || "#E8F0FF"};
  text-shadow: 0 0 20px ${({ theme }) => theme.colors?.primary || "#00FFFF"}30;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const PackagePreviewSubtitle = styled(motion.p)`
  font-size: 1.2rem;
  color: ${({ theme }) => theme.text?.secondary || "rgba(255, 255, 255, 0.8)"};
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const PackageGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

/**
 * v2.0 Package Card Wrapper
 * Uses FrostedCard for consistent glassmorphism
 */
const PackageCardWrapper = styled.div`
  cursor: pointer;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-10px);
  }
`;

/**
 * Card content (inside FrostedCard)
 */
const PackageCardContent = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 400px;
`;

/**
 * Package Icon Container
 * Replaces pricing display
 */
const PackageIcon = styled.div<{ $color: string }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${({ $color }) => $color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  box-shadow: 0 0 20px ${({ $color }) => $color}40;

  svg {
    width: 40px;
    height: 40px;
    color: ${({ $color }) => $color};
    filter: drop-shadow(0 0 10px ${({ $color }) => $color}60);
  }
`;

const PackageTitle = styled.h3`
  font-size: 1.8rem;
  color: ${({ theme }) => theme.text?.accent || "#00FFFF"};
  margin-bottom: 1rem;
  font-weight: 600;
`;

const PackageDescription = styled.p`
  color: ${({ theme }) => theme.text?.secondary || "rgba(255, 255, 255, 0.8)"};
  margin-bottom: 1.5rem;
  font-size: 1.05rem;
  line-height: 1.6;
  flex-grow: 1;
`;

/**
 * Benefits List (replaces pricing info)
 */
const BenefitsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1.5rem 0;
  text-align: left;
  width: 100%;
`;

const BenefitItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  color: ${({ theme }) => theme.text?.secondary || "rgba(255, 255, 255, 0.8)"};
  font-size: 0.95rem;

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors?.primary || "#00FFFF"};
    flex-shrink: 0;
  }
`;

const CTAButtonWrapper = styled.div`
  margin-top: 1rem;
  width: 100%;
`;

/**
 * Urgency Section (kept from v1.0, no pricing here)
 */
const UrgencySection = styled(motion.div)`
  background: linear-gradient(
    135deg,
    rgba(255, 46, 99, 0.1),
    rgba(0, 255, 255, 0.1)
  );
  padding: 3rem 2rem;
  margin: 4rem 0;
  text-align: center;
  border-radius: 20px;
  position: relative;
  overflow: hidden;
`;

const UrgencyText = styled.h3`
  font-size: 1.8rem;
  color: #ff2e63;
  margin-bottom: 1rem;
  font-weight: 600;
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const SocialProofText = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2rem;
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ExploreMoreButton = styled.div`
  margin-top: 2rem;
`;

// --- Package Data (v2.0 - NO PRICING) ---

interface PackageData {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
  benefits: string[];
  ctaText: string;
  ctaTheme: "primary" | "secondary" | "cosmic";
}

const packagesData: PackageData[] = [
  {
    id: "single-session",
    title: "Single Session",
    description:
      "Experience Sean Swan's signature training methodology in a focused one-on-one session. Perfect for those new to premium personal training or looking to supplement their existing routine.",
    icon: <Zap />,
    iconColor: "#00FFFF", // Swan Cyan (primary)
    benefits: [
      "1-hour personalized training session",
      "Custom workout plan tailored to your goals",
      "Professional form correction and technique guidance",
      "Post-session nutrition recommendations",
      "Full gym access during session",
    ],
    ctaText: "Book Single Session",
    ctaTheme: "primary",
  },
  {
    id: "silver-package",
    title: "Silver Package",
    description:
      "Our most popular choice for committed individuals ready to see real transformation. 8 sessions provide the foundation for lasting results and sustainable fitness habits.",
    icon: <Target />,
    iconColor: "#C0C0C0", // Silver
    benefits: [
      "8 premium one-on-one training sessions",
      "Comprehensive fitness assessment and body composition analysis",
      "Personalized meal plan and nutrition coaching",
      "Weekly progress tracking and adjustments",
      "24/7 trainer support via SwanStudios app",
      "Access to exclusive training materials and resources",
    ],
    ctaText: "Start Silver Package",
    ctaTheme: "secondary",
  },
  {
    id: "gold-package",
    title: "Gold Package",
    description:
      "The complete transformation experience. 20 sessions deliver comprehensive body recomposition, mental resilience, and the tools for lifelong fitness success. Sean's proven methodology at its finest.",
    icon: <Trophy />,
    iconColor: "#FFD700", // Gold
    benefits: [
      "20 premium one-on-one training sessions",
      "In-depth fitness and health assessment",
      "Fully customized training and nutrition program",
      "Bi-weekly body composition and performance testing",
      "Priority scheduling and dedicated trainer support",
      "Access to SwanStudios' AI-powered tracking platform",
      "Monthly consultation with nutrition specialist",
      "Exclusive member events and community access",
    ],
    ctaText: "Begin Gold Package",
    ctaTheme: "cosmic",
  },
];

// --- Component ---

interface PackageSectionV2Props {
  id?: string;
  packageRef?: React.RefObject<HTMLElement>;
  isPackageInView?: boolean;
}

const PackageSectionV2: React.FC<PackageSectionV2Props> = ({
  id = "packages",
  packageRef,
  isPackageInView = true,
}) => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  // Animation variants
  const packageVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 30 },
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
    <PackagePreviewSection id={id} ref={packageRef}>
      {/* Section Header */}
      <PackagePreviewTitle
        variants={packageVariants}
        initial="hidden"
        animate={isPackageInView ? "visible" : "hidden"}
      >
        Start Your Transformation Today
      </PackagePreviewTitle>

      <PackagePreviewSubtitle
        variants={packageVariants}
        initial="hidden"
        animate={isPackageInView ? "visible" : "hidden"}
      >
        Choose from our premium training packages designed by Sean Swan with over
        25 years of experience
      </PackagePreviewSubtitle>

      {/* Package Cards Grid */}
      <PackageGrid
        variants={packageVariants}
        initial="hidden"
        animate={isPackageInView ? "visible" : "hidden"}
      >
        {packagesData.map((pkg) => (
          <PackageCardWrapper key={pkg.id}>
            <FrostedCard
              glassLevel="mid"
              elevation={2}
              interactive={true}
              borderVariant="elegant"
            >
              <PackageCardContent>
                {/* Icon (replaces pricing) */}
                <PackageIcon $color={pkg.iconColor}>{pkg.icon}</PackageIcon>

                {/* Title */}
                <PackageTitle>{pkg.title}</PackageTitle>

                {/* Expanded Description */}
                <PackageDescription>{pkg.description}</PackageDescription>

                {/* Benefits List (replaces "X sessions • $Y per session") */}
                <BenefitsList>
                  {pkg.benefits.map((benefit, index) => (
                    <BenefitItem key={index}>
                      <Star size={18} />
                      {benefit}
                    </BenefitItem>
                  ))}
                </BenefitsList>

                {/* CTA Button */}
                <CTAButtonWrapper>
                  <GlowButton
                    text={pkg.ctaText}
                    theme={pkg.ctaTheme}
                    size="medium"
                    animateOnRender={false}
                    onClick={() => navigate("/shop")}
                    aria-label={`${pkg.ctaText} - View details and pricing`}
                  />
                </CTAButtonWrapper>
              </PackageCardContent>
            </FrostedCard>
          </PackageCardWrapper>
        ))}
      </PackageGrid>

      {/* Urgency and Social Proof (kept from v1.0) */}
      <UrgencySection
        variants={packageVariants}
        initial="hidden"
        animate={isPackageInView ? "visible" : "hidden"}
      >
        <UrgencyText>
          <Flame
            size={24}
            style={{ display: "inline", marginRight: "0.5rem" }}
          />
          Limited Availability - Only 3 New Clients Per Month
        </UrgencyText>

        <SocialProofText>
          <Users size={20} style={{ display: "inline", marginRight: "0.5rem" }} />
          Over 500+ transformations completed •{" "}
          <Award size={20} style={{ display: "inline", margin: "0 0.5rem" }} />
          Featured in LA Fitness Magazine •{" "}
          <TrendingUp
            size={20}
            style={{ display: "inline", margin: "0 0.5rem" }}
          />
          Trusted by celebrities and athletes
        </SocialProofText>

        <ExploreMoreButton>
          <GlowButton
            text="View All Packages & Pricing"
            theme="cosmic"
            size="large"
            animateOnRender={false}
            onClick={() => navigate("/shop")}
            aria-label="View all training packages and pricing details"
          />
        </ExploreMoreButton>
      </UrgencySection>
    </PackagePreviewSection>
  );
};

export default PackageSectionV2;
