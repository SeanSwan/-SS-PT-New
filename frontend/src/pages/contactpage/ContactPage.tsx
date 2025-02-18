// src/Components/Contact/ContactPage.tsx

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Header from '../../components/Header/header'; // Use your existing header component
import ContactForm from './ContactForm';
import AdditionalInfo from './AdditionalInfo';

/**
 * ContactPageWrapper
 * --------------------
 * The main container for the Contact Us page.
 * It applies a full-height, gradient background with the brand colors and centers the content.
 */
const ContactPageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(to bottom right, #000000, #4B0082); /* Black to deep purple */
  color: #FFFFFF;
  font-family: 'Arial', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  overflow-x: hidden;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

/**
 * MainContent
 * -----------
 * The container for the main content (message, contact form, additional info).
 * Uses Framer Motion for a smooth entrance animation.
 */
const MainContent = styled(motion.main)`
  max-width: 800px;
  width: 100%;
  margin-top: 2rem;
`;

/**
 * SubHeading
 * ----------
 * A sub-heading to emphasize the maintenance status of the site.
 */
const SubHeading = styled(motion.h3)`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #00FFFF; /* Neon blue */
  text-align: center;
`;

/**
 * MaintenanceMessage
 * ------------------
 * Displays a maintenance message that informs users the site is being upgraded.
 * The background overlay ensures text readability over the gradient.
 */
const MaintenanceMessage = styled(motion.p)`
  font-size: 1.2rem;
  text-align: center;
  margin-bottom: 2rem;
  line-height: 1.6;
  background: rgba(0, 0, 0, 0.6);
  padding: 1rem;
  border-radius: 10px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.3);
`;

const ContactPage: React.FC = () => {
  return (
    <ContactPageWrapper>
      <Header />
      <MainContent
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SubHeading
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Site Under Maintenance
        </SubHeading>
        <MaintenanceMessage
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Our site is being upgraded with cutting-edge AI technologies and will be back online soon.
          To contact us for personal training sessions, please email{" "}
          <a
            href="mailto:loveswantstudios@protonmail.com"
            style={{ color: "#00FFFF", textDecoration: "underline" }}
          >
            loveswantstudios@protonmail.com
          </a>{" "}
          or fill out the form below.
        </MaintenanceMessage>
        <ContactForm />
        <AdditionalInfo />
      </MainContent>
    </ContactPageWrapper>
  );
};

export default ContactPage;
