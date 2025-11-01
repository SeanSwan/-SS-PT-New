// frontend/src/pages/HomePage/components/HomePage.V2.component.tsx

/**
 * HomePage v2.0 - Complete Integration
 *
 * **This file demonstrates how to integrate all v2.0 components:**
 * 1. Hero Section v2.0 (LivingConstellation + FrostedCard + Parallax)
 * 2. Package Section v2.0 (pricing removed + icons + benefits + FrostedCard)
 * 3. Features Section v2.0 (FrostedCard + parallax)
 * 4. V1ThemeBridge wrapping for deferred sections
 *
 * **To activate v2.0:**
 * 1. In HomePage/index.tsx (or main route file):
 *    - Change: `export { default } from './components/HomePage.component';`
 *    - To: `export { default } from './components/HomePage.V2.component';`
 *
 * 2. Or rename this file to HomePage.component.tsx (backup the old one first)
 *
 * **Performance Expected:**
 * - LCP: ≤ 2.5s (v1.0: ~4.5s) - 44% improvement
 * - CLS: ≤ 0.1
 * - FPS: ≥ 30 (v1.0: ~20 FPS with video)
 * - Bundle: +23 KB gzipped (negligible)
 *
 * **Created for:**
 * Homepage Refactor v2.0 (Week 2) - Complete Integration
 *
 * @see docs/ai-workflow/HOMEPAGE-REFACTOR-FINAL-PLAN.md
 * @see docs/ai-workflow/WEEK-1-COMPLETION-REPORT.md
 */

import React, { useEffect, lazy, Suspense } from "react";
import styled, { keyframes } from "styled-components";
import { Helmet } from "react-helmet-async";

// v2.0 Refactored Sections
import HeroSectionV2 from "./Hero-Section.V2";
import PackageSectionV2 from "./PackageSection.V2";
import FeaturesSectionV2 from "../../../components/FeaturesSection/FeaturesSection.V2";

// V1ThemeBridge for deferred sections
import V1ThemeBridge from "../../../components/ui/ThemeBridge/V1ThemeBridge";

// Deferred sections (still v1.0, wrapped in V1ThemeBridge)
import TrainerProfilesSection from "./TrainerProfilesSection";
import CreativeExpressionSection from "./CreativeExpressionSection";

// Lazy-loaded components (still v1.0, wrapped in V1ThemeBridge)
const TestimonialSlider = lazy(
  () => import("../../../components/TestimonialSlider/TestimonialSlider")
);

const FitnessStats = lazy(
  () => import("../../../components/FitnessStats/FitnessStats")
);

const NewsletterSignup = lazy(
  () => import("../../../components/NewsletterSignup/NewsletterSignup")
);

const InstagramFeed = lazy(
  () => import("../../../components/InstagramFeed/InstagramFeed")
);

// --- Styled Components ---

/**
 * Main container
 * No background needed - LivingConstellation is fixed position
 */
const PageContainer = styled.main`
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
`;

/**
 * Section divider animation
 */
const diagonalShimmer = keyframes`
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 100% 100%;
  }
`;

const SectionDivider = styled.div`
  position: relative;
  height: 150px;
  background: linear-gradient(
    to right,
    rgba(0, 255, 255, 0.05),
    rgba(120, 81, 169, 0.05)
  );
  margin: 0;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;

  &::before {
    content: "";
    position: absolute;
    width: 100%;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 255, 255, 0.8),
      rgba(120, 81, 169, 0.8),
      transparent
    );
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 25%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 75%,
      transparent 100%
    );
    background-size: 200% 200%;
    animation: ${diagonalShimmer} 5s linear infinite;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    height: 120px;
  }
`;

/**
 * Loading fallback for lazy-loaded sections
 */
const SectionLoader = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: ${({ theme }) => theme.text?.secondary || "rgba(255, 255, 255, 0.8)"};
  font-size: 1.1rem;

  &::after {
    content: "...";
    animation: ellipsis 1.5s infinite;
  }

  @keyframes ellipsis {
    0% {
      content: ".";
    }
    33% {
      content: "..";
    }
    66% {
      content: "...";
    }
  }
`;

// --- Component ---

const HomePageV2: React.FC = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>SwanStudios - Elite Personal Training & Fitness Coaching</title>
        <meta
          name="description"
          content="Transform your body and elevate your life with SwanStudios' elite personal training, performance assessment, nutrition coaching, and comprehensive fitness solutions. Serving Orange County and Los Angeles."
        />
        <meta
          name="keywords"
          content="personal training, fitness coaching, nutrition coaching, performance assessment, online coaching, Orange County fitness, Los Angeles personal trainer, NASM certified, elite training"
        />
        <meta property="og:title" content="SwanStudios - Elite Personal Training" />
        <meta
          property="og:description"
          content="Experience the world's first Fitness Social Ecosystem with expert trainers and AI-powered tracking."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://swanstudios.com" />
      </Helmet>

      <PageContainer>
        {/* ========================================
            v2.0 REFACTORED SECTIONS
            ======================================== */}

        {/* Hero Section v2.0 - LivingConstellation + FrostedCard + Parallax */}
        <HeroSectionV2 />

        <SectionDivider />

        {/* Package Section v2.0 - Pricing removed + FrostedCard */}
        <PackageSectionV2 id="packages" />

        <SectionDivider />

        {/* Features Section v2.0 - FrostedCard + Parallax */}
        <FeaturesSectionV2 />

        <SectionDivider />

        {/* ========================================
            DEFERRED SECTIONS (v1.0 wrapped in V1ThemeBridge)
            These sections remain v1.0 for now, but V1ThemeBridge
            ensures visual cohesion with v2.0 sections
            ======================================== */}

        {/* Creative Expression Section (v1.0 with bridge) */}
        <V1ThemeBridge>
          <CreativeExpressionSection />
        </V1ThemeBridge>

        <SectionDivider />

        {/* Trainer Profiles Section (v1.0 with bridge) */}
        <V1ThemeBridge>
          <TrainerProfilesSection />
        </V1ThemeBridge>

        <SectionDivider />

        {/* Testimonial Slider (v1.0 with bridge) */}
        <V1ThemeBridge>
          <Suspense fallback={<SectionLoader>Loading testimonials</SectionLoader>}>
            <TestimonialSlider />
          </Suspense>
        </V1ThemeBridge>

        <SectionDivider />

        {/* Fitness Stats (v1.0 with bridge) */}
        <V1ThemeBridge>
          <Suspense fallback={<SectionLoader>Loading stats</SectionLoader>}>
            <FitnessStats />
          </Suspense>
        </V1ThemeBridge>

        <SectionDivider />

        {/* Instagram Feed (v1.0 with bridge) */}
        <V1ThemeBridge>
          <Suspense fallback={<SectionLoader>Loading Instagram feed</SectionLoader>}>
            <InstagramFeed />
          </Suspense>
        </V1ThemeBridge>

        <SectionDivider />

        {/* Newsletter Signup (v1.0 with bridge) */}
        <V1ThemeBridge>
          <Suspense fallback={<SectionLoader>Loading newsletter</SectionLoader>}>
            <NewsletterSignup />
          </Suspense>
        </V1ThemeBridge>
      </PageContainer>
    </>
  );
};

export default HomePageV2;
