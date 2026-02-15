import React from "react";
import styled, { keyframes, css } from "styled-components";
import { motion } from "framer-motion";

// Reduced-motion helper — disables CSS animations for users who prefer it
const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;
import Testimonial from "./Testimonial";
import GlowButton from "../../components/ui/buttons/GlowButton";

// Import images
import maleBlk from "../../assets/maleblk.jpg";
import femaleLat from "../../assets/femalelat.jpg";
import femalewht from "../../assets/femalewht.jpg";
import femaleoldwht from "../../assets/femaleoldwht.jpg";
import femaleAsi from "../../assets/femaleasi.jpg"; // Use existing image instead of male1
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
  ${reducedMotion}

  @media (max-width: 768px) {
    display: none;
  }
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

// Featured success story title wrapper
const FeaturedTitle = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 3rem 0;
  position: relative;
  z-index: 2;
`;

// Title text with animations
const TitleText = styled.div`
  display: inline-block;
  position: relative;
  text-align: center;
`;

// Normal part of the title
const TitleBase = styled.span`
  font-size: 2rem;
  font-weight: 300;
  color: white;
  margin-right: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

// Highlighted part of the title
const TitleHighlight = styled.span`
  font-size: 2rem;
  font-weight: 300;
  color: #b0b0ff;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -8px;
    width: 100%;
    height: 3px;
    border-radius: 2px;
    background: linear-gradient(90deg, #4a00e0, #8e2de2, #00ffff, #8e2de2);
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
    ${reducedMotion}
  }

  @media (max-width: 768px) {
    font-size: 1.75rem;
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
  grid-template-columns: auto 1fr;
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
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto;
  border: 3px solid rgba(255, 255, 255, 0.2);
  position: relative;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  flex-shrink: 0; /* Prevent image from shrinking */
  
  /* Glow effect */
  &:before {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 50%;
    background: linear-gradient(
      45deg, 
      rgba(0, 255, 255, 0.4), 
      rgba(120, 81, 169, 0.4)
    );
    z-index: -1;
    opacity: 0.7;
    animation: ${pulseGlow} 4s infinite ease-in-out;
    ${reducedMotion}
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  
  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
  }
`;

// Featured testimonial text content
const FeaturedText = styled.div`
  h4 {
    font-size: 1.5rem;
    color: #00ffff;
    margin: 0 0 0.25rem;
    font-weight: 500;
  }
  
  .profession {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 1.25rem;
    font-style: italic;
  }
  
  .quote {
    font-size: 1.1rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.9);
    position: relative;
    margin-bottom: 1.5rem;
    position: relative;
    padding: 0 0.5rem;
  }
  
  .quote::before,
  .quote::after {
    font-family: Georgia, serif;
    position: absolute;
    color: rgba(120, 81, 169, 0.3);
  }

  .quote::before {
    content: '"';
    top: -1rem;
    left: -0.5rem;
    font-size: 2.5rem;
  }

  .quote::after {
    content: '"';
    bottom: -1.5rem;
    right: 0;
    font-size: 2.5rem;
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
    ".... card4 ....";
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
export default function FixedTestimonialSection() {
  // Testimonials data
  const testimonials: TestimonialData[] = [
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
    },
    {
      name: "Anna Liu",
      image: femaleAsi,
      text: "What sets SwanStudios apart is their attention to detail. Every exercise is tailored to your specific needs and goals. I've trained at many gyms over the years, but none have delivered results as efficiently and effectively as SwanStudios.",
      profession: "Business Executive",
      rating: 5
    }
  ];

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
    <TestimonialSectionContainer id="testimonials-section">
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
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <Title>What Our Clients Say</Title>
        <Subtitle>
          Real stories from real people who have transformed their lives with our
          <span> personalized training programs</span>.
        </Subtitle>
      </SectionHeader>
      
      {/* Featured Testimonial */}
      <div>
        <FeaturedTitle
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <TitleText>
            <TitleBase>Featured</TitleBase>
            <TitleHighlight>Success Story</TitleHighlight>
          </TitleText>
        </FeaturedTitle>
        
        <FeaturedCard
          initial="hidden"
          animate="visible"
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
          My journey with SwanStudios began after years of trying everything else. Their science-based approach and personalized attention completely changed my relationship with fitness. In just six months, I've surpassed goals I never thought possible. The trainers here don't just help you look better—they teach you how to move better, feel better, and live better.
          </div>
          <div className="stars" role="img" aria-label="5 out of 5 stars">
          {[1, 2, 3, 4, 5].map((star) => (
          <div key={star} className="star" aria-hidden="true">★</div>
          ))}
          </div>
          </FeaturedText>
          </FeaturedContent>
        </FeaturedCard>
      </div>
      
      {/* Community Testimonials in T-Shape */}
      <div>
        <TShapedGrid
          initial="hidden"
          animate="visible"
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
        initial="hidden"
        animate="visible"
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