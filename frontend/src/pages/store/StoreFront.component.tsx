import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, Variants } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Velustro } from "uvcanvas";
import HeroPageStore from './HeroPageStore';

// -----------------------------------------------------------------
// Data & Helper Functions (unchanged)
// -----------------------------------------------------------------

const fixedPackages = [
  {
    id: 1,
    sessions: 8,
    pricePerSession: 175,
    name: 'Gold Glimmer',
    description: 'An introductory 8-session package to ignite your transformation.',
  },
  {
    id: 2,
    sessions: 20,
    pricePerSession: 165,
    name: 'Platinum Pulse',
    description: 'Elevate your performance with 20 dynamic sessions.',
  },
  {
    id: 3,
    sessions: 50,
    pricePerSession: 150,
    name: 'Rhodium Rise',
    description: 'Unleash your inner champion with 50 premium sessions.',
  },
];

const monthlyPackages = [
  { id: 1, months: 3, sessionsPerWeek: 2, pricePerSession: 165, name: 'Silver Start', description: '3 months at 2 sessions per week to kickstart your journey.' },
  { id: 2, months: 3, sessionsPerWeek: 3, pricePerSession: 160, name: 'Silver Surge', description: 'Accelerate progress with 3 months at 3 sessions per week.' },
  { id: 3, months: 3, sessionsPerWeek: 4, pricePerSession: 155, name: 'Silver Storm', description: 'High intensity 3-month program at 4 sessions per week.' },
  { id: 4, months: 6, sessionsPerWeek: 2, pricePerSession: 155, name: 'Gold Glow', description: '6 months of consistent progress at 2 sessions per week.' },
  { id: 5, months: 6, sessionsPerWeek: 3, pricePerSession: 150, name: 'Gold Growth', description: '6 months at 3 sessions per week for noticeable gains.' },
  { id: 6, months: 6, sessionsPerWeek: 4, pricePerSession: 145, name: 'Gold Grandeur', description: 'Maximize your potential with 6 months at 4 sessions per week.' },
  { id: 7, months: 9, sessionsPerWeek: 2, pricePerSession: 150, name: 'Platinum Promise', description: 'Commit to excellence – 9 months at 2 sessions per week.' },
  { id: 8, months: 9, sessionsPerWeek: 3, pricePerSession: 145, name: 'Platinum Power', description: 'Experience transformation with 9 months at 3 sessions per week.' },
  { id: 9, months: 9, sessionsPerWeek: 4, pricePerSession: 140, name: 'Platinum Prestige', description: 'The best value – 9 months at 4 sessions per week.' },
  { id: 10, months: 12, sessionsPerWeek: 2, pricePerSession: 145, name: 'Rhodium Radiance', description: 'A full year at 2 sessions per week to redefine your limits.' },
  { id: 11, months: 12, sessionsPerWeek: 3, pricePerSession: 140, name: 'Rhodium Revolution', description: 'Transform your life with 12 months at 3 sessions per week.' },
  { id: 12, months: 12, sessionsPerWeek: 4, pricePerSession: 135, name: 'Rhodium Reign', description: 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.' },
];

const calculateTotalSessions = (months: number, sessionsPerWeek: number) => months * 4 * sessionsPerWeek;

// -----------------------------------------------------------------
// Framer Motion Variants
// -----------------------------------------------------------------

const priceOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// -----------------------------------------------------------------
// Styled Components (unchanged from your original code)
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

const ContentOverlay = styled.div`
  position: relative;
  z-index: 1;
  padding: 2rem;
  color: #333;
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

const PriceContainer = styled.div`
  position: relative;
  text-align: center;
  margin-bottom: 1rem;
  min-height: 2rem;
`;

const PriceOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 0.5rem;
  background: #ffffff;
  color: #333;
  font-weight: bold;
  border: 1px solid #ccc;
  border-radius: 5px;
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
  &:hover {
    background: var(--royal-purple, #7851a9);
  }
`;

// OrientationForm is assumed to be defined elsewhere (you provided it earlier)
import OrientationForm from '../../components/OrientationForm/orientationForm';


// -----------------------------------------------------------------
// StoreFront Component
// -----------------------------------------------------------------

const StoreFront = () => {
  const { user } = useAuth();
  const [showOrientation, setShowOrientation] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <StoreContainer>
      <LumiflexBackground />

      <BackgroundVideo autoPlay loop muted poster="/assets/fallback.jpg">
        <source src="/assets/movie.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </BackgroundVideo>

      <ContentOverlay>
        <HeroPageStore />

        <ParallaxSection>Get Ready to Elevate Your Game</ParallaxSection>

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
                <PriceContainer>
                  {user ? (
                    hoveredCard === pkg.id ? (
                      <PriceOverlay
                        variants={priceOverlayVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ duration: 0.3 }}
                      >
                        {pkg.sessions} Sessions @ ${pkg.pricePerSession.toFixed(2)} each
                      </PriceOverlay>
                    ) : (
                      <PriceOverlay variants={priceOverlayVariants} initial="hidden" style={{ opacity: 0 }}>
                        <span style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>Hover to reveal price</span>
                      </PriceOverlay>
                    )
                  ) : (
                    <PriceOverlay variants={priceOverlayVariants} initial="visible">
                      <span style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>Login to see price</span>
                    </PriceOverlay>
                  )}
                </PriceContainer>
                <CardButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (user) {
                      alert(`Purchasing ${pkg.name} package`);
                    } else {
                      alert('Please log in to purchase packages.');
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
          {monthlyPackages.map((pkg) => {
            const totalSessions = calculateTotalSessions(pkg.months, pkg.sessionsPerWeek);
            const totalCost = totalSessions * pkg.pricePerSession;
            return (
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
                  <PriceContainer>
                    {user ? (
                      hoveredCard === pkg.id ? (
                        <PriceOverlay
                          variants={priceOverlayVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ duration: 0.3 }}
                        >
                          {pkg.months} Months @ {pkg.sessionsPerWeek} sessions/week<br />
                          Total: {totalSessions} sessions<br />
                          ${pkg.pricePerSession.toFixed(2)} per session<br />
                          Total: ${totalCost.toFixed(2)}
                        </PriceOverlay>
                      ) : (
                        <PriceOverlay variants={priceOverlayVariants} initial="hidden" style={{ opacity: 0 }}>
                          <span style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>Hover to reveal price</span>
                        </PriceOverlay>
                      )
                    ) : (
                      <PriceOverlay variants={priceOverlayVariants} initial="visible">
                        <span style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>Login to see price</span>
                      </PriceOverlay>
                    )}
                  </PriceContainer>
                  <CardButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (user) {
                        alert(`Purchasing ${pkg.name} package`);
                      } else {
                        alert('Please log in to purchase packages.');
                      }
                    }}
                  >
                    Buy Now
                  </CardButton>
                </CardContent>
              </Card>
            );
          })}
        </Grid>

        {/* Orientation Signup Section – only available if the user is logged in */}
        <SectionTitle>Orientation Signup</SectionTitle>
        {user ? (
          <CardButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowOrientation(true)}
          >
            Sign Up for Orientation
          </CardButton>
        ) : (
          <CardButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => alert('Please log in to sign up for orientation.')}
          >
            Sign Up for Orientation
          </CardButton>
        )}
      </ContentOverlay>

      {showOrientation && <OrientationForm onClose={() => setShowOrientation(false)} />}
    </StoreContainer>
  );
};

export default StoreFront;
