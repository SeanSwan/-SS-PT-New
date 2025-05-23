// src/components/Footer/EnhancedFooter.jsx
import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { motion, useAnimation, useInView, animate } from 'framer-motion';
import { gsap } from 'gsap';
import { 
  FaFacebook, 
  FaInstagram, 
  FaLinkedin, 
  FaYoutube,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaChevronUp,
  FaCopyright,
  FaHeart,
  FaTiktok
} from 'react-icons/fa';
import { SiBluesky } from 'react-icons/si';
import logoImage from '../../assets/Logo.png';
import { defaultShouldForwardProp } from '../../utils/styled-component-helpers';

// Styled Components
const FooterContainer = styled.footer`
  width: 100%;
  background: linear-gradient(to right, #0f0c29, #302b63, #24243e);
  color: #fff;
  padding: 5rem 0 2rem;
  margin-top: auto;
  box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  z-index: 1;
`;

const BackgroundPattern = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 10% 0%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 90% 90%, rgba(120, 81, 169, 0.1) 0%, transparent 50%);
  opacity: 0.7;
  z-index: -1;
`;

const WavePattern = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50px;
  background: linear-gradient(
    135deg,
    #0f0c29 25%,
    transparent 25%
  ) -50px 0,
  linear-gradient(
    225deg,
    #0f0c29 25%,
    transparent 25%
  ) -50px 0,
  linear-gradient(
    315deg,
    #0f0c29 25%,
    transparent 25%
  ),
  linear-gradient(
    45deg,
    #0f0c29 25%,
    transparent 25%
  );
  background-size: 100px 100px;
  background-color: #302b63;
  transform: translateY(-100%);
`;

const GlowOrb = styled.div`
  position: absolute;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(50px);
  opacity: 0.8;
  transition: all 0.5s ease;
  z-index: -1;
  
  &.orb1 {
    top: -100px;
    left: 20%;
  }
  
  &.orb2 {
    bottom: -50px;
    right: 15%;
    background: radial-gradient(circle, rgba(120, 81, 169, 0.1) 0%, transparent 70%);
  }
`;

const FooterContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 3rem;
  padding: 0 2rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: 2fr 1fr 1fr;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

// Fixed: Use motion.create() instead of direct motion() and use shouldForwardProp
const LogoSection = styled(motion.div).withConfig({
  shouldForwardProp: defaultShouldForwardProp
})`
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    text-align: center;
    align-items: center;
  }
`;

const LogoContainer = styled(motion.div).withConfig({
  shouldForwardProp: defaultShouldForwardProp
})`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  position: relative;
`;

const LogoTextContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const LogoText = styled.h3`
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
  
  background: linear-gradient(90deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const LogoTagline = styled.span`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
`;

const LogoImg = styled(motion.img).withConfig({
  shouldForwardProp: defaultShouldForwardProp
})`
  width: 80px;
  height: auto;
  margin-right: 1rem;
  filter: drop-shadow(0 0 12px rgba(0, 255, 255, 0.5));
  
  @media (max-width: 480px) {
    width: 60px;
  }
`;

const CompanyDescription = styled(motion.p).withConfig({
  shouldForwardProp: defaultShouldForwardProp
})`
  color: #e0e0e0;
  line-height: 1.7;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  max-width: 95%;
  
  @media (max-width: 768px) {
    text-align: center;
    margin-left: auto;
    margin-right: auto;
  }
`;

const FooterSection = styled(motion.div).withConfig({
  shouldForwardProp: defaultShouldForwardProp
})`
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    align-items: center;
  }
`;

const FooterHeading = styled(motion.h4).withConfig({
  shouldForwardProp: defaultShouldForwardProp
})`
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  font-weight: 600;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -8px;
    width: 40px;
    height: 2px;
    background: linear-gradient(90deg, #00ffff, #7851a9);
    transition: width 0.3s ease;
  }
  
  ${FooterSection}:hover &:after {
    width: 60px;
  }
  
  @media (max-width: 768px) {
    text-align: center;
    
    &:after {
      left: 50%;
      transform: translateX(-50%);
    }
  }
`;

const FooterNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  
  @media (max-width: 768px) {
    align-items: center;
  }
`;

// Fixed: Create a proper motion component with create()
const AnimatedLink = motion.create(Link, { 
  forwardMotionProps: false,
  shouldForwardProp: defaultShouldForwardProp
});

const AnimatedFooterLink = styled(AnimatedLink)`
  color: #e0e0e0;
  text-decoration: none;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  position: relative;
  display: inline-block;
  padding: 2px 0;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 1px;
    background: var(--neon-blue, #00ffff);
    transition: width 0.3s ease;
  }
  
  &:hover {
    color: var(--neon-blue, #00ffff);
  }
  
  &:hover::after {
    width: 100%;
  }
`;

const SocialIcons = styled(motion.div).withConfig({
  shouldForwardProp: defaultShouldForwardProp
})`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

// Fixed: Create a proper motion component with create()
const AnimatedA = motion.create('a', {
  forwardMotionProps: false,
  shouldForwardProp: defaultShouldForwardProp
});

const SocialIcon = styled(AnimatedA)`
  color: #fff;
  font-size: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    z-index: -1;
    opacity: 0;
    transform: scale(0);
    transition: all 0.3s ease;
  }
  
  &:hover {
    color: var(--neon-blue, #00ffff);
    transform: translateY(-5px);
  }
  
  &:hover::before {
    opacity: 1;
    transform: scale(1);
  }
`;

const ContactItem = styled(motion.div).withConfig({
  shouldForwardProp: defaultShouldForwardProp
})`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  color: #e0e0e0;
  transition: all 0.3s ease;
  
  svg {
    color: var(--neon-blue, #00ffff);
    font-size: 1.1rem;
    flex-shrink: 0;
  }
  
  &:hover {
    color: #fff;
    transform: translateX(5px);
  }
  
  @media (max-width: 768px) {
    text-align: center;
    justify-content: center;
    
    &:hover {
      transform: translateY(-3px);
    }
  }
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  margin: 2rem 0;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 2rem;
`;

const BottomFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const Copyright = styled(motion.div).withConfig({
  shouldForwardProp: defaultShouldForwardProp
})`
  color: #e0e0e0;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    color: var(--neon-blue, #00ffff);
  }
  
  .heart {
    color: #ff6b6b;
    animation: heartbeat 1.5s ease infinite;
  }
  
  @keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    10%, 30% { transform: scale(1.2); }
    20% { transform: scale(0.9); }
  }
`;

const FooterLinks = styled.div`
  display: flex;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const SmallFooterLink = styled(Link)`
  color: #e0e0e0;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.3s ease;
  
  &:hover {
    color: var(--neon-blue, #00ffff);
  }
`;

// Fixed: Use motion.create() properly
const AnimatedButton = motion.create('button', {
  forwardMotionProps: false,
  shouldForwardProp: defaultShouldForwardProp
});

const ScrollTopButton = styled(AnimatedButton)`
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 30, 0.8);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: var(--neon-blue, #00ffff);
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  z-index: 1000;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    padding: 2px;
    background: linear-gradient(135deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.6;
  }
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  }
  
  @media (max-width: 480px) {
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
`;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.8, type: "spring", stiffness: 100 }
  }
};

const linkVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 }
  }
};

const contactVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 }
  }
};

const textTypingVariants = {
  hidden: { width: 0, opacity: 0 },
  visible: {
    width: "100%",
    opacity: 1,
    transition: { duration: 1, delay: 0.5 }
  }
};

const iconAnimation = {
  hidden: { scale: 0, opacity: 0 },
  visible: (index: number) => ({
    scale: 1, 
    opacity: 1,
    transition: { 
      delay: 0.3 + (index * 0.1),
      type: "spring",
      stiffness: 200,
      damping: 10
    }
  })
};

// Animation sequence for logo bounce - direct animation object
const logoAnimationValues = {
  y: [0, -10, 0]
};

// Enhanced Footer Component
const EnhancedFooter = () => {
  const footerRef = useRef(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.1 });
  const controls = useAnimation();
  
  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [controls, isInView]);
  
  // Smooth scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // GSAP animation for hover effects on social icons
  useEffect(() => {
    if (footerRef.current) {
      const socialIcons = footerRef.current.querySelectorAll('.social-icon');
      
      socialIcons.forEach(icon => {
        icon.addEventListener('mouseenter', () => {
          gsap.to(icon, {
            y: -5,
            duration: 0.3,
            ease: 'power2.out'
          });
        });
        
        icon.addEventListener('mouseleave', () => {
          gsap.to(icon, {
            y: 0,
            duration: 0.3,
            ease: 'power2.out'
          });
        });
      });
    }
  }, []);
  
  return (
    <FooterContainer ref={footerRef}>
      <BackgroundPattern />
      <WavePattern />
      <GlowOrb className="orb1" />
      <GlowOrb className="orb2" />
      
      <FooterContent>
        <LogoSection
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          <LogoContainer variants={logoVariants}>
            <LogoImg 
              src={logoImage} 
              alt="SwanStudios Logo"
              animate={logoAnimationValues}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            />
            <LogoTextContainer>
              <LogoText>SwanStudios</LogoText>
              <LogoTagline>Excellence in Performance Training</LogoTagline>
            </LogoTextContainer>
          </LogoContainer>
          
          <CompanyDescription variants={itemVariants}>
            Transforming fitness through personalized training programs and expert guidance to help you achieve your health and wellness goals. Our elite coaching team combines proven science with personalized attention.
          </CompanyDescription>
          
          <SocialIcons variants={containerVariants}>
            <SocialIcon 
              href="https://facebook.com/seanswantech" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Facebook"
              className="social-icon"
              custom={0}
              variants={iconAnimation}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.1 }}
            >
              <FaFacebook />
            </SocialIcon>
            <SocialIcon 
              href="https://bsky.app/profile/swanstudios.bsky.social" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Bluesky"
              className="social-icon"
              custom={1}
              variants={iconAnimation}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.1 }}
            >
              <SiBluesky />
            </SocialIcon>
            <SocialIcon 
              href="https://instagram.com/seanswantech" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Instagram"
              className="social-icon"
              custom={2}
              variants={iconAnimation}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.1 }}
            >
              <FaInstagram />
            </SocialIcon>
            <SocialIcon 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="LinkedIn"
              className="social-icon"
              custom={3}
              variants={iconAnimation}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.1 }}
            >
              <FaLinkedin />
            </SocialIcon>
            <SocialIcon 
              href="https://www.youtube.com/@swanstudios2018" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="YouTube"
              className="social-icon"
              custom={4}
              variants={iconAnimation}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.1 }}
            >
              <FaYoutube />
            </SocialIcon>
            <SocialIcon 
              href="https://tiktok.com/@swanstudios2018" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="TikTok"
              className="social-icon"
              custom={5}
              variants={iconAnimation}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.1 }}
            >
              <FaTiktok />
            </SocialIcon>
          </SocialIcons>
        </LogoSection>
        
        <FooterSection
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          <FooterHeading variants={itemVariants}>Quick Links</FooterHeading>
          <FooterNav>
            <AnimatedFooterLink to="/" variants={linkVariants}>
              Home
            </AnimatedFooterLink>
            <AnimatedFooterLink to="/about" variants={linkVariants}>
              About Us
            </AnimatedFooterLink>
            <AnimatedFooterLink to="/store" variants={linkVariants}>
              Store
            </AnimatedFooterLink>
            <AnimatedFooterLink to="/contact" variants={linkVariants}>
              Contact
            </AnimatedFooterLink>
            <AnimatedFooterLink to="/video-library" variants={linkVariants}>
              Video Library
            </AnimatedFooterLink>
          </FooterNav>
        </FooterSection>
        
        <FooterSection
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          <FooterHeading variants={itemVariants}>Programs</FooterHeading>
          <FooterNav>
            <AnimatedFooterLink to="/programs/personal-training" variants={linkVariants}>
              Personal Training
            </AnimatedFooterLink>
            <AnimatedFooterLink to="/programs/group-classes" variants={linkVariants}>
              Group Classes
            </AnimatedFooterLink>
            <AnimatedFooterLink to="/programs/nutrition" variants={linkVariants}>
              Nutrition Coaching
            </AnimatedFooterLink>
            <AnimatedFooterLink to="/programs/online-training" variants={linkVariants}>
              Online Training
            </AnimatedFooterLink>
            <AnimatedFooterLink to="/programs/recovery" variants={linkVariants}>
              Recovery & Wellness
            </AnimatedFooterLink>
          </FooterNav>
        </FooterSection>
        
        <FooterSection
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          <FooterHeading variants={itemVariants}>Contact Us</FooterHeading>
          <ContactItem variants={contactVariants}>
            <FaMapMarkerAlt />
            <span>Anaheim Hills </span>
          </ContactItem>
          <ContactItem variants={contactVariants}>
            <FaPhone />
            <span>(555) 123-4567</span>
          </ContactItem>
          <ContactItem variants={contactVariants}>
            <FaEnvelope />
            <span>loveswanstudios@protonmail.com</span>
          </ContactItem>
          
          <FooterHeading variants={itemVariants} style={{ marginTop: '2rem' }}>
            Hours
          </FooterHeading>
          <ContactItem variants={contactVariants}>
            <span>Monday-Friday: 6am - 9pm</span>
          </ContactItem>
          <ContactItem variants={contactVariants}>
            <span>Saturday: 8am - 6pm</span>
          </ContactItem>
          <ContactItem variants={contactVariants}>
            <span>Sunday: 10am - 4pm</span>
          </ContactItem>
        </FooterSection>
      </FooterContent>
      
      <Divider />
      
      <BottomFooter>
        <Copyright
          variants={itemVariants}
          initial="hidden"
          animate={controls}
        >
          <FaCopyright /> {new Date().getFullYear()} Swan Studios. All Rights Reserved.
          <span> Made with <FaHeart className="heart" /> in California</span>
        </Copyright>
        
        <FooterLinks>
          <SmallFooterLink to="/privacy">Privacy Policy</SmallFooterLink>
          <SmallFooterLink to="/terms">Terms of Service</SmallFooterLink>
          <SmallFooterLink to="/sitemap">Sitemap</SmallFooterLink>
        </FooterLinks>
      </BottomFooter>
      
      <ScrollTopButton
        onClick={scrollToTop}
        aria-label="Scroll to top"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <FaChevronUp />
      </ScrollTopButton>
    </FooterContainer>
  );
};

export default EnhancedFooter;