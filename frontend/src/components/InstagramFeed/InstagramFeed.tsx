// frontend/src/components/InstagramFeed/InstagramFeed.tsx

/**
 * Social Feed v2.0 — Platform-Diverse Social Mosaic
 * Ethereal Wilderness Design Tokens
 *
 * Replaces the original Instagram-only feed with a 3-card
 * mixed-platform section: Facebook, Instagram, YouTube.
 * Each card uses authentic platform micro-UI patterns while
 * maintaining brand cohesion through EW glass surfaces and tokens.
 *
 * Cormorant Garamond headings, Source Sans 3 body,
 * FrostedCard-consistent glassmorphism, prefers-reduced-motion
 */

import React, { useRef } from 'react';
import styled from 'styled-components';
import { motion, useInView } from 'framer-motion';
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaHeart,
  FaRegComment,
  FaRegPaperPlane,
  FaRegBookmark,
  FaPlay,
  FaThumbsUp,
  FaComment,
  FaShare,
} from 'react-icons/fa';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// --- EW Design Tokens ---

const T = {
  bg: '#0a0a1a',
  cardGlass: 'rgba(15, 20, 35, 0.55)',
  cardGlassFallback: 'rgba(15, 20, 35, 0.88)',
  primary: '#00D4AA',
  secondary: '#7851A9',
  accent: '#48E8C8',
  text: '#F0F8FF',
  textSecondary: '#8AA8B8',
  textMuted: '#5A7A8A',
  border: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(255, 255, 255, 0.18)',
  facebook: '#1877F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
} as const;

// --- Platform Social Data ---

const SOCIAL = {
  facebook: {
    url: 'https://facebook.com/seanswantech',
    pageName: 'SwanStudios',
    pageType: 'Personal Training Studio',
    avatar: '/male1.jpg',
    timestamp: '2 days ago',
    text: '25 years of coaching has taught us one thing — there are no shortcuts to real transformation. Every client who walks through our doors gets a personalized plan built on proven science, not trends.\n\nThis week, we\'re celebrating another milestone: 500+ client transformations and counting.',
    linkTitle: 'Elite Personal Training & Coaching',
    linkDomain: 'sswanstudios.com',
    linkImage: '/image2.jpg',
    reactions: 247,
    comments: 38,
    shares: 12,
  },
  instagram: {
    url: 'https://www.instagram.com/seanswantech',
    handle: 'sswanstudios',
    avatar: '/male1.jpg',
    image: '/maleblk.jpg',
    caption: 'Every rep counts. Every set matters. Form is everything.',
    hashtags: '#SwanStudios #PersonalTraining #FormFirst',
    likes: 342,
    comments: 28,
    timestamp: '3 days ago',
  },
  youtube: {
    url: 'https://www.youtube.com/@swanstudios2018',
    channelName: 'SwanStudios',
    subscribers: '2.4K',
    avatar: '/male1.jpg',
    thumbnail: '/femalelat.jpg',
    title: '5 Mobility Drills Every Athlete Needs | Coach Sean',
    duration: '12:34',
    views: '15K',
    timestamp: '1 week ago',
    likes: 892,
  },
};

// --- Section Styled Components ---

const SectionContainer = styled.section`
  padding: 6rem 2rem;
  background: linear-gradient(
    180deg,
    ${T.bg} 0%,
    rgba(12, 14, 28, 1) 50%,
    ${T.bg} 100%
  );
  position: relative;
  overflow: hidden;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
`;

const BackgroundGlow = styled.div`
  position: absolute;
  width: 60vw;
  height: 60vw;
  max-width: 800px;
  max-height: 800px;
  background: radial-gradient(
    ellipse at center,
    rgba(120, 81, 169, 0.06) 0%,
    rgba(0, 212, 170, 0.03) 40%,
    transparent 70%
  );
  border-radius: 50%;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  filter: blur(80px);
  z-index: 0;
  pointer-events: none;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 3.5rem;
`;

const SectionTitle = styled(motion.h2)`
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 2.8rem;
  font-weight: 600;
  font-style: italic;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, ${T.text} 0%, ${T.primary} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SectionSubtitle = styled(motion.p)`
  font-size: 1.15rem;
  color: ${T.textSecondary};
  max-width: 640px;
  margin: 0 auto;
  line-height: 1.7;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

// --- Feed Grid ---

const FeedGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  align-items: start;

  @media (max-width: 1023px) {
    grid-template-columns: repeat(2, 1fr);

    /* YouTube card spans full width on tablet */
    & > :nth-child(3) {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
    max-width: 480px;
    margin: 0 auto;
    gap: 1.5rem;
  }
`;

// --- Shared Card Glass Base ---

const CardBase = styled.article<{ $accentColor: string; $accentGradient?: string }>`
  background: ${T.cardGlass};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${T.border};
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

  @supports not (backdrop-filter: blur(12px)) {
    background: ${T.cardGlassFallback};
  }

  /* Platform accent line at top */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${({ $accentGradient, $accentColor }) =>
      $accentGradient ||
      `linear-gradient(90deg, transparent 10%, ${$accentColor} 50%, transparent 90%)`};
    z-index: 2;
    opacity: 0.7;
  }

  &:hover {
    transform: translateY(-6px);
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.4),
      0 0 30px ${({ $accentColor }) => $accentColor}10;
    border-color: ${T.borderHover};
  }

  &:focus-within {
    outline: 2px solid ${T.primary};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

// --- Platform Badge ---

const PlatformBadge = styled.span<{ $color: string; $bg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: ${({ $bg }) => $bg};
  font-size: 0.72rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
  letter-spacing: 0.03em;
  text-transform: uppercase;

  svg {
    font-size: 0.8rem;
  }
`;

// --- Card Link (wraps entire card for a11y) ---

const CardLink = styled.a`
  display: block;
  text-decoration: none;
  color: inherit;

  &:focus-visible {
    outline: 2px solid ${T.primary};
    outline-offset: 2px;
    border-radius: 20px;
  }
`;

// --- Platform Icon Links Row ---

const PlatformLinks = styled(motion.div)`
  display: flex;
  justify-content: center;
  gap: 1.25rem;
  margin-top: 3rem;
`;

const PlatformIconLink = styled.a<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${T.border};
  color: ${T.textSecondary};
  font-size: 1.1rem;
  transition: all 0.3s ease;
  text-decoration: none;

  &:hover {
    color: ${({ $color }) => $color};
    border-color: ${({ $color }) => $color}40;
    background: ${({ $color }) => $color}12;
    box-shadow: 0 0 20px ${({ $color }) => $color}20;
  }

  &:focus-visible {
    outline: 2px solid ${T.primary};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// =============================================
// FACEBOOK CARD STYLES
// =============================================

const FBInner = styled.div`
  padding: 1.25rem 1.5rem;
`;

const FBHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const FBAvatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${T.secondary}20;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const FBMeta = styled.div`
  flex: 1;
  min-width: 0;
`;

const FBPageName = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${T.text};
  display: flex;
  align-items: center;
  gap: 5px;
`;

const FBVerifiedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${T.facebook};
  color: white;
  font-size: 0.55rem;
  font-weight: 700;
`;

const FBSubtext = styled.div`
  font-size: 0.78rem;
  color: ${T.textMuted};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const FBPostText = styled.p`
  font-size: 0.92rem;
  line-height: 1.65;
  color: ${T.textSecondary};
  margin-bottom: 1rem;
  white-space: pre-line;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const FBLinkPreview = styled.div`
  border: 1px solid ${T.border};
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const FBLinkImage = styled.div`
  height: 130px;
  overflow: hidden;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const FBLinkInfo = styled.div`
  padding: 0.6rem 0.85rem;
  background: rgba(0, 0, 0, 0.25);
`;

const FBLinkDomain = styled.div`
  font-size: 0.7rem;
  color: ${T.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
`;

const FBLinkTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${T.textSecondary};
`;

const FBEngagement = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid ${T.border};
  font-size: 0.82rem;
  color: ${T.textMuted};
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const FBReactions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const FBReactionDots = styled.div`
  display: flex;
  gap: 0;

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 0.65rem;
    margin-right: -5px;
    border: 2px solid rgba(15, 20, 35, 0.9);
  }
`;

const FBActions = styled.div`
  display: flex;
  gap: 0.85rem;
`;

const FBActionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

// =============================================
// INSTAGRAM CARD STYLES
// =============================================

const IGHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
`;

const IGHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
`;

const IGAvatarRing = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(45deg, #833AB4, #E4405F, #FCAF45);
  padding: 2px;
  flex-shrink: 0;
`;

const IGAvatarImg = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(15, 20, 35, 0.95);
`;

const IGHandle = styled.div`
  font-size: 0.88rem;
  font-weight: 600;
  color: ${T.text};
`;

const IGImageWrap = styled.div`
  position: relative;
  width: 100%;
  padding-top: 100%; /* 1:1 square */
  overflow: hidden;
`;

const IGImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;

  ${CardBase}:hover & {
    transform: scale(1.03);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    ${CardBase}:hover & {
      transform: none;
    }
  }
`;

const IGActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem 0;
`;

const IGActionsLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1.25rem;
  color: ${T.text};

  svg {
    cursor: pointer;
    transition: color 0.2s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }
`;

const IGBookmark = styled.div`
  font-size: 1.25rem;
  color: ${T.text};
`;

const IGContent = styled.div`
  padding: 0.5rem 1rem 1rem;
`;

const IGLikes = styled.div`
  font-size: 0.88rem;
  font-weight: 600;
  color: ${T.text};
  margin-bottom: 0.35rem;
`;

const IGCaption = styled.p`
  font-size: 0.88rem;
  line-height: 1.5;
  color: ${T.textSecondary};
  margin-bottom: 0.25rem;

  strong {
    color: ${T.text};
    font-weight: 600;
    margin-right: 5px;
  }
`;

const IGHashtags = styled.span`
  color: ${T.primary};
  font-size: 0.85rem;
`;

const IGCommentCount = styled.div`
  font-size: 0.82rem;
  color: ${T.textMuted};
  margin-top: 0.4rem;
`;

const IGTimestamp = styled.div`
  font-size: 0.72rem;
  color: ${T.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-top: 0.35rem;
`;

// =============================================
// YOUTUBE CARD STYLES
// =============================================

const YTThumbWrap = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
  overflow: hidden;
`;

const YTThumbImg = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;

  ${CardBase}:hover & {
    transform: scale(1.03);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    ${CardBase}:hover & {
      transform: none;
    }
  }
`;

const YTPlayOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
  transition: background 0.3s ease;

  ${CardBase}:hover & {
    background: rgba(0, 0, 0, 0.3);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const YTPlayButton = styled.div`
  width: 56px;
  height: 40px;
  background: rgba(255, 0, 0, 0.9);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.1rem;
  transition: transform 0.2s ease, background 0.2s ease;

  ${CardBase}:hover & {
    background: rgba(255, 0, 0, 1);
    transform: scale(1.08);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    ${CardBase}:hover & {
      transform: none;
    }
  }
`;

const YTDuration = styled.span`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.02em;
`;

const YTContent = styled.div`
  padding: 1rem 1.25rem 1.25rem;
`;

const YTTitle = styled.h3`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${T.text};
  line-height: 1.4;
  margin-bottom: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const YTChannel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.5rem;
`;

const YTChannelAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const YTChannelInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const YTChannelName = styled.div`
  font-size: 0.85rem;
  color: ${T.textSecondary};
  font-weight: 500;
`;

const YTSubscribers = styled.div`
  font-size: 0.72rem;
  color: ${T.textMuted};
`;

const YTMeta = styled.div`
  font-size: 0.78rem;
  color: ${T.textMuted};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const YTEngagement = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${T.border};
  font-size: 0.82rem;
  color: ${T.textMuted};
`;

const YTEngagementItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

// =============================================
// FACEBOOK CARD COMPONENT
// =============================================

const FacebookCard: React.FC = () => (
  <CardBase $accentColor={T.facebook}>
    <CardLink
      href={SOCIAL.facebook.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View SwanStudios on Facebook"
    >
      <FBInner>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <PlatformBadge $color={T.facebook} $bg={`${T.facebook}15`}>
            <FaFacebookF /> Facebook
          </PlatformBadge>
        </div>

        <FBHeader>
          <FBAvatar>
            <img src={SOCIAL.facebook.avatar} alt="" loading="lazy" />
          </FBAvatar>
          <FBMeta>
            <FBPageName>
              {SOCIAL.facebook.pageName}
              <FBVerifiedBadge aria-label="Verified">&#10003;</FBVerifiedBadge>
            </FBPageName>
            <FBSubtext>
              <span>{SOCIAL.facebook.timestamp}</span>
              <span>·</span>
              <span>{SOCIAL.facebook.pageType}</span>
            </FBSubtext>
          </FBMeta>
        </FBHeader>

        <FBPostText>{SOCIAL.facebook.text}</FBPostText>

        <FBLinkPreview>
          <FBLinkImage>
            <img src={SOCIAL.facebook.linkImage} alt="SwanStudios website preview" loading="lazy" />
          </FBLinkImage>
          <FBLinkInfo>
            <FBLinkDomain>{SOCIAL.facebook.linkDomain}</FBLinkDomain>
            <FBLinkTitle>{SOCIAL.facebook.linkTitle}</FBLinkTitle>
          </FBLinkInfo>
        </FBLinkPreview>

        <FBEngagement>
          <FBReactions>
            <FBReactionDots>
              <span style={{ background: '#1877F2' }}>&#128077;</span>
              <span style={{ background: '#ED4956' }}>&#10084;&#65039;</span>
              <span style={{ background: '#F7B928' }}>&#128293;</span>
            </FBReactionDots>
            <span>{SOCIAL.facebook.reactions}</span>
          </FBReactions>
          <FBActions>
            <FBActionItem>
              <FaComment style={{ fontSize: '0.75rem' }} /> {SOCIAL.facebook.comments}
            </FBActionItem>
            <FBActionItem>
              <FaShare style={{ fontSize: '0.75rem' }} /> {SOCIAL.facebook.shares}
            </FBActionItem>
          </FBActions>
        </FBEngagement>
      </FBInner>
    </CardLink>
  </CardBase>
);

// =============================================
// INSTAGRAM CARD COMPONENT
// =============================================

const InstagramCard: React.FC = () => (
  <CardBase
    $accentColor={T.instagram}
    $accentGradient="linear-gradient(90deg, #405DE6, #833AB4, #E4405F, #FCAF45)"
  >
    <CardLink
      href={SOCIAL.instagram.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View SwanStudios on Instagram"
    >
      <div style={{ padding: '0.65rem 1rem 0', display: 'flex', justifyContent: 'flex-end' }}>
        <PlatformBadge $color={T.instagram} $bg={`${T.instagram}15`}>
          <FaInstagram /> Instagram
        </PlatformBadge>
      </div>

      <IGHeader>
        <IGHeaderLeft>
          <IGAvatarRing>
            <IGAvatarImg src={SOCIAL.instagram.avatar} alt="" loading="lazy" />
          </IGAvatarRing>
          <IGHandle>{SOCIAL.instagram.handle}</IGHandle>
        </IGHeaderLeft>
      </IGHeader>

      <IGImageWrap>
        <IGImage
          src={SOCIAL.instagram.image}
          alt={SOCIAL.instagram.caption}
          loading="lazy"
        />
      </IGImageWrap>

      <IGActions>
        <IGActionsLeft>
          <FaHeart style={{ color: '#ED4956' }} />
          <FaRegComment />
          <FaRegPaperPlane />
        </IGActionsLeft>
        <IGBookmark>
          <FaRegBookmark />
        </IGBookmark>
      </IGActions>

      <IGContent>
        <IGLikes>{SOCIAL.instagram.likes.toLocaleString()} likes</IGLikes>
        <IGCaption>
          <strong>{SOCIAL.instagram.handle}</strong>
          {SOCIAL.instagram.caption}{' '}
          <IGHashtags>{SOCIAL.instagram.hashtags}</IGHashtags>
        </IGCaption>
        <IGCommentCount>
          View all {SOCIAL.instagram.comments} comments
        </IGCommentCount>
        <IGTimestamp>{SOCIAL.instagram.timestamp}</IGTimestamp>
      </IGContent>
    </CardLink>
  </CardBase>
);

// =============================================
// YOUTUBE CARD COMPONENT
// =============================================

const YouTubeCard: React.FC = () => (
  <CardBase $accentColor={T.youtube}>
    <CardLink
      href={SOCIAL.youtube.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Watch SwanStudios on YouTube"
    >
      <div style={{ padding: '0.65rem 1rem 0', display: 'flex', justifyContent: 'flex-end' }}>
        <PlatformBadge $color={T.youtube} $bg={`${T.youtube}15`}>
          <FaYoutube /> YouTube
        </PlatformBadge>
      </div>

      <div style={{ padding: '0.5rem 0 0' }}>
        <YTThumbWrap>
          <YTThumbImg
            src={SOCIAL.youtube.thumbnail}
            alt={SOCIAL.youtube.title}
            loading="lazy"
          />
          <YTPlayOverlay>
            <YTPlayButton>
              <FaPlay />
            </YTPlayButton>
          </YTPlayOverlay>
          <YTDuration>{SOCIAL.youtube.duration}</YTDuration>
        </YTThumbWrap>
      </div>

      <YTContent>
        <YTTitle>{SOCIAL.youtube.title}</YTTitle>

        <YTChannel>
          <YTChannelAvatar>
            <img src={SOCIAL.youtube.avatar} alt="" loading="lazy" />
          </YTChannelAvatar>
          <YTChannelInfo>
            <YTChannelName>{SOCIAL.youtube.channelName}</YTChannelName>
            <YTSubscribers>{SOCIAL.youtube.subscribers} subscribers</YTSubscribers>
          </YTChannelInfo>
        </YTChannel>

        <YTMeta>
          <span>{SOCIAL.youtube.views} views</span>
          <span>·</span>
          <span>{SOCIAL.youtube.timestamp}</span>
        </YTMeta>

        <YTEngagement>
          <YTEngagementItem>
            <FaThumbsUp style={{ fontSize: '0.8rem' }} /> {SOCIAL.youtube.likes.toLocaleString()}
          </YTEngagementItem>
          <YTEngagementItem>
            <FaComment style={{ fontSize: '0.75rem' }} /> 47
          </YTEngagementItem>
        </YTEngagement>
      </YTContent>
    </CardLink>
  </CardBase>
);

// =============================================
// MAIN SOCIAL FEED COMPONENT
// =============================================

const SocialFeed: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const prefersReducedMotion = useReducedMotion();

  const titleVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: prefersReducedMotion ? 0 : 0.6, ease: 'easeOut' },
    },
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.15,
        delayChildren: prefersReducedMotion ? 0 : 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: 'easeOut',
      },
    },
  };

  const linksVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.5,
        delay: prefersReducedMotion ? 0 : 0.6,
      },
    },
  };

  // id="instagram" kept for backward-compat anchor links
  return (
    <SectionContainer id="instagram" ref={ref} aria-label="Follow Our Journey">
      <BackgroundGlow />

      <ContentWrapper>
        <SectionHeader>
          <SectionTitle
            variants={titleVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
          >
            Follow Our Journey
          </SectionTitle>
          <SectionSubtitle
            variants={titleVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
          >
            Training insights, client transformations, and behind-the-scenes
            content across our social channels.
          </SectionSubtitle>
        </SectionHeader>

        <FeedGrid
          variants={gridVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <motion.div variants={cardVariants}>
            <FacebookCard />
          </motion.div>
          <motion.div variants={cardVariants}>
            <InstagramCard />
          </motion.div>
          <motion.div variants={cardVariants}>
            <YouTubeCard />
          </motion.div>
        </FeedGrid>

        <PlatformLinks
          variants={linksVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <PlatformIconLink
            href={SOCIAL.facebook.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow SwanStudios on Facebook"
            $color={T.facebook}
          >
            <FaFacebookF />
          </PlatformIconLink>
          <PlatformIconLink
            href={SOCIAL.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow SwanStudios on Instagram"
            $color={T.instagram}
          >
            <FaInstagram />
          </PlatformIconLink>
          <PlatformIconLink
            href={SOCIAL.youtube.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Subscribe to SwanStudios on YouTube"
            $color={T.youtube}
          >
            <FaYoutube />
          </PlatformIconLink>
        </PlatformLinks>
      </ContentWrapper>
    </SectionContainer>
  );
};

export default SocialFeed;
