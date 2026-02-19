import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Tag, Clock, Eye, Calendar } from 'lucide-react';
import VideoPlayer from '../components/video/VideoPlayer';
import WatchProgress from '../components/video/WatchProgress';
import YouTubeCTA from '../components/video/YouTubeCTA';
import MembersGateBanner from '../components/video/MembersGateBanner';
import VideoStructuredData from '../components/seo/VideoStructuredData';

const API_BASE = import.meta.env.VITE_API_URL || '';

/* ---------- helpers ---------- */

const fetchApi = async (path: string, options?: RequestInit) => {
  const token = localStorage.getItem('token');
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
};

/* ---------- types ---------- */

interface VideoData {
  id: string;
  title: string;
  slug: string;
  description: string;
  source: 'upload' | 'youtube';
  signedUrl?: string;
  captionsUrl?: string;
  youtubeVideoId?: string;
  thumbnailUrl: string;
  durationSeconds: number;
  views: number;
  tags: string[];
  chapters: { time: number; label: string }[];
  publishedAt: string;
  isPublic: boolean;
  ctaStrategy?: string;
  youtubePlaylistUrl?: string;
  progress?: { currentTime: number; completed: boolean };
}

interface RelatedVideo {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
}

type PageState = 'loading' | 'ready' | 'not_found' | 'login_required' | 'forbidden';

/* ========== Component ========== */

const VideoWatch: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<PageState>('loading');
  const [video, setVideo] = useState<VideoData | null>(null);
  const [related, setRelated] = useState<RelatedVideo[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  /* ---------- fetch video ---------- */
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      setState('loading');
      try {
        const res = await fetchApi(`/api/v2/videos/watch/${slug}`);
        if (cancelled) return;

        if (res.status === 404) { setState('not_found'); return; }
        if (res.status === 401) { setState('login_required'); return; }
        if (res.status === 403) { setState('forbidden'); return; }

        const json = await res.json();
        const data = json?.data ?? json;
        setVideo(data.video ?? data);
        setRelated(data.related ?? []);
        setCurrentTime(data.video?.progress?.currentTime ?? data.progress?.currentTime ?? 0);
        setState('ready');
      } catch {
        setState('not_found');
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  /* ---------- time update from player ---------- */
  const handleTimeUpdate = useCallback((t: number) => setCurrentTime(t), []);
  const handleSeek = useCallback((t: number) => {
    setCurrentTime(t);
    // The VideoPlayer reads initialTime from the prop, but for mid-session
    // seeks we dispatch a custom event that VideoPlayer can listen to.
    window.dispatchEvent(new CustomEvent('video-seek', { detail: t }));
  }, []);

  /* ---------- gate states ---------- */
  if (state === 'loading') {
    return (
      <PageContainer>
        <ContentArea>
          <SkeletonPlayer />
          <SkeletonText style={{ width: '60%', height: 28 }} />
          <SkeletonText style={{ width: '90%', height: 16 }} />
        </ContentArea>
      </PageContainer>
    );
  }

  if (state === 'not_found') {
    return (
      <PageContainer>
        <CenterMessage>
          <h2>Video not found</h2>
          <p>This video may have been removed or the link is incorrect.</p>
          <BackLink to="/video-library">Browse library</BackLink>
        </CenterMessage>
      </PageContainer>
    );
  }

  if (state === 'login_required') {
    return (
      <PageContainer>
        <ContentArea><MembersGateBanner reason="login_required" /></ContentArea>
      </PageContainer>
    );
  }

  if (state === 'forbidden') {
    return (
      <PageContainer>
        <ContentArea><MembersGateBanner reason="premium_required" /></ContentArea>
      </PageContainer>
    );
  }

  if (!video) return null;

  return (
    <PageContainer>
      {/* SEO structured data for public videos */}
      {video.isPublic && (
        <VideoStructuredData
          title={video.title}
          description={video.description}
          thumbnailUrl={video.thumbnailUrl}
          publishedAt={video.publishedAt}
          durationSeconds={video.durationSeconds}
          slug={video.slug}
        />
      )}

      <AnimatePresence>
        <ContentArea
          as={motion.div}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Back nav */}
          <BackButton onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={20} /> Back
          </BackButton>

          {/* Main layout */}
          <WatchLayout>
            {/* Left: player + meta */}
            <MainColumn>
              <VideoPlayer
                source={video.source}
                signedUrl={video.signedUrl}
                captionsUrl={video.captionsUrl}
                youtubeVideoId={video.youtubeVideoId}
                videoId={video.id}
                title={video.title}
                onTimeUpdate={handleTimeUpdate}
                initialTime={video.progress?.currentTime}
              />

              {video.durationSeconds > 0 && (
                <WatchProgress
                  videoId={video.id}
                  durationSeconds={video.durationSeconds}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                />
              )}

              {/* YouTube CTA */}
              {video.source === 'youtube' && video.ctaStrategy && video.youtubeVideoId && (
                <YouTubeCTA
                  videoId={video.id}
                  strategy={video.ctaStrategy}
                  youtubeVideoId={video.youtubeVideoId}
                  youtubePlaylistUrl={video.youtubePlaylistUrl}
                />
              )}

              {/* Title + meta */}
              <TitleBlock>
                <VideoTitle>{video.title}</VideoTitle>
                <MetaRow>
                  {video.durationSeconds > 0 && (
                    <MetaItem><Clock size={14} /> {formatDuration(video.durationSeconds)}</MetaItem>
                  )}
                  <MetaItem><Eye size={14} /> {video.views} views</MetaItem>
                  <MetaItem><Calendar size={14} /> {formatDate(video.publishedAt)}</MetaItem>
                </MetaRow>
              </TitleBlock>

              {video.description && <Description>{video.description}</Description>}

              {/* Tags */}
              {video.tags?.length > 0 && (
                <TagList>
                  {video.tags.map((t) => (
                    <TagPill key={t}><Tag size={12} /> {t}</TagPill>
                  ))}
                </TagList>
              )}

              {/* Chapters */}
              {video.chapters?.length > 0 && (
                <ChapterSection>
                  <SectionHeading>Chapters</SectionHeading>
                  {video.chapters.map((ch, i) => (
                    <ChapterItem key={i} onClick={() => handleSeek(ch.time)}>
                      <ChapterTime>{formatDuration(ch.time)}</ChapterTime>
                      <ChapterLabel>{ch.label}</ChapterLabel>
                    </ChapterItem>
                  ))}
                </ChapterSection>
              )}
            </MainColumn>

            {/* Right: related videos */}
            {related.length > 0 && (
              <SideColumn>
                <SectionHeading>Related Videos</SectionHeading>
                {related.map((rv) => (
                  <RelatedCard key={rv.id} to={`/watch/${rv.slug}`}>
                    <RelatedThumb>
                      <img src={rv.thumbnailUrl} alt={rv.title} loading="lazy" />
                      {rv.durationSeconds > 0 && (
                        <DurationBadge>{formatDuration(rv.durationSeconds)}</DurationBadge>
                      )}
                    </RelatedThumb>
                    <RelatedTitle>{rv.title}</RelatedTitle>
                  </RelatedCard>
                ))}
              </SideColumn>
            )}
          </WatchLayout>
        </ContentArea>
      </AnimatePresence>
    </PageContainer>
  );
};

/* ========== Styled Components ========== */

const PageContainer = styled.div`
  min-height: 100vh;
  background: #0a0a1a;
  color: rgba(255, 255, 255, 0.9);
`;

const ContentArea = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 24px 80px;

  @media (max-width: 430px) { padding: 16px 12px 60px; }
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  padding: 8px 0;
  min-height: 44px;
  margin-bottom: 16px;
  transition: color 0.2s;
  &:hover { color: #00ffff; }
`;

const WatchLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 32px;

  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const MainColumn = styled.div`
  min-width: 0;
`;

const SideColumn = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 1024px) {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }
`;

const TitleBlock = styled.div`
  margin-top: 20px;
`;

const VideoTitle = styled.h1`
  font-size: clamp(20px, 3.5vw, 32px);
  font-weight: 700;
  margin: 0 0 8px;
  color: #ffffff;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
`;

const Description = styled.p`
  font-size: 15px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.7);
  margin: 16px 0 0;
  white-space: pre-line;
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
`;

const TagPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #00ffff;
  background: rgba(0, 255, 255, 0.08);
  border: 1px solid rgba(0, 255, 255, 0.2);
`;

const SectionHeading = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (max-width: 1024px) {
    grid-column: 1 / -1;
  }
`;

/* ---- Chapters ---- */

const ChapterSection = styled.div`
  margin-top: 24px;
  padding: 16px;
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
`;

const ChapterItem = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: none;
  border: none;
  padding: 10px 8px;
  min-height: 44px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
  &:hover { background: rgba(0, 255, 255, 0.06); }
`;

const ChapterTime = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #00ffff;
  font-variant-numeric: tabular-nums;
  min-width: 48px;
`;

const ChapterLabel = styled.span`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
`;

/* ---- Related Videos ---- */

const RelatedCard = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-decoration: none;
  border-radius: 10px;
  overflow: hidden;
  transition: transform 0.2s;
  &:hover { transform: translateY(-3px); }
`;

const RelatedThumb = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(30, 58, 138, 0.15);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const DurationBadge = styled.span`
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.8);
`;

const RelatedTitle = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

/* ---- Skeletons ---- */

const pulse = `
  @keyframes skPulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.25; }
  }
`;

const SkeletonPlayer = styled.div`
  width: 100%;
  padding-top: 56.25%;
  border-radius: 12px;
  background: rgba(30, 58, 138, 0.15);
  animation: skPulse 1.5s ease infinite;
  ${pulse}
`;

const SkeletonText = styled.div`
  margin-top: 16px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  animation: skPulse 1.5s ease infinite;
  ${pulse}
`;

const CenterMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 60vh;
  padding: 24px;
  color: rgba(255, 255, 255, 0.7);

  h2 {
    font-size: 24px;
    color: #ffffff;
    margin: 0 0 8px;
  }

  p {
    margin: 0 0 24px;
  }
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 12px 28px;
  min-height: 48px;
  border-radius: 10px;
  background: linear-gradient(45deg, #3b82f6, #00ffff);
  color: #0a0a1a;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.2s;
  &:hover { transform: translateY(-2px); }
`;

export default VideoWatch;
