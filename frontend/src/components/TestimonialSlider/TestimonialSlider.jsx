// src/pages/homepage/components/TestimonialSlider/TestimonialSlider.jsx
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { FaQuoteLeft, FaQuoteRight, FaStar, FaArrowRight, FaArrowLeft } from "react-icons/fa";

// Import assets
import clientImage1 from "../../assets/femaleoldwht.jpg";
import clientImage2 from "../../assets/femalelat.jpg";
import clientImage3 from "../../assets/male1.jpg";
import clientImage4 from "../../assets/maleblk.jpg";
import clientImage5 from "../../assets/femalewht.jpg";
import backgroundPattern from "../../assets/auth/auth-pattern.svg";

// Styled Components
const TestimonialSection = styled.section`
  position: relative;
  padding: 6rem 2rem;
  background: #0a0a0a url(${backgroundPattern});
  background-size: cover;
  background-blend-mode: overlay;
  overflow: hidden;
`;

const BackgroundGlow = styled.div`
  position: absolute;
  width: 80vh;
  height: 80vh;
  background: radial-gradient(
    ellipse at center,
    rgba(120, 81, 169, 0.15) 0%,
    rgba(0, 255, 255, 0.05) 50%,
    transparent 70%
  );
  border-radius: 50%;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  filter: blur(80px);
  z-index: 0;
  opacity: 0.6;
`;

const SectionContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const SectionHeading = styled(motion.h2)`
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: white;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  display: inline-block;
  left: 50%;
  transform: translateX(-50%);

  &::after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, #00ffff, #7851a9);
    border-radius: 3px;
  }
`;

const SectionSubHeading = styled(motion.p)`
  text-align: center;
  font-size: 1.2rem;
  color: #c0c0c0;
  margin-bottom: 3rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;

const TestimonialCarousel = styled.div`
  position: relative;
  width: 100%;
  min-height: 500px;
  margin: 0 auto;
  perspective: 1000px;
  
  @media (max-width: 768px) {
    min-height: 700px;
  }
`;

const TestimonialCard = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 800px;
  background: rgba(25, 25, 35, 0.85);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const TestimonialContent = styled.div`
  padding: 3rem;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    padding: 2rem;
  }
`;

const TestimonialHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const ClientImage = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--neon-blue, #00ffff);
  margin-right: 1.5rem;
  box-shadow: 0 5px 15px rgba(0, 255, 255, 0.3);
  
  @media (max-width: 768px) {
    margin-right: 0;
    margin-bottom: 1rem;
  }
`;

const ClientInfo = styled.div`
  flex: 1;
`;

const ClientName = styled.h3`
  font-size: 1.5rem;
  color: white;
  margin-bottom: 0.3rem;
`;

const ClientDetails = styled.p`
  font-size: 1rem;
  color: var(--neon-blue, #00ffff);
  margin-bottom: 0.5rem;
`;

const RatingContainer = styled.div`
  display: flex;
  color: gold;
  margin-bottom: 0.5rem;
`;

const ResultsLabel = styled.div`
  display: inline-block;
  background: rgba(120, 81, 169, 0.2);
  color: var(--royal-purple, #7851a9);
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
`;

const TestimonialText = styled.div`
  position: relative;
  padding: 0 1.5rem;
  margin-bottom: 2rem;
  font-size: 1.1rem;
  line-height: 1.7;
  color: #e0e0e0;
  
  &::before, &::after {
    position: absolute;
    color: rgba(0, 255, 255, 0.3);
    font-size: 2rem;
  }
  
  &::before {
    content: """;
    left: 0;
    top: -0.5rem;
  }
  
  &::after {
    content: """;
    right: 0;
    bottom: -1.5rem;
  }
`;

const BeforeAfterStats = styled.div`
  display: flex;
  justify-content: space-around;
  margin-top: 1rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatLabel = styled.p`
  font-size: 0.9rem;
  color: #c0c0c0;
  margin-bottom: 0.3rem;
`;

const StatValue = styled.p`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--neon-blue, #00ffff);
  
  &.before {
    text-decoration: line-through;
    color: #ff6b6b;
    opacity: 0.8;
  }
  
  &.after {
    color: #2ecc71;
  }
`;

const StatChange = styled.span`
  font-size: 0.9rem;
  color: #2ecc71;
  margin-left: 0.5rem;
`;

const NavigationButton = styled(motion.button)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  
  &.prev {
    left: 20px;
  }
  
  &.next {
    right: 20px;
  }
  
  @media (max-width: 768px) {
    top: auto;
    bottom: -80px;
    
    &.prev {
      left: calc(50% - 60px);
    }
    
    &.next {
      right: calc(50% - 60px);
    }
  }
`;

const ProgressIndicator = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 3rem;
`;

const ProgressDot = styled.button`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.active ? 'var(--neon-blue, #00ffff)' : 'rgba(255, 255, 255, 0.3)'};
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: var(--royal-purple, #7851a9);
  }
`;

const QuoteIcon = styled(motion.div)`
  position: absolute;
  color: rgba(0, 255, 255, 0.1);
  font-size: 5rem;
  z-index: 0;
  
  &.left {
    top: 20%;
    left: 5%;
  }
  
  &.right {
    bottom: 20%;
    right: 5%;
  }
`;

// Animation variants
const headingVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 } 
  }
};

const subheadingVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, delay: 0.2 } 
  }
};

const cardVariants = {
  enter: (direction) => {
    return {
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      rotateY: direction > 0 ? 30 : -30,
    }
  },
  center: {
    x: 0,
    opacity: 1,
    rotateY: 0,
    transition: {
      duration: 0.7,
      type: "spring",
      damping: 20
    }
  },
  exit: (direction) => {
    return {
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      rotateY: direction < 0 ? 30 : -30,
      transition: {
        duration: 0.7
      }
    }
  }
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: { 
    opacity: 0.1, 
    scale: 1,
    transition: { 
      duration: 0.8,
      ease: "easeOut"
    } 
  }
};

// Sample testimonial data
const testimonials = [
  {
    id: 1,
    name: "Sarah Johnson",
    details: "Lost 42 lbs in 7 months • Corporate Executive",
    image: clientImage1,
    text: "I tried countless fitness programs before finding SwanStudios, but nothing clicked. Sean's personalized approach was exactly what I needed. The team doesn't just focus on workouts—they transformed my relationship with nutrition and built sustainable habits. At 54, I'm stronger and more energetic than I was in my 30s!",
    rating: 5,
    beforeAfterStats: {
      weight: { before: "187 lbs", after: "145 lbs", change: "-22%" },
      bodyFat: { before: "33%", after: "21%", change: "-12%" },
      energy: { before: "4/10", after: "9/10", change: "+125%" }
    },
    resultLabel: "Weight Loss"
  },
  {
    id: 2,
    name: "Carlos Mendez",
    details: "Training for 1.5 years • Semi-Pro Soccer Player",
    image: clientImage2,
    text: "When I tore my ACL, doctors said my playing days might be over. The rehabilitation program designed by SwanStudios not only got me back on the field, but I'm performing better than before my injury. Their recovery protocols and progressive strength training approach have been game-changers for my career.",
    rating: 5,
    beforeAfterStats: {
      sprint: { before: "7.2s", after: "6.1s", change: "-15%" },
      vertJump: { before: "24 in", after: "32 in", change: "+33%" },
      strength: { before: "150 lbs", after: "245 lbs", change: "+63%" }
    },
    resultLabel: "Sports Performance"
  },
  {
    id: 3,
    name: "David Chen",
    details: "Client for 8 months • Tech Entrepreneur",
    image: clientImage3,
    text: "As a busy founder working 70+ hour weeks, I never thought I'd have time for fitness. The SwanStudios team crafted a program that fits perfectly into my chaotic schedule. Their online coaching platform keeps me accountable, and I've seen remarkable improvements in my strength and energy levels despite my limited time.",
    rating: 4.9,
    beforeAfterStats: {
      strength: { before: "95 lbs", after: "205 lbs", change: "+116%" },
      stress: { before: "9/10", after: "4/10", change: "-56%" },
      sleep: { before: "5 hrs", after: "7.5 hrs", change: "+50%" }
    },
    resultLabel: "Strength Gain"
  },
  {
    id: 4,
    name: "Marcus Jefferson",
    details: "Transformed in 10 months • Corporate Sales",
    image: clientImage4,
    text: "After hitting 40, my metabolism seemed to crash. I gained weight despite 'eating healthy' and couldn't understand why. The nutrition coaching at SwanStudios opened my eyes to what my body actually needed. Their body composition analysis showed my true starting point, and the team designed a complete lifestyle overhaul that has me looking and feeling 10 years younger.",
    rating: 5,
    beforeAfterStats: {
      weight: { before: "225 lbs", after: "195 lbs", change: "-13%" },
      waist: { before: "42 in", after: "36 in", change: "-14%" },
      bp: { before: "148/95", after: "118/75", change: "Normal" }
    },
    resultLabel: "Health Improvement"
  },
  {
    id: 5,
    name: "Jennifer Williams",
    details: "Client for 1 year • Mother of three",
    image: clientImage5,
    text: "After having three kids, I struggled to recognize my own body. The trainers at SwanStudios helped me rebuild my core strength and regain confidence. Their women's-specific training approach addressed my exact needs, and the supportive community kept me motivated through plateaus. I've never felt stronger or more capable!",
    rating: 5,
    beforeAfterStats: {
      coreStr: { before: "Poor", after: "Excellent", change: "+300%" },
      pushups: { before: "0", after: "15", change: "New PR" },
      confidence: { before: "3/10", after: "9/10", change: "+200%" }
    },
    resultLabel: "Post-Pregnancy Fitness"
  }
];

// Testimonial Slider Component
const TestimonialSlider = () => {
  const [[activeIndex, direction], setActiveIndex] = useState([0, 0]);
  const [autoplay, setAutoplay] = useState(true);
  
  // Navigate to a specific testimonial
  const navigate = (newDirection) => {
    setAutoplay(false); // Pause autoplay when manually navigating
    const nextIndex = activeIndex + newDirection;
    
    if (nextIndex < 0) {
      setActiveIndex([testimonials.length - 1, newDirection]);
    } else if (nextIndex >= testimonials.length) {
      setActiveIndex([0, newDirection]);
    } else {
      setActiveIndex([nextIndex, newDirection]);
    }
  };
  
  // Go to a specific testimonial
  const goToTestimonial = (index) => {
    setAutoplay(false); // Pause autoplay when manually navigating
    const newDirection = index > activeIndex ? 1 : -1;
    setActiveIndex([index, newDirection]);
  };
  
  // Autoplay functionality
  useEffect(() => {
    let interval;
    
    if (autoplay) {
      interval = setInterval(() => {
        const nextIndex = (activeIndex + 1) % testimonials.length;
        setActiveIndex([nextIndex, 1]);
      }, 6000);
    }
    
    return () => clearInterval(interval);
  }, [activeIndex, autoplay]);
  
  const currentTestimonial = testimonials[activeIndex];
  
  // Render star rating
  const renderRating = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <FaStar key={i} color={i < Math.floor(rating) ? "gold" : "#555"} />
      );
    }
    return stars;
  };
  
  return (
    <TestimonialSection id="testimonials">
      <BackgroundGlow />
      <QuoteIcon 
        className="left"
        variants={iconVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <FaQuoteLeft />
      </QuoteIcon>
      <QuoteIcon 
        className="right"
        variants={iconVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <FaQuoteRight />
      </QuoteIcon>
      
      <SectionContainer>
        <SectionHeading
          variants={headingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Success Stories
        </SectionHeading>
        <SectionSubHeading
          variants={subheadingVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Hear from real clients who have transformed their bodies and lives with our expert coaching
        </SectionSubHeading>
        
        <TestimonialCarousel>
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
                <TestimonialHeader>
                  <ClientImage src={currentTestimonial.image} alt={currentTestimonial.name} />
                  <ClientInfo>
                    <ClientName>{currentTestimonial.name}</ClientName>
                    <ClientDetails>{currentTestimonial.details}</ClientDetails>
                    <RatingContainer>
                      {renderRating(currentTestimonial.rating)}
                    </RatingContainer>
                    <ResultsLabel>{currentTestimonial.resultLabel}</ResultsLabel>
                  </ClientInfo>
                </TestimonialHeader>
                
                <TestimonialText>
                  {currentTestimonial.text}
                </TestimonialText>
                
                <BeforeAfterStats>
                  {Object.entries(currentTestimonial.beforeAfterStats).map(([key, value], index) => (
                    <StatItem key={index}>
                      <StatLabel>{key.charAt(0).toUpperCase() + key.slice(1)}</StatLabel>
                      <div>
                        <StatValue className="before">{value.before}</StatValue>
                        {" → "}
                        <StatValue className="after">{value.after}</StatValue>
                        <StatChange>{value.change}</StatChange>
                      </div>
                    </StatItem>
                  ))}
                </BeforeAfterStats>
              </TestimonialContent>
            </TestimonialCard>
          </AnimatePresence>
          
          <NavigationButton
            className="prev"
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaArrowLeft />
          </NavigationButton>
          
          <NavigationButton
            className="next"
            onClick={() => navigate(1)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaArrowRight />
          </NavigationButton>
        </TestimonialCarousel>
        
        <ProgressIndicator>
          {testimonials.map((_, index) => (
            <ProgressDot 
              key={index} 
              active={index === activeIndex}
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