import styled from "styled-components";
import { motion } from "framer-motion";

// ✅ Correct Import Path for the Video
import wavesVideo from "../../assets/Waves.mp4"; 

const HeroContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
`;

const VideoBackground = styled.video`
  position: absolute;
  top: 50%;
  left: 50%;
  width: auto;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  transform: translate(-50%, -50%);
  object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    45deg,
    rgba(0, 255, 255, 0.6),  /* Increase alpha to 0.6 for more opacity */
    rgba(106, 13, 173, 0.6)   /* Darker overlay effect */
  );
`;

const Content = styled(motion.div)`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #fff;
  text-align: center;
`;

const Title = styled(motion.h1)`
  font-size: 4rem;
  font-weight: bold;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    font-size: 3rem;
  }
`;

const Tagline = styled(motion.p)`
  font-size: 1.5rem;
  max-width: 600px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

export default function Hero() {
  return (
    <HeroContainer>
      {/* ✅ Video Background (Using Correct Path) */}
      <VideoBackground autoPlay loop muted playsInline preload="auto">
        <source src={wavesVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      {/* ✅ Overlay */}
      <Overlay />

      {/* ✅ Content */}
      <Content>
        <Title
          initial={{ y: -50, opacity: 0.3 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          SwanStudios
        </Title>
        <Tagline
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Revolutionizing Personal Training for the Modern Athlete
        </Tagline>
      </Content>
    </HeroContainer>
  );
}
