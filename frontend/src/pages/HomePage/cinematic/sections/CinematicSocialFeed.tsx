/**
 * CinematicSocialFeed.tsx — Social media feed with platform cards.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Facebook, Instagram, Youtube, ExternalLink } from 'lucide-react';

import type { CinematicTokens } from '../cinematic-tokens';
import type { SocialPlatform } from '../HomepageContent';
import { staggerContainer, staggerItem, defaultViewport } from '../cinematic-animations';
import { SectionShell, SectionBackground, SectionHeading, SectionDescription, GlassCard, Grid3 } from '../cinematic-shared';

interface Props {
  sectionTitle: string;
  sectionDescription: string;
  platforms: SocialPlatform[];
  tokens: CinematicTokens;
}

const PLATFORM_ICONS: Record<string, React.FC<{ size?: number }>> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
};

interface TP { $tokens: CinematicTokens }

const PlatformCard = styled(motion.a)<TP>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 2.5rem 2rem;
  background: ${({ $tokens }) => $tokens.palette.glass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${({ $tokens }) => $tokens.palette.glassBorder};
  border-radius: ${({ $tokens }) => $tokens.surface.cardRadius};
  text-decoration: none;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ $tokens }) => $tokens.surface.elevatedShadow};
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;

const PlatformIconWrapper = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 1.25rem;
  background: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
`;

const PlatformName = styled.span<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.25rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
`;

const PlatformHandle = styled.span<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.9rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
`;

const FollowLabel = styled.span<TP>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ $tokens }) => $tokens.palette.accent};
`;

const SocialLinksRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
`;

const SocialLinkBtn = styled.a<TP & { $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 20px ${({ $color }) => `${$color}30`};
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;

const CinematicSocialFeed: React.FC<Props> = ({
  sectionTitle,
  sectionDescription,
  platforms,
  tokens,
}) => (
  <SectionBackground $tokens={tokens} $variant="surface">
    <SectionShell $tokens={tokens}>
      <motion.div
        variants={staggerContainer(tokens.motion)}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
      >
        <motion.div variants={staggerItem(tokens.motion)} style={{ textAlign: 'center' }}>
          <SectionHeading $tokens={tokens} style={{ textAlign: 'center', margin: '0 auto 1rem' }}>
            {sectionTitle}
          </SectionHeading>
        </motion.div>
        <motion.div variants={staggerItem(tokens.motion)} style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
          <SectionDescription $tokens={tokens} style={{ textAlign: 'center' }}>
            {sectionDescription}
          </SectionDescription>
        </motion.div>

        <Grid3>
          {platforms.map((platform) => {
            const Icon = PLATFORM_ICONS[platform.platform] || Facebook;
            const color = PLATFORM_COLORS[platform.platform] || '#1877F2';
            return (
              <PlatformCard
                key={platform.platform}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                $tokens={tokens}
                variants={staggerItem(tokens.motion)}
              >
                <PlatformIconWrapper $color={color}>
                  <Icon size={28} />
                </PlatformIconWrapper>
                <PlatformName $tokens={tokens}>
                  {platform.platform.charAt(0).toUpperCase() + platform.platform.slice(1)}
                </PlatformName>
                <PlatformHandle $tokens={tokens}>{platform.handle}</PlatformHandle>
                <FollowLabel $tokens={tokens}>
                  Follow Us <ExternalLink size={14} />
                </FollowLabel>
              </PlatformCard>
            );
          })}
        </Grid3>

        <SocialLinksRow>
          {platforms.map((platform) => {
            const Icon = PLATFORM_ICONS[platform.platform] || Facebook;
            const color = PLATFORM_COLORS[platform.platform] || '#1877F2';
            return (
              <SocialLinkBtn
                key={platform.platform}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                $tokens={tokens}
                $color={color}
                aria-label={`Follow SwanStudios on ${platform.platform}`}
              >
                <Icon size={22} />
              </SocialLinkBtn>
            );
          })}
        </SocialLinksRow>
      </motion.div>
    </SectionShell>
  </SectionBackground>
);

export default CinematicSocialFeed;
