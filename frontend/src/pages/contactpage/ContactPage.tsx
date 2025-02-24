import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Header from '../../components/Header/header';
import ContactForm from './ContactForm';
import AdditionalInfo from './AdditionalInfo';

const ContactPageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(to bottom right, var(--dark-bg, #000000), var(--secondary-color, #4B0082));
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

const MainContent = styled(motion.main)`
  max-width: 800px;
  width: 100%;
  margin-top: 2rem;
`;

const SubHeading = styled(motion.h3)`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--primary-color);
  text-align: center;
`;

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
          Contact Us
        </SubHeading>
        <MaintenanceMessage
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Please fill out the form below to contact us. We will respond via email and SMS.
        </MaintenanceMessage>
        <ContactForm />
        <AdditionalInfo />
      </MainContent>
    </ContactPageWrapper>
  );
};

export default ContactPage;
