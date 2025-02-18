// src/Components/Contact/AdditionalInfo.tsx

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

/**
 * InfoWrapper
 * -----------
 * A container for additional contact information with a smooth fade-in animation.
 */
const InfoWrapper = styled(motion.div)`
  margin-top: 2rem;
  text-align: center;
`;

/**
 * InfoText
 * --------
 * Text styling for contact details.
 */
const InfoText = styled.p`
  font-size: 1.1rem;
  margin-bottom: 1rem;
`;

/**
 * SocialIcons
 * -----------
 * A flex container to display social media icons with spacing.
 */
const SocialIcons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
`;

/**
 * Icon
 * ----
 * Styles for each social media icon. Uses hover animations to increase interactivity.
 */
const Icon = styled(motion.a)`
  color: #FFFFFF;
  font-size: 1.8rem;
  text-decoration: none;

  &:hover {
    color: #00FFFF;
  }
`;

const AdditionalInfo: React.FC = () => {
  return (
    <InfoWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7, duration: 0.5 }}
    >
      <InfoText>For immediate inquiries, please call: (555) 123-4567</InfoText>
      <SocialIcons>
        <Icon
          href="https://facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          <i className="fab fa-facebook"></i>
        </Icon>
        <Icon
          href="https://twitter.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Twitter"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          <i className="fab fa-twitter"></i>
        </Icon>
        <Icon
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          <i className="fab fa-instagram"></i>
        </Icon>
      </SocialIcons>
    </InfoWrapper>
  );
};

export default AdditionalInfo;
