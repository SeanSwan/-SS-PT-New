// frontend/src/pages/HomePage/components/TrainerProfilesSection.tsx
// === TrainerProfiles v2.0 - Ethereal Wilderness tokens ===

import React, { useState, useCallback, useEffect, useRef } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  Star,
  Linkedin,
  Instagram,
  ArrowRight,
  ArrowLeft,
  Medal,
  Flame,
  Calendar
} from "lucide-react";
import GlowButton from "../../../components/ui/buttons/GlowButton";
import SectionTitle from "../../../components/ui/SectionTitle";
import { useUniversalTheme } from "../../../context/ThemeContext";
import SectionVideoBackground from "../../../components/ui/backgrounds/SectionVideoBackground";

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

// === TypeScript Interfaces ===
interface SocialLinksData {
  linkedin: string;
  instagram: string;
}

interface Trainer {
  id: number;
  name: string;
  title: string;
  image: string;
  bio: string;
  specialties: string[];
  rating: number;
  reviews: number;
  certifications: string[];
  socialLinks: SocialLinksData;
}

// === Animation Keyframes ===
const diagonalGlimmer = keyframes`
  0%, 85% {
    background-position: -200% 200%;
    opacity: 0;
  }
  90%, 95% {
    background-position: 0% 0%;
    opacity: 0.8;
  }
  100% {
    background-position: 200% -200%;
    opacity: 0;
  }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(0, 212, 170, 0.5)); }
  50% { filter: drop-shadow(0 0 20px rgba(0, 212, 170, 0.8)); }
  100% { filter: drop-shadow(0 0 5px rgba(0, 212, 170, 0.5)); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 15px rgba(120, 81, 169, 0.4); }
  50% { box-shadow: 0 0 25px rgba(120, 81, 169, 0.7); }
  100% { box-shadow: 0 0 15px rgba(120, 81, 169, 0.4); }
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
  width: 100%;
  max-width: 100vw;
  margin: 0;
  box-sizing: border-box;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
`;

const GridLines = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 25px 25px;
  z-index: 0;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const SectionSubtitle = styled(motion.p)`
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 3rem;
  color: ${T.textSecondary};
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  transition: color 0.3s ease;

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const TrainerCarousel = styled.div`
  position: relative;
  width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;

  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`;

const TrainerCard = styled(motion.div)`
  background: ${T.surface};
  border-radius: 16px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: row;
  position: relative;
  min-height: 450px;
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
  border: 1px solid rgba(0, 212, 170, 0.12);
  transition: all 0.3s ease;

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    &:hover {
      border-color: rgba(0, 212, 170, 0.3);
      box-shadow: 0 20px 40px -10px rgba(0, 212, 170, 0.2);
    }
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      transparent 0%,
      rgba(0, 212, 170, 0.06) 25%,
      rgba(0, 212, 170, 0.12) 50%,
      rgba(0, 212, 170, 0.06) 75%,
      transparent 100%
    );
    background-size: 200% 200%;
    pointer-events: none;
    border-radius: 16px;
    opacity: 0;

    @media (prefers-reduced-motion: no-preference) {
      animation: ${diagonalGlimmer} 5s linear infinite;
    }
  }

  @media (hover: hover) {
    &:hover::before {
      opacity: 1;
    }
  }

  @media (max-width: 900px) {
    flex-direction: column;
    max-width: 550px;
    height: auto;
    min-height: auto;
  }

  ${noMotion}
`;

const TrainerImageContainer = styled.div`
  position: relative;
  width: 40%;
  min-width: 350px;
  height: auto;
  min-height: 100%;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 900px) {
    width: 100%;
    height: 300px;
    min-height: 300px;
  }

  @media (max-width: 480px) {
    height: 250px;
    min-height: 250px;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to top, rgba(10, 10, 26, 1), transparent);
    opacity: 0.6;

    @media (min-width: 901px) {
      background: linear-gradient(to right, rgba(10, 10, 26, 0.8), transparent);
      width: 50%;
      left: auto;
      right: 0;
    }
  }
`;

const TrainerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  transition: transform 0.5s ease;
  filter: brightness(0.9);

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    ${TrainerCard}:hover & {
      transform: scale(1.05);
      filter: brightness(1);
    }
  }
`;

const TrainerInfo = styled.div`
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  color: ${T.text};
  width: 60%;

  @media (max-width: 900px) {
    width: 100%;
    padding: 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 1.25rem;
  }
`;

const TrainerName = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  color: ${T.text};
  font-weight: 600;
  transition: color 0.3s ease;
  font-family: 'Cormorant Garamond', 'Georgia', serif;

  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const TrainerTitle = styled.h4`
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: ${T.primary};
  font-weight: 400;
  transition: color 0.3s ease;
  font-family: 'Cormorant Garamond', 'Georgia', serif;

  @media (max-width: 480px) {
    font-size: 1rem;
  }
`;

const TrainerBio = styled.p`
  font-size: 1rem;
  margin-bottom: 1.5rem;
  color: ${T.textSecondary};
  line-height: 1.6;
  flex-grow: 1;
  transition: color 0.3s ease;
  overflow-wrap: break-word;
  word-wrap: break-word;
`;

const SpecialtiesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const SpecialtyTag = styled.div`
  background: rgba(0, 212, 170, 0.12);
  color: ${T.primary};
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s ease;
  flex-shrink: 0;
  border: 1px solid rgba(0, 212, 170, 0.25);

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    &:hover {
      background: rgba(0, 212, 170, 0.18);
      border-color: ${T.primary};
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 212, 170, 0.18);
    }
  }

  ${noMotion}
`;

const RatingContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-shrink: 0;
`;

const Rating = styled.div`
  display: flex;
  color: gold;
  margin-right: 0.5rem;
`;

const RatingText = styled.span`
  color: ${T.textSecondary};
  font-size: 0.9rem;
  transition: color 0.3s ease;
`;

const CardFooter = styled.div`
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 212, 170, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`;

const SocialLinksContainer = styled.div`
  display: flex;
  gap: 1rem;
`;

const SocialLink = styled.a`
  color: ${T.textSecondary};
  font-size: 1.2rem;
  transition: all 0.3s ease;

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    &:hover {
      color: ${T.primary};
      transform: translateY(-2px);
      filter: drop-shadow(0 0 8px rgba(0, 212, 170, 0.4));
    }
  }

  ${noMotion}
`;

const Certification = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(15, 25, 35, 0.85);
  color: ${T.accent};
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 2;
  border: 1px solid rgba(72, 232, 200, 0.3);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  cursor: default;

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    &:hover {
      background: rgba(72, 232, 200, 0.18);
      border-color: ${T.accent};
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 5px 15px rgba(72, 232, 200, 0.25);
    }
  }

  ${noMotion}
`;

const NavigationButton = styled(motion.button)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(15, 25, 35, 0.85);
  color: ${T.text};
  border: 1px solid rgba(0, 212, 170, 0.12);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    &:hover {
      background: ${T.secondary};
      border-color: rgba(0, 212, 170, 0.3);
      color: ${T.text};
      box-shadow: 0 8px 25px rgba(120, 81, 169, 0.3);
    }
  }

  &:focus-visible {
    outline: 2px solid ${T.primary};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(0, 212, 170, 0.3);
  }

  &:focus:not(:focus-visible) {
    outline: none;
  }

  &.prev {
    left: -60px;
  }

  &.next {
    right: -60px;
  }

  @media (max-width: 900px) {
    &.prev {
      left: 10px;
    }

    &.next {
      right: 10px;
    }
  }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    &.prev {
      left: 5px;
    }
    &.next {
      right: 5px;
    }
  }

  ${noMotion}
`;

const DotsContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  gap: 8px;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active }) => $active ? T.primary : `rgba(0, 212, 170, 0.18)`};
  border: 1px solid ${({ $active }) => $active ? T.primary : `rgba(0, 212, 170, 0.12)`};
  padding: 0;
  cursor: pointer;
  transition: all 0.3s ease;
  /* 44px touch target: 10px dot + 17px padding on each side = 44px */
  box-sizing: content-box;
  padding: 17px;
  background-clip: content-box;

  @media (hover: hover) {
    &:hover {
      background: ${({ $active }) => $active ? T.primary : T.secondary};
      background-clip: content-box;
      border-color: ${T.primary};
      transform: scale(1.2);
      box-shadow: 0 0 8px rgba(0, 212, 170, 0.25);
    }
  }

  &:focus-visible {
    outline: 2px solid ${T.primary};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(0, 212, 170, 0.3);
  }

  &:focus:not(:focus-visible) {
    outline: none;
  }

  ${noMotion}
`;

// === Animation Variants ===
const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    zIndex: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.6
    }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9,
    zIndex: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.6
    }
  })
};

const subtitleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.2 }
  }
};

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 }
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 }
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 }
  }
};

// Import logo for trainer images
import logoImage from "../../../assets/Logo.png";

// === Sample Trainer Data ===
const trainers: Trainer[] = [
  { id: 1, name: "Sean Swan", title: "Head Coach & Founder", image: logoImage, bio: "With over 25 years of experience, Sean has trained professional athletes and celebrities. His holistic approach focuses on sustainable performance improvements and injury prevention.", specialties: ["Strength & Conditioning", "Athletic Performance", "Injury Rehabilitation"], rating: 5, reviews: 152, certifications: ["NASM-CPT", "CSCS", "PES"], socialLinks: { linkedin: "https://linkedin.com/in/seanswan", instagram: "https://www.instagram.com/seanswantech" } },
  { id: 2, name: "Jasmine Hearon (Swan)", title: "Co-Founder & Elite Performance Coach", image: logoImage, bio: "Since 2012, Jasmine has been the cornerstone of SwanStudios' success. Her extensive background as a former Gold's Gym manager brings unparalleled leadership and training expertise to our elite coaching team.", specialties: ["Leadership Training", "Performance Coaching", "Program Development"], rating: 5, reviews: 147, certifications: ["NASM-CPT", "Management Certified", "Elite Coach"], socialLinks: { linkedin: "https://linkedin.com/in/jasmineswan", instagram: "https://instagram.com/jasmine_swan_fitness" } },
];

// === Component Implementation ===
const TrainerProfilesSection: React.FC = () => {
  const { currentTheme } = useUniversalTheme();
  const sectionRef = useRef<HTMLElement>(null);

  const [[activeIndex, direction], setActiveIndex] = useState<[number, number]>([0, 0]);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Theme-aware button variant (preserved for admin-command branch)
  const getThemeButtonVariant = () => {
    switch (currentTheme) {
      case 'swan-galaxy':
        return 'cosmic';
      case 'admin-command':
        return 'primary';
      case 'dark-galaxy':
        return 'cosmic';
      default:
        return 'cosmic';
    }
  };

  // Navigate between trainers
  const navigate = useCallback((newDirection: number) => {
    let nextIndex = activeIndex + newDirection;
    if (nextIndex < 0) nextIndex = trainers.length - 1;
    else if (nextIndex >= trainers.length) nextIndex = 0;
    setActiveIndex([nextIndex, newDirection]);
    setAutoRotate(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [activeIndex]);

  // Go to specific trainer
  const goToTrainer = useCallback((index: number) => {
    const newDirection = index > activeIndex ? 1 : (index < activeIndex ? -1 : 0);
    if (index !== activeIndex) {
      setActiveIndex([index, newDirection]);
      setAutoRotate(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [activeIndex]);

  // Touch swipe functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
    setAutoRotate(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart !== null) setTouchEnd(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    if (Math.abs(distance) > minSwipeDistance) navigate(distance > 0 ? 1 : -1);
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Auto rotation effect
  useEffect(() => {
    if (autoRotate) {
      intervalRef.current = setInterval(() => {
        const nextIndex = (activeIndex + 1) % trainers.length;
        setActiveIndex([nextIndex, 1]);
      }, 7000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeIndex, autoRotate]);

  // Scoped keyboard navigation -- only fires when focus is inside this section
  const handleSectionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigate(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigate(1);
    }
  }, [navigate]);

  // Safely get current trainer data
  const currentTrainerIndex = activeIndex >= 0 && activeIndex < trainers.length ? activeIndex : 0;
  const currentTrainer = trainers[currentTrainerIndex];

  if (!currentTrainer) {
    // Trainer data is missing or index is invalid — show loading fallback
    return (
      <SectionContainer id="trainers">
        <ContentWrapper>
          <SectionTitle variant="ew">Meet Our Expert Coaching Team</SectionTitle>
          <div style={{ color: T.textSecondary }}>Loading trainer details...</div>
        </ContentWrapper>
      </SectionContainer>
    );
  }

  // Render star rating
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(<Star key={`star-${i}`} color={i < fullStars ? "gold" : T.textSecondary} />);
    }
    return stars;
  };

  // Get specialty icon
  const getSpecialtyIcon = (specialty: string) => {
    const lowerSpecialty = specialty.toLowerCase();
    if (lowerSpecialty.includes("strength") || lowerSpecialty.includes("performance")) return <Flame />;
    if (lowerSpecialty.includes("nutrition") || lowerSpecialty.includes("body transformation")) return <Medal />;
    if (lowerSpecialty.includes("mobility") || lowerSpecialty.includes("rehabilitation") || lowerSpecialty.includes("recovery")) return <Calendar />;
    return <Flame />;
  };

  return (
    <MotionConfig reducedMotion="user">
      <SectionContainer
        id="trainers"
        ref={sectionRef}
        onKeyDown={handleSectionKeyDown}
        tabIndex={-1}
      >
        <SectionVideoBackground src="/galaxy1.mp4" fallbackGradient={`linear-gradient(135deg, ${T.bg}, #1a1a3c)`} overlayOpacity={0.65} />
        <GridLines />
        <ContentWrapper>
          <SectionTitle variant="ew">Meet Our Expert Coaching Team</SectionTitle>
          <SectionSubtitle
            variants={subtitleVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Our certified trainers combine decades of experience with cutting-edge methodologies
            to help you achieve extraordinary results.
          </SectionSubtitle>

          <TrainerCarousel
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <TrainerCard
                key={currentTrainer.id}
                custom={direction}
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <TrainerImageContainer>
                  <Certification>
                    <Medal style={{ marginRight: '5px' }} />
                    {currentTrainer.certifications?.[0] ?? 'Certified'}
                  </Certification>
                  <TrainerImage src={currentTrainer.image} alt={currentTrainer.name} />
                </TrainerImageContainer>
                <TrainerInfo>
                  <TrainerName>{currentTrainer.name}</TrainerName>
                  <TrainerTitle>{currentTrainer.title}</TrainerTitle>
                  <RatingContainer>
                    <Rating>{renderRating(currentTrainer.rating)}</Rating>
                    <RatingText>({currentTrainer.reviews} reviews)</RatingText>
                  </RatingContainer>
                  <TrainerBio>{currentTrainer.bio}</TrainerBio>
                  <SpecialtiesContainer>
                    {currentTrainer.specialties.map((specialty, index) => (
                      <SpecialtyTag key={`${currentTrainer.id}-spec-${index}`}>
                        {getSpecialtyIcon(specialty)} {specialty}
                      </SpecialtyTag>
                    ))}
                  </SpecialtiesContainer>
                  <CardFooter>
                    <GlowButton
                      text="Schedule My Session"
                      theme={getThemeButtonVariant()}
                      size="medium"
                      animateOnRender={false}
                      onClick={() => window.location.href = '/contact'}
                      rightIcon={<ArrowRight />}
                    />
                    <SocialLinksContainer>
                      <SocialLink href={currentTrainer.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${currentTrainer.name}'s LinkedIn profile`}> <Linkedin /> </SocialLink>
                      <SocialLink href={currentTrainer.socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${currentTrainer.name}'s Instagram profile`}> <Instagram /> </SocialLink>
                    </SocialLinksContainer>
                  </CardFooter>
                </TrainerInfo>
              </TrainerCard>
            </AnimatePresence>

            <NavigationButton className="prev" onClick={() => navigate(-1)} variants={buttonVariants} initial="visible" whileHover="hover" whileTap="tap" aria-label="Previous trainer"> <ArrowLeft /> </NavigationButton>
            <NavigationButton className="next" onClick={() => navigate(1)} variants={buttonVariants} initial="visible" whileHover="hover" whileTap="tap" aria-label="Next trainer"> <ArrowRight /> </NavigationButton>
          </TrainerCarousel>

          <DotsContainer>
            {trainers.map((_, index) => (
              <Dot
                key={`dot-${index}`}
                $active={index === currentTrainerIndex}
                onClick={() => goToTrainer(index)}
                aria-label={`Go to trainer ${index + 1}`}
              />
            ))}
          </DotsContainer>
        </ContentWrapper>
      </SectionContainer>
    </MotionConfig>
  );
};

export default TrainerProfilesSection;
