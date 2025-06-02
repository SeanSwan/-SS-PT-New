import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

const InfoWrapper = styled(motion.div)`
  margin-top: 2rem;
  text-align: center;
`;

const InfoText = styled.p`
  font-size: 1.1rem;
  margin-bottom: 1rem;
`;

const SocialIcons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
`;

const Icon = styled(motion.a)`
  color: #ffffff;
  font-size: 1.8rem;
  text-decoration: none;
  &:hover {
    color: var(--primary-color);
  }
`;

const AdditionalInfo: React.FC = () => {
  return (
    <InfoWrapper
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7, duration: 0.5 }}
    >
      <InfoText>For immediate inquiries, please Email: loveswanstudios@protonmail.com</InfoText>
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
          href="https://www.instagram.com/seanswantech"
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
