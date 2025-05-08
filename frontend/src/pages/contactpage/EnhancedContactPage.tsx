import React, { useRef, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView } from "framer-motion";
import Header from "../../components/Header/header";
import GlowButton from "../../components/ui/GlowButton";
import { TextField, Snackbar, Alert, Grid, IconButton, Tooltip } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import YouTubeIcon from "@mui/icons-material/YouTube";
import TimelapseIcon from "@mui/icons-material/Timelapse";
import axios from "axios";

// Import asset for background video - update path if needed
const swanVideo = "/swan.mp4";

/*
  🌟 Premium Contact Page 2025 Edition
  ---------------------
  - Features **immersive animations** and **next-level visual effects**
  - Implements **3D glass-morphism** for an ultra-premium feel
  - Includes **intelligent interaction elements** for visual richness
  - Enhanced with **award-winning layout** and visual hierarchy
  - Delivers a **cohesive premium aesthetic** matching other components
*/

// ======================= 🎨 Animation Keyframes =======================
const shimmer = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(1deg); }
  100% { transform: translateY(0px) rotate(0deg); }
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

const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const borderPulse = keyframes`
  0% {
    border-color: rgba(0, 255, 255, 0.5);
  }
  50% {
    border-color: rgba(120, 81, 169, 0.8);
  }
  100% {
    border-color: rgba(0, 255, 255, 0.5);
  }
`;

// ======================= 🎨 Styled Components =======================

// Main wrapper with consistent styling
const ContactPageWrapper = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100%;
  margin: 0;
  padding: 0;
  color: #ffffff;
  font-family: "Arial", sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
`;

// Premium video background with improved styling
const VideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  margin: 0;
  padding: 0;
  z-index: 0;
  opacity: 0.6; /* Slightly increased opacity for luxury feel */
`;

// Enhanced overlay with luxury gradient animation
const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    45deg,
    rgba(10, 10, 26, 0.85),
    rgba(30, 30, 63, 0.85)
  );
  z-index: 1;
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 255, 255, 0.15),
      rgba(120, 81, 169, 0.15),
      rgba(0, 255, 255, 0.15)
    );
    background-size: 200% 200%;
    animation: ${gradientShift} 15s ease infinite;
    z-index: -1;
  }
`;

// Premium decorative orb elements
const TopLeftOrb = styled.div`
  position: fixed;
  top: 10%;
  left: 5%;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.05);
  filter: blur(60px);
  opacity: 0.3;
  z-index: 2;
  pointer-events: none;
  animation: ${float} 15s infinite ease-in-out;
`;

const BottomRightOrb = styled.div`
  position: fixed;
  bottom: 15%;
  right: 8%;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: rgba(120, 81, 169, 0.05);
  filter: blur(60px);
  opacity: 0.3;
  z-index: 2;
  pointer-events: none;
  animation: ${float} 18s infinite ease-in-out reverse;
`;

// Luxury main content container with glass morphism effect
const MainContent = styled(motion.main)`
  position: relative;
  z-index: 3;
  max-width: 1200px;
  width: 90%;
  margin: 7rem auto 3rem;
  padding: 0;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    margin-top: 5rem;
  }
`;

// Premium title styling
const PageTitle = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 300;
  margin-bottom: 1.5rem;
  text-align: center;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  letter-spacing: 2px;
  position: relative;
  display: inline-block;
  width: 100%;
  
  /* Luxury gradient text effect */
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
  
  /* Premium underline */
  &:after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 0.8),
      rgba(120, 81, 169, 0.8),
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

// Enhanced subtitle
const SubHeading = styled(motion.h3)`
  font-size: 1.8rem;
  font-weight: 300;
  margin-bottom: 2rem;
  text-align: center;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

// Styled Contact Sections Container
const ContactSectionsContainer = styled(motion.div)`
  display: flex;
  flex-direction: row;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  animation: ${pulseGlow} 8s infinite ease-in-out;
  
  /* Gradient border effect */
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 20px;
    padding: 2px;
    background: linear-gradient(45deg, #00ffff, #7851a9);
    -webkit-mask: 
      linear-gradient(#fff 0 0) content-box, 
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.5;
    z-index: -1;
  }
  
  @media (max-width: 968px) {
    flex-direction: column;
  }
`;

// Contact Form Section
const FormSection = styled(motion.div)`
  flex: 1;
  padding: 3rem;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  
  @media (max-width: 968px) {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2rem 1.5rem;
  }
`;

// Contact Info Section
const InfoSection = styled(motion.div)`
  flex: 1;
  padding: 3rem;
  background: rgba(20, 20, 50, 0.3);
  display: flex;
  flex-direction: column;
  
  @media (max-width: 968px) {
    padding: 2rem 1.5rem;
  }
`;

// Premium Form Title
const FormTitle = styled(motion.h2)`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  font-weight: 300;
  position: relative;
  display: inline-block;
  color: #fff;
  
  &:after {
    content: "";
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 1),
      rgba(120, 81, 169, 0.5)
    );
  }
`;

// Info Title
const InfoTitle = styled(FormTitle)`
  &:after {
    background: linear-gradient(
      to right,
      rgba(120, 81, 169, 1),
      rgba(0, 255, 255, 0.5)
    );
  }
`;

// Styled Form
const ContactForm = styled(motion.form)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

// Custom Styled TextField
const StyledTextField = styled(TextField)`
  .MuiInputBase-root {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    color: #fff;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: ${borderPulse} 8s infinite ease-in-out;
    
    &:hover, &.Mui-focused {
      border-color: rgba(0, 255, 255, 0.8);
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
    }
  }
  
  .MuiOutlinedInput-notchedOutline {
    border: none;
  }
  
  .MuiInputLabel-root {
    color: rgba(255, 255, 255, 0.7);
    
    &.Mui-focused {
      color: rgba(0, 255, 255, 1);
    }
  }
  
  .MuiInputBase-input {
    padding: 15px;
    color: #fff;
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
  }
`;

// Contact Info Card
const InfoCard = styled(motion.div)`
  background: rgba(20, 20, 40, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    border-color: rgba(0, 255, 255, 0.2);
  }
`;

// Info Item with Icon
const InfoItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  
  .icon {
    color: #00ffff;
    margin-right: 12px;
    font-size: 1.5rem;
  }
  
  .text {
    font-size: 1.1rem;
    color: #fff;
  }
  
  a {
    color: #00ffff;
    text-decoration: none;
    transition: all 0.3s ease;
    
    &:hover {
      color: #c8b6ff;
      text-decoration: underline;
    }
  }
`;

// Social Media Icons
const SocialIconsContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 1rem;
`;

const SocialIconButton = styled(IconButton)`
  background: rgba(255, 255, 255, 0.05) !important;
  color: #fff !important;
  transition: all 0.3s ease !important;
  
  &:hover {
    background: rgba(0, 255, 255, 0.2) !important;
    color: #00ffff !important;
    transform: translateY(-3px);
  }
`;

// FAQ Section
const FAQSection = styled(motion.div)`
  margin-top: 2rem;
  width: 100%;
  border-radius: 20px;
  padding: 2rem;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: ${pulseGlow} 8s infinite ease-in-out;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const FAQTitle = styled(motion.h2)`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  font-weight: 300;
  text-align: center;
  
  &:after {
    content: "";
    display: block;
    width: 100px;
    height: 2px;
    margin: 10px auto 0;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0.2),
      rgba(0, 255, 255, 0.8),
      rgba(0, 255, 255, 0.2)
    );
  }
`;

const FAQItem = styled(motion.div)`
  margin-bottom: 1.5rem;
  
  .question {
    font-size: 1.2rem;
    font-weight: 500;
    color: #00ffff;
    margin-bottom: 0.5rem;
  }
  
  .answer {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.6;
  }
`;

// ======================= 🚀 Enhanced Contact Page Component =======================

const EnhancedContactPage = () => {
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  // Refs for animation triggers
  const contentRef = useRef(null);
  const titleRef = useRef(null);
  const formSectionRef = useRef(null);
  const infoSectionRef = useRef(null);
  const faqSectionRef = useRef(null);
  
  // Animation controls
  const controls = useAnimation();
  const titleControls = useAnimation();
  const formControls = useAnimation();
  const infoControls = useAnimation();
  const faqControls = useAnimation();
  
  // In-view detection
  const isContentInView = useInView(contentRef, { once: true, amount: 0.2 });
  const isTitleInView = useInView(titleRef, { once: true });
  const isFormInView = useInView(formSectionRef, { once: true, amount: 0.3 });
  const isInfoInView = useInView(infoSectionRef, { once: true, amount: 0.3 });
  const isFaqInView = useInView(faqSectionRef, { once: true, amount: 0.3 });
  
  // Start animations when elements come into view
  useEffect(() => {
    if (isContentInView) {
      controls.start("visible");
    }
    
    if (isTitleInView) {
      titleControls.start("visible");
    }
    
    if (isFormInView) {
      formControls.start("visible");
    }
    
    if (isInfoInView) {
      infoControls.start("visible");
    }
    
    if (isFaqInView) {
      faqControls.start("visible");
    }
  }, [
    isContentInView, 
    isTitleInView, 
    isFormInView,
    isInfoInView,
    isFaqInView,
    controls, 
    titleControls, 
    formControls,
    infoControls,
    faqControls
  ]);
  
  // Animation variants
  const containerVariants = {
    hidden: { 
      opacity: 0,
      y: 30
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
        delayChildren: 0.2,
        staggerChildren: 0.2
      }
    }
  };
  
  const titleVariants = {
    hidden: { 
      opacity: 0,
      y: -20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };
  
  const sectionVariants = {
    hidden: { 
      opacity: 0,
      y: 30
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };
  
  const infoCardVariants = {
    hidden: { 
      opacity: 0,
      x: -30
    },
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
  
  const faqItemVariants = {
    hidden: { 
      opacity: 0,
      y: 20
    },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };
  
  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!name || !email || !message) {
      setError("Please fill in all required fields");
      return;
    }
    
    try {
      // Simulating API call
      // In real implementation, replace with:
      // await axios.post("/api/contact", { name, email, subject, message });
      
      // Simulate success
      setSuccess(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setError("");
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError("Failed to send message. Please try again later.");
    }
  };
  
  // Close error message
  const handleCloseError = () => {
    setError("");
  };

  return (
    <ContactPageWrapper>
      {/* Premium Video Background */}
      <VideoBackground 
        autoPlay 
        loop 
        muted 
        playsInline 
        preload="auto"
      >
        <source src={swanVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </VideoBackground>

      {/* Enhanced Overlay */}
      <Overlay />
      
      {/* Premium Decorative Elements */}
      <TopLeftOrb />
      <BottomRightOrb />

      {/* Site Header */}
      <Header />
      
      {/* Main Content with Glass Morphism */}
      <MainContent
        ref={contentRef}
        initial="hidden"
        animate={controls}
        variants={containerVariants}
      >
        {/* Premium Title */}
        <PageTitle
          ref={titleRef}
          initial="hidden"
          animate={titleControls}
          variants={titleVariants}
        >
          Connect With Us
        </PageTitle>
        
        {/* Contact Sections Container */}
        <ContactSectionsContainer>
          {/* Form Section */}
          <FormSection
            ref={formSectionRef}
            initial="hidden"
            animate={formControls}
            variants={sectionVariants}
          >
            <FormTitle variants={titleVariants}>Send Us a Message</FormTitle>
            
            <ContactForm onSubmit={handleSubmit}>
              <StyledTextField
                label="Full Name"
                variant="outlined"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
              />
              
              <StyledTextField
                label="Email"
                variant="outlined"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
              />
              
              <StyledTextField
                label="Subject"
                variant="outlined"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                fullWidth
              />
              
              <StyledTextField
                label="Message"
                variant="outlined"
                multiline
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                fullWidth
                required
              />
              
              <GlowButton
                type="submit"
                variant="primary"
                glowIntensity="high"
                fullWidth
                style={{ marginTop: '1rem' }}
              >
                Send Message
              </GlowButton>
            </ContactForm>
          </FormSection>
          
          {/* Info Section */}
          <InfoSection
            ref={infoSectionRef}
            initial="hidden"
            animate={infoControls}
            variants={sectionVariants}
          >
            <InfoTitle variants={titleVariants}>Contact Information</InfoTitle>
            
            <InfoCard 
              custom={0}
              variants={infoCardVariants}
            >
              <InfoItem>
                <LocationOnIcon className="icon" />
                <div className="text">
                  <strong>Location</strong><br />
                  123 Fitness Avenue, Suite 100<br />
                  Newport Beach, CA 92660
                </div>
              </InfoItem>
            </InfoCard>
            
            <InfoCard
              custom={1}
              variants={infoCardVariants}
            >
              <InfoItem>
                <EmailIcon className="icon" />
                <div className="text">
                  <strong>Email</strong><br />
                  <a href="mailto:loveswanstudios@protonmail.com">loveswanstudios@protonmail.com</a>
                </div>
              </InfoItem>
            </InfoCard>
            
            <InfoCard
              custom={2}
              variants={infoCardVariants}
            >
              <InfoItem>
                <PhoneIcon className="icon" />
                <div className="text">
                  <strong>Phone</strong><br />
                  <a href="tel:+14155125678">+1 (415) 512-5678</a>
                </div>
              </InfoItem>
            </InfoCard>
            
            <InfoCard
              custom={3}
              variants={infoCardVariants}
            >
              <InfoItem>
                <TimelapseIcon className="icon" />
                <div className="text">
                  <strong>Hours</strong><br />
                  Monday - Friday: 6am - 9pm<br />
                  Saturday: 8am - 6pm<br />
                  Sunday: 9am - 5pm
                </div>
              </InfoItem>
            </InfoCard>
            
            <div style={{ marginTop: 'auto' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>Connect With Us</h4>
              <SocialIconsContainer>
                <Tooltip title="Facebook">
                  <SocialIconButton>
                    <FacebookIcon />
                  </SocialIconButton>
                </Tooltip>
                <Tooltip title="Instagram">
                  <SocialIconButton>
                    <InstagramIcon />
                  </SocialIconButton>
                </Tooltip>
                <Tooltip title="Twitter">
                  <SocialIconButton>
                    <TwitterIcon />
                  </SocialIconButton>
                </Tooltip>
                <Tooltip title="YouTube">
                  <SocialIconButton>
                    <YouTubeIcon />
                  </SocialIconButton>
                </Tooltip>
              </SocialIconsContainer>
            </div>
          </InfoSection>
        </ContactSectionsContainer>
        
        {/* FAQ Section */}
        <FAQSection
          ref={faqSectionRef}
          initial="hidden"
          animate={faqControls}
          variants={sectionVariants}
        >
          <FAQTitle variants={titleVariants}>Frequently Asked Questions</FAQTitle>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FAQItem
                custom={0}
                variants={faqItemVariants}
              >
                <div className="question">How do I schedule a personal training session?</div>
                <div className="answer">
                  You can schedule a personal training session by contacting us through this form, calling our phone number, or emailing us directly. We'll match you with the perfect trainer for your goals.
                </div>
              </FAQItem>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FAQItem
                custom={1}
                variants={faqItemVariants}
              >
                <div className="question">What are your pricing options?</div>
                <div className="answer">
                  We offer a variety of training packages to fit different budgets and goals. Contact us for a personalized quote based on your specific needs and objectives.
                </div>
              </FAQItem>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FAQItem
                custom={2}
                variants={faqItemVariants}
              >
                <div className="question">Do you offer virtual training sessions?</div>
                <div className="answer">
                  Yes! We provide virtual training options through our secure platform. These sessions are customized just like our in-person training to ensure you reach your fitness goals.
                </div>
              </FAQItem>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FAQItem
                custom={3}
                variants={faqItemVariants}
              >
                <div className="question">How quickly will I receive a response?</div>
                <div className="answer">
                  We aim to respond to all inquiries within 24 hours during business days. For urgent matters, we recommend giving us a call directly.
                </div>
              </FAQItem>
            </Grid>
          </Grid>
        </FAQSection>
      </MainContent>
      
      {/* Success/Error Messages */}
      <Snackbar 
        open={success} 
        autoHideDuration={5000} 
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccess(false)} 
          severity="success" 
          sx={{ 
            width: '100%',
            background: 'rgba(46, 125, 50, 0.9)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
          }}
        >
          Your message has been sent successfully! We'll get back to you soon.
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={5000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseError} 
          severity="error" 
          sx={{ 
            width: '100%',
            background: 'rgba(211, 47, 47, 0.9)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
          }}
        >
          {error}
        </Alert>
      </Snackbar>
    </ContactPageWrapper>
  );
};

export default EnhancedContactPage;