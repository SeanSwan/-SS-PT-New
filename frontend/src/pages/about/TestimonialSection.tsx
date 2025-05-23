import React, { useRef, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView } from "framer-motion";
import Testimonial from "./Testimonial";
import GlowButton from "../../components/Button/glowButton";

// Import images
import maleBlk from "../../assets/maleblk.jpg";
import femaleLat from "../../assets/femalelat.jpg";
import femalewht from "../../assets/femalewht.jpg";
import femaleoldwht from "../../assets/femaleoldwht.jpg";
import male1 from "../../assets/male1.jpg";
import male2 from "../../assets/male2.jpg";

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

const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(120, 81, 169, 0.7);
  }
  100% {
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
`;

// ======================= 🎨 Styled Components =======================

// Container for the entire section
const TestimonialSectionContainer = styled.section`
  position: relative;
  padding: 6rem 0;
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
    padding: 4rem 0;
  }
`;

// Decorative orbs for subtle background interest
const DecorativeOrb = styled.div`
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
  z-index: 0;
  animation: ${pulse} 8s infinite ease-in-out;
`;

// Section header with centered text
const SectionHeader = styled(motion.div)`
  text-align: center;
  position: relative;
  z-index: 2;
  margin-bottom: 2rem;
  padding: 0 1.5rem;
`;

// Main heading
const Title = styled(motion.h2)`
  font-size: 3.5rem;
  font-weight: 300;
  margin-bottom: 1.25rem;
  color: white;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  letter-spacing: 2px;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

// Subtitle text
const Subtitle = styled(motion.p)`
  font-size: 1.2rem;
  max-width: 700px;
  margin: 0 auto;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  
  span {
    color: #00ffff;
    font-weight: 400;
  }
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

// Featured testimonial title with proper underline effect
const FeaturedTitleWrapper = styled(motion.div)`
  text-align: center;
  margin: 2.5rem 0 2rem;
  position: relative;
  z-index: 2;
`;

const FeaturedTitleContent = styled.h3`
  font-size: 2rem;
  font-weight: 300;
  color: white;
  margin: 0;
  display: inline-block;
  position: relative;
  
  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const HighlightSpan = styled.span`
  margin-left: 0.5rem;
  position: relative;
  color: #b0b0ff;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(
      to right,
      #00ffff,
      #7851a9,
      #00ffff
    );
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
    border-radius: 2px;
  }
`;

// Featured testimonial card
const FeaturedCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  overflow: hidden;
  position: relative;
  max-width: 900px;
  margin: 0 auto 4rem;
  
  /* Gradient border effect */
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 15px;
    padding: 1px;
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    z-index: 0;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 3rem;
  }
`;

// Featured testimonial content layout
const FeaturedContent = styled.div`
  padding: 2.5rem;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  align-items: center;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 1.75rem;
    gap: 1.5rem;
  }
`;

// Featured testimonial image container
const FeaturedImage = styled.div`
  width: 200px;
  height: 200px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto;
  border: 3px solid rgba(255, 255, 255, 0.2);
  position: relative;
  
  /* Glow effect */
  &:before {
    content: '';
    position: absolute;
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border-radius: 50%;
    background: linear-gradient(
      45deg, 
      rgba(0, 255, 255, 0.6), 
      rgba(120, 81, 169, 0.6)
    );
    z-index: -1;
    opacity: 0.7;
    animation: ${pulseGlow} 4s infinite ease-in-out;
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  
  @media (max-width: 768px) {
    width: 150px;
    height: 150px;
  }
`;

// Featured testimonial text content
const FeaturedText = styled.div`
  h4 {
    font-size: 1.5rem;
    color: #00ffff;
    margin: 0 0 0.25rem;
    font-weight: 400;
  }
  
  .profession {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 1.25rem;
    font-style: italic;
  }
  
  .quote {
    font-size: 1.1rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
    position: relative;
    margin-bottom: 1.5rem;
  }
  
  .stars {
    display: flex;
    gap: 0.25rem;
  }
  
  .star {
    color: gold;
    font-size: 1.2rem;
  }
  
  @media (max-width: 768px) {
    text-align: center;
    
    h4 {
      font-size: 1.3rem;
    }
    
    .quote {
      font-size: 1rem;
    }
    
    .stars {
      justify-content: center;
    }
  }
`;

// T-shaped grid for community testimonials
const TShapedGrid = styled(motion.div)`
  display: grid;
  grid-template-areas:
    "card1 card2 card3"
    "empty card4 empty";
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto 3rem;
  padding: 0 2rem;
  
  & > div:nth-child(1) { grid-area: card1; }
  & > div:nth-child(2) { grid-area: card2; }
  & > div:nth-child(3) { grid-area: card3; }
  & > div:nth-child(4) { 
    grid-area: card4; 
    max-width: 400px;
    margin: 0 auto;
    width: 100%;
  }
  
  @media (max-width: 1100px) {
    grid-template-areas:
      "card1 card2"
      "card3 card4";
    grid-template-columns: 1fr 1fr;
    
    & > div:nth-child(4) {
      max-width: 100%;
    }
  }
  
  @media (max-width: 768px) {
    grid-template-areas:
      "card1"
      "card2"
      "card3"
      "card4";
    grid-template-columns: 1fr;
  }
`;

// Call-to-action container
const CTAContainer = styled(motion.div)`
  text-align: center;
  max-width: 700px;
  margin: 5rem auto 0;
  padding: 0 2rem;
  
  h3 {
    font-size: 2.2rem;
    font-weight: 300;
    margin-bottom: 1.25rem;
    color: white;
    
    span {
      background: linear-gradient(
        to right,
        #00ffff,
        #7851a9
      );
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
    }
  }
  
  p {
    font-size: 1.1rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 2rem;
  }
  
  .buttons {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
  }
  
  @media (max-width: 768px) {
    margin-top: 3rem;
    
    h3 {
      font-size: 1.8rem;
    }
    
    p {
      font-size: 1rem;
    }
    
    .buttons {
      flex-direction: column;
      gap: 1rem;
      align-items: center;
    }
  }
`;

// Define the testimonial data structure
interface TestimonialData {
  name: string;
  image: string;
  text: string;
  profession: string;
  rating: number;
}

// ======================= 🚀 TestimonialSection Component =======================
export default function TestimonialSection() {
  // References for scroll animations
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  
  // Animation controls
  const headerControls = useAnimation();
  const featuredControls = useAnimation();
  const gridControls = useAnimation();
  const ctaControls = useAnimation();
  
  // In-view detection
  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.3 });
  const isFeaturedInView = useInView(featuredRef, { once: true, amount: 0.3 });
  const isGridInView = useInView(gridRef, { once: true, amount: 0.3 });
  const isCTAInView = useInView(ctaRef, { once: true, amount: 0.3 });
  
  // Testimonials data
  const testimonials: TestimonialData[] = [
    {
      name: "Emily Carter",
      image: femalewht,
      text: "Before SwanStudios, I felt stuck—mentally and physically. Their training isn't just about lifting weights; it's about rebuilding confidence and strength from within. The trainers genuinely care, and for the first time, I feel empowered in my own body.",
      profession: "Marketing Executive",
      rating: 5
    },
    {
      name: "James Reynolds",
      image: maleBlk,
      text: "I walked into SwanStudios out of shape and doubting myself. Today, I walk out feeling like a warrior. The combination of strength training, injury prevention, and mindset coaching has changed my life in ways I never imagined.",
      profession: "Software Engineer",
      rating: 5
    },
    {
      name: "Sophia Martinez",
      image: femaleLat,
      text: "SwanStudios isn't just a gym—it's a community that uplifts you. I used to think fitness was about looking a certain way, but now I see it's about feeling strong, pain-free, and limitless. My transformation here has been nothing short of life-changing.",
      profession: "Healthcare Professional",
      rating: 5
    },
    {
      name: "Michael Thompson",
      image: male2,
      text: "As a former athlete, I thought my best days were behind me. SwanStudios proved me wrong. Their science-backed training helped me regain my mobility, explosiveness, and confidence. I feel ten years younger and stronger than ever.",
      profession: "Former College Athlete",
      rating: 5
    }
  ];

  // Start animations when elements come into view
  useEffect(() => {
    if (isHeaderInView) {
      headerControls.start("visible");
    }
    
    if (isFeaturedInView) {
      featuredControls.start("visible");
    }
    
    if (isGridInView) {
      gridControls.start("visible");
    }
    
    if (isCTAInView) {
      ctaControls.start("visible");
    }
  }, [
    isHeaderInView, 
    isFeaturedInView, 
    isGridInView, 
    isCTAInView,
    headerControls, 
    featuredControls, 
    gridControls,
    ctaControls
  ]);

  // Animation variants
  const fadeIn = {
    hidden: { 
      opacity: 0,
      y: 30
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
  
  const staggered = {
    hidden: { 
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };
  
  const cardAnimation = {
    hidden: { 
      opacity: 0,
      y: 30
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

  return (
    <TestimonialSectionContainer ref={sectionRef} id="testimonials-section">
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

      {/* Header Section */}
      <SectionHeader 
        ref={headerRef}
        initial="hidden"
        animate={headerControls}
        variants={fadeIn}
      >
        <Title>What Our Clients Say</Title>
        <Subtitle>
          Real stories from real people who have transformed their lives with our
          <span> personalized training programs</span>.
        </Subtitle>
      </SectionHeader>
      
      {/* Featured Testimonial */}
      <div ref={featuredRef}>
        <FeaturedTitleWrapper 
          initial="hidden"
          animate={featuredControls}
          variants={fadeIn}
        >
          <FeaturedTitleContent>
            Featured <HighlightSpan>Success Story</HighlightSpan>
          </FeaturedTitleContent>
        </FeaturedTitleWrapper>
        
        <FeaturedCard
          initial="hidden"
          animate={featuredControls}
          variants={fadeIn}
        >
          <FeaturedContent>
            <FeaturedImage>
              <img src={femalewht} alt="Emily Carter" />
            </FeaturedImage>
            
            <FeaturedText>
              <h4>Emily Carter</h4>
              <div className="profession">Marketing Executive</div>
              <div className="quote">
                "My journey with SwanStudios began after years of trying everything else. Their science-based approach and personalized attention completely changed my relationship with fitness. In just six months, I've surpassed goals I never thought possible. The trainers here don't just help you look better—they teach you how to move better, feel better, and live better."
              </div>
              <div className="stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={star} className="star">★</div>
                ))}
              </div>
            </FeaturedText>
          </FeaturedContent>
        </FeaturedCard>
      </div>
      
      {/* Community Testimonials in T-Shape */}
      <div ref={gridRef}>
        <TShapedGrid
          initial="hidden"
          animate={gridControls}
          variants={staggered}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={cardAnimation}
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
        </TShapedGrid>
      </div>
      
      {/* CTA Section */}
      <CTAContainer
        ref={ctaRef}
        initial="hidden"
        animate={ctaControls}
        variants={fadeIn}
      >
        <h3>
          Ready for Your <span>Transformation?</span>
        </h3>
        <p>
          Join the hundreds of clients who have transformed their bodies, improved their performance, and elevated their lifestyles with SwanStudios' elite training programs.
        </p>
        <div className="buttons">
          <GlowButton
            text="Book a Consultation"
            theme="cosmic"
            size="large"
            animateOnRender
          />
          <GlowButton
            text="Learn About Our Programs"
            theme="neon"
            size="large"
            animateOnRender
          />
        </div>
      </CTAContainer>
    </TestimonialSectionContainer>
  );
}