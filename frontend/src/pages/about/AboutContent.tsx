import React, { useRef, useEffect, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion, useInView, useAnimation } from "framer-motion";
import GlowButton from "../../components/Button/glowButton";

// Import Header Component
import Header from "../../components/Header/header";

// Import Assets
import logoImage from "../../assets/Logo.png";
import wavesVideo from "../../assets/Waves.mp4"; // Add subtle video background

// ======================= 🎨 Animations =======================
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
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(120, 81, 169, 0.7);
  }
  100% {
    box-shadow: 0 0 15px rgba(120, 81, 169, 0.4);
  }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const breathe = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
`;

const typeWriter = keyframes`
  from { width: 0; }
  to { width: 100%; }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ======================= 🎨 Styled Components =======================
const AboutSection = styled.section`
  position: relative;
  padding: 6rem 0;
  color: white;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  
  @media (max-width: 768px) {
    padding: 4rem 0;
  }
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.7),
      rgba(10, 10, 30, 0.85),
      rgba(20, 20, 50, 0.9)
    );
  }
  
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.5;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  width: 90%;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const TitleContainer = styled(motion.div)`
  position: relative;
  text-align: center;
  margin-bottom: 4rem;
`;

const Title = styled(motion.h2)`
  font-size: 3rem;
  font-weight: 300;
  color: white;
  position: relative;
  display: inline-block;
  letter-spacing: 2px;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  
  span {
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
    font-weight: 400;
  }
  
  &:after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 1),
      rgba(0, 255, 255, 0)
    );
  }

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 1.2rem;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.8);
  max-width: 700px;
  margin: 0 auto 2rem;
  line-height: 1.6;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;

  @media (max-width: 992px) {
    gap: 3rem;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
`;

const TextContent = styled(motion.div)`
  font-size: 1.1rem;
  line-height: 1.7;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.9);
  
  p {
    margin-bottom: 1.5rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    
    &:first-of-type::first-letter {
      font-size: 3.5rem;
      font-weight: 400;
      color: #00ffff;
      float: left;
      line-height: 0.8;
      margin-right: 0.15em;
      text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    }
  }
  
  strong {
    color: #00ffff;
    font-weight: 400;
    position: relative;
    
    /* Subtle highlight effect on hover */
    &:hover {
      background: linear-gradient(90deg, #00ffff, #7851a9);
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
    }
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    
    p:first-of-type::first-letter {
      font-size: 3rem;
    }
  }
`;

const FeatureList = styled.ul`
  list-style: none;
  padding-left: 0;
  margin: 2rem 0;
  
  li {
    position: relative;
    padding-left: 30px;
    margin-bottom: 1.2rem;
    transition: all 0.3s ease;
    
    &:before {
      content: '✓';
      position: absolute;
      left: 0;
      top: 0;
      color: #00ffff;
      font-weight: bold;
      font-size: 1.2rem;
      text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
    }
  }
`;

const ButtonContainer = styled(motion.div)`
  margin-top: 2.5rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 600px) {
    justify-content: center;
  }
`;

const ImageContainer = styled(motion.div)`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ImageWrapper = styled(motion.div)`
  position: relative;
  border-radius: 15px;
  overflow: hidden;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  animation: ${pulseGlow} 4s infinite ease-in-out;
  width: 100%;
  max-width: 450px; /* Set maximum width constraint */
  margin: 0 auto; /* Center the component if smaller than parent */
  
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 15px;
    padding: 2px;
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.8;
    z-index: 1;
  }
`;

const ImageContent = styled.img`
  width: 100%;
  height: auto;
  display: block;
  transform: scale(1);
  transition: transform 0.5s ease;
  aspect-ratio: 1 / 1; /* Maintain square aspect ratio */
  object-fit: contain; /* Ensure the image fits within container without distortion */
  
  ${ImageWrapper}:hover & {
    transform: scale(1.05);
  }
`;

const OrnamentalElement = styled(motion.div)`
  position: absolute;
  width: 150px;
  height: 150px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  z-index: -1;
  
  &:before {
    content: "";
    position: absolute;
    inset: 10px;
    border-radius: 50%;
    border: 1px dashed rgba(0, 255, 255, 0.3);
  }
`;

const TopLeftElement = styled(OrnamentalElement)`
  top: -50px;
  left: -50px;
  background: radial-gradient(circle at center, rgba(0, 255, 255, 0.1) 0%, transparent 70%);
  animation: ${float} 7s ease-in-out infinite;
`;

const BottomRightElement = styled(OrnamentalElement)`
  bottom: -50px;
  right: -50px;
  background: radial-gradient(circle at center, rgba(120, 81, 169, 0.1) 0%, transparent 70%);
  animation: ${float} 5s ease-in-out infinite;
`;

const StatsContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin: 5rem auto 0;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 2rem;
  text-align: center;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-10px);
  }
`;

const StatNumber = styled.div`
  font-size: 3rem;
  font-weight: 300;
  color: #00ffff;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  position: relative;
  display: inline-block;
`;

const CounterNumber = styled.span`
  display: inline-block;
`;

const StatLabel = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 300;
`;

// New components for Journey Timeline
const TimelineSection = styled(motion.div)`
  margin-top: 8rem;
  position: relative;
  padding-bottom: 2rem;
  
  @media (max-width: 768px) {
    margin-top: 5rem;
  }
`;

const TimelineTitle = styled(motion.h3)`
  text-align: center;
  font-size: 2.2rem;
  font-weight: 300;
  margin-bottom: 4rem;
  color: white;
  position: relative;
  display: inline-block;
  left: 50%;
  transform: translateX(-50%);
  
  span {
    color: #00ffff;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }
  
  &:after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 1),
      rgba(0, 255, 255, 0)
    );
  }
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const TimelineLine = styled.div`
  position: absolute;
  top: 120px;
  bottom: 0;
  left: 50%;
  width: 2px;
  background: linear-gradient(
    to bottom,
    rgba(0, 255, 255, 1),
    rgba(120, 81, 169, 0.8),
    rgba(0, 255, 255, 0.4)
  );
  transform: translateX(-1px);
  
  @media (max-width: 768px) {
    left: 30px;
  }
`;

const TimelineItems = styled.div`
  position: relative;
`;

const TimelineItem = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 4rem;
  gap: 2rem;
  
  &:nth-child(even) {
    .timeline-content {
      grid-column: 1;
      text-align: right;
      
      h4:after {
        left: auto;
        right: 0;
      }
    }
    
    .timeline-year {
      grid-column: 2;
      justify-self: start;
    }
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 60px 1fr;
    gap: 1rem;
    
    &:nth-child(even) {
      .timeline-content {
        grid-column: 2;
        text-align: left;
        
        h4:after {
          left: 0;
          right: auto;
        }
      }
      
      .timeline-year {
        grid-column: 1;
        justify-self: center;
      }
    }
  }
`;

const TimelineYear = styled.div`
  width: 60px;
  height: 60px;
  background: linear-gradient(45deg, #00ffff, #7851a9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  position: relative;
  z-index: 2;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  justify-self: end;
  
  &:after {
    content: '';
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    border: 1px dashed rgba(255, 255, 255, 0.3);
    animation: ${spin} 10s linear infinite;
  }
  
  @media (max-width: 768px) {
    width: 50px;
    height: 50px;
    font-size: 0.9rem;
    justify-self: center;
  }
`;

const TimelineContent = styled.div`
  h4 {
    font-size: 1.3rem;
    font-weight: 500;
    margin-bottom: 1rem;
    color: #00ffff;
    position: relative;
    display: inline-block;
    
    &:after {
      content: '';
      position: absolute;
      bottom: -5px;
      left: 0;
      width: 40px;
      height: 2px;
      background: #00ffff;
    }
  }
  
  p {
    font-size: 1rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
  }
  
  @media (max-width: 768px) {
    h4 {
      font-size: 1.1rem;
    }
    
    p {
      font-size: 0.9rem;
    }
  }
`;

// Innovative new PhilosophyCard component
const PhilosophyContainer = styled(motion.div)`
  margin: 6rem auto 0;
  
  @media (max-width: 768px) {
    margin-top: 4rem;
  }
`;

const PhilosophyTitle = styled(motion.h3)`
  text-align: center;
  font-size: 2.2rem;
  font-weight: 300;
  margin-bottom: 3rem;
  color: white;
  position: relative;
  display: inline-block;
  left: 50%;
  transform: translateX(-50%);
  
  span {
    color: #00ffff;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }
  
  &:after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 1),
      rgba(0, 255, 255, 0)
    );
  }
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const PhilosophyCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const PhilosophyCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 2.5rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 15px;
    padding: 2px;
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.6;
    z-index: 0;
  }
  
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transition: all 0.5s ease;
  }
  
  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
    
    &:after {
      left: 100%;
    }
  }
`;

const PhilosophyIcon = styled.div`
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  position: relative;
  z-index: 1;
  animation: ${breathe} 3s infinite ease-in-out;
  
  &:before {
    content: "";
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    border: 1px dashed rgba(0, 255, 255, 0.3);
    animation: ${spin} 15s linear infinite;
  }
  
  svg {
    width: 35px;
    height: 35px;
    color: #00ffff;
  }
`;

const PhilosophyCardTitle = styled.h4`
  font-size: 1.3rem;
  font-weight: 500;
  margin-bottom: 1rem;
  color: white;
  position: relative;
  z-index: 1;
  
  &:after {
    content: "";
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 2px;
    background: #00ffff;
  }
`;

const PhilosophyCardText = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
  position: relative;
  z-index: 1;
`;

// Dynamic text typing effect component
const TypedTextContainer = styled.div`
  margin: 2.5rem 0;
  position: relative;
  border-left: 3px solid #00ffff;
  padding-left: 1.5rem;
  max-width: 80%;
  
  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

// Use shouldForwardProp to prevent isTyping from being forwarded to DOM
const TypedText = styled.p.withConfig({
  shouldForwardProp: (prop) => prop !== 'isTyping'
})`
  font-size: 1.2rem;
  font-weight: 300;
  font-style: italic;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  position: relative;
  
  &:after {
    content: "${props => props.isTyping ? '|' : ''}";
    animation: blink 1s step-end infinite;
  }
  
  @keyframes blink {
    from, to { opacity: 1; }
    50% { opacity: 0; }
  }
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

// Certificate showcase
const CertificationsContainer = styled(motion.div)`
  margin-top: 2rem;
`;

const CertificationsTitle = styled.h5`
  font-size: 1.1rem;
  font-weight: 400;
  margin-bottom: 1rem;
  color: #00ffff;
`;

const CertificationBadges = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 600px) {
    justify-content: center;
  }
`;

const CertificationBadge = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    color: #00ffff;
  }
  
  &:hover {
    background: rgba(0, 255, 255, 0.1);
    transform: translateY(-2px);
  }
`;

// ======================= 🚀 AboutContent Component =======================
const AboutContent = () => {
  // References for scroll animations
  const titleRef = useRef(null);
  const textRef = useRef(null);
  const imageRef = useRef(null);
  const statsRef = useRef(null);
  const timelineRef = useRef(null);
  const philosophyRef = useRef(null);
  
  // Determine if elements are in view
  const titleInView = useInView(titleRef, { once: true });
  const textInView = useInView(textRef, { once: true });
  const imageInView = useInView(imageRef, { once: true });
  const statsInView = useInView(statsRef, { once: true });
  const timelineInView = useInView(timelineRef, { once: true });
  const philosophyInView = useInView(philosophyRef, { once: true });
  
  // Animation controls
  const titleControls = useAnimation();
  const textControls = useAnimation();
  const imageControls = useAnimation();
  const statsControls = useAnimation();
  const timelineControls = useAnimation();
  const philosophyControls = useAnimation();
  
  // State for number counter animation
  const [countedStats, setCountedStats] = useState({
    years: 0,
    clients: 0,
    successRate: 0,
    commitment: 0
  });
  
  // State for typed text effect
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const fullText = "We don't just train bodies; we transform lives. Our approach combines science, experience, and personalized attention to create sustainable results that last a lifetime.";
  
  // Handle stat counting animation
  useEffect(() => {
    if (statsInView) {
      const duration = 2000; // 2 seconds
      const framesPerSecond = 60;
      const totalFrames = duration / 1000 * framesPerSecond;
      
      let frame = 0;
      const interval = setInterval(() => {
        frame++;
        const progress = Math.min(frame / totalFrames, 1);
        
        setCountedStats({
          years: Math.floor(25 * progress),
          clients: Math.floor(1000 * progress),
          successRate: Math.floor(97 * progress),
          commitment: Math.floor(100 * progress)
        });
        
        if (frame === totalFrames) {
          clearInterval(interval);
        }
      }, 1000 / framesPerSecond);
      
      return () => clearInterval(interval);
    }
  }, [statsInView]);
  
  // Handle typed text animation
  useEffect(() => {
    if (textInView && typedText !== fullText) {
      const timeout = setTimeout(() => {
        setTypedText(fullText.substring(0, typedText.length + 1));
        if (typedText.length + 1 === fullText.length) {
          setIsTyping(false);
        }
      }, 50);
      
      return () => clearTimeout(timeout);
    }
  }, [textInView, typedText, fullText]);
  
  // Trigger animations when elements come into view
  useEffect(() => {
    if (titleInView) {
      titleControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: "easeOut" }
      });
    }
    
    if (textInView) {
      textControls.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.8, ease: "easeOut" }
      });
    }
    
    if (imageInView) {
      imageControls.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.8, ease: "easeOut", delay: 0.2 }
      });
    }
    
    if (statsInView) {
      statsControls.start("visible");
    }
    
    if (timelineInView) {
      timelineControls.start("visible");
    }
    
    if (philosophyInView) {
      philosophyControls.start("visible");
    }
  }, [
    titleInView, 
    textInView, 
    imageInView, 
    statsInView, 
    timelineInView,
    philosophyInView,
    titleControls, 
    textControls, 
    imageControls, 
    statsControls,
    timelineControls,
    philosophyControls
  ]);

  // Timeline data
  const timeline = [
    {
      year: 1998,
      title: "Professional Foundations",
      description: "Sean earned his National College of Exercise Professionals certification at Spectrum Club Manhattan Beach under legendary instructor Mike Dimora while working at Spectrum Club Howard Hughes Center in Los Angeles."
    },
    {
      year: 2000,
      title: "Certifications & Physical Therapy",
      description: "Obtained NASM certification and worked at Kerlan Jobe Health South as a physical therapy aid, gaining invaluable experience in injury prevention and recovery techniques."
    },
    {
      year: 2010,
      title: "Independent Training",
      description: "After successful tenures at LA Fitness, 24 Hour Fitness, and Bodies in Motion as both trainer and class instructor, Sean began independent training with a reputation for results-driven programs."
    },
    {
      year: 2013,
      title: "SwanStudios Founded",
      description: "Sean and his wife Jasmine founded SwanStudios with a vision to transform fitness training through personalized, science-backed methods that guarantee results with commitment."
    },
    {
      year: 2018,
      title: "Technology Integration",
      description: "Completed a full-stack development bootcamp to blend 25+ years of training expertise with AI technology, creating flawless programs that deliver 100% results for committed clients."
    },
    {
      year: 2025,
      title: "Community Expansion",
      description: "Expanding into dance-themed workout classes and launching the SwanStudios social platform to connect clients in a positive community focused on health, creativity, and mutual motivation."
    }
  ];

  // Philosophy cards data
  const philosophyCards = [
    {
      icon: "🔬",
      title: "Science-Backed",
      text: "Every aspect of our training methodology is grounded in scientific research and 25+ years of hands-on experience with proven results."
    },
    {
      icon: "👤",
      title: "Personalized",
      text: "No cookie-cutter programs. Every client receives a fully customized AI-assisted plan tailored to their unique body, goals, and specific needs."
    },
    {
      icon: "🔄",
      title: "Sustainable",
      text: "We focus on building habits and systems that create lasting change, addressing everything from posture to nutrition to injury prevention."
    },
    {
      icon: "🌟",
      title: "Community",
      text: "Promoting love, unity, and creative expression through fitness, dance, art, and positive motivation in our growing supportive community."
    }
  ];

  // Stats data
  const stats = [
    { number: 25, label: "Years Experience", display: `${countedStats.years}+` },
    { number: 1000, label: "Clients Transformed", display: `${countedStats.clients}+` },
    { number: 97, label: "Success Rate", display: `${countedStats.successRate}%` },
    { number: 100, label: "Commitment to Excellence", display: `${countedStats.commitment}%` }
  ];

  return (
    <AboutSection>
      <VideoBackground>
        <video autoPlay loop muted playsInline>
          <source src={wavesVideo} type="video/mp4" />
        </video>
      </VideoBackground>
      
      <Container>
        <TitleContainer 
          ref={titleRef}
          initial={{ opacity: 0, y: 30 }}
          animate={titleControls}
        >
          <Title>
            About <span>SwanStudios</span>
          </Title>
          <Subtitle>
            Discover our revolutionary approach to fitness that has transformed the lives of over 
            a thousand clients through personalized elite-level training, creative expression, and a supportive community focused on complete wellness.
          </Subtitle>
        </TitleContainer>

        <Content>
          <TextContent
            ref={textRef}
            initial={{ opacity: 0, x: -30 }}
            animate={textControls}
          >
            <p>
              At <strong>SwanStudios</strong>, we don't believe in gimmicks—just real, <strong>results-driven training</strong> designed to transform your body and mindset. With over <strong>25 years of hands-on experience</strong>, we've built a system that is <strong>proven to work</strong> for anyone willing to commit.
            </p>

            <TypedTextContainer>
              <TypedText isTyping={isTyping}>{typedText}</TypedText>
            </TypedTextContainer>

            <p>
              Founder <strong>Sean Swan</strong> began his professional journey in 1998, earning his certification from the <strong>National College of Exercise Professionals</strong> under the legendary Mike Dimora. He has worked with elite fitness brands including <strong>LA Fitness, Gold's Gym, 24 Hour Fitness, and Bodies in Motion</strong>, serving in roles from trainer to assistant training manager. His expertise extends beyond traditional training—having worked as a <strong>physical therapy aid at Kerlan Jobe Health South</strong>, he understands <strong>injury prevention, recovery, and the science behind true fitness progress</strong>.
            </p>

            <p>
              In 2018, Sean completed a full-stack development bootcamp to seamlessly blend technology with fitness expertise, creating AI-assisted programs that deliver guaranteed results for committed clients. This innovative approach has revolutionized how personalized fitness programs are developed at SwanStudios.
            </p>

            <p>
              Co-founder <strong>Jasmine Swan</strong>, who trained under Sean's expert guidance, brings her own exceptional talents to SwanStudios. Together, they've created more than just a gym—it's a <strong>commitment to excellence</strong> and a community that promotes health, creativity, and positive motivation. Every training plan is <strong>custom-tailored</strong> to the individual, ensuring that no two programs are the same.
            </p>

            <FeatureList>
              <li><strong>No shortcuts.</strong> Just elite-level coaching that works.</li>
              <li>Training rooted in <strong>science, experience, and innovation.</strong></li>
              <li>A <strong>proven track record</strong> of success with hundreds of clients.</li>
              <li><strong>AI-assisted performance tracking</strong> combined with thousands of real-world training hours.</li>
            </FeatureList>

            <p>
              At <strong>SwanStudios</strong>, we train the <strong>right way</strong>—with discipline, precision, and <strong>a method that guarantees results</strong> if you show up and do the work.
            </p>

            <CertificationsContainer
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <CertificationsTitle>Accreditations & Certifications:</CertificationsTitle>
              <CertificationBadges>
                <CertificationBadge
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>NASM Certified</span>
                </CertificationBadge>
                <CertificationBadge
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>ACE Professional</span>
                </CertificationBadge>
                <CertificationBadge
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>Precision Nutrition</span>
                </CertificationBadge>
                <CertificationBadge
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>TRX Certified</span>
                </CertificationBadge>
              </CertificationBadges>
            </CertificationsContainer>

            <ButtonContainer
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <GlowButton
                text="Start Your Transformation"
                theme="cosmic"
                size="large"
                animateOnRender
              />
              <GlowButton
                text="Meet The Team"
                theme="neon"
                size="large"
                animateOnRender
              />
            </ButtonContainer>
          </TextContent>

          <ImageContainer
            ref={imageRef}
            initial={{ opacity: 0, x: 30 }}
            animate={imageControls}
          >
            <ImageWrapper>
              <ImageContent
                src={logoImage}
                alt="SwanStudios"
              />
              <TopLeftElement 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
              />
              <BottomRightElement 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
              />
            </ImageWrapper>
          </ImageContainer>
        </Content>
        
        <StatsContainer
          ref={statsRef}
          initial="hidden"
          animate={statsControls}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                delayChildren: 0.3,
                staggerChildren: 0.2
              }
            }
          }}
        >
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              variants={{
                hidden: { y: 20, opacity: 0 },
                visible: {
                  y: 0,
                  opacity: 1,
                  transition: { duration: 0.6, ease: "easeOut" }
                }
              }}
            >
              <StatNumber><CounterNumber>{stat.display}</CounterNumber></StatNumber>
              <StatLabel>{stat.label}</StatLabel>
            </StatCard>
          ))}
        </StatsContainer>
        
        {/* Philosophy Cards Section */}
        <PhilosophyContainer
          ref={philosophyRef}
          initial="hidden"
          animate={philosophyControls}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                delayChildren: 0.3,
                staggerChildren: 0.2
              }
            }
          }}
        >
          <PhilosophyTitle>
            Our <span>Philosophy</span>
          </PhilosophyTitle>
          
          <PhilosophyCards>
            {philosophyCards.map((card, index) => (
              <PhilosophyCard
                key={index}
                variants={{
                  hidden: { y: 30, opacity: 0 },
                  visible: {
                    y: 0,
                    opacity: 1,
                    transition: { duration: 0.6, ease: "easeOut" }
                  }
                }}
              >
                <PhilosophyIcon>
                  {card.icon}
                </PhilosophyIcon>
                <PhilosophyCardTitle>{card.title}</PhilosophyCardTitle>
                <PhilosophyCardText>{card.text}</PhilosophyCardText>
              </PhilosophyCard>
            ))}
          </PhilosophyCards>
        </PhilosophyContainer>
        
        {/* Timeline Section */}
        <TimelineSection
          ref={timelineRef}
          initial="hidden"
          animate={timelineControls}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                delayChildren: 0.3,
                staggerChildren: 0.2
              }
            }
          }}
        >
          <TimelineTitle>
            Our <span>Journey</span>
          </TimelineTitle>
          
          <TimelineLine />
          
          <TimelineItems>
            {timeline.map((item, index) => (
              <TimelineItem
                key={index}
                variants={{
                  hidden: { y: 30, opacity: 0 },
                  visible: {
                    y: 0,
                    opacity: 1,
                    transition: { duration: 0.6, ease: "easeOut" }
                  }
                }}
              >
                <TimelineYear className="timeline-year">
                  {item.year}
                </TimelineYear>
                <TimelineContent className="timeline-content">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </TimelineContent>
              </TimelineItem>
            ))}
          </TimelineItems>
        </TimelineSection>
      </Container>
    </AboutSection>
  );
};

export default AboutContent;