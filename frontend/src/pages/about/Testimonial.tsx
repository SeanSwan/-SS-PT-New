import React, { forwardRef } from "react";
import styled, { keyframes, css } from "styled-components";

// Reduced-motion helper
const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;
import { motion } from "framer-motion";

/*
  🌟 Premium Testimonial Component
  --------------------------------
  - Features luxury **glass-morphism card design** with premium styling
  - Implements **sophisticated animation effects** for enhanced engagement
  - Includes **elegant rating visualization** with animated stars
  - Optimized for **responsive layouts** across all device sizes
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

const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(120, 81, 169, 0.5);
  }
  100% {
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
`;

// ======================= 🎨 Styled Components =======================

// Premium glass-morphism card with luxury styling
const TestimonialCard = styled(motion.div)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  height: 100%;
  padding: 2.5rem;
  overflow: hidden;
  border-radius: 20px;
  
  /* Glass morphism effect */
  background: rgba(30, 30, 60, 0.25);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  /* Premium shadow effect */
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  /* Subtle gradient border top */
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      90deg, 
      rgba(0, 255, 255, 0.7), 
      rgba(120, 81, 169, 0.7)
    );
    opacity: 0.8;
    transition: opacity 0.3s ease;
  }
  
  /* Decorative accent in corner */
  &:after {
    content: '"';
    position: absolute;
    bottom: 10px;
    right: 20px;
    font-size: 120px;
    font-family: 'Georgia', serif;
    color: rgba(255, 255, 255, 0.03);
    line-height: 0.7;
    z-index: 0;
  }
`;

// Premium image container with animated glow effect
const ImageContainer = styled.div`
  position: relative;
  margin-bottom: 1.8rem;
  z-index: 1;
  
  /* Animated glow ring */
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
    ${reducedMotion}
  }
`;

// Premium testimonial image with enhanced styling
const TestimonialImage = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 1;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  
  ${TestimonialCard}:hover & img {
    transform: scale(1.08);
  }
  
  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
  }
`;

// Premium name styling with gradient text effect
const TestimonialName = styled.h3`
  font-size: 1.4rem;
  font-weight: 500;
  margin-bottom: 0.3rem;
  color: white;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  
  ${TestimonialCard}:hover & {
    background: linear-gradient(
      to right,
      #a9f8fb,
      #46cdcf,
      #7b2cbf,
      #c8b6ff
    );
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    animation: ${shimmer} 3s linear infinite;
  }
`;

// Premium profession styling
const Profession = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1.5rem;
  font-style: italic;
  position: relative;
  display: inline-block;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 1px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 0.8),
      rgba(0, 255, 255, 0)
    );
  }
`;

// Premium testimonial text
const TestimonialText = styled.p`
  font-size: 1.05rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.85);
  position: relative;
  z-index: 1;
  margin-bottom: 2rem;
  flex-grow: 1;
  
  /* Stylized quotation marks */
  &:before, &:after {
    font-family: 'Georgia', serif;
    font-size: 1.8rem;
    color: rgba(0, 255, 255, 0.7);
    line-height: 0;
  }
  
  &:before {
    content: """;
    margin-right: 0.2rem;
    vertical-align: -0.4rem;
  }
  
  &:after {
    content: """;
    margin-left: 0.2rem;
    vertical-align: -0.4rem;
  }
`;

// Premium star rating with animation
const RatingContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: auto;
  margin-bottom: 0.5rem;
`;

// Use shouldForwardProp to prevent 'filled' and 'index' from being forwarded to the DOM
const Star = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'filled' && prop !== 'index'
})<{ filled: boolean; index: number }>`
  color: ${props => props.filled ? '#FFD700' : 'rgba(255, 255, 255, 0.2)'};
  font-size: 1.2rem;
  margin: 0 2px;
  transition: all 0.3s ease;
  animation: ${float} 3s infinite ease-in-out;
  animation-delay: ${props => props.index * 0.1}s;
  ${reducedMotion}
  
  ${TestimonialCard}:hover & {
    transform: ${props => props.filled ? 'scale(1.2)' : 'scale(1)'};
  }
`;

// ======================= 🚀 Premium Testimonial Component =======================

// Interface for the component props
interface TestimonialProps {
  name: string;
  image: string;
  text: string;
  profession?: string;
  rating?: number;
  // Any additional motion props
  [x: string]: any;
}

// Using forwardRef to properly handle refs with Framer Motion
const Testimonial = forwardRef<HTMLDivElement, TestimonialProps>((props, ref) => {
  const { 
    name, 
    image, 
    text, 
    profession = "Client", 
    rating = 5,
    ...motionProps 
  } = props;

  // Card animation variants
  const cardVariants = {
    hidden: { 
      opacity: 0,
      y: 30 
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.6,
        ease: "easeOut" 
      }
    },
    hover: {
      y: -15,
      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
      transition: { 
        duration: 0.3,
        ease: "easeOut" 
      }
    }
  };

  return (
    <TestimonialCard
      ref={ref}
      variants={cardVariants}
      whileHover="hover"
      {...motionProps}
    >
      <ImageContainer>
        <TestimonialImage>
          <img src={image} alt={name} />
        </TestimonialImage>
      </ImageContainer>
      
      <TestimonialName>{name}</TestimonialName>
      <Profession>{profession}</Profession>
      
      <TestimonialText>{text}</TestimonialText>
      
      <RatingContainer role="img" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star, index) => (
          <Star key={star} filled={star <= rating} index={index} aria-hidden="true">
            ★
          </Star>
        ))}
      </RatingContainer>
    </TestimonialCard>
  );
});

// Add display name for debugging
Testimonial.displayName = "PremiumTestimonial";

export default Testimonial;