import React, { useState } from "react";
import styled from "styled-components";
import { motion, Variants } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { Velustro } from "uvcanvas";
import HeroPageStore from "./HeroPageStore";
import OrientationForm from "../../components/OrientationForm/orientationForm";

// -----------------------------------------------------------------
// Hard-Coded Package Data
// -----------------------------------------------------------------
const fixedPackages = [
  {
    id: 1,
    sessions: 8,
    pricePerSession: 175,
    totalCost: 1400, // 8 x 175
    name: "Gold Glimmer",
    description: "An introductory 8-session package to ignite your transformation.",
  },
  {
    id: 2,
    sessions: 20,
    pricePerSession: 165,
    totalCost: 3300, // 20 x 165
    name: "Platinum Pulse",
    description: "Elevate your performance with 20 dynamic sessions.",
  },
  {
    id: 3,
    sessions: 50,
    pricePerSession: 150,
    totalCost: 7500, // 50 x 150
    name: "Rhodium Rise",
    description: "Unleash your inner champion with 50 premium sessions.",
  },
];

const monthlyPackages = [
  { 
    id: 1, 
    months: 3, 
    sessionsPerWeek: 2, 
    pricePerSession: 165, 
    totalSessions: 24,    // 3 * 4 * 2 
    totalCost: 3960,      // 24 x 165 
    name: 'Silver Start', 
    description: '3 months at 2 sessions per week to kickstart your journey.' 
  },
  { 
    id: 2, 
    months: 3, 
    sessionsPerWeek: 3, 
    pricePerSession: 160, 
    totalSessions: 36,    // 3 * 4 * 3 
    totalCost: 5760,      // 36 x 160 
    name: 'Silver Surge', 
    description: 'Accelerate progress with 3 months at 3 sessions per week.' 
  },
  { 
    id: 3, 
    months: 3, 
    sessionsPerWeek: 4, 
    pricePerSession: 155, 
    totalSessions: 48,    // 3 * 4 * 4 
    totalCost: 7440,      // 48 x 155 
    name: 'Silver Storm', 
    description: 'High intensity 3-month program at 4 sessions per week.' 
  },
  { 
    id: 4, 
    months: 6, 
    sessionsPerWeek: 2, 
    pricePerSession: 155, 
    totalSessions: 48,    // 6 * 4 * 2 
    totalCost: 7440,      // 48 x 155 
    name: 'Gold Glow', 
    description: '6 months of consistent progress at 2 sessions per week.' 
  },
  { 
    id: 5, 
    months: 6, 
    sessionsPerWeek: 3, 
    pricePerSession: 150, 
    totalSessions: 72,    // 6 * 4 * 3 
    totalCost: 10800,     // 72 x 150 
    name: 'Gold Growth', 
    description: '6 months at 3 sessions per week for noticeable gains.' 
  },
  { 
    id: 6, 
    months: 6, 
    sessionsPerWeek: 4, 
    pricePerSession: 145, 
    totalSessions: 96,    // 6 * 4 * 4 
    totalCost: 13920,     // 96 x 145 
    name: 'Gold Grandeur', 
    description: 'Maximize your potential with 6 months at 4 sessions per week.' 
  },
  { 
    id: 7, 
    months: 9, 
    sessionsPerWeek: 2, 
    pricePerSession: 150, 
    totalSessions: 72,    // 9 * 4 * 2 
    totalCost: 10800,     // 72 x 150 
    name: 'Platinum Promise', 
    description: 'Commit to excellence – 9 months at 2 sessions per week.' 
  },
  { 
    id: 8, 
    months: 9, 
    sessionsPerWeek: 3, 
    pricePerSession: 145, 
    totalSessions: 108,   // 9 * 4 * 3 
    totalCost: 15660,     // 108 x 145 
    name: 'Platinum Power', 
    description: 'Experience transformation with 9 months at 3 sessions per week.' 
  },
  { 
    id: 9, 
    months: 9, 
    sessionsPerWeek: 4, 
    pricePerSession: 140, 
    totalSessions: 144,   // 9 * 4 * 4 
    totalCost: 20160,     // 144 x 140 
    name: 'Platinum Prestige', 
    description: 'The best value – 9 months at 4 sessions per week.' 
  },
  { 
    id: 10, 
    months: 12, 
    sessionsPerWeek: 2, 
    pricePerSession: 145, 
    totalSessions: 96,    // 12 * 4 * 2 
    totalCost: 13920,     // 96 x 145 
    name: 'Rhodium Radiance', 
    description: 'A full year at 2 sessions per week to redefine your limits.' 
  },
  { 
    id: 11, 
    months: 12, 
    sessionsPerWeek: 3, 
    pricePerSession: 140, 
    totalSessions: 144,   // 12 * 4 * 3 
    totalCost: 20160,     // 144 x 140 
    name: 'Rhodium Revolution', 
    description: 'Transform your life with 12 months at 3 sessions per week.' 
  },
  { 
    id: 12, 
    months: 12, 
    sessionsPerWeek: 4, 
    pricePerSession: 135, 
    totalSessions: 192,   // 12 * 4 * 4 
    totalCost: 25920,     // 192 x 135 
    name: 'Rhodium Reign', 
    description: 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.' 
  },
];

// Filter monthly packages to show only those with 4 sessions per week
const filteredMonthlyPackages = monthlyPackages
  .filter((pkg) => pkg.sessionsPerWeek === 4)
  .sort((a, b) => a.months - b.months);

// -----------------------------------------------------------------
// Framer Motion Variants
// -----------------------------------------------------------------
const priceOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// -----------------------------------------------------------------
// Styled Components
// -----------------------------------------------------------------
const LumiflexBackground = styled(Velustro)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -2;
`;

const StoreContainer = styled.div`
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  background: none;
`;

const BackgroundVideo = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  opacity: 0.2;
`;

const ContentOverlay = styled.div`
  position: relative;
  z-index: 1;
  padding: 2rem;
  color: #333;
`;

const ParallaxSection = styled.div`
  height: 150px;
  background-color: #c0c0c0;
  background-attachment: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  font-size: 1.5rem;
  margin: 2rem 0;
`;

const SectionTitle = styled.h2`
  text-align: center;
  margin: 2rem 0 1rem;
  font-size: 2.5rem;
  color: var(--neon-blue, #00ffff);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const Card = styled(motion.div)`
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  flex-direction: column;
`;

const CardMedia = styled.video`
  width: 100%;
  height: 150px;
  object-fit: cover;
  background: #ddd;
`;

const CardContent = styled.div`
  padding: 1rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const PriceBox = styled.div`
  background: #f5f5f5;
  border: 2px solid #ccc;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  text-align: center;
  min-height: 3rem;
`;

const PriceOverlay = styled(motion.div)`
  display: inline-block;
  background: transparent;
  color: #333;
  font-weight: bold;
  font-size: 1rem;
`;

const CardTitle = styled.h3`
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
  color: var(--neon-blue, #00ffff);
`;

const CardDescription = styled.p`
  font-size: 1rem;
  color: #555;
  margin-bottom: 1rem;
`;

const CardButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: var(--neon-blue, #00ffff);
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  color: #000;
  cursor: pointer;
  transition: background 0.3s ease;
  margin-top: 1rem;
  &:hover {
    background: var(--royal-purple, #7851a9);
    color: white;
  }
`;

const OrientationButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: var(--neon-blue, #00ffff);
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  color: #000;
  cursor: pointer;
  transition: background 0.3s ease;
  margin-top: 2rem;
  &:hover {
    background: var(--royal-purple, #7851a9);
    color: white;
  }
`;

// -----------------------------------------------------------------
// StoreFront Component
// -----------------------------------------------------------------
const StoreFront = () => {
  const { user } = useAuth();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showOrientation, setShowOrientation] = useState(false);

  // Only clients and admins can view price details
  const canViewPrices = user && (user.role === "client" || user.role === "admin");

  // Helper to format numbers with commas
  const formatPrice = (price) => price.toLocaleString("en-US");

  return (
    <StoreContainer>
      <LumiflexBackground />
      <BackgroundVideo autoPlay loop muted poster="/assets/fallback.jpg">
        <source src="/assets/movie.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </BackgroundVideo>
      <ContentOverlay>
        {/* Hero Section */}
        <HeroPageStore />

        <SectionTitle>Premium Training Packages</SectionTitle>
        <Grid>
          {fixedPackages.map((pkg) => (
            <Card
              key={pkg.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => setHoveredCard(pkg.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => alert(`More info for ${pkg.name}`)}
            >
              <CardMedia autoPlay loop muted poster="/assets/card-fallback.jpg">
                <source src="/assets/card-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </CardMedia>
              <CardContent>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
                <PriceBox>
                  {canViewPrices ? (
                    hoveredCard === pkg.id ? (
                      <PriceOverlay
                        variants={priceOverlayVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ duration: 0.3 }}
                      >
                        {pkg.sessions} Sessions @ ${formatPrice(pkg.pricePerSession)} each<br />
                        Total: ${formatPrice(pkg.totalCost)}
                      </PriceOverlay>
                    ) : (
                      <PriceOverlay variants={priceOverlayVariants} initial="hidden" style={{ opacity: 0 }}>
                        Hover to reveal price
                      </PriceOverlay>
                    )
                  ) : (
                    <PriceOverlay variants={priceOverlayVariants} initial="visible">
                      <span style={{ fontStyle: "italic", fontSize: "0.9rem" }}>
                        Login as a client to see price
                      </span>
                    </PriceOverlay>
                  )}
                </PriceBox>
                <CardButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canViewPrices) {
                      alert(`Purchasing ${pkg.name} package`);
                    } else {
                      alert("Only clients can purchase packages. Please log in or upgrade.");
                    }
                  }}
                >
                  Buy Now
                </CardButton>
              </CardContent>
            </Card>
          ))}
        </Grid>

        <ParallaxSection>Step Up Your Game</ParallaxSection>

        <SectionTitle>Monthly Training Packages</SectionTitle>
        <Grid>
          {filteredMonthlyPackages.map((pkg) => (
            <Card
              key={pkg.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => setHoveredCard(pkg.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => alert(`More info for ${pkg.name}`)}
            >
              <CardMedia autoPlay loop muted poster="/assets/card-fallback.jpg">
                <source src="/assets/card-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </CardMedia>
              <CardContent>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
                <PriceBox>
                  {canViewPrices ? (
                    hoveredCard === pkg.id ? (
                      <PriceOverlay
                        variants={priceOverlayVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ duration: 0.3 }}
                      >
                        {pkg.months} Months @ {pkg.sessionsPerWeek} sessions/week<br />
                        Total: {pkg.totalSessions} sessions<br />
                        ${formatPrice(pkg.pricePerSession)} per session<br />
                        Total: ${formatPrice(pkg.totalCost)}
                      </PriceOverlay>
                    ) : (
                      <PriceOverlay variants={priceOverlayVariants} initial="hidden" style={{ opacity: 0 }}>
                        Hover to reveal price
                      </PriceOverlay>
                    )
                  ) : (
                    <PriceOverlay variants={priceOverlayVariants} initial="visible">
                      <span style={{ fontStyle: "italic", fontSize: "0.9rem" }}>
                        Login as a client to see price
                      </span>
                    </PriceOverlay>
                  )}
                </PriceBox>
                <CardButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canViewPrices) {
                      alert(`Purchasing ${pkg.name} package`);
                    } else {
                      alert("Only clients can purchase packages. Please log in or upgrade.");
                    }
                  }}
                >
                  Buy Now
                </CardButton>
              </CardContent>
            </Card>
          ))}
        </Grid>

        {/* Orientation Signup Button */}
       
      </ContentOverlay>

      
    </StoreContainer>
  );
};

export default StoreFront;
