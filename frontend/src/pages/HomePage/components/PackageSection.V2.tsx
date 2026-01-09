import React, { useRef, useState, useEffect } from "react";
import styled from "styled-components";
import { motion, useInView } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import GlowButton from "../../../components/ui/buttons/GlowButton";

// --- Styled Components ---

const Section = styled.section`
  padding: 6rem 2rem;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 4rem;
  
  h2 {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #fff 0%, #a5f3fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    
    @media (max-width: 768px) {
      font-size: 2.2rem;
    }
  }
  
  p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-width: 450px;
    margin: 0 auto;
  }
`;

const Card = styled(motion.div)`
  position: relative;
  height: 600px;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #0a0a15;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px -10px rgba(0, 255, 255, 0.15);
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      to bottom,
      rgba(10, 10, 20, 0.3) 0%,
      rgba(10, 10, 20, 0.8) 50%,
      rgba(10, 10, 20, 0.98) 100%
    );
    z-index: 1;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.6;
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.6;
    position: absolute;
    top: 0;
    left: 0;
  }
`;

const Content = styled.div`
  position: relative;
  z-index: 2;
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

const Badge = styled.div`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(0, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 50px;
  color: #00ffff;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  z-index: 3;
`;

const PlanName = styled.h3`
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
`;

const Price = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 2rem;
  
  span.amount {
    font-size: 2.5rem;
    font-weight: 800;
    color: white;
  }
  
  span.period {
    color: rgba(255, 255, 255, 0.6);
    font-size: 1rem;
  }
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  
  svg {
    color: #00ffff;
    flex-shrink: 0;
  }
`;

// --- Components ---

interface PackageCardProps {
  title: string;
  price: string;
  period: string;
  features: string[];
  videoSrc?: string; // Optional video
  imageSrc: string; // Fallback image
  badge?: string;
  delay: number;
  theme: 'primary' | 'cosmic' | 'emerald';
}

const PackageCard: React.FC<PackageCardProps> = ({ 
  title, price, period, features, videoSrc, imageSrc, badge, delay, theme 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { amount: 0.5 });

  // Performance Optimization: Only play video when card is in view
  useEffect(() => {
    if (videoRef.current) {
      if (isInView) {
        videoRef.current.play().catch(() => {}); // Ignore autoplay errors
      } else {
        videoRef.current.pause();
      }
    }
  }, [isInView]);

  return (
    <Card
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      <VideoBackground>
        {/* Fallback Image always rendered behind video */}
        <img src={imageSrc} alt={`${title} training package background`} />
        
        {/* Video only renders if source provided */}
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={imageSrc} // Fallback while loading
            muted
            loop
            playsInline
            preload="none" // Save bandwidth
          />
        )}
      </VideoBackground>

      {badge && <Badge>{badge}</Badge>}

      <Content>
        <PlanName>{title}</PlanName>
        <Price>
          <span className="amount">{price}</span>
          <span className="period">{period}</span>
        </Price>

        <FeatureList>
          {features.map((feature, idx) => (
            <FeatureItem key={idx}>
              <Check size={18} />
              {feature}
            </FeatureItem>
          ))}
        </FeatureList>

        <GlowButton 
          text="Start Training" 
          theme={theme} 
          size="large" 
          fullWidth 
          rightIcon={<ArrowRight size={18} />}
        />
      </Content>
    </Card>
  );
};

const PackageSectionV2: React.FC = () => {
  return (
    <Section id="packages">
      <Container>
        <Header>
          <h2>Choose Your Path</h2>
          <p>Select the training package that fits your goals. No hidden fees, just results.</p>
        </Header>

        <Grid>
          <PackageCard
            title="Foundation"
            price="$199"
            period="/ month"
            features={["2 Sessions per week", "Custom Workout Plan", "Nutrition Guidance", "Monthly Progress Check"]}
            imageSrc="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop"
            delay={0}
            theme="primary"
          />
          <PackageCard
            title="Transformation"
            price="$349"
            period="/ month"
            features={["3 Sessions per week", "Advanced Nutrition Plan", "24/7 Trainer Access", "Weekly Check-ins", "Supplement Guide"]}
            imageSrc="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop"
            badge="Most Popular"
            delay={0.2}
            theme="cosmic"
          />
          <PackageCard
            title="Elite Athlete"
            price="$599"
            period="/ month"
            features={["Unlimited Sessions", "Pro-Level Programming", "Daily Form Analysis", "Meal Prep Service", "Physio Consultation"]}
            imageSrc="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1470&auto=format&fit=crop"
            badge="Limited Spots"
            delay={0.4}
            theme="emerald"
          />
        </Grid>
      </Container>
    </Section>
  );
};

export default PackageSectionV2;