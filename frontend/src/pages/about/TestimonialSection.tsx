import React, { useRef, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView } from "framer-motion";
import Testimonial from "./Testimonial";

// Import local images from your assets folder
import maleBlk from "../../assets/maleblk.jpg";
import femaleLat from "../../assets/femalelat.jpg";
import femalewht from "../../assets/femalewht.jpg";
import femaleoldwht from "../../assets/femaleoldwht.jpg";
import male1 from "../../assets/male1.jpg";
import male2 from "../../assets/male2.jpg";

/*
  🌟 Ultra-Premium TestimonialSection Component
  --------------------------------------------
  - Features luxurious **glass-morphism background** with premium styling
  - Implements **sophisticated scroll reveal animations** with staggered entries
  - Includes **animated decorative elements** for visual richness
  - Enhanced with **premium typography** and visual hierarchy
  - Fully responsive with **perfectly balanced spacing** at all screen sizes
*/

// ======================= 🎨 Animation Keyframes =======================

const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-15px) rotate(2deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.05); opacity: 0.9; }
  100% { transform: scale(1); opacity: 0.7; }
`;

const slideGradient = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

// ======================= 🎨 Styled Components =======================

// Ultra-premium section container with glass morphism
const TestimonialSectionContainer = styled.section`
  position: relative;
  padding: 8rem 2rem;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  overflow: hidden;
  
  /* Glass morphism layer */
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(30, 30, 60, 0.25);
    backdrop-filter: blur(10px);
    z-index: 0;
  }
  
  @media (max-width: 768px) {
    padding: 6rem 1.5rem;
  }
  
  @media (max-width: 480px) {
    padding: 4rem 1rem;
  }
`;

// Decorative orbs for visual interest
const DecorativeOrb = styled.div`
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
  z-index: 0;
  animation: ${pulse} 8s infinite ease-in-out;
`;

// Deluxe animated section header
const SectionHeader = styled(motion.div)`
  text-align: center;
  position: relative;
  z-index: 2;
  margin-bottom: 5rem;
  
  @media (max-width: 768px) {
    margin-bottom: 3.5rem;
  }
`;

// Premium title with gradient and animation
const Title = styled(motion.h2)`
  font-size: 3.5rem;
  font-weight: 300;
  margin-bottom: 1.5rem;
  color: white;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  letter-spacing: 2px;
  position: relative;
  display: inline-block;
  
  /* Gradient hover effect */
  &:hover {
    background: linear-gradient(
      to right,
      #a9f8fb,
      #46cdcf,
      #7b2cbf,
      #c8b6ff,
      #a9f8fb
    );
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    animation: ${shimmer} 4s linear infinite;
  }
  
  /* Premium underline */
  &:after {
    content: "";
    position: absolute;
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%);
    width: 150px;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 0.8),
      rgba(120, 81, 169, 0.8),
      rgba(0, 255, 255, 0)
    );
  }
  
  @media (max-width: 768px) {
    font-size: 2.8rem;
    
    &:after {
      width: 120px;
    }
  }
  
  @media (max-width: 480px) {
    font-size: 2.2rem;
    
    &:after {
      width: 100px;
    }
  }
`;

// Premium subtitle
const Subtitle = styled(motion.p)`
  font-size: 1.2rem;
  max-width: 700px;
  margin: 2rem auto 0;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.8;
  position: relative;
  z-index: 1;
  
  span {
    color: #a9f8fb;
    font-weight: 500;
  }
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

// Premium testimonial grid with improved responsive layout
const TestimonialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 3rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2.5rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

// Premium pagination indicators with glass morphism
const PaginationContainer = styled(motion.div)`
  display: flex;
  justify-content: center;
  margin-top: 4rem;
  position: relative;
  z-index: 1;
`;

const PaginationWrapper = styled.div`
  display: flex;
  gap: 0.8rem;
  padding: 1rem 2rem;
  border-radius: 20px;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
`;

// Fixed the TypeScript error by properly typing the props with $isActive
interface PaginationDotProps {
  $isActive: boolean;
}

const PaginationDot = styled.button<PaginationDotProps>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.$isActive 
    ? 'linear-gradient(45deg, #00ffff, #7b2cbf)' 
    : 'rgba(255, 255, 255, 0.2)'};
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      45deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
    opacity: ${props => props.$isActive ? 1 : 0};
  }
  
  &:hover {
    transform: scale(1.3);
    background: ${props => props.$isActive 
      ? 'linear-gradient(45deg, #00ffff, #7b2cbf)' 
      : 'rgba(255, 255, 255, 0.4)'};
  }
`;

// Define the testimonial data structure
interface TestimonialData {
  name: string;
  gender: string;
  image: string;
  text: string;
  profession: string;
  rating: number;
}

// ======================= 🚀 Enhanced Component =======================

export default function TestimonialSection() {
  // References for scroll animations
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  
  // Animation controls
  const headerControls = useAnimation();
  const gridControls = useAnimation();
  const paginationControls = useAnimation();
  
  // In-view detection
  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.3 });
  const isGridInView = useInView(gridRef, { once: true, amount: 0.1 });
  const isPaginationInView = useInView(paginationRef, { once: true });
  
  // Testimonials data with premium descriptions
  const testimonials: TestimonialData[] = [
    {
      name: "Emily Carter",
      gender: "female",
      image: femalewht,
      text: "Before SwanStudios, I felt stuck—mentally and physically. Their training isn't just about lifting weights; it's about rebuilding confidence and strength from within. The trainers genuinely care, and for the first time, I feel empowered in my own body.",
      profession: "Marketing Executive",
      rating: 5
    },
    {
      name: "James Reynolds",
      gender: "male",
      image: maleBlk,
      text: "I walked into SwanStudios out of shape and doubting myself. Today, I walk out feeling like a warrior. The combination of strength training, injury prevention, and mindset coaching has changed my life in ways I never imagined.",
      profession: "Software Engineer",
      rating: 5
    },
    {
      name: "Sophia Martinez",
      gender: "female",
      image: femaleLat,
      text: "SwanStudios isn't just a gym—it's a community that uplifts you. I used to think fitness was about looking a certain way, but now I see it's about feeling strong, pain-free, and limitless. My transformation here has been nothing short of life-changing.",
      profession: "Healthcare Professional",
      rating: 5
    },
    {
      name: "Michael Thompson",
      gender: "male",
      image: male2,
      text: "As a former athlete, I thought my best days were behind me. SwanStudios proved me wrong. Their science-backed training helped me regain my mobility, explosiveness, and confidence. I feel ten years younger and stronger than ever.",
      profession: "Former College Athlete",
      rating: 5
    },
    {
      name: "Olivia Parker",
      gender: "female",
      image: femaleoldwht,
      text: "The trainers at SwanStudios are like fitness architects, designing programs that sculpt not just your body but your entire lifestyle. I've never felt so energized, capable, and in control of my health. This place is a game-changer!",
      profession: "Business Owner",
      rating: 5
    },
    {
      name: "David Mitchell",
      gender: "male",
      image: male1,
      text: "I came in looking for a workout plan. I found a transformation. SwanStudios challenged me physically and mentally, and today, I stand taller, move better, and live stronger. This training doesn't just change your body—it changes your life.",
      profession: "Finance Professional",
      rating: 5
    }
  ];

  // Helpers for remote avatars
  let remoteMaleCounter = 1;
  let remoteFemaleCounter = 1;

  // Helper function to determine which image URL to use
  const getAvatar = (testimonial: TestimonialData): string => {
    if (testimonial.image) {
      return testimonial.image;
    }
    if (testimonial.gender === "male") {
      const url = `https://randomuser.me/api/portraits/men/${remoteMaleCounter}.jpg`;
      remoteMaleCounter++;
      return url;
    } else if (testimonial.gender === "female") {
      const url = `https://randomuser.me/api/portraits/women/${remoteFemaleCounter}.jpg`;
      remoteFemaleCounter++;
      return url;
    }
    return "https://randomuser.me/api/portraits/lego/1.jpg";
  };

  // Start animations when elements come into view
  useEffect(() => {
    if (isHeaderInView) {
      headerControls.start("visible");
    }
    
    if (isGridInView) {
      gridControls.start("visible");
    }
    
    if (isPaginationInView) {
      paginationControls.start("visible");
    }
  }, [isHeaderInView, isGridInView, isPaginationInView, headerControls, gridControls, paginationControls]);

  // Animation variants
  const headerVariants = {
    hidden: { 
      opacity: 0,
      y: -50
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };
  
  const gridVariants = {
    hidden: { 
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2,
        duration: 0.5
      }
    }
  };
  
  const testimonialVariants = {
    hidden: { 
      opacity: 0,
      y: 50
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 100
      }
    }
  };
  
  const paginationVariants = {
    hidden: {
      opacity: 0,
      y: 30
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.8,
        ease: "easeOut"
      }
    }
  };

  // Build the final array with correct image sources
  const testimonialsWithAvatars = testimonials.map((testimonial) => ({
    ...testimonial,
    image: getAvatar(testimonial),
  }));

  return (
    <TestimonialSectionContainer ref={sectionRef}>
      {/* Decorative Elements */}
      <DecorativeOrb 
        style={{ 
          top: '15%', 
          left: '5%', 
          width: '400px', 
          height: '400px', 
          background: 'rgba(0, 255, 255, 0.15)',
          animationDelay: '0s' 
        }} 
      />
      <DecorativeOrb 
        style={{ 
          bottom: '10%', 
          right: '8%', 
          width: '500px', 
          height: '500px', 
          background: 'rgba(120, 81, 169, 0.15)',
          animationDelay: '1s' 
        }} 
      />
      <DecorativeOrb 
        style={{ 
          top: '40%', 
          right: '25%', 
          width: '300px', 
          height: '300px', 
          background: 'rgba(106, 13, 173, 0.1)',
          animationDelay: '2s' 
        }} 
      />

      {/* Header Section */}
      <SectionHeader 
        ref={headerRef}
        initial="hidden"
        animate={headerControls}
        variants={headerVariants}
      >
        <Title>What Our Clients Say</Title>
        <Subtitle>
          Real stories from real people who have transformed their lives with our
          <span> personalized training programs</span>.
        </Subtitle>
      </SectionHeader>

      {/* Testimonial Grid */}
      <motion.div
        ref={gridRef}
        initial="hidden"
        animate={gridControls}
        variants={gridVariants}
      >
        <TestimonialGrid>
          {testimonialsWithAvatars.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={testimonialVariants}
            >
              <Testimonial 
                name={testimonial.name}
                image={testimonial.image}
                text={testimonial.text}
                profession={testimonial.profession}
                rating={testimonial.rating}
              />
            </motion.div>
          ))}
        </TestimonialGrid>
      </motion.div>
      
      {/* Pagination */}
      <PaginationContainer
        ref={paginationRef}
        initial="hidden"
        animate={paginationControls}
        variants={paginationVariants}
      >
        <PaginationWrapper>
          {[1, 2].map((_, i) => (
            <PaginationDot 
              key={i} 
              $isActive={i === 0} 
              onClick={() => {}} // This would be functional in a paginated version
            />
          ))}
        </PaginationWrapper>
      </PaginationContainer>
    </TestimonialSectionContainer>
  );
}