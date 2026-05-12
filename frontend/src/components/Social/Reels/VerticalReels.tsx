/**
 * VerticalReels — TikTok/Instagram Reels-style vertical video feed
 * Full-screen vertical swipe through video posts from the social feed.
 * Supports touch swipe on mobile and scroll/keyboard on desktop.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageSquare, Share, ThumbsUp, User, Volume2, VolumeX, Play, ChevronUp, ChevronDown } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../../context/AuthContext';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import SwanIcon from '../SwanIcon';
import { sanitizeImageUrl, cssUrlValue } from '../../../utils/imageUrl';

// ─── Keyframes ──────────────────────────────────────────────────
const heartPop = keyframes`
  0% { transform: scale(0); opacity: 1; }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

// ─── Styled Components ──────────────────────────────────────────
const ReelsContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  height: calc(100vh - 180px);
  min-height: 500px;
  overflow: hidden;
  border-radius: 16px;
  background: #000;
  touch-action: pan-y;

  @media (max-width: 768px) {
    max-width: 100%;
    border-radius: 0;
    height: calc(100vh - 120px);
  }
`;

const ReelSlide = styled.div<{ $active: boolean; $direction: 'up' | 'down' | 'none' }>`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform: ${({ $active, $direction }) =>
    $active ? 'translateY(0)' :
    $direction === 'up' ? 'translateY(-100%)' : 'translateY(100%)'};
  z-index: ${({ $active }) => $active ? 2 : 1};
`;

const VideoWrapper = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;

  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const ImageWrapper = styled.div<{ $src: string }>`
  position: absolute;
  inset: 0;
  background: ${({ $src }) => {
    const safe = sanitizeImageUrl($src);
    return safe ? `url(${cssUrlValue(safe)}) center / cover no-repeat` : 'transparent';
  }};

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      transparent 40%,
      rgba(0, 0, 0, 0.6) 70%,
      rgba(0, 0, 0, 0.9) 100%
    );
  }
`;

const DefaultBackground = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #002060 0%, #001030 50%, #000A20 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      transparent 40%,
      rgba(0, 0, 0, 0.6) 70%,
      rgba(0, 0, 0, 0.9) 100%
    );
  }

  img {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    opacity: 0.3;
    filter: drop-shadow(0 0 30px rgba(96, 192, 240, 0.3));
  }
`;

const ContentOverlay = styled.div`
  position: relative;
  z-index: 3;
  padding: 20px 16px 24px;
  display: flex;
  gap: 12px;
`;

const ContentLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`;

const Avatar = styled.div<{ $src?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe
      ? `url(${cssUrlValue(safe)}) center / cover`
      : 'linear-gradient(135deg, #60C0F0, #8B5CF6)';
  }};
  flex-shrink: 0;
`;

const UserName = styled.span`
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
`;

const PostContent = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  max-height: 80px;
  overflow: hidden;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(96, 192, 240, 0.2);
  color: #60C0F0;
  border: 1px solid rgba(96, 192, 240, 0.3);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ActionBar = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
`;

const ActionButton = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: ${p => p.$active ? '#F87171' : '#fff'};
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  padding: 4px;

  svg {
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
  }

  span {
    font-size: 11px;
    font-weight: 600;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }
`;

const MuteButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 5;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NavHints = styled.div`
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: 0.4;

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavHintBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { opacity: 1; background: rgba(0, 0, 0, 0.6); }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  padding: 40px;
  gap: 16px;

  h3 { color: #fff; margin: 0; }
  p { margin: 0; font-size: 14px; }
`;

const ProgressDots = styled.div`
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  gap: 4px;
`;

const Dot = styled.div<{ $active: boolean }>`
  width: ${p => p.$active ? '16px' : '6px'};
  height: 6px;
  border-radius: 3px;
  background: ${p => p.$active ? '#fff' : 'rgba(255,255,255,0.4)'};
  transition: width 0.3s, background 0.3s;
`;

// ─── Component ──────────────────────────────────────────────────
const VerticalReels: React.FC = () => {
  const { user } = useAuth();
  const { posts, likePost } = useSocialFeed();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter to posts with media (prioritize video)
  const mediaPosts = posts.filter(p => p.mediaUrl);
  const currentPost = mediaPosts[currentIndex];

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < mediaPosts.length) {
      // Pause previous video
      const prevVideo = videoRefs.current.get(currentIndex);
      if (prevVideo) prevVideo.pause();

      setCurrentIndex(idx);

      // Play new video
      setTimeout(() => {
        const newVideo = videoRefs.current.get(idx);
        if (newVideo) {
          newVideo.currentTime = 0;
          newVideo.muted = muted;
          newVideo.play().catch(() => {});
        }
      }, 100);
    }
  }, [currentIndex, mediaPosts.length, muted]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') goNext();
      if (e.key === 'ArrowUp' || e.key === 'k') goPrev();
      if (e.key === 'm') setMuted(m => !m);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  };

  // Scroll navigation
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (Math.abs(e.deltaY) > 30) {
      if (e.deltaY > 0) goNext();
      else goPrev();
    }
  }, [goNext, goPrev]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Toggle mute
  const toggleMute = () => {
    setMuted(m => {
      const newMuted = !m;
      const video = videoRefs.current.get(currentIndex);
      if (video) video.muted = newMuted;
      return newMuted;
    });
  };

  const isVideo = (post: any) =>
    post.mediaType === 'video' || /\.(mp4|mov|webm)$/i.test(post.mediaUrl || '');

  if (mediaPosts.length === 0) {
    return (
      <ReelsContainer>
        <EmptyState>
          <Play size={48} />
          <h3>No Reels Yet</h3>
          <p>Be the first to share a photo or video! Posts with media will appear here in the Reels view.</p>
        </EmptyState>
      </ReelsContainer>
    );
  }

  return (
    <ReelsContainer
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress dots (show max 10) */}
      <ProgressDots>
        {mediaPosts.slice(
          Math.max(0, currentIndex - 4),
          Math.min(mediaPosts.length, currentIndex + 6)
        ).map((_, i) => {
          const actualIndex = Math.max(0, currentIndex - 4) + i;
          return <Dot key={actualIndex} $active={actualIndex === currentIndex} />;
        })}
      </ProgressDots>

      {/* Mute toggle for video */}
      {currentPost && isVideo(currentPost) && (
        <MuteButton onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </MuteButton>
      )}

      {/* Desktop nav hints */}
      <NavHints>
        <NavHintBtn onClick={goPrev} disabled={currentIndex === 0}>
          <ChevronUp size={18} />
        </NavHintBtn>
        <NavHintBtn onClick={goNext} disabled={currentIndex === mediaPosts.length - 1}>
          <ChevronDown size={18} />
        </NavHintBtn>
      </NavHints>

      {/* Render current + adjacent slides */}
      {mediaPosts.map((post, idx) => {
        // Only render current ± 1 for performance
        if (Math.abs(idx - currentIndex) > 1) return null;

        const postIsVideo = isVideo(post);
        const direction = idx < currentIndex ? 'up' as const : idx > currentIndex ? 'down' as const : 'none' as const;

        return (
          <ReelSlide key={post.id} $active={idx === currentIndex} $direction={direction}>
            {/* Background */}
            {postIsVideo ? (
              <VideoWrapper>
                <video
                  ref={el => { if (el) videoRefs.current.set(idx, el); }}
                  src={post.mediaUrl}
                  loop
                  playsInline
                  muted={muted}
                  preload="metadata"
                  onClick={() => {
                    const v = videoRefs.current.get(idx);
                    if (v) v.paused ? v.play() : v.pause();
                  }}
                />
              </VideoWrapper>
            ) : post.mediaUrl ? (
              <ImageWrapper $src={post.mediaUrl} />
            ) : (
              <DefaultBackground>
                <img src="/Logo.png" alt="" />
              </DefaultBackground>
            )}

            {/* Content + Actions overlay */}
            <ContentOverlay>
              <ContentLeft>
                <TypeBadge>{post.type}</TypeBadge>
                <UserRow>
                  <Avatar $src={post.user?.photo} />
                  <UserName>
                    {post.user?.firstName} {post.user?.lastName}
                  </UserName>
                </UserRow>
                <PostContent>{post.content}</PostContent>
              </ContentLeft>

              <ActionBar>
                <ActionButton
                  $active={post.isLiked}
                  onClick={() => likePost(post.id)}
                >
                  <Heart size={26} fill={post.isLiked ? 'currentColor' : 'none'} />
                  <span>{post.likesCount}</span>
                </ActionButton>

                <ActionButton>
                  <MessageSquare size={24} />
                  <span>{post.commentsCount}</span>
                </ActionButton>

                <ActionButton>
                  <Share size={22} />
                  <span>Share</span>
                </ActionButton>
              </ActionBar>
            </ContentOverlay>
          </ReelSlide>
        );
      })}
    </ReelsContainer>
  );
};

export default VerticalReels;
