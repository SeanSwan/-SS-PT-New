import backgroundImage from "../../../assets/swan-tile-big.png"; // Import background image
import React, { useState, useCallback, useEffect, useRef } from "react"; // Ensure useRef is imported
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaStar,
  FaLinkedin,
  FaInstagram,
  FaArrowRight,
  FaArrowLeft,
  FaMedal,
  FaFire,
  FaRegCalendarCheck
} from "react-icons/fa";
// Assuming GlowButton path is correct relative to this file
import GlowButton from "../../../components/ui/buttons/GlowButton";
import SectionTitle from "../../../components/ui/SectionTitle"; // Assuming this path is correct
import { useUniversalTheme } from "../../../context/ThemeContext";

// --- TypeScript Interfaces ---
interface TrainerSpecialty {
  name: string;
  icon: 'fire' | 'medal' | 'calendar';
}

interface SocialLinksData { // Renamed to avoid conflict with styled component
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
  socialLinks: SocialLinksData; // Use renamed interface
}

// --- Animation Keyframes ---
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
  0% { filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.5)); }
  50% { filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.8)); }
  100% { filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.5)); }
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

// --- Styled Components ---
const SectionContainer = styled.section`
  padding: 6rem 2rem;
  background: linear-gradient(to right, ${({ theme }) => theme.background.primary}90, ${({ theme }) => theme.background.secondary}90, ${({ theme }) => theme.background.primary}90),
              url(${backgroundImage});
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 100vw; // Ensure it doesn't exceed viewport width
  margin: 0;
  box-sizing: border-box;

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
  color: ${({ theme }) => theme.text.secondary};
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
  min-height: 722px; // Increased height to match new card height

  @media (max-width: 768px) {
    min-height: 772px; // Adjust for mobile layout (+36px from new height)
  }
`;

const TrainerCard = styled(motion.div)`
  background: ${({ theme }) => theme.background.surface};
  border-radius: 15px;
  padding: 0; // No padding on the card itself, handle inside TrainerInfo
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.elevation};
  display: flex;
  flex-direction: column;
  position: relative; // Changed from absolute to relative for carousel logic
  height: 722px; // Increased by additional 36px (quarter inch) to prevent bottom cutoff
  max-width: 800px;
  margin: 0 auto; // Center the card
  border: 1px solid ${({ theme }) => theme.borders.subtle};
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.borders.elegant};
    box-shadow: ${({ theme }) => theme.shadows.cosmic};
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
      ${({ theme }) => theme.colors.primary}10 25%,
      ${({ theme }) => theme.colors.primary}20 50%,
      ${({ theme }) => theme.colors.primary}10 75%,
      transparent 100%
    );
    background-size: 200% 200%;
    animation: ${diagonalGlimmer} 5s linear infinite;
    pointer-events: none;
    border-radius: 15px;
    opacity: 0;
  }
  
  &:hover::before {
    opacity: 1;
  }

  @media (max-width: 768px) {
    height: auto; // Allow height to adjust on mobile
    min-height: 722px; // Ensure minimum height on mobile (increased by additional 36px)
  }
`;

const TrainerImageContainer = styled.div`
  position: relative;
  height: 350px; // Increased height to ensure faces aren't cropped
  overflow: hidden;
  flex-shrink: 0; // Prevent shrinking

  /* Use different heights for different screen sizes to prevent face cropping */
  @media (min-width: 1200px) {
    height: 380px; // Taller for very large screens
  }

  @media (max-width: 768px) {
    height: 300px; // Original height for mobile
  }

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 40%;
    background: linear-gradient(to top, rgba(20, 20, 30, 1), transparent);
  }
`;

const TrainerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%; // Position to show faces better - center horizontally and slightly above center vertically
  transition: transform 0.5s ease;
  filter: brightness(0.9);

  ${TrainerCard}:hover & {
    transform: scale(1.05);
    filter: brightness(1);
  }

  /* Use different object-position for different screen sizes */
  @media (min-width: 1200px) {
    object-position: center 20%; // Adjusted for large screens
  }

  @media (max-width: 768px) {
    object-position: center top; // Original position for mobile
  }
`;

const TrainerInfo = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1; // Allow this section to grow and fill space
  color: white; // Ensure default text color is visible
`;

const TrainerName = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.text.primary};
  font-weight: 600;
  transition: color 0.3s ease;
`;

const TrainerTitle = styled.h4`
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 400;
  transition: color 0.3s ease;
`;

const TrainerBio = styled.p`
  font-size: 1rem;
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.text.secondary};
  line-height: 1.6;
  flex-grow: 1; // Allow bio to take up available space
  transition: color 0.3s ease;
`;

const SpecialtiesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const SpecialtyTag = styled.div`
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s ease;
  flex-shrink: 0; // Prevent tags from shrinking too much
  border: 1px solid ${({ theme }) => theme.colors.primary}40;

  &:hover {
    background: ${({ theme }) => theme.colors.primary}30;
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${({ theme }) => theme.colors.primary}30;
  }
`;

const RatingContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-shrink: 0; // Prevent shrinking
`;

const Rating = styled.div`
  display: flex;
  color: gold;
  margin-right: 0.5rem;
`;

const RatingText = styled.span`
  color: ${({ theme }) => theme.text.muted};
  font-size: 0.9rem;
  transition: color 0.3s ease;
`;

const CardFooter = styled.div`
  margin-top: auto; // Push to bottom
  padding-top: 1rem; // Add some space above the footer elements
  border-top: 1px solid rgba(255, 255, 255, 0.05); // Optional separator line
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0; // Prevent shrinking
`;

const SocialLinksContainer = styled.div` // Renamed from SocialLinks
  display: flex;
  gap: 1rem;
`;

const SocialLink = styled.a`
  color: ${({ theme }) => theme.text.muted};
  font-size: 1.2rem;
  transition: all 0.3s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
    filter: drop-shadow(0 0 8px ${({ theme }) => theme.colors.primary}60);
  }
`;

const Certification = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: ${({ theme }) => theme.background.elevated};
  color: ${({ theme }) => theme.colors.accent};
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 2;
  border: 1px solid ${({ theme }) => theme.borders.elegant};
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.accent}20;
    border-color: ${({ theme }) => theme.colors.accent};
    animation: ${stellarGlow} 2s ease-in-out infinite;
  }
`;

const NavigationButton = styled(motion.button)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: ${({ theme }) => theme.background.elevated};
  color: ${({ theme }) => theme.text.primary};
  border: 1px solid ${({ theme }) => theme.borders.subtle};
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

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
    border-color: ${({ theme }) => theme.borders.elegant};
    color: ${({ theme }) => theme.text.primary};
    box-shadow: ${({ theme }) => theme.shadows.primary};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}50;
  }

  &.prev {
    left: -25px;
  }

  &.next {
    right: -25px;
  }

  @media (max-width: 900px) { // Adjust breakpoint for button visibility
    &.prev {
      left: 10px;
    }

    &.next {
      right: 10px;
    }
  }

   @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    &.prev {
      left: 5px;
    }
    &.next {
      right: 5px;
    }
  }
`;

const DotsContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  gap: 8px;
`;

// Use transient prop $active for the Dot component
const Dot = styled.button<{ $active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.primary}30;
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.primary : theme.borders.subtle};
  padding: 0;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover, &:focus {
    background: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.secondary};
    border-color: ${({ theme }) => theme.colors.primary};
    transform: scale(1.2);
    box-shadow: 0 0 8px ${({ theme }) => theme.colors.primary}40;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}50;
  }
`;

// --- Animation Variants ---
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
    zIndex: 1, // Ensure current card is on top
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
    zIndex: 0, // Send exiting card behind
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

// --- Sample Trainer Data ---
// (Using the full data again for completeness - ALL IMAGES REPLACED WITH LOGO)
const trainers: Trainer[] = [
    { id: 1, name: "Sean Swan", title: "Head Coach & Founder", image: logoImage, bio: "With over 25 years of experience, Sean has trained professional athletes and celebrities. His holistic approach focuses on sustainable performance improvements and injury prevention.", specialties: ["Strength & Conditioning", "Athletic Performance", "Injury Rehabilitation"], rating: 5, reviews: 152, certifications: ["NASM-CPT", "CSCS", "PES"], socialLinks: { linkedin: "https://linkedin.com/in/seanswan", instagram: "https://www.instagram.com/seanswantech" } },
    { id: 2, name: "Jasmine Hearon (Swan)", title: "Co-Founder & Elite Performance Coach", image: logoImage, bio: "Since 2012, Jasmine has been the cornerstone of SwanStudios' success. Her extensive background as a former Gold's Gym manager brings unparalleled leadership and training expertise to our elite coaching team.", specialties: ["Leadership Training", "Performance Coaching", "Program Development"], rating: 5, reviews: 147, certifications: ["NASM-CPT", "Management Certified", "Elite Coach"], socialLinks: { linkedin: "https://linkedin.com/in/jasmineswan", instagram: "https://instagram.com/jasmine_swan_fitness" } },
    { id: 3, name: "Jennifer Adams", title: "Senior Performance Coach", image: logoImage, bio: "Jennifer specializes in helping clients transform their bodies through science-based training protocols. Her background in exercise physiology allows her to create optimized programs for any goal.", specialties: ["Body Transformation", "Nutrition Planning", "HIIT Training"], rating: 4.9, reviews: 98, certifications: ["NASM-CPT", "PN-1"], socialLinks: { linkedin: "https://linkedin.com/in/jenniferadamsfit", instagram: "https://instagram.com/jenadams_fit" } },
    { id: 4, name: "Michael Torres", title: "Strength Specialist", image: logoImage, bio: "Former competitive powerlifter, Michael helps clients build functional strength that translates to improved performance in both daily life and athletic pursuits.", specialties: ["Powerlifting", "Olympic Lifting", "Functional Strength"], rating: 4.8, reviews: 87, certifications: ["NSCA-CSCS"], socialLinks: { linkedin: "https://linkedin.com/in/michaeltorresstrength", instagram: "https://instagram.com/miketorreslifts" } },
    { id: 5, name: "Lisa Chen", title: "Mobility & Recovery Specialist", image: logoImage, bio: "Lisa combines traditional training approaches with cutting-edge recovery techniques to help clients move better, reduce pain, and improve longevity.", specialties: ["Mobility Training", "Pain Management", "Recovery Protocols"], rating: 4.9, reviews: 74, certifications: ["FRC", "FMS"], socialLinks: { linkedin: "https://linkedin.com/in/lisachenmobility", instagram: "https://instagram.com/lisamoveswell" } },
    { id: 6, name: "David Johnson", title: "Performance Nutrition Coach", image: logoImage, bio: "David's expertise in performance nutrition helps clients optimize their body composition, energy levels, and recovery through personalized nutrition strategies.", specialties: ["Sports Nutrition", "Macro Planning", "Supplement Guidance"], rating: 4.7, reviews: 63, certifications: ["PN-2", "CISSN"], socialLinks: { linkedin: "https://linkedin.com/in/davidjohnsonnutrition", instagram: "https://instagram.com/davidj_nutrition" } }
];

// --- Component Implementation ---
const TrainerProfilesSection: React.FC = () => {
  // Theme integration
  const { theme, currentTheme } = useUniversalTheme();
  
  const [[activeIndex, direction], setActiveIndex] = useState<[number, number]>([0, 0]);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Correctly typed ref
  
  // Theme-aware button variant
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

  // Keyboard navigation effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigate(-1);
      else if (e.key === 'ArrowRight') navigate(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Safely get current trainer data
  const currentTrainerIndex = activeIndex >= 0 && activeIndex < trainers.length ? activeIndex : 0;
  const currentTrainer = trainers[currentTrainerIndex]; // Get trainer data for the valid index

  // Add the crucial check here
  if (!currentTrainer) {
    console.error("Trainer data is missing or index is invalid:", activeIndex);
    return (
      <SectionContainer id="trainers">
        <ContentWrapper>
           <SectionTitle>Meet Our Expert Coaching Team</SectionTitle>
           <div>Loading trainer details...</div> {/* Provide a loading state */}
        </ContentWrapper>
      </SectionContainer>
     );
  }

  // Render star rating
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(<FaStar key={`star-${i}`} color={i < fullStars ? "gold" : "#555"} />);
    }
    return stars;
  };

  // Get specialty icon
  const getSpecialtyIcon = (specialty: string) => {
    const lowerSpecialty = specialty.toLowerCase();
    if (lowerSpecialty.includes("strength") || lowerSpecialty.includes("performance")) return <FaFire />;
    if (lowerSpecialty.includes("nutrition") || lowerSpecialty.includes("body transformation")) return <FaMedal />;
    if (lowerSpecialty.includes("mobility") || lowerSpecialty.includes("rehabilitation") || lowerSpecialty.includes("recovery")) return <FaRegCalendarCheck />;
    return <FaFire />;
  };

  return (
    <SectionContainer id="trainers">
      <GridLines />
      <ContentWrapper>
        <SectionTitle>Meet Our Expert Coaching Team</SectionTitle>
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
            {/* Use the safely retrieved currentTrainer */}
            <TrainerCard
              key={currentTrainer.id}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <Certification>
                 <FaMedal style={{ marginRight: '5px' }} />
                 {/* Use optional chaining for safety */}
                 {currentTrainer.certifications?.[0] ?? 'Certified'}
              </Certification>
              <TrainerImageContainer>
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
                        rightIcon={<FaArrowRight />}
                    />
                  <SocialLinksContainer>
                    <SocialLink href={currentTrainer.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${currentTrainer.name}'s LinkedIn profile`}> <FaLinkedin /> </SocialLink>
                    <SocialLink href={currentTrainer.socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${currentTrainer.name}'s Instagram profile`}> <FaInstagram /> </SocialLink>
                  </SocialLinksContainer>
                </CardFooter>
              </TrainerInfo>
            </TrainerCard>
          </AnimatePresence>

          <NavigationButton className="prev" onClick={() => navigate(-1)} variants={buttonVariants} initial="visible" whileHover="hover" whileTap="tap" aria-label="Previous trainer"> <FaArrowLeft /> </NavigationButton>
          <NavigationButton className="next" onClick={() => navigate(1)} variants={buttonVariants} initial="visible" whileHover="hover" whileTap="tap" aria-label="Next trainer"> <FaArrowRight /> </NavigationButton>
        </TrainerCarousel>

        <DotsContainer>
          {trainers.map((_, index) => (
            <Dot
              key={`dot-${index}`}
              $active={index === currentTrainerIndex} // Use the safe index
              onClick={() => goToTrainer(index)}
              aria-label={`Go to trainer ${index + 1}`}
            />
          ))}
        </DotsContainer>
      </ContentWrapper>
    </SectionContainer>
  );
};

export default TrainerProfilesSection;