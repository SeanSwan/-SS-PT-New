import React, { useRef, useEffect } from "react";
import styled, { keyframes } from "styled-components";
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
`;

const ImageContainer = styled(motion.div)`
  position: relative;
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
`;

const StatLabel = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 300;
`;

// ======================= 🚀 AboutContent Component =======================
const AboutContent = () => {
  // References for scroll animations
  const titleRef = useRef(null);
  const textRef = useRef(null);
  const imageRef = useRef(null);
  const statsRef = useRef(null);
  
  // Determine if elements are in view
  const titleInView = useInView(titleRef, { once: true });
  const textInView = useInView(textRef, { once: true });
  const imageInView = useInView(imageRef, { once: true });
  const statsInView = useInView(statsRef, { once: true });
  
  // Animation controls
  const titleControls = useAnimation();
  const textControls = useAnimation();
  const imageControls = useAnimation();
  const statsControls = useAnimation();
  
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
  }, [titleInView, textInView, imageInView, statsInView, titleControls, textControls, imageControls, statsControls]);

  // Stats data
  const stats = [
    { number: "25+", label: "Years Experience" },
    { number: "1000+", label: "Clients Transformed" },
    { number: "97%", label: "Success Rate" },
    { number: "100%", label: "Commitment to Excellence" }
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
            a thousand clients through personalized elite-level training and coaching.
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

            <p>
              Founder <strong>Sean Swan</strong> has worked with some of the biggest fitness brands in the world, including <strong>LA Fitness, Gold's Gym, 24 Hour Fitness, and Bodies in Motion</strong>. His expertise extends beyond traditional training—having worked as a <strong>physical therapy aid at Kerlan Jobe Health South</strong>, he understands <strong>injury prevention, recovery, and the science behind true fitness progress</strong>.
            </p>

            <p>
              Alongside his wife <strong>Jasmine</strong>, a dedicated fitness professional, Sean has built SwanStudios as more than just a gym—it's a <strong>commitment to excellence</strong>. Every training plan is <strong>custom-tailored</strong> to the individual, ensuring that no two programs are the same.
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
              <StatNumber>{stat.number}</StatNumber>
              <StatLabel>{stat.label}</StatLabel>
            </StatCard>
          ))}
        </StatsContainer>
      </Container>
    </AboutSection>
  );
};

export default AboutContent;