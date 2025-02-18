import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

// ✅ Import Header Component
import Header from "../../components/Header/header"; // Ensure correct import path

// ✅ Import the Image Properly
import logoImage from "../../assets/Logo.png";

/*
  🌟 AboutContent Component
  -------------------------
  - Showcases **SwanStudios’ mission, expertise, and training philosophy**.
  - Uses **animations & structured layout** for engaging presentation.
  - Wrapped with a **Header for complete structure**.
*/

// ======================= 🎨 Styled Components =======================

/** 📌 Main About Section */
const AboutSection = styled.section`
  padding: 4rem 2rem;
  background-color: #fff;
  color: #333;

  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }
`;

/** 📌 Content Container */
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

/** 📌 Section Title */
const Title = styled(motion.h2)`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  text-align: center;
  color: #6a0dad;
`;

/** 📌 Content Layout - Grid for Desktop, Stack for Mobile */
const Content = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

/** 📌 Text Content */
const TextContent = styled(motion.div)`
  font-size: 1.2rem;
  line-height: 1.6;
  font-weight: 400;
`;

/** 📌 Image Styling */
const ImageContent = styled(motion.img)`
  width: 100%;
  height: auto;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

// ======================= 🚀 AboutContent Component =======================

const AboutContent: React.FC = () => {
  return (
    <>
      <Header /> {/* ✅ Header at the top for consistent navigation */}

      <AboutSection>
        <Container>
          <Title
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            About SwanStudios
          </Title>

          <Content>
            {/* ✅ Text Content Section */}
            <TextContent
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p>
                At <strong>SwanStudios</strong>, we don’t believe in gimmicks—just real, <strong>results-driven training</strong> designed to transform your body and mindset. With over <strong>25 years of hands-on experience</strong>, we’ve built a system that is <strong>proven to work</strong> for anyone willing to commit.
              </p>

              <p>
                Founder <strong>Sean Swan</strong> has worked with some of the biggest fitness brands in the world, including <strong>LA Fitness, Gold’s Gym, 24 Hour Fitness, and Bodies in Motion</strong>. His expertise extends beyond traditional training—having worked as a <strong>physical therapy aid at Kerlan Jobe Health South</strong>, he understands <strong>injury prevention, recovery, and the science behind true fitness progress</strong>.
              </p>

              <p>
                Alongside his wife <strong>Jasmine</strong>, a dedicated fitness professional, Sean has built SwanStudios as more than just a gym—it’s a <strong>commitment to excellence</strong>. Every training plan is <strong>custom-tailored</strong> to the individual, ensuring that no two programs are the same.
              </p>

              <p>
                <strong>What Sets Us Apart?</strong>  
                - No shortcuts. <strong>Just elite-level coaching that works.</strong>  
                - Training rooted in <strong>science, experience, and innovation.</strong>  
                - A <strong>proven track record</strong> of success with hundreds of clients.  
                - <strong>AI-assisted performance tracking</strong> combined with thousands of real-world training hours.  
              </p>

              <p>
                At <strong>SwanStudios</strong>, we train the <strong>right way</strong>—with discipline, precision, and <strong>a method that guarantees results</strong> if you show up and do the work.
              </p>

              <p>
                <strong>If you’re serious about transforming your body, this is where it happens.</strong>  
                Don’t settle. <strong>Get started today.</strong>  
              </p>
            </TextContent>

            {/* ✅ Image Section (Properly Imported) */}
            <ImageContent
              src={logoImage} // ✅ Corrected Import Path for the Image
              alt="SwanStudios Facility"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            />
          </Content>
        </Container>
      </AboutSection>
    </>
  );
};

export default AboutContent;

