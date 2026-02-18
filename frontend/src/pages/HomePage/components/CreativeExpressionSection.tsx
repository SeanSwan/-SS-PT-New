// frontend/src/pages/HomePage/components/CreativeExpressionSection.tsx
// === CreativeExpression v2.0 - Ethereal Wilderness tokens ===

import React, { useRef } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion, useInView, MotionConfig } from "framer-motion";
import { Music, Paintbrush, Mic, Heart } from "lucide-react";
import SectionTitle from "../../../components/ui/SectionTitle";
import ParallaxImageBackground from "../../../components/ui/backgrounds/ParallaxImageBackground";
import canvasImage from "../../../assets/canvas.png";

// === EW Design Tokens (shared with ProgramsOverview.V3 / FitnessStats V2) ===
const T = {
  bg: '#0a0a1a',
  surface: 'rgba(15, 25, 35, 0.92)',
  primary: '#00D4AA',
  secondary: '#7851A9',
  accent: '#48E8C8',
  text: '#F0F8FF',
  textSecondary: '#8AA8B8',
} as const;

// === Reduced-motion helper ===
const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// === Animation Keyframes ===
const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 15px currentColor; }
  50% { box-shadow: 0 0 25px currentColor; }
  100% { box-shadow: 0 0 15px currentColor; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const stellarGlow = keyframes`
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
`;

// === Styled Components ===
const SectionContainer = styled.section`
  padding: 6rem 2rem;
  background: ${T.bg};
  position: relative;
  overflow: hidden;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  border-top: 1px solid rgba(0, 212, 170, 0.25);

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
`;

const GlowEffect = styled.div`
  position: absolute;
  width: 70vh;
  height: 70vh;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 212, 170, 0.15), rgba(120, 81, 169, 0.08), transparent 70%);
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  filter: blur(60px);
  z-index: 0;
  opacity: 0.6;
  pointer-events: none;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${stellarGlow} 8s ease-in-out infinite;
  }
  ${noMotion}
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SectionDescription = styled(motion.p)`
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 4rem;
  color: ${T.textSecondary};
  max-width: 800px;
  line-height: 1.6;

  span {
    background: linear-gradient(135deg, ${T.primary}, ${T.secondary});
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    font-weight: 600;
  }

  strong {
    color: ${T.text};
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 3rem;
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;

  /* Community & Heart card spans full width on 3-col layout */
  & > div:nth-child(4) {
    grid-column: 1 / -1;
  }

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);

    /* Reset span for 2-col -> 2x2 grid */
    & > div:nth-child(4) {
      grid-column: auto;
    }
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const ExpressionCard = styled(motion.div)`
  background: ${T.surface};
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0, 212, 170, 0.12);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  height: 100%;

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    &:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px -10px rgba(0, 212, 170, 0.2);
      border-color: rgba(0, 212, 170, 0.3);
    }
  }

  &.heart-card {
    background: linear-gradient(135deg, ${T.surface}, rgba(0, 212, 170, 0.06));
    border: 1px solid rgba(72, 232, 200, 0.25);

    @media (hover: hover) and (prefers-reduced-motion: no-preference) {
      &:hover {
        border-color: ${T.accent};
        box-shadow: 0 20px 40px -10px rgba(72, 232, 200, 0.25);
      }
    }
  }

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }

  ${noMotion}
`;

const IconContainer = styled.div`
  font-size: 3rem;
  margin-bottom: 1.5rem;
  color: ${T.primary};
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;

  svg {
    filter: drop-shadow(0 0 8px rgba(0, 212, 170, 0.5));
    transition: all 0.3s ease;
    width: 48px;
    height: 48px;
  }

  &.heart-icon {
    color: ${T.accent};

    @media (prefers-reduced-motion: no-preference) {
      animation: ${pulse} 3s ease-in-out infinite;
    }

    svg {
      filter: drop-shadow(0 0 8px rgba(72, 232, 200, 0.5));
    }
  }

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    ${ExpressionCard}:hover & {
      animation: ${stellarGlow} 2s ease-in-out infinite;

      svg {
        filter: drop-shadow(0 0 15px currentColor);
      }
    }
  }

  ${noMotion}
`;

const CardTitle = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, ${T.text}, ${T.primary});
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 600;
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
  font-family: 'Cormorant Garamond', 'Georgia', serif;

  &.heart-card-title {
    background: linear-gradient(135deg, ${T.text}, ${T.accent});
    background-clip: text;
    -webkit-background-clip: text;
  }

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    ${ExpressionCard}:hover & {
      background-size: 200% 200%;
      animation: ${shimmer} 2s linear infinite;
    }
  }

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }

  ${noMotion}
`;

const CardDescription = styled.p`
  font-size: 1.1rem;
  color: ${T.textSecondary};
  line-height: 1.6;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 2;
  flex-grow: 1;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const BenefitsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
  width: 100%;
  position: relative;
  z-index: 2;
`;

const BenefitItem = styled.li`
  margin-bottom: 0.75rem;
  display: flex;
  align-items: flex-start;
  color: ${T.textSecondary};
  font-size: 1rem;
  line-height: 1.4;
  transition: color 0.3s ease;

  &::before {
    content: "\u2726";
    margin-right: 10px;
    color: ${T.primary};
    transition: all 0.3s ease;
    line-height: 1.4;
  }

  @media (hover: hover) {
    ${ExpressionCard}:hover & {
      color: ${T.text};
    }
  }

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    ${ExpressionCard}:hover &::before {
      animation: ${stellarGlow} 2s ease-in-out infinite;
    }
  }

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }

  ${noMotion}
`;

// === Animation Variants ===
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
};

const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: "easeOut"
    }
  }
};

// === Component Implementation ===
const CreativeExpressionSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const expressionCategories = [
    {
      title: "Dance",
      icon: <Music />,
      description: "Unleash your power through rhythm. Express your warrior spirit through movement that connects your body to your soul.",
      benefits: [
        "Build explosive core strength and flexibility",
        "Master coordination and balance like a fighter",
        "Channel stress into pure energy and euphoria",
        "Unite with your tribe through powerful group sessions"
      ]
    },
    {
      title: "Art & Visual Expression",
      icon: <Paintbrush />,
      description: "Channel your intensity onto the canvas. Transform your inner fire into visual masterpieces that tell your transformation story.",
      benefits: [
        "Develop precision and control in every stroke",
        "Unlock creative problem-solving superpowers",
        "Transform emotions into powerful visual statements",
        "Create your personal victory gallery"
      ]
    },
    {
      title: "Vocal & Sound Work",
      icon: <Mic />,
      description: "Find the strength in your own voice. Unleash the power within through vocal techniques that amplify your inner warrior.",
      benefits: [
        "Build breathing power and explosive lung capacity",
        "Transform anxiety into vocal strength and confidence",
        "Command attention with unshakeable self-expression",
        "Connect with the primal power of sound and rhythm"
      ]
    },
    {
      title: "Community & Heart",
      icon: <Heart />,
      description: "Connect with a tribe that shares your fire. Plug into a global family that grinds together, grows together, and celebrates every single victory. No more training alone!",
      benefits: [
        "Feel the power of collective energy fueling your journey",
        "Unite with warriors who share your relentless drive",
        "Experience the adrenaline of being part of a movement",
        "Unleash your ultimate potential in a team that believes in greatness"
      ]
    }
  ];

  return (
    <MotionConfig reducedMotion="user">
      <SectionContainer id="creative-expression" ref={ref}>
        <ParallaxImageBackground
          src={canvasImage}
          overlayOpacity={0.55}
        />
        <GlowEffect />
        <ContentWrapper>
          <SectionTitle variant="ew">FORGE YOUR BODY, FREE YOUR SPIRIT</SectionTitle>
          <SectionDescription
            variants={textVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            At SwanStudios, we build <span>warriors and artists</span>. True power is found when peak physical strength is united with unbridled creative expression. Here, we don't just lift weights; we lift each other. <strong>EVERY POSITIVE ACTION IS REWARDED</strong> - your journey is holistic. You earn points for everything: crushing a workout, creating art, motivating a teammate. In this ecosystem, your growth in body, mind, and spirit is our most valued currency.
          </SectionDescription>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <CardGrid>
              {expressionCategories.map((category, index) => (
                <ExpressionCard
                  key={index}
                  variants={itemVariants}
                  className={`expression-card ${category.title.includes('Heart') ? 'heart-card' : ''}`}
                >
                  <IconContainer className={category.title.includes('Heart') ? 'heart-icon' : ''}>
                    {category.icon}
                  </IconContainer>
                  <CardTitle className={category.title.includes('Heart') ? 'heart-card-title' : ''}>
                    {category.title}
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                  <BenefitsList>
                    {category.benefits.map((benefit, i) => (
                      <BenefitItem key={i}>{benefit}</BenefitItem>
                    ))}
                  </BenefitsList>
                </ExpressionCard>
              ))}
            </CardGrid>
          </motion.div>
        </ContentWrapper>
      </SectionContainer>
    </MotionConfig>
  );
};

export default CreativeExpressionSection;
