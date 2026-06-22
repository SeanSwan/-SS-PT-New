/**
 * VerticalReels - dashboard/standalone vertical media viewer for real social posts.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import { useToast } from '../../../hooks/use-toast';
import {
  Avatar,
  ContentLeft,
  ContentOverlay,
  DefaultBackground,
  Dot,
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
import VerticalReelsActions from './VerticalReelsActions';
import VerticalReelsStatus from './VerticalReelsStatus';
import {
  buildMediaReels,
  getCommentsPreview,
  getDisplayName,
  isTextEntryTarget,
  isVideoPost,
  safeCount,
  type ReelPost,
} from './VerticalReels.model';

interface VerticalReelsProps {
  frame?: 'standalone' | 'dashboard';
}

const VerticalReels: React.FC<VerticalReelsProps> = ({ frame = 'standalone' }) => {
  const {
    posts,
    isLoading,
    error,
    refreshPosts,
    likePost,
    unlikePost,
    loadComments,
  } = useSocialFeed();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const mediaPosts = useMemo(() => buildMediaReels(posts), [posts]);
  const currentItem = mediaPosts[currentIndex];

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(mediaPosts.length - 1, 0)));
  }, [mediaPosts.length]);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= mediaPosts.length) return;

    const prevVideo = videoRefs.current.get(currentIndex);
    prevVideo?.pause();
    setCurrentIndex(idx);

    window.setTimeout(() => {
      const newVideo = videoRefs.current.get(idx);
      if (!newVideo) return;
      newVideo.currentTime = 0;
      newVideo.muted = muted;
      void newVideo.play().catch(() => {});
    }, 80);
  }, [currentIndex, mediaPosts.length, muted]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target) || mediaPosts.length < 2) return;
      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault();
        goNext();
      }
      if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault();
        goPrev();
      }
      if (event.key === 'm') setMuted((value) => !value);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, mediaPosts.length]);

  const handleTouchStart = (event: React.TouchEvent) => {
    setTouchStart(event.touches[0].clientY);
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - event.changedTouches[0].clientY;
    if (Math.abs(diff) > 60) (diff > 0 ? goNext : goPrev)();
    setTouchStart(null);
  };

  const handleWheel = useCallback((event: WheelEvent) => {
    if (mediaPosts.length < 2 || Math.abs(event.deltaY) <= 30) return;
    event.preventDefault();
    (event.deltaY > 0 ? goNext : goPrev)();
  }, [goNext, goPrev, mediaPosts.length]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const toggleMute = () => {
    setMuted((value) => {
      const nextMuted = !value;
      const video = videoRefs.current.get(currentIndex);
      if (video) video.muted = nextMuted;
      return nextMuted;
    });
  };

  const handleComments = (post: ReelPost) => {
    const opening = commentsPostId !== post.id;
    setCommentsPostId(opening ? post.id : null);
    if (opening && (post.comments?.length ?? 0) === 0 && safeCount(post.commentsCount) > 0) {
      void loadComments(post.id);
    }
  };

  const handleShare = (postId: string) => {
    const shareUrl = `${window.location.origin}/social/posts/${postId}`;
    void (async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Reel link copied',
          description: 'The post link is ready to share.',
          variant: 'success',
        });
      } catch {
        toast({
          title: 'Share failed',
          description: 'Copy was not available in this browser.',
          variant: 'destructive',
        });
      }
    })();
  };

  if (isLoading && mediaPosts.length === 0) {
    return (
      <VerticalReelsStatus
        frame={frame}
        busy
        icon={<Loader2 size={46} className="reels-status-spin" aria-hidden="true" />}
        title="Loading Reels"
        copy="Pulling your latest community media into the reel stack."
      />
    );
  }

  if (error && mediaPosts.length === 0) {
    return (
      <VerticalReelsStatus
        frame={frame}
        busy={false}
        alert
        icon={<AlertTriangle size={46} aria-hidden="true" />}
        title="Reels need a reload"
        copy="The feed request failed before media could load. Retry the dashboard feed."
        actionLabel="Try again"
        onAction={() => void refreshPosts()}
      />
    );
  }

  if (mediaPosts.length === 0) {
    return (
      <VerticalReelsStatus
        frame={frame}
        busy={false}
        icon={<Play size={46} aria-hidden="true" />}
        title="No media reels yet"
        copy="Media posts from the community will appear here. If you just uploaded one, refresh the reel stack."
        actionLabel="Refresh reels"
        onAction={() => void refreshPosts()}
      />
    );
  }

  return (
    <ReelsContainer
      $frame={frame}
      ref={containerRef}
      role="region"
      aria-label="SwanStudios Reels"
      aria-busy={isLoading}
      tabIndex={0}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <ProgressDots aria-hidden="true">
        {mediaPosts.slice(Math.max(0, currentIndex - 4), Math.min(mediaPosts.length, currentIndex + 6)).map((_, i) => {
          const actualIndex = Math.max(0, currentIndex - 4) + i;
          return <Dot key={actualIndex} $active={actualIndex === currentIndex} />;
        })}
      </ProgressDots>

      {currentItem && isVideoPost(currentItem.post, currentItem.mediaUrl) && (
        <MuteButton type="button" onClick={toggleMute} aria-label={muted ? 'Unmute reel' : 'Mute reel'}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </MuteButton>
      )}

      <NavHints aria-label="Reel navigation">
        <NavHintBtn type="button" onClick={goPrev} disabled={currentIndex === 0} aria-label="Previous reel">
          <ChevronUp size={18} />
        </NavHintBtn>
        <NavHintBtn
          type="button"
          onClick={goNext}
          disabled={currentIndex === mediaPosts.length - 1}
          aria-label="Next reel"
        >
          <ChevronDown size={18} />
        </NavHintBtn>
      </NavHints>

      {mediaPosts.map(({ post, mediaUrl }, idx) => {
        if (Math.abs(idx - currentIndex) > 1) return null;

        const postIsVideo = isVideoPost(post, mediaUrl);
        const direction = idx < currentIndex ? 'up' as const : idx > currentIndex ? 'down' as const : 'none' as const;
        const displayName = getDisplayName(post);
        const commentsOpen = commentsPostId === post.id;
        const commentsText = getCommentsPreview(post);

        return (
          <ReelSlide key={post.id} $active={idx === currentIndex} $direction={direction}>
            {postIsVideo ? (
              <VideoWrapper>
                <video
                  ref={(element) => { element ? videoRefs.current.set(idx, element) : videoRefs.current.delete(idx); }}
                  src={mediaUrl}
                  loop
                  playsInline
                  muted={muted}
                  preload="metadata"
                  aria-label={`Reel by ${displayName}`}
                  onClick={() => {
                    const video = videoRefs.current.get(idx);
                    if (video) void (video.paused ? video.play() : video.pause());
                  }}
                />
              </VideoWrapper>
            ) : (
              mediaUrl ? <ImageWrapper $src={mediaUrl} /> : <DefaultBackground><img src="/Logo.png" alt="" /></DefaultBackground>
            )}

            <ContentOverlay>
              <ContentLeft>
                <TypeBadge>{post.type || 'post'}</TypeBadge>
                <UserRow>
                  <Avatar $src={post.user?.photo} />
                  <UserName>{displayName}</UserName>
                </UserRow>
                <PostContent>{post.content || 'Media update'}</PostContent>
                {commentsOpen && <PostContent as="div" role="status" aria-live="polite">{commentsText}</PostContent>}
              </ContentLeft>

              <VerticalReelsActions
                post={post}
                displayName={displayName}
                commentsOpen={commentsOpen}
                onToggleLike={() => void (post.isLiked ? unlikePost(post.id) : likePost(post.id))}
                onToggleComments={() => handleComments(post)}
                onShare={() => handleShare(post.id)}
              />
            </ContentOverlay>
          </ReelSlide>
        );
      })}
    </ReelsContainer>
  );
};

export default VerticalReels;
