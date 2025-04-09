// src/components/NewsletterSignup/NewsletterSignup.jsx
import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaCheck, FaExclamationTriangle, FaLock, FaArrowRight, FaDumbbell, FaAppleAlt, FaBrain } from 'react-icons/fa';
import SectionTitle from '../ui/SectionTitle';
import GlowButton from '../Button/glowButton'; // Import GlowButton component

// Import background image
import backgroundImage from '../../assets/swan-tile-big.png';

// Styled Components
const NewsletterSection = styled.section`
  position: relative;
  padding: 6rem 0;
  background: linear-gradient(to right, rgba(10, 10, 10, 0.9), rgba(26, 26, 46, 0.9), rgba(10, 10, 10, 0.9)),
              url(${backgroundImage});
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  overflow: hidden;
  width: 100%;
  max-width: 100vw;
  margin: 0;
  box-sizing: border-box;
`;

const BackgroundEffect = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 50%, rgba(0, 255, 255, 0.05) 0%, transparent 60%),
              radial-gradient(circle at 70% 50%, rgba(120, 81, 169, 0.05) 0%, transparent 60%);
  z-index: 0;
`;

const GridLines = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 25px 25px;
`;

const ContentContainer = styled.div`
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 0 2rem;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SectionSubtitle = styled(motion.p)`
  text-align: center;
  font-size: 1.2rem;
  color: #c0c0c0;
  margin-bottom: 3rem;
  max-width: 800px;
  width: 100%;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const FormContainer = styled(motion.div)`
  width: 100%;
  max-width: 600px;
  background: rgba(25, 25, 35, 0.85);
  border-radius: 15px;
  padding: 3rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  
  @media (max-width: 768px) {
    padding: 2rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputGroup = styled.div`
  position: relative;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--neon-blue, #00ffff);
  font-size: 1.2rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--neon-blue, #00ffff);
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

// Removed SubscribeButton styled component as we'll use GlowButton instead

const PrivacyText = styled(motion.p)`
  font-size: 0.8rem;
  color: #808080;
  margin-top: 1rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
`;

const ErrorMessage = styled(motion.div)`
  background: rgba(255, 50, 50, 0.1);
  color: #ff6b6b;
  padding: 0.75rem 1rem;
  border-radius: 5px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
`;

const SuccessMessage = styled(motion.div)`
  text-align: center;
  padding: 2rem;
  width: 100%;
  
  h3 {
    font-size: 1.8rem;
    color: #2ecc71;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  p {
    font-size: 1.1rem;
    color: #c0c0c0;
    margin-bottom: 2rem;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
`;

const BenefitsContainer = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
  margin-top: 4rem;
  width: 100%;
  
  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const BenefitCard = styled(motion.div)`
  background: rgba(25, 25, 35, 0.7);
  padding: 1.5rem;
  border-radius: 10px;
  width: 280px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(5px);
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const BenefitIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: var(--neon-blue, #00ffff);
  font-size: 1.5rem;
`;

const BenefitTitle = styled.h3`
  font-size: 1.2rem;
  color: white;
  margin-bottom: 0.5rem;
`;

const BenefitText = styled.p`
  font-size: 0.9rem;
  color: #c0c0c0;
  line-height: 1.5;
`;

// Animation variants
const subtitleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, delay: 0.2 } 
  }
};

const formVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.5, 
      delay: 0.4,
      type: "spring",
      stiffness: 100
    } 
  }
};

const benefitCardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (index) => ({ 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5,
      delay: 0.6 + (index * 0.1)
    } 
  })
};

const successVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.5,
      type: "spring",
      stiffness: 100
    } 
  }
};

// Benefits data
const benefits = [
  {
    icon: <FaDumbbell />,
    title: "Exclusive Workouts",
    text: "Get access to exclusive workouts and training tips from our elite coaching team."
  },
  {
    icon: <FaAppleAlt />,
    title: "Nutrition Guides",
    text: "Receive monthly nutrition guides with meal plans and recipes to fuel your transformation."
  },
  {
    icon: <FaBrain />,
    title: "Mindset Coaching",
    text: "Learn the mental strategies used by elite athletes to stay motivated and overcome obstacles."
  }
];

// Newsletter Signup Component
const NewsletterSignup = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!name) {
      setError('Please enter your name');
      return;
    }
    
    // Simulate form submission
    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      // In a real application, you would send this data to your API
      console.log('Subscription data:', { name, email });
    }, 1500);
  };
  
  return (
    <NewsletterSection id="newsletter">
      <BackgroundEffect />
      <GridLines />
      <ContentContainer>
        <SectionTitle>Join Our Fitness Community</SectionTitle>
        
        <SectionSubtitle
          variants={subtitleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          Subscribe to receive exclusive workouts, nutrition tips, and special offers to accelerate your fitness journey
        </SectionSubtitle>
        
        <FormContainer
          variants={formVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <SuccessMessage
                key="success"
                variants={successVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <h3><FaCheck /> Thank You for Subscribing!</h3>
                <p>
                  Check your inbox for a confirmation email and your first exclusive workout guide.
                </p>
                <ButtonContainer>
                  <GlowButton
                    text="Subscribe Another"
                    theme="cosmic"
                    size="medium"
                    onClick={() => {
                      setIsSuccess(false);
                      setEmail('');
                      setName('');
                    }}
                    animateOnRender={false}
                  />
                </ButtonContainer>
              </SuccessMessage>
            ) : (
              <Form key="form" onSubmit={handleSubmit}>
                <InputGroup>
                  <InputIcon>
                    <FaEnvelope />
                  </InputIcon>
                  <Input
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </InputGroup>
                <InputGroup>
                  <InputIcon>
                    <FaEnvelope />
                  </InputIcon>
                  <Input
                    type="email"
                    placeholder="Your Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </InputGroup>
                
                <AnimatePresence>
                  {error && (
                    <ErrorMessage
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <FaExclamationTriangle /> {error}
                    </ErrorMessage>
                  )}
                </AnimatePresence>
                
                <ButtonContainer>
                  <GlowButton
                    text={isSubmitting ? "Subscribing..." : "Subscribe Now"}
                    theme="cosmic"
                    size="medium"
                    rightIcon={<FaArrowRight />}
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    animateOnRender={false}
                  />
                </ButtonContainer>
                
                <PrivacyText
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <FaLock /> We respect your privacy. Unsubscribe at any time.
                </PrivacyText>
              </Form>
            )}
          </AnimatePresence>
        </FormContainer>
        
        <BenefitsContainer>
          {benefits.map((benefit, index) => (
            <BenefitCard
              key={index}
              custom={index}
              variants={benefitCardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <BenefitIcon>{benefit.icon}</BenefitIcon>
              <BenefitTitle>{benefit.title}</BenefitTitle>
              <BenefitText>{benefit.text}</BenefitText>
            </BenefitCard>
          ))}
        </BenefitsContainer>
      </ContentContainer>
    </NewsletterSection>
  );
};

export default NewsletterSignup;