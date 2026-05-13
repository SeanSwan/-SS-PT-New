/**
 * VerticalReels — TikTok/Instagram Reels-style vertical video feed
 * Full-screen vertical swipe through video posts from the social feed.
 * Supports touch swipe on mobile and scroll/keyboard on desktop.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageSquare, Share, Volume2, VolumeX, Play, ChevronUp, ChevronDown } from 'lucide-react';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import {
  ActionBar,
  ActionButton,
  Avatar,
  ContentLeft,
  ContentOverlay,
  DefaultBackground,
  Dot,
  EmptyState,
  ImageWrapper,
  MuteButton,
  NavHintBtn,
  NavHints,
  PostContent,
  ProgressDots,
  ReelSlide,
  ReelsContainer,
  TypeBadge,
  UserName,
  UserRow,
  VideoWrapper,
} from './VerticalReels.styles';

// ─── Keyframes ──────────────────────────────────────────────────
// ─── Styled Components ──────────────────────────────────────────
// ─── Component ──────────────────────────────────────────────────
const VerticalReels: React.FC = () => {
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
