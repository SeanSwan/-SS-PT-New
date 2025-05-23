import React, { useState, useEffect, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaArrowRight, FaStar } from "react-icons/fa";

// =============== ANIMATIONS ===============
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
`;

// =============== STYLED COMPONENTS ===============
const SectionWrapper = styled.section`
  position: relative;
  padding: 6rem 0;
  background-color: #151528;
  color: #fff;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: 
      radial-gradient(circle at 10% 20%, rgba(120, 81, 169, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 90% 80%, rgba(0, 255, 255, 0.1) 0%, transparent 50%);
    z-index: 0;
  }

  @media (max-width: 768px) {
    padding: 4rem 0;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  position: relative;
  z-index: 1;
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 4rem;
`;

const Title = styled(motion.h2)`
  font-size: 2.8rem;
  margin-bottom: 1.2rem;
  color: #fff;
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 1.2rem;
  line-height: 1.6;
  max-width: 700px;
  margin: 0 auto 3rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
`;

const FeaturedTitleWrapper = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  position: relative;
`;

const FeaturedTitle = styled(motion.h3)`
  font-size: 1.8rem;
  font-weight: 600;
  display: inline-block;
  margin: 0;
  color: #fff;
  position: relative;
`;

const HighlightSpan = styled.span`
  color: #b0b0ff;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, 
      rgba(74, 0, 224, 0.7), 
      rgba(142, 45, 226, 1),
      rgba(0, 255, 255, 0.8),
      rgba(142, 45, 226, 1)
    );
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
    border-radius: 2px;
  }
`;

const CarouselContainer = styled.div`
  position: relative;
  max-width: 900px;
  min-height: 450px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    min-height: 550px;
  }
`;

const TestimonialCard = styled(motion.div)`
  background: rgba(25, 25, 45, 0.8);
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(120, 81, 169, 0.3);
  
  @media (max-width: 768px) {
    padding: 2rem;
  }
`;

const CardInner = styled.div`
  display: flex;
  align-items: flex-start;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

const ImageContainer = styled.div`
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  margin-right: 2.5rem;
  border: 3px solid rgba(120, 81, 169, 0.5);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  animation: ${float} 6s ease-in-out infinite;
  
  &::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: linear-gradient(45deg, rgba(0, 255, 255, 0.4), rgba(120, 81, 169, 0.4));
    z-index: -1;
    opacity: 0.6;
  }
  
  @media (max-width: 768px) {
    margin: 0 auto 1.5rem;
    width: 100px;
    height: 100px;
  }
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ContentContainer = styled.div`
  flex: 1;
`;

const QuoteText = styled.p`
  font-size: 1.25rem;
  line-height: 1.7;
  margin-bottom: 1.5rem;
  color: rgba(255, 255, 255, 0.95);
  position: relative;
  
  &::before, &::after {
    font-family: Georgia, serif;
    position: absolute;
    color: rgba(120, 81, 169, 0.3);
  }
  
  &::before {
    content: '"';
    top: -1.5rem;
    left: -0.5rem;
    font-size: 4rem;
  }
  
  &::after {
    content: '"';
    bottom: -2rem;
    right: 0;
    font-size: 4rem;
  }
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    text-align: center;
    
    &::before {
      top: -1.5rem;
      left: 0;
      font-size: 3rem;
    }
    
    &::after {
      bottom: -1.5rem;
      right: 0;
      font-size: 3rem;
    }
  }
`;

const ClientInfo = styled.div`
  margin-top: 1.5rem;
`;

const ClientName = styled.h4`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.3rem;
  color: #fff;
`;

const ClientRole = styled.p`
  font-size: 1rem;
  color: #00e5ff;
  margin: 0 0 0.5rem;
`;

const Rating = styled.div`
  display: flex;
  color: #ffd700;
  
  svg {
    margin-right: 3px;
  }
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const NavigationButton = styled(motion.button)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(20, 20, 40, 0.7);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  font-size: 1.2rem;
  border: 1px solid rgba(120, 81, 169, 0.3);
  
  &:hover {
    background: rgba(120, 81, 169, 0.6);
  }
  
  &.prev {
    left: -25px;
  }
  
  &.next {
    right: -25px;
  }
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 1rem;
    
    &.prev {
      left: -10px;
    }
    
    &.next {
      right: -10px;
    }
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
  background-color: ${props => props.$active ? "rgba(120, 81, 169, 0.7)" : "rgba(255, 255, 255, 0.2)"};
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    background: ${props => props.$active ? "rgba(0, 255, 255, 0.3)" : "transparent"};
    transition: all 0.3s ease;
  }
  
  &:hover {
    background-color: ${props => props.$active ? "rgba(120, 81, 169, 0.9)" : "rgba(255, 255, 255, 0.4)"};
  }
`;

// =============== COMPONENT DATA ===============
interface Testimonial {
  id: number;
  name: string;
  role: string;
  image: string;
  text: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Emily Carter",
    role: "Marketing Executive",
    image: "/maleblk.jpg",
    text: "My journey with SwanStudios began after years of trying everything else. Their science-based approach and personalized attention completely changed my relationship with fitness. In just six months, I've surpassed goals I never thought possible. The trainers here don't just help you look better—they teach you how to move better, feel better, and live better."
  },
  {
    id: 2,
    name: "James Reynolds",
    role: "Software Engineer",
    image: "/male1.jpg",
    text: "I walked into SwanStudios out of shape and doubting myself. Today, I walk out feeling like a warrior. The combination of strength training, injury prevention, and mindset coaching has changed my life in ways I never imagined."
  },
  {
    id: 3,
    name: "Sophia Martinez",
    role: "Healthcare Professional",
    image: "/femaleasi.jpg",
    text: "SwanStudios isn't just a gym—it's a community that uplifts you. I used to think fitness was about looking a certain way, but now I see it's about feeling strong, pain-free, and limitless. My transformation here has been nothing short of life-changing."
  },
  {
    id: 4,
    name: "Michael Thompson",
    role: "Former College Athlete",
    image: "/male2.jpg",
    text: "As a former athlete, I thought my best days were behind me. SwanStudios proved me wrong. Their science-backed training helped me regain my mobility, explosiveness, and confidence. I feel ten years younger and stronger than ever."
  },
  {
    id: 5,
    name: "Olivia Parker",
    role: "Business Executive",
    image: "/femalelat.jpg",
    text: "The trainers at SwanStudios are like fitness architects, designing programs that sculpt not just your body but your entire lifestyle. I've never felt so energized, capable, and in control of my health. This place is a game-changer!"
  },
  {
    id: 6,
    name: "David Mitchell",
    role: "Tech Entrepreneur",
    image: "/femaleoldwht.jpg",
    text: "I came in looking for a workout plan. I found a transformation. SwanStudios challenged me physically and mentally, and today, I stand taller, move better, and live stronger. This training doesn't just change your body—it changes your life."
  }
];

// =============== ANIMATIONS VARIANTS ===============
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1.0]
    } 
  }
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 500 : -500,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.5 }
    }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 500 : -500,
    opacity: 0,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.3 }
    }
  })
};

// =============== MAIN COMPONENT ===============
const TestimonialSection: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const totalTestimonials = testimonials.length;
  const autoPlayInterval = 7000; // 7 seconds between auto-slides
  
  // Navigation functions
  const nextTestimonial = useCallback(() => {
    setDirection(1);
    setCurrent(prev => (prev === totalTestimonials - 1 ? 0 : prev + 1));
  }, [totalTestimonials]);
  
  const prevTestimonial = useCallback(() => {
    setDirection(-1);
    setCurrent(prev => (prev === 0 ? totalTestimonials - 1 : prev - 1));
  }, [totalTestimonials]);
  
  // Go to specific testimonial
  const goToTestimonial = useCallback((index: number) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  }, [current]);
  
  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      nextTestimonial();
    }, autoPlayInterval);
    
    return () => clearInterval(interval);
  }, [nextTestimonial]);
  
  // Star rating component
  const StarRating = () => (
    <Rating>
      {[...Array(5)].map((_, i) => (
        <FaStar key={i} />
      ))}
    </Rating>
  );
  
  return (
    <SectionWrapper id="testimonials">
      <Container>
        <SectionHeader>
          <Title
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            What Our Clients Say
          </Title>
          
          <Subtitle
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            Real stories from real people who have transformed their lives with our
            personalized training programs.
          </Subtitle>
        </SectionHeader>
        
        <FeaturedTitleWrapper>
          <FeaturedTitle
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            Featured <HighlightSpan>Success Story</HighlightSpan>
          </FeaturedTitle>
        </FeaturedTitleWrapper>
        
        <CarouselContainer>
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <TestimonialCard
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ position: 'absolute', width: '100%' }}
            >
              <CardInner>
                <ImageContainer>
                  <Image src={testimonials[current].image} alt={testimonials[current].name} />
                </ImageContainer>
                
                <ContentContainer>
                  <QuoteText>{testimonials[current].text}</QuoteText>
                  <ClientInfo>
                    <ClientName>{testimonials[current].name}</ClientName>
                    <ClientRole>{testimonials[current].role}</ClientRole>
                    <StarRating />
                  </ClientInfo>
                </ContentContainer>
              </CardInner>
            </TestimonialCard>
          </AnimatePresence>
          
          <NavigationButton 
            className="prev" 
            onClick={prevTestimonial} 
            aria-label="Previous testimonial"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaArrowLeft />
          </NavigationButton>
          
          <NavigationButton 
            className="next" 
            onClick={nextTestimonial} 
            aria-label="Next testimonial"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaArrowRight />
          </NavigationButton>
        </CarouselContainer>
        
        <ProgressIndicator>
          {testimonials.map((_, index) => (
            <ProgressDot 
              key={index} 
              $active={index === current} 
              onClick={() => goToTestimonial(index)}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </ProgressIndicator>
      </Container>
    </SectionWrapper>
  );
};

export default TestimonialSection;
