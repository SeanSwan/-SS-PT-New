// src/pages/homepage/components/YouTubeShowcase/YouTubeShowcase.jsx
import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { motion, useAnimation, useInView } from "framer-motion";
import { gsap } from "gsap";
import { FaPlay, FaYoutube } from "react-icons/fa";
import GlowButtonComponent from "../Button/glow";
import logoImage from "../../../../assets/Logo.png";

// Styled Components
const ShowcaseSection = styled.section`
  position: relative;
  padding: 8rem 2rem;
  background: linear-gradient(to right, #0a0a0a, #090320, #0a0a0a);
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 5rem 1rem;
  }

  @media (min-width: 2560px) {
    padding: 12rem 2rem;
  }
`;

const BackgroundPatterns = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  overflow: hidden;
  
  &::before, &::after {
    content: '';
    position: absolute;
    background-image: 
      radial-gradient(circle at 25% 25%, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, rgba(120, 81, 169, 0.05) 0%, transparent 50%);
    width: 150%;
    height: 150%;
    top: -25%;
    left: -25%;
    animation: rotateBackground 40s linear infinite;
  }
  
  @keyframes rotateBackground {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const GridLines = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  background-image: 
    linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120, 81, 169, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: -1px -1px;
`;

const ContentContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
`;

const TextContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  @media (max-width: 1024px) {
    order: 2;
    text-align: center;
    align-items: center;
  }
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  color: white;
  position: relative;
  
  span {
    background: linear-gradient(90deg, #00ffff, #7851a9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    position: relative;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 0;
    width: 100px;
    height: 3px;
    background: linear-gradient(90deg, #00ffff, #7851a9);
    border-radius: 3px;
  }
  
  @media (max-width: 1024px) {
    text-align: center;
    font-size: 2rem;
    
    &::after {
      left: 50%;
      transform: translateX(-50%);
    }
  }

  @media (min-width: 2560px) {
    font-size: 3.5rem;
  }
`;

const SectionDescription = styled(motion.p)`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  color: #c0c0c0;
  line-height: 1.8;
  max-width: 600px;
  
  @media (max-width: 1024px) {
    text-align: center;
    margin-left: auto;
    margin-right: auto;
  }

  @media (max-width: 768px) {
    font-size: 1.05rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.5rem;
    max-width: 800px;
  }
`;

const HighlightText = styled.span`
  color: var(--neon-blue, #00ffff);
  font-weight: 500;
`;

const FeaturesList = styled(motion.ul)`
  margin: 0 0 2.5rem;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.8rem;
    width: 100%;
    max-width: 500px;
  }

  @media (min-width: 2560px) {
    gap: 1.5rem;
  }
`;

const FeatureItem = styled(motion.li)`
  font-size: 1.05rem;
  color: #e0e0e0;
  display: flex;
  align-items: center;
  gap: 10px;
  
  &::before {
    content: '✓';
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00ffff, #7851a9);
    color: #000;
    font-size: 0.8rem;
    font-weight: bold;
  }

  @media (max-width: 768px) {
    font-size: 0.95rem;
    text-align: left;
  }

  @media (min-width: 2560px) {
    font-size: 1.3rem;
    
    &::before {
      width: 30px;
      height: 30px;
      font-size: 1rem;
    }
  }
`;

const VideoContainer = styled(motion.div)`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  perspective: 1000px;
  
  @media (max-width: 1024px) {
    order: 1;
    max-width: 700px;
    margin: 0 auto;
  }
`;

const VideoPlaceholder = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #090320, #1a142e);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transform-style: preserve-3d;
  transition: transform 0.5s ease;
`;

const LogoPlaceholder = styled.div`
  position: relative;
  width: 60%;
  height: 60%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.5s ease;
  z-index: 2;
  
  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.5));
  }
  
  ${VideoPlaceholder}:hover & {
    transform: scale(0.8);
    opacity: 0.6;
  }
`;

const VideoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.6) 100%);
  z-index: 1;
  transition: all 0.5s ease;
  
  ${VideoPlaceholder}:hover & {
    background: radial-gradient(circle at center, transparent 20%, rgba(0, 0, 0, 0.8) 100%);
  }
`;

const PlayButton = styled(motion.button)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 255, 255, 0.2);
  color: #00ffff;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  z-index: 5;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
  
  ${VideoPlaceholder}:hover & {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    border-radius: 50%;
    background: rgba(0, 255, 255, 0.1);
    z-index: -1;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }

  @media (max-width: 768px) {
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
  }

  @media (min-width: 2560px) {
    width: 120px;
    height: 120px;
    font-size: 2.5rem;
  }
`;

const ViewAllContainer = styled.div`
  margin-top: 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  
  @media (max-width: 1024px) {
    width: 100%;
    justify-content: center;
  }
`;

const ViewAllLink = styled(motion.a)`
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--neon-blue, #00ffff);
  text-decoration: none;
  font-weight: 500;
  font-size: 1.1rem;
  position: relative;
  padding: 0.5rem 0;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--neon-blue, #00ffff);
    transition: width 0.3s ease;
  }
  
  &:hover::after {
    width: 100%;
  }
  
  svg {
    font-size: 1.5rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.4rem;
    
    svg {
      font-size: 1.8rem;
    }
  }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
`;

const ModalContent = styled(motion.div)`
  position: relative;
  width: 100%;
  max-width: 1000px;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  
  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
  
  @media (max-width: 768px) {
    width: 95%;
  }
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: -20px;
  right: -20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--neon-blue, #00ffff);
  color: #000;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  z-index: 1001;
  
  &::before {
    content: '×';
    font-weight: bold;
  }
`;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const videoVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  }
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    }
  })
};

const modalVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

const modalContentVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    }
  }
};

// YouTube Showcase Component
const YouTubeShowcase = () => {
  const [showModal, setShowModal] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const vidContainerRef = useRef(null);
  const controls = useAnimation();
  const isInView = useInView(vidContainerRef, { once: false, amount: 0.3 });
  
  // Features list data
  const features = [
    "Exclusive Training Videos",
    "Form Correction Guides",
    "Nutrition Insights",
    "Recovery Techniques",
    "Mental Performance",
    "Success Stories"
  ];
  
  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);
  
  // GSAP hover effect for video container
  useEffect(() => {
    if (vidContainerRef.current) {
      const container = vidContainerRef.current;
      
      const handleMouseMove = (e) => {
        const { left, top, width, height } = container.getBoundingClientRect();
        const x = (e.clientX - left) / width - 0.5;
        const y = (e.clientY - top) / height - 0.5;
        
        gsap.to(container, {
          rotationY: x * 10,
          rotationX: y * -10,
          transformStyle: "preserve-3d",
          duration: 0.5,
          ease: "power2.out"
        });
      };
      
      const handleMouseLeave = () => {
        gsap.to(container, {
          rotationY: 0,
          rotationX: 0,
          duration: 0.5,
          ease: "power2.out"
        });
      };
      
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
      
      return () => {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, []);
  
  // Video modal handlers
  const openModal = () => {
    setShowModal(true);
    document.body.style.overflow = "hidden";
  };
  
  const closeModal = () => {
    setShowModal(false);
    document.body.style.overflow = "";
  };
  
  // YouTube video embed URL - replace with your actual video ID
  const videoEmbedUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ";
  
  return (
    <ShowcaseSection id="video-gallery">
      <BackgroundPatterns />
      <GridLines />
      <ContentContainer>
        <TextContent>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={controls}
          >
            <SectionTitle variants={itemVariants}>
              Expert <span>Video Guides</span>
            </SectionTitle>
            <SectionDescription variants={itemVariants}>
              Access our exclusive library of <HighlightText>professional training videos</HighlightText> created by Sean Swan and our elite coaching team. Perfect your form, optimize your nutrition, and elevate your fitness journey.
            </SectionDescription>
            
            <FeaturesList variants={containerVariants}>
              {features.map((feature, index) => (
                <FeatureItem 
                  key={index} 
                  custom={index} 
                  variants={listItemVariants}
                >
                  {feature}
                </FeatureItem>
              ))}
            </FeaturesList>
            
            <ViewAllContainer>
              <GlowButtonComponent text="Join Premium Access" />
              
              <ViewAllLink 
                href="/video-library" 
                variants={itemVariants}
                whileHover={{ x: 5 }}
              >
                <FaYoutube /> View All Videos
              </ViewAllLink>
            </ViewAllContainer>
          </motion.div>
        </TextContent>
        
        <VideoContainer 
          ref={vidContainerRef}
          variants={videoVariants}
          initial="hidden"
          animate={controls}
        >
          <VideoPlaceholder onClick={openModal}>
            <VideoOverlay />
            <LogoPlaceholder>
              <img src={logoImage} alt="SwanStudios Logo" />
            </LogoPlaceholder>
            <PlayButton
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaPlay />
            </PlayButton>
          </VideoPlaceholder>
        </VideoContainer>
      </ContentContainer>
      
      {/* Video Modal */}
      {showModal && (
        <ModalOverlay
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={closeModal}
        >
          <ModalContent
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`${videoEmbedUrl}?autoplay=1&rel=0`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setVideoLoaded(true)}
            />
            <CloseButton
              onClick={closeModal}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            />
          </ModalContent>
        </ModalOverlay>
      )}
    </ShowcaseSection>
  );
};

export default YouTubeShowcase;