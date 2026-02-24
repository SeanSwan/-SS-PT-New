/**
 * CinematicFooter.tsx — Redesigned footer with link groups and "System Operational" indicator.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Clock,
  Heart,
  CheckCircle,
} from 'lucide-react';

import logoImage from '../../../../assets/Logo.png';
import type { CinematicTokens } from '../cinematic-tokens';
import type { HomepageContent } from '../HomepageContent';
import { staggerContainer, staggerItem, defaultViewport } from '../cinematic-animations';

interface Props {
  footer: HomepageContent['footer'];
  tokens: CinematicTokens;
}

interface TP { $tokens: CinematicTokens }

const SOCIAL_ICONS: Record<string, React.FC<{ size?: number }>> = {
  Facebook, Instagram, LinkedIn: Linkedin, YouTube: Youtube, Bluesky: Mail,
};

const FooterWrapper = styled.footer<TP>`
  position: relative;
  width: 100%;
  background: ${({ $tokens }) => {
    const { bg, surface } = $tokens.palette;
    return `linear-gradient(180deg, ${bg} 0%, ${surface} 100%)`;
  }};
  border-top: 1px solid ${({ $tokens }) => $tokens.palette.border};
`;

const FooterInner = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 5rem 1.5rem 2rem;

  @media (max-width: 768px) {
    padding: 3rem 1rem 1.5rem;
  }
`;

const TopGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  gap: 3rem;
  margin-bottom: 3rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const BrandColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const BrandHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const BrandLogo = styled.img`
  height: 40px;
  width: auto;
`;

const BrandInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const BrandName = styled.h3<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.25rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  margin: 0;
`;

const BrandTagline = styled.span<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.dramaFamily};
  font-style: italic;
  font-size: 0.85rem;
  color: ${({ $tokens }) => $tokens.palette.accent};
`;

const BrandDescription = styled.p<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.9rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  line-height: 1.7;
  margin: 0;
`;

const SocialRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const SocialIcon = styled.a<TP>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ $tokens }) => `${$tokens.palette.accent}10`};
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  transition: color 0.2s ease, background 0.2s ease;

  &:hover {
    color: ${({ $tokens }) => $tokens.palette.accent};
    background: ${({ $tokens }) => `${$tokens.palette.accent}20`};
  }
`;

const LinkColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const LinkColumnTitle = styled.h4<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  margin: 0 0 0.25rem;
`;

const FooterLink = styled(Link)<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.9rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  text-decoration: none;
  transition: color 0.2s ease;
  min-height: 32px;
  display: flex;
  align-items: center;

  &:hover {
    color: ${({ $tokens }) => $tokens.palette.accent};
  }
`;

const ContactColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ContactItem = styled.div<TP>`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.9rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    color: ${({ $tokens }) => $tokens.palette.accent};
    margin-top: 2px;
  }
`;

const BottomBar = styled.div<TP>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 2rem;
  border-top: 1px solid ${({ $tokens }) => $tokens.palette.border};
`;

const CopyrightRow = styled.div<TP>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.8rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};

  svg {
    color: #ff4081;
  }
`;

const LegalLinks = styled.div`
  display: flex;
  gap: 1.5rem;
`;

const LegalLink = styled(Link)<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.8rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  text-decoration: none;
  min-height: 32px;
  display: flex;
  align-items: center;

  &:hover {
    color: ${({ $tokens }) => $tokens.palette.accent};
  }
`;

const StatusBadge = styled.div<TP>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-family: ${({ $tokens }) => $tokens.typography.monoFamily};
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  color: ${({ $tokens }) => $tokens.palette.gaming};
  background: ${({ $tokens }) => `${$tokens.palette.gaming}10`};
  border: 1px solid ${({ $tokens }) => `${$tokens.palette.gaming}30`};
`;

const CinematicFooter: React.FC<Props> = ({ footer, tokens }) => (
  <FooterWrapper $tokens={tokens}>
    <FooterInner>
      <motion.div
        variants={staggerContainer(tokens.motion)}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
      >
        <TopGrid>
          {/* Brand */}
          <BrandColumn>
            <BrandHeader>
              <BrandLogo src={logoImage} alt="SwanStudios Logo" />
              <BrandInfo>
                <BrandName $tokens={tokens}>{footer.brandName}</BrandName>
                <BrandTagline $tokens={tokens}>{footer.brandTagline}</BrandTagline>
              </BrandInfo>
            </BrandHeader>
            <BrandDescription $tokens={tokens}>{footer.brandDescription}</BrandDescription>
            <SocialRow>
              {footer.social.map((s) => {
                const Icon = SOCIAL_ICONS[s.platform] || Mail;
                return (
                  <SocialIcon
                    key={s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    $tokens={tokens}
                    aria-label={s.platform}
                  >
                    <Icon size={18} />
                  </SocialIcon>
                );
              })}
            </SocialRow>
          </BrandColumn>

          {/* Link Groups */}
          {footer.linkGroups.map((group) => (
            <LinkColumn key={group.title}>
              <LinkColumnTitle $tokens={tokens}>{group.title}</LinkColumnTitle>
              {group.links.map((link) => (
                <FooterLink key={link.path} to={link.path} $tokens={tokens}>
                  {link.label}
                </FooterLink>
              ))}
            </LinkColumn>
          ))}

          {/* Contact */}
          <ContactColumn>
            <LinkColumnTitle $tokens={tokens}>Contact Us</LinkColumnTitle>
            <ContactItem $tokens={tokens}>
              <MapPin size={16} />
              {footer.contactInfo.location}
            </ContactItem>
            <ContactItem $tokens={tokens}>
              <Phone size={16} />
              {footer.contactInfo.phone}
            </ContactItem>
            <ContactItem $tokens={tokens}>
              <Mail size={16} />
              {footer.contactInfo.email}
            </ContactItem>
            <LinkColumnTitle $tokens={tokens} style={{ marginTop: '0.5rem' }}>Hours</LinkColumnTitle>
            <ContactItem $tokens={tokens}>
              <Clock size={16} />
              {footer.contactInfo.hours}
            </ContactItem>
          </ContactColumn>
        </TopGrid>

        <BottomBar $tokens={tokens}>
          <CopyrightRow $tokens={tokens}>
            {footer.copyright}
            <Heart size={12} fill="currentColor" />
            {footer.madeWith.replace('Made with love', '')}
          </CopyrightRow>

          <StatusBadge $tokens={tokens}>
            <CheckCircle size={12} />
            System Operational
          </StatusBadge>

          <LegalLinks>
            {footer.legal.map((link) => (
              <LegalLink key={link.path} to={link.path} $tokens={tokens}>
                {link.label}
              </LegalLink>
            ))}
          </LegalLinks>
        </BottomBar>
      </motion.div>
    </FooterInner>
  </FooterWrapper>
);

export default CinematicFooter;
