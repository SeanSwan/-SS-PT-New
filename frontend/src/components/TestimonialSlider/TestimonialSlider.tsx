import React, { useState, useEffect, useCallback, useRef } from "react";
import styled, { keyframes, css } from "styled-components";

// Reduced-motion helper
const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;
import { motion, AnimatePresence } from "framer-motion";
import { Quote, Star, ArrowRight, ArrowLeft } from "lucide-react";
import SectionTitle from "../ui/SectionTitle";

// --- Animation Keyframes ---
// Single subtle diagonal glimmer animation every 5 seconds
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

const pulseGlow = keyframes`
  0%, 100% { 
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.4)); 
  } 
  50% { 
    filter: drop-shadow(0 0 16px rgba(0, 255, 255, 0.7)); 
  }
`;

// --- Animation Variants ---
const subheadingVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: { x: 0, opacity: 1, transition: { duration: 0.7 } },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    transition: { duration: 0.7 }
  })
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
};

// --- Interfaces ---
interface StatValue {
  before: string;
  after: string;
  change: string;
}
interface BeforeAfterStats { [key: string]: StatValue; }
interface Testimonial {
  id: number;
  name: string;
  details: string;
  image: string;
  text: string;
  rating: number;
  beforeAfterStats: BeforeAfterStats;
  resultLabel: string;
  relatedProgramId?: string | number;
}

// --- Styled Components ---
const TestimonialSection = styled.section`
  position: relative;
  padding: 6rem 2rem 8rem;
  background: linear-gradient(145deg, #080818, #1a1a3a);
  overflow: hidden;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  @media (max-width: 768px) {
    padding: 4rem 1rem 6rem;
  }
`;

const BackgroundGlow = styled.div`
  position: absolute;
  width: 90vh;
  height: 90vh;
  background: radial-gradient(
    ellipse at center,
    rgba(120, 81, 169, 0.1) 0%,
    rgba(0, 255, 255, 0.03) 50%,
    transparent 70%
  );
  border-radius: 50%;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  filter: blur(100px);
  z-index: 0;
  opacity: 0.5;
  pointer-events: none;
`;

const SectionContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const SectionSubHeading = styled(motion.p)`
  text-align: center;
  font-size: 1.2rem;
  color: #b0b0d0;
  margin-bottom: 3rem;
  max-width: 750px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const TestimonialCarousel = styled.div`
  position: relative;
  width: 100%;
  min-height: 600px;
  margin: 0 auto;
  perspective: 1200px;
  @media (max-width: 768px) {
    min-height: 800px;
  }
`;

// Updated with single subtle diagonal glimmer effect
const TestimonialCard = styled(motion.div)`
  position: absolute;
  top: 0; left: 0; right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 1100px;
  background: rgba(15, 15, 30, 0.9);
  border-radius: 25px;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.4s ease;
  
  &:hover { 
    border-color: rgba(0, 255, 255, 0.3); 
  }
  
  /* Single subtle diagonal glimmer effect */
  &::before {
    content: "";
    position: absolute;
    inset: -1px;
    background: linear-gradient(
      135deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 25%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 75%,
      transparent 100%
    );
    background-size: 200% 200%;
    animation: ${diagonalGlimmer} 5s linear infinite;
    ${reducedMotion}
    pointer-events: none;
    z-index: -1;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  
  &:hover::before { 
    opacity: 0.8; 
  }
`;

const TestimonialContent = styled.div`
  display: flex;
  flex-direction: row;
  min-height: 450px;

  @media (max-width: 900px) {
    flex-direction: column;
  }
`;

const ProfileColumn = styled.div`
  width: 35%;
  background: rgba(0, 0, 0, 0.2);
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-right: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 900px) {
    width: 100%;
    flex-direction: row;
    text-align: left;
    padding: 2rem;
    justify-content: flex-start;
    gap: 2rem;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
`;

const ReviewColumn = styled.div`
  width: 65%;
  padding: 3rem 3.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media (max-width: 900px) {
    width: 100%;
    padding: 2rem;
  }

  @media (max-width: 600px) {
    padding: 1.5rem;
  }
`;

const ClientImage = styled.div<{ image: string }>`
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background-image: url(${props => props.image});
  background-size: cover;
  background-position: center;
  border: 4px solid var(--neon-blue, #00D4AA);
  margin-right: 0;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 20px rgba(0, 255, 255, 0.35);
  animation: ${pulseGlow} 5s ease-in-out infinite;
  ${reducedMotion}
  flex-shrink: 0;

  @media (max-width: 900px) {
    margin-bottom: 0;
  }

  @media (max-width: 600px) {
    margin-bottom: 1rem;
  }
`;

const ClientInfo = styled.div`
  flex: 1;
`;

const ClientName = styled.h3`
  font-size: 1.75rem;
  color: white;
  margin-bottom: 0.4rem;
  font-weight: 700;
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;
  font-family: 'Cormorant Garamond', 'Georgia', serif;
`;

const ClientDetails = styled.p`
  font-size: 1rem;
  color: var(--neon-blue, #00D4AA);
  margin-bottom: 0.6rem;
  opacity: 0.9;
  overflow-wrap: break-word;
  word-wrap: break-word;
`;

const RatingContainer = styled.div`
  display: flex;
  color: gold;
  margin-bottom: 0.7rem;
  gap: 2px;
  justify-content: center;

  @media (max-width: 900px) {
    justify-content: flex-start;
  }
  @media (max-width: 600px) {
    justify-content: center;
  }
`;

const ResultsLabel = styled.div`
  display: inline-block;
  background: rgba(120, 81, 169, 0.25);
  color: #c8b6ff;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 0.5rem;
  border: 1px solid rgba(120, 81, 169, 0.5);
`;

const TestimonialText = styled.div`
  position: relative;
  padding: 0 1rem;
  margin-bottom: 2.5rem;
  font-size: 1.25rem;
  line-height: 1.8;
  color: #e8e8f8;
  font-style: italic;
  text-align: left;
  overflow-wrap: break-word;
  word-wrap: break-word;
  font-family: 'Cormorant Garamond', 'Georgia', serif;

  @media (max-width: 900px) {
    text-align: center;
    font-size: 1.15rem;
  }
`;

const BeforeAfterStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  @media (max-width: 768px) {
    gap: 1rem;
    padding: 1rem;
    grid-template-columns: 1fr;
  }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatLabel = styled.p`
  font-size: 0.9rem;
  color: #a0a0c0;
  margin-bottom: 0.5rem;
  text-transform: capitalize;
`;

const StatValueContainer = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
`;

const StatValue = styled.p<{ $variant?: "before" | "after" }>`
  font-size: 1.6rem;
  font-weight: 600;
  color: ${props => props.$variant === "before" ? "#ff7b7b" : "#50fa7b"};
  text-decoration: ${props => props.$variant === "before" ? "line-through" : "none"};
  opacity: ${props => props.$variant === "before" ? 0.7 : 1};
  @media (max-width: 768px) {
    font-size: 1.4rem;
  }
`;

const StatChange = styled.span`
  font-size: 1rem;
  color: #50fa7b;
  font-weight: bold;
`;

const RelatedProgramLink = styled.a`
  display: block;
  text-align: center;
  margin-top: 2rem;
  padding: 0.5rem 1rem;
  color: var(--neon-blue, #00D4AA);
  text-decoration: underline;
  font-size: 0.9rem;
  opacity: 0.8;
  transition: opacity 0.3s ease;
  &:hover {
    opacity: 1;
    text-decoration: none;
    color: white;
    background-color: rgba(0, 255, 255, 0.1);
    border-radius: 5px;
  }
`;

const NavigationButton = styled(motion.button)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 2;
  font-size: 2rem;
  color: #00D4AA;
  &:hover { color: white; }
  &.prev { left: -60px; }
  &.next { right: -60px; }

  @media (max-width: 1300px) {
    &.prev { left: 10px; background: rgba(0,0,0,0.3); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    &.next { right: 10px; background: rgba(0,0,0,0.3); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  }
`;

const ProgressIndicator = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
`;

const ProgressDot = styled.button<{ $active: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin: 0 5px;
  padding: 16px;
  background-color: ${props => props.$active ? "#00D4AA" : "#555"};
  background-clip: content-box;
  border: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid rgba(0, 255, 255, 0.8);
    outline-offset: 2px;
  }
`;

const QuoteIcon = styled(motion.div).withConfig({
  shouldForwardProp: (prop) => !["position"].includes(prop)
})`
  position: absolute;
  color: rgba(0, 255, 255, 0.08);
  font-size: 6rem;
  z-index: 0;
  pointer-events: none;
  &.left { top: 15%; left: 5%; transform: rotate(-15deg); }
  &.right { bottom: 15%; right: 5%; transform: rotate(15deg); }
  @media (max-width: 768px) { font-size: 4rem; }
`;

// --- Testimonial Slider Component ---
const TestimonialSlider: React.FC = () => {
  const [[activeIndex, direction], setActiveIndex] = useState<[number, number]>([0, 0]);
  const [autoplay, setAutoplay] = useState<boolean>(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Sample Testimonials (Personal Training with Swanstudios) ---
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      details: "Lost 42 lbs in 7 months • Corporate Executive",
      image: "/femaleoldwht.jpg",
      text: "Thanks to Swanstudios personal training, I achieved an incredible transformation! The tailored workouts and nutrition plan helped me lose 42 lbs, and I feel more energetic and confident than ever.",
      rating: 5,
      beforeAfterStats: {
        weight: { before: "187 lbs", after: "145 lbs", change: "-22%" },
        bodyFat: { before: "33%", after: "21%", change: "-12%" },
        energy: { before: "4/10", after: "9/10", change: "+125%" }
      },
      resultLabel: "Weight Loss",
      relatedProgramId: "weight-loss-program"
    },
    {
      id: 2,
      name: "Carlos Mendez",
      details: "Training for 1.5 years • Semi-Pro Soccer Player",
      image: "/male2.jpg",
      text: "Swanstudios coaching not only accelerated my recovery but also boosted my performance on the field. Their expert guidance and personalized approach made all the difference.",
      rating: 5,
      beforeAfterStats: {
        sprint: { before: "7.2s", after: "6.1s", change: "-15%" },
        vertJump: { before: "24 in", after: "32 in", change: "+33%" },
        strength: { before: "150 lbs", after: "245 lbs", change: "+63%" }
      },
      resultLabel: "Sports Performance",
      relatedProgramId: "athlete-rehab-program"
    },
    {
      id: 3,
      name: "David Chen",
      details: "Client for 8 months • Tech Entrepreneur",
      image: "/male1.jpg",
      text: "The personalized training at Swanstudios truly transformed my lifestyle. I built strength, improved my overall wellness, and gained the confidence to balance my busy schedule.",
      rating: 4.9,
      beforeAfterStats: {
        strength: { before: "95 lbs", after: "205 lbs", change: "+116%" },
        stress: { before: "9/10", after: "4/10", change: "-56%" },
        sleep: { before: "5 hrs", after: "7.5 hrs", change: "+50%" }
      },
      resultLabel: "Strength Gain"
    }
  ];

  // --- Navigation Functions ---
  const navigate = useCallback((newDirection: number) => {
    const testimonialCount = testimonials.length;
    const newIndex = (activeIndex + newDirection + testimonialCount) % testimonialCount;
    setActiveIndex([newIndex, newDirection]);
  }, [activeIndex, testimonials.length]);

  const goToTestimonial = useCallback((index: number) => {
    const newDirection = index > activeIndex ? 1 : -1;
    setActiveIndex([index, newDirection]);
  }, [activeIndex]);

  // --- Touch Events ---
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) { // Swipe left for next
      navigate(1);
    } else if (distance < -50) { // Swipe right for previous
      navigate(-1);
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // --- Autoplay ---
  useEffect(() => {
    if (autoplay) {
      intervalRef.current = setInterval(() => {
        navigate(1);
      }, 5000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoplay, navigate]);

  // --- Keyboard Navigation ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        navigate(1);
      } else if (e.key === "ArrowLeft") {
        navigate(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // --- Current Testimonial ---
  const currentTestimonialIndex = activeIndex >= 0 && activeIndex < testimonials.length ? activeIndex : 0;
  const currentTestimonial = testimonials[currentTestimonialIndex];

  const renderRating = (rating: number) => {
    const stars = [];
    for (let i = 0; i < Math.floor(rating); i++) {
      stars.push(<Star key={i} aria-hidden="true" />);
    }
    return stars;
  };

  if (!currentTestimonial) {
    return (
      <TestimonialSection id="testimonials">
        <SectionContainer>
          <SectionTitle>Success Stories</SectionTitle>
          <div>Loading...</div>
        </SectionContainer>
      </TestimonialSection>
    );
  }

  return (
    <TestimonialSection id="testimonials">
      <BackgroundGlow />
      <QuoteIcon className="left" variants={iconVariants} initial="hidden" animate="visible">
        <Quote />
      </QuoteIcon>
      <QuoteIcon className="right" variants={iconVariants} initial="hidden" animate="visible">
        <Quote />
      </QuoteIcon>
      <SectionContainer>
        <SectionTitle>Success Stories</SectionTitle>
        <SectionSubHeading variants={subheadingVariants} initial="hidden" animate="visible">
          Hear from real clients who transformed their bodies and lives with our expert coaching at Swanstudios.
        </SectionSubHeading>
        <TestimonialCarousel
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <TestimonialCard
              key={currentTestimonial.id}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <TestimonialContent>
                <ProfileColumn>
                  <ClientImage image={currentTestimonial.image} />
                  <ClientInfo>
                    <ClientName>{currentTestimonial.name}</ClientName>
                    <ClientDetails>{currentTestimonial.details}</ClientDetails>
                    <RatingContainer role="img" aria-label={`${currentTestimonial.rating} out of 5 stars`}>{renderRating(currentTestimonial.rating)}</RatingContainer>
                    <ResultsLabel>{currentTestimonial.resultLabel}</ResultsLabel>
                  </ClientInfo>
                </ProfileColumn>
                <ReviewColumn>
                  <TestimonialText>"{currentTestimonial.text}"</TestimonialText>
                  <BeforeAfterStats>
                    {Object.entries(currentTestimonial.beforeAfterStats).map(([key, value]) => (
                      <StatItem key={key}>
                        <StatLabel>{key}</StatLabel>
                        <StatValueContainer>
                          <StatValue $variant="before">{value.before}</StatValue>
                          <span>→</span>
                          <StatValue $variant="after">{value.after}</StatValue>
                          <StatChange>({value.change})</StatChange>
                        </StatValueContainer>
                      </StatItem>
                    ))}
                  </BeforeAfterStats>
                  {currentTestimonial.relatedProgramId && (
                    <RelatedProgramLink href={`/store#program-${currentTestimonial.relatedProgramId}`}>
                      Learn about the program {currentTestimonial.name} used →
                    </RelatedProgramLink>
                  )}
                </ReviewColumn>
              </TestimonialContent>
            </TestimonialCard>
          </AnimatePresence>
          <NavigationButton className="prev" onClick={() => navigate(-1)} aria-label="Previous testimonial">
            <ArrowLeft aria-hidden="true" />
          </NavigationButton>
          <NavigationButton className="next" onClick={() => navigate(1)} aria-label="Next testimonial">
            <ArrowRight aria-hidden="true" />
          </NavigationButton>
        </TestimonialCarousel>
        <ProgressIndicator>
          {testimonials.map((_, index) => (
            <ProgressDot
              key={`dot-${index}`}
              $active={index === currentTestimonialIndex}
              onClick={() => goToTestimonial(index)}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </ProgressIndicator>
      </SectionContainer>
    </TestimonialSection>
  );
};

export default TestimonialSlider;