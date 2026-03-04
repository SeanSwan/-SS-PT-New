// src/components/Footer/Footer.tsx — Theme-aware, streamlined
import React, { useRef } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Facebook, Instagram, Linkedin, Youtube, Mail, Phone,
  MapPin, Heart,
} from 'lucide-react';
import logoImage from '../../assets/Logo.png';
import { defaultShouldForwardProp } from '../../utils/styled-component-helpers';

/* ═══════════════════════════════════════════════════════
   STYLED COMPONENTS — All theme-aware
   ═══════════════════════════════════════════════════════ */

const FooterContainer = styled.footer`
  width: 100%;
  background: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.text.body};
  padding: 4rem 0 1.5rem;
  margin-top: auto;
  border-top: 1px solid ${({ theme }) => `${theme.colors.primary}20`};
  position: relative;
  overflow: hidden;
`;

const FooterGlow = styled.div`
  position: absolute;
  top: -100px;
  left: 20%;
  width: 300px;
  height: 300px;
  background: ${({ theme }) =>
    `radial-gradient(circle, ${theme.colors.primary}08 0%, transparent 70%)`};
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 2.5rem;
  padding: 0 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 2fr 1fr 1fr;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const LogoSection = styled.div`
  display: flex;
  flex-direction: column;

  @media (max-width: 480px) {
    align-items: center;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.25rem;

  @media (max-width: 480px) {
    justify-content: center;
  }
`;

const LogoImg = styled(motion.img).withConfig({
  shouldForwardProp: defaultShouldForwardProp,
})`
  width: 70px;
  height: auto;
  margin-right: 1rem;
  filter: drop-shadow(0 0 10px ${({ theme }) =>
    theme.effects.glowIntensity !== 'none'
      ? `${theme.colors.primary}40`
      : 'transparent'});

  @media (max-width: 480px) {
    width: 55px;
  }
`;

const LogoTextContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const LogoText = styled.h3`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 1.6rem;
  font-weight: 600;
  margin: 0;
  background: ${({ theme }) =>
    `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent || theme.colors.primary})`};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const LogoTagline = styled.span`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.85rem;
  color: ${({ theme }) => theme.text.secondary};
  font-style: italic;
`;

const CompanyDescription = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.text.muted};
  line-height: 1.7;
  margin-bottom: 1.25rem;
  font-size: 0.9rem;
  max-width: 95%;
`;

const SocialIcons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;

  @media (max-width: 480px) {
    justify-content: center;
  }
`;

const SocialIcon = styled.a`
  color: ${({ theme }) => theme.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}25`};
  transition: all 0.3s ease;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => `${theme.colors.primary}60`};
    transform: translateY(-3px);
    box-shadow: ${({ theme }) =>
      theme.effects.glowIntensity !== 'none'
        ? `0 4px 15px ${theme.colors.primary}25`
        : '0 4px 10px rgba(0,0,0,0.2)'};
  }
`;

const FooterSection = styled.div`
  display: flex;
  flex-direction: column;

  @media (max-width: 480px) {
    align-items: center;
  }
`;

const FooterHeading = styled.h4`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.05rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin-bottom: 1.25rem;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -6px;
    width: 30px;
    height: 2px;
    background: ${({ theme }) =>
      `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent || theme.colors.primary})`};
    border-radius: 1px;
    transition: width 0.3s ease;
  }

  ${FooterSection}:hover &::after {
    width: 50px;
  }

  @media (max-width: 480px) {
    &::after {
      left: 50%;
      transform: translateX(-50%);
    }
  }
`;

const FooterNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;

  @media (max-width: 480px) {
    align-items: center;
  }
`;

const FooterLink = styled(Link)`
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.text.muted};
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.3s ease;
  min-height: 44px;
  display: flex;
  align-items: center;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text.muted};

  svg {
    color: ${({ theme }) => theme.colors.primary};
    flex-shrink: 0;
    width: 16px;
    height: 16px;
  }

  @media (max-width: 480px) {
    justify-content: center;
  }
`;

const FooterDivider = styled.div`
  width: 100%;
  max-width: 1200px;
  height: 1px;
  background: ${({ theme }) =>
    `linear-gradient(90deg, transparent, ${theme.colors.primary}20, transparent)`};
  margin: 2rem auto;
`;

const BottomFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const CopyrightText = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.text.muted};
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;

  .heart {
    color: #ff6b6b;
  }
`;

const BottomLinks = styled.div`
  display: flex;
  gap: 1.25rem;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const SmallFooterLink = styled(Link)`
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.text.muted};
  text-decoration: none;
  font-size: 0.8rem;
  transition: color 0.3s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */

const EnhancedFooter: React.FC = () => {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.1 });

  return (
    <FooterContainer ref={footerRef}>
      <FooterGlow />

      <FooterContent>
        {/* Logo & Info */}
        <LogoSection>
          <LogoContainer>
            <LogoImg
              src={logoImage}
              alt="SwanStudios Logo"
              animate={isInView ? { y: [0, -6, 0] } : {}}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <LogoTextContainer>
              <LogoText>SwanStudios</LogoText>
              <LogoTagline>Excellence in Performance Training</LogoTagline>
            </LogoTextContainer>
          </LogoContainer>

          <CompanyDescription>
            Transforming fitness through personalized training programs and expert guidance.
            Our elite coaching team combines proven science with personalized attention to help
            you achieve your health and wellness goals.
          </CompanyDescription>

          <SocialIcons>
            <SocialIcon href="https://facebook.com/seanswantech" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <Facebook size={16} />
            </SocialIcon>
            <SocialIcon href="https://bsky.app/profile/swanstudios.bsky.social" target="_blank" rel="noopener noreferrer" aria-label="Bluesky">
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>B</span>
            </SocialIcon>
            <SocialIcon href="https://www.instagram.com/seanswantech" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <Instagram size={16} />
            </SocialIcon>
            <SocialIcon href="https://www.linkedin.com/company/swanstudios" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Linkedin size={16} />
            </SocialIcon>
            <SocialIcon href="https://www.youtube.com/@swanstudios2018" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <Youtube size={16} />
            </SocialIcon>
          </SocialIcons>
        </LogoSection>

        {/* Quick Links */}
        <FooterSection>
          <FooterHeading>Quick Links</FooterHeading>
          <FooterNav>
            <FooterLink to="/">Home</FooterLink>
            <FooterLink to="/about">About Us</FooterLink>
            <FooterLink to="/store">Store</FooterLink>
            <FooterLink to="/contact">Contact</FooterLink>
            <FooterLink to="/video-library">Video Library</FooterLink>
          </FooterNav>
        </FooterSection>

        {/* Programs */}
        <FooterSection>
          <FooterHeading>Programs</FooterHeading>
          <FooterNav>
            <FooterLink to="/programs/personal-training">Personal Training</FooterLink>
            <FooterLink to="/programs/group-classes">Group Classes</FooterLink>
            <FooterLink to="/programs/nutrition">Nutrition Coaching</FooterLink>
            <FooterLink to="/programs/online-training">Online Training</FooterLink>
            <FooterLink to="/programs/recovery">Recovery & Wellness</FooterLink>
          </FooterNav>
        </FooterSection>

        {/* Contact */}
        <FooterSection>
          <FooterHeading>Contact Us</FooterHeading>
          <ContactItem>
            <MapPin />
            <span>Anaheim Hills</span>
          </ContactItem>
          <ContactItem>
            <Phone />
            <span>(714) 947-3221</span>
          </ContactItem>
          <ContactItem>
            <Mail />
            <span>loveswanstudios@protonmail.com</span>
          </ContactItem>

          <FooterHeading style={{ marginTop: '1.5rem' }}>Hours</FooterHeading>
          <ContactItem>
            <span>Monday–Sunday: By Appointment Only</span>
          </ContactItem>
        </FooterSection>
      </FooterContent>

      <FooterDivider />

      <BottomFooter>
        <CopyrightText>
          &copy; 2018 Swan Studios. All Rights Reserved.
          <span> Made with</span> <Heart size={12} className="heart" /> <span>in California</span>
        </CopyrightText>

        <BottomLinks>
          <SmallFooterLink to="/privacy">Privacy Policy</SmallFooterLink>
          <SmallFooterLink to="/terms">Terms of Service</SmallFooterLink>
          <SmallFooterLink to="/sitemap">Sitemap</SmallFooterLink>
        </BottomLinks>
      </BottomFooter>
    </FooterContainer>
  );
};

export default EnhancedFooter;
