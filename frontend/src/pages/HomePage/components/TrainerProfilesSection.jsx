// src/pages/homepage/components/TrainerProfiles/TrainerProfilesSection.jsx
import React, { useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { FaStar, FaLinkedin, FaInstagram, FaArrowRight, FaArrowLeft, FaMedal, FaFire, FaRegCalendarCheck } from "react-icons/fa";

// Import trainer images from assets
import sean from "../../../assets/male1.jpg";
import jennifer from "../../../assets/femalewht.jpg";
import michael from "../../../assets/male2.jpg";
import lisa from "../../../assets/femaleasi.jpg";
import david from "../../../assets/maleblk.jpg";

// Styled Components
const SectionContainer = styled.section`
  padding: 5rem 2rem;
  background: linear-gradient(to bottom, #0a0a0a, #121212);
  position: relative;
  overflow: hidden;
`;

const GlowEffect = styled.div`
  position: absolute;
  width: 60vh;
  height: 60vh;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, rgba(120, 81, 169, 0.05) 50%, transparent 70%);
  top: 20%;
  left: 30%;
  filter: blur(60px);
  z-index: 0;
  opacity: 0.6;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const SectionTitle = styled(motion.h2)`
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

const SectionSubtitle = styled(motion.p)`
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 3rem;
  color: #c0c0c0;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;

const TrainerCarousel = styled.div`
  position: relative;
  width: 100%;
  margin: 0 auto;
`;

const TrainerCard = styled(motion.div)`
  background: rgba(20, 20, 30, 0.9);
  border-radius: 15px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  position: relative;
  height: 600px;
  
  @media (max-width: 768px) {
    height: auto;
    flex-direction: column;
  }
`;

const TrainerImageContainer = styled.div`
  position: relative;
  height: 300px;
  overflow: hidden;
  
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 40%;
    background: linear-gradient(to top, rgba(20, 20, 30, 1), transparent);
  }
`;

const TrainerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
  
  ${TrainerCard}:hover & {
    transform: scale(1.05);
  }
`;

const TrainerInfo = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const TrainerName = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  color: white;
  font-weight: 600;
`;

const TrainerTitle = styled.h4`
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--neon-blue, #00ffff);
  font-weight: 400;
`;

const TrainerBio = styled.p`
  font-size: 1rem;
  margin-bottom: 1.5rem;
  color: #c0c0c0;
  line-height: 1.6;
  flex: 1;
`;

const SpecialtiesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const SpecialtyTag = styled.div`
  background: rgba(0, 255, 255, 0.1);
  color: var(--neon-blue, #00ffff);
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const RatingContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const Rating = styled.div`
  display: flex;
  color: gold;
  margin-right: 0.5rem;
`;

const RatingText = styled.span`
  color: #c0c0c0;
  font-size: 0.9rem;
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;
`;

const SocialLink = styled.a`
  color: #c0c0c0;
  font-size: 1.2rem;
  transition: color 0.3s ease;
  
  &:hover {
    color: var(--neon-blue, #00ffff);
  }
`;

const Certification = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: gold;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 2;
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
  transition: background 0.3s ease;
  
  &:hover {
    background: var(--royal-purple, #7851a9);
  }
  
  &:focus {
    outline: none;
  }
  
  &.prev {
    left: -25px;
  }
  
  &.next {
    right: -25px;
  }
  
  @media (max-width: 768px) {
    &.prev {
      left: 10px;
    }
    
    &.next {
      right: 10px;
    }
  }
`;

const BookButton = styled(motion.button)`
  background: var(--neon-blue, #00ffff);
  color: black;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: var(--royal-purple, #7851a9);
    color: white;
    transform: translateY(-2px);
  }
  
  &:focus {
    outline: none;
  }
`;

// Animation variants
const cardVariants = {
  enter: (direction) => {
    return {
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }
  },
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    }
  },
  exit: (direction) => {
    return {
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      transition: {
        duration: 0.5,
      }
    }
  }
};

const titleVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 } 
  }
};

const subtitleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, delay: 0.2 } 
  }
};

// Sample trainer data
const trainers = [
  {
    id: 1,
    name: "Sean Swan",
    title: "Head Coach & Founder",
    image: sean,
    bio: "With over 25 years of experience, Sean has trained professional athletes and celebrities. His holistic approach focuses on sustainable performance improvements and injury prevention.",
    specialties: ["Strength & Conditioning", "Athletic Performance", "Injury Rehabilitation"],
    rating: 5,
    reviews: 152,
    certifications: ["NASM-CPT", "CSCS", "PES"],
    socialLinks: {
      linkedin: "https://linkedin.com",
      instagram: "https://instagram.com",
    }
  },
  {
    id: 2,
    name: "Jennifer Adams",
    title: "Senior Performance Coach",
    image: jennifer,
    bio: "Jennifer specializes in helping clients transform their bodies through science-based training protocols. Her background in exercise physiology allows her to create optimized programs for any goal.",
    specialties: ["Body Transformation", "Nutrition Planning", "HIIT Training"],
    rating: 4.9,
    reviews: 98,
    certifications: ["NASM-CPT", "PN-1"],
    socialLinks: {
      linkedin: "https://linkedin.com",
      instagram: "https://instagram.com",
    }
  },
  {
    id: 3,
    name: "Michael Torres",
    title: "Strength Specialist",
    image: michael,
    bio: "Former competitive powerlifter, Michael helps clients build functional strength that translates to improved performance in both daily life and athletic pursuits.",
    specialties: ["Powerlifting", "Olympic Lifting", "Functional Strength"],
    rating: 4.8,
    reviews: 87,
    certifications: ["NSCA-CSCS"],
    socialLinks: {
      linkedin: "https://linkedin.com",
      instagram: "https://instagram.com",
    }
  },
  {
    id: 4,
    name: "Lisa Chen",
    title: "Mobility & Recovery Specialist",
    image: lisa,
    bio: "Lisa combines traditional training approaches with cutting-edge recovery techniques to help clients move better, reduce pain, and improve longevity.",
    specialties: ["Mobility Training", "Pain Management", "Recovery Protocols"],
    rating: 4.9,
    reviews: 74,
    certifications: ["FRC", "FMS"],
    socialLinks: {
      linkedin: "https://linkedin.com",
      instagram: "https://instagram.com",
    }
  },
  {
    id: 5,
    name: "David Johnson",
    title: "Performance Nutrition Coach",
    image: david,
    bio: "David's expertise in performance nutrition helps clients optimize their body composition, energy levels, and recovery through personalized nutrition strategies.",
    specialties: ["Sports Nutrition", "Macro Planning", "Supplement Guidance"],
    rating: 4.7,
    reviews: 63,
    certifications: ["PN-2", "CISSN"],
    socialLinks: {
      linkedin: "https://linkedin.com",
      instagram: "https://instagram.com",
    }
  }
];

// TrainerProfiles component
const TrainerProfilesSection = () => {
  const [[activeIndex, direction], setActiveIndex] = useState([0, 0]);
  
  const navigate = (newDirection) => {
    const nextIndex = activeIndex + newDirection;
    
    if (nextIndex < 0) {
      setActiveIndex([trainers.length - 1, newDirection]);
    } else if (nextIndex >= trainers.length) {
      setActiveIndex([0, newDirection]);
    } else {
      setActiveIndex([nextIndex, newDirection]);
    }
  };
  
  const currentTrainer = trainers[activeIndex];
  
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
  
  // Match specialty with appropriate icon
  const getSpecialtyIcon = (specialty) => {
    if (specialty.includes("Strength")) return <FaFire />;
    if (specialty.includes("Nutrition")) return <FaMedal />;
    return <FaRegCalendarCheck />;
  };
  
  return (
    <SectionContainer id="trainers">
      <GlowEffect />
      <ContentWrapper>
        <SectionTitle
          variants={titleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Meet Our Elite Coaching Team
        </SectionTitle>
        <SectionSubtitle
          variants={subtitleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Our certified trainers combine decades of experience with cutting-edge methodologies
          to help you achieve extraordinary results.
        </SectionSubtitle>
        
        <TrainerCarousel>
          <AnimatePresence initial={false} custom={direction}>
            <TrainerCard
              key={currentTrainer.id}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween" }}
            >
              <Certification>
                <FaMedal /> {currentTrainer.certifications[0]}
              </Certification>
              <TrainerImageContainer>
                <TrainerImage src={currentTrainer.image} alt={currentTrainer.name} />
              </TrainerImageContainer>
              <TrainerInfo>
                <TrainerName>{currentTrainer.name}</TrainerName>
                <TrainerTitle>{currentTrainer.title}</TrainerTitle>
                
                <RatingContainer>
                  <Rating>{renderRating(currentTrainer.rating)}</Rating>
                  <RatingText>({currentTrainer.reviews} reviews)</RatingText>
                </RatingContainer>
                
                <TrainerBio>{currentTrainer.bio}</TrainerBio>
                
                <SpecialtiesContainer>
                  {currentTrainer.specialties.map((specialty, index) => (
                    <SpecialtyTag key={index}>
                      {getSpecialtyIcon(specialty)} {specialty}
                    </SpecialtyTag>
                  ))}
                </SpecialtiesContainer>
                
                <BookButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Book a Session <FaArrowRight />
                </BookButton>
                
                <SocialLinks>
                  <SocialLink href={currentTrainer.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                    <FaLinkedin />
                  </SocialLink>
                  <SocialLink href={currentTrainer.socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <FaInstagram />
                  </SocialLink>
                </SocialLinks>
              </TrainerInfo>
            </TrainerCard>
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
        </TrainerCarousel>
      </ContentWrapper>
    </SectionContainer>
  );
};

export default TrainerProfilesSection;