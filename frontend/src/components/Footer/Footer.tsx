// src/components/Footer/footer.tsx
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaLinkedin, 
  FaYoutube,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt
} from 'react-icons/fa';

const FooterContainer = styled.footer`
  width: 100%;
  background: linear-gradient(to right, #0f0c29, #302b63, #24243e);
  color: #fff;
  padding: 3rem 0 2rem;
  margin-top: auto;
  box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.1);
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  padding: 0 2rem;
`;

const FooterSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const FooterHeading = styled.h4`
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  font-weight: 600;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -8px;
    width: 50px;
    height: 2px;
    background-color: #fff;
  }
`;

const FooterNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FooterLink = styled(Link)`
  color: #e0e0e0;
  text-decoration: none;
  transition: color 0.3s;
  font-size: 0.95rem;
  
  &:hover {
    color: #fff;
    text-decoration: underline;
  }
`;

const SocialIcons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const SocialIcon = styled.a`
  color: #fff;
  font-size: 1.5rem;
  transition: transform 0.3s, color 0.3s;
  
  &:hover {
    transform: translateY(-3px);
    color: #a3a3ff;
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
`;

const Copyright = styled.div`
  text-align: center;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  font-size: 0.9rem;
`;

const ScrollTop = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(48, 43, 99, 0.7);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  transition: background 0.3s;
  z-index: 100;
  
  &:hover {
    background: rgba(48, 43, 99, 1);
  }
`;

const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection>
          <FooterHeading>Swan Studios</FooterHeading>
          <p>Transforming fitness through personalized training programs and expert guidance to help you achieve your health and wellness goals.</p>
          <SocialIcons>
            <SocialIcon href="https://facebook.com" target="_blank" aria-label="Facebook">
              <FaFacebook />
            </SocialIcon>
            <SocialIcon href="https://twitter.com" target="_blank" aria-label="Twitter">
              <FaTwitter />
            </SocialIcon>
            <SocialIcon href="https://instagram.com" target="_blank" aria-label="Instagram">
              <FaInstagram />
            </SocialIcon>
            <SocialIcon href="https://linkedin.com" target="_blank" aria-label="LinkedIn">
              <FaLinkedin />
            </SocialIcon>
            <SocialIcon href="https://youtube.com" target="_blank" aria-label="YouTube">
              <FaYoutube />
            </SocialIcon>
          </SocialIcons>
        </FooterSection>
        
        <FooterSection>
          <FooterHeading>Quick Links</FooterHeading>
          <FooterNav>
            <FooterLink to="/">Home</FooterLink>
            <FooterLink to="/about">About Us</FooterLink>
            <FooterLink to="/store">Store</FooterLink>
            <FooterLink to="/contact">Contact</FooterLink>
          </FooterNav>
        </FooterSection>
        
        <FooterSection>
          <FooterHeading>Programs</FooterHeading>
          <FooterNav>
            <FooterLink to="/programs/personal-training">Personal Training</FooterLink>
            <FooterLink to="/programs/group-classes">Group Classes</FooterLink>
            <FooterLink to="/programs/nutrition">Nutrition Coaching</FooterLink>
            <FooterLink to="/programs/online-training">Online Training</FooterLink>
          </FooterNav>
        </FooterSection>
        
        <FooterSection>
          <FooterHeading>Contact Us</FooterHeading>
          <ContactItem>
            <FaMapMarkerAlt />
            <span>123 Fitness Street, Wellness City, CA 94103</span>
          </ContactItem>
          <ContactItem>
            <FaPhone />
            <span>(555) 123-4567</span>
          </ContactItem>
          <ContactItem>
            <FaEnvelope />
            <span>info@swanstudios.com</span>
          </ContactItem>
        </FooterSection>
      </FooterContent>
      
      <Copyright>
        &copy; {new Date().getFullYear()} Swan Studios. All Rights Reserved.
      </Copyright>
      
      <ScrollTop onClick={scrollToTop} aria-label="Scroll to top">
        ↑
      </ScrollTop>
    </FooterContainer>
  );
};

export default Footer;