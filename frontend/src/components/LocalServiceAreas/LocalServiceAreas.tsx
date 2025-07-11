// LocalServiceAreas.tsx - SEO-optimized service areas component
import React, { useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useInView } from "framer-motion";
import { FaMapMarkerAlt, FaStar } from "react-icons/fa";
import { useUniversalTheme } from "../../context/ThemeContext";

// Animation keyframes
const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled components
const ServiceAreasContainer = styled.section`
  padding: 4rem 2rem;
  background: ${({ theme }) => theme.background.primary};
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1rem;
  background: ${({ theme }) => theme.gradients.stellar};
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SectionSubtitle = styled(motion.p)`
  text-align: center;
  font-size: 1.2rem;
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const RegionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const RegionCard = styled(motion.div)`
  background: ${({ theme }) => theme.background.surface};
  border: 1px solid ${({ theme }) => theme.borders.subtle};
  border-radius: 15px;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    border-color: ${({ theme }) => theme.borders.elegant};
    box-shadow: ${({ theme }) => theme.shadows.cosmic};
  }
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) => theme.colors.primary}20,
      transparent
    );
    transition: left 0.5s;
  }
  
  &:hover::before {
    left: 100%;
  }
`;

const RegionHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  
  svg {
    color: ${({ theme }) => theme.colors.primary};
    margin-right: 0.75rem;
    font-size: 1.5rem;
  }
`;

const RegionTitle = styled.h3`
  font-size: 1.4rem;
  color: ${({ theme }) => theme.colors.primary};
  margin: 0;
  font-weight: 600;
`;

const CitiesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
`;

const CityItem = styled.li`
  color: ${({ theme }) => theme.text.secondary};
  font-size: 0.95rem;
  padding: 0.25rem 0;
  transition: color 0.3s ease;
  position: relative;
  
  &::before {
    content: "•";
    color: ${({ theme }) => theme.colors.accent};
    margin-right: 0.5rem;
    font-weight: bold;
  }
  
  &:hover {
    color: ${({ theme }) => theme.text.primary};
  }
`;

const HighlightSection = styled(motion.div)`
  background: ${({ theme }) => theme.gradients.secondary}20;
  border: 1px solid ${({ theme }) => theme.borders.subtle};
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      45deg,
      transparent 0%,
      ${({ theme }) => theme.colors.primary}10 50%,
      transparent 100%
    );
    background-size: 200% 200%;
    animation: ${shimmer} 3s linear infinite;
  }
`;

const HighlightText = styled.h3`
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.accent};
  margin-bottom: 1rem;
  position: relative;
  z-index: 2;
  
  svg {
    margin-left: 0.5rem;
    animation: ${float} 2s ease-in-out infinite;
  }
`;

const HighlightDescription = styled.p`
  color: ${({ theme }) => theme.text.secondary};
  font-size: 1.1rem;
  position: relative;
  z-index: 2;
  margin: 0;
`;

// Service areas data
const serviceAreas = [
  {
    region: "Orange County Communities",
    cities: [
      "Anaheim Hills", "Newport Beach", "Laguna Beach", "Villa Park", 
      "Yorba Linda", "Mission Viejo", "San Juan Capistrano", "Coto de Caza",
      "Dove Canyon", "Rancho Santa Margarita", "Irvine", "Costa Mesa",
      "Huntington Beach", "Crystal Cove", "Laguna Hills"
    ]
  },
  {
    region: "Los Angeles Communities",
    cities: [
      "Beverly Hills", "Bel Air", "Brentwood", "Pacific Palisades",
      "Santa Monica", "Venice", "Manhattan Beach", "Hermosa Beach",
      "Redondo Beach", "Marina del Rey", "Century City", "Westwood",
      "Culver City", "West Hollywood", "Hollywood Hills"
    ]
  },
  {
    region: "Valley & Inland Communities",
    cities: [
      "Calabasas", "Hidden Hills", "Malibu", "Encino", "Tarzana",
      "Sherman Oaks", "Studio City", "Pasadena", "San Marino",
      "Palos Verdes", "Rolling Hills", "Hancock Park", "Los Feliz",
      "Silver Lake"
    ]
  }
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const LocalServiceAreas: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.2 });
  const { theme } = useUniversalTheme();

  return (
    <ServiceAreasContainer id="service-areas" ref={ref}>
      <ContentWrapper>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <SectionTitle variants={itemVariants}>
            Serving Southern California's Fitness Community
          </SectionTitle>
          
          <SectionSubtitle variants={itemVariants}>
            Expert personal training and AI-powered fitness coaching across Orange County and Los Angeles neighborhoods
          </SectionSubtitle>

          <RegionsGrid>
            {serviceAreas.map((area, index) => (
              <RegionCard key={index} variants={itemVariants}>
                <RegionHeader>
                  <FaMapMarkerAlt />
                  <RegionTitle>{area.region}</RegionTitle>
                </RegionHeader>
                <CitiesList>
                  {area.cities.map((city, cityIndex) => (
                    <CityItem key={cityIndex}>{city}</CityItem>
                  ))}
                </CitiesList>
              </RegionCard>
            ))}
          </RegionsGrid>

          <HighlightSection variants={itemVariants}>
            <HighlightText>
              Expert Training Where You Are <FaStar />
            </HighlightText>
            <HighlightDescription>
              From home gyms in Newport Coast to busy offices in Century City, 
              we bring world-class training to your location. Serving 35+ neighborhoods 
              across Southern California with the same commitment to excellence that defines SwanStudios.
            </HighlightDescription>
          </HighlightSection>
        </motion.div>
      </ContentWrapper>
    </ServiceAreasContainer>
  );
};

export default LocalServiceAreas;