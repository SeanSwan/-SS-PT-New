/**
 * ============================================================================
 * FILE: OracleInsightsWidget.tsx
 * PURPOSE: Swan Oracle — fitness content feed powered by SerpAPI
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Frosted-glass widget that displays curated fitness
 * content from Google Scholar, News, and YouTube. Admin/trainer only.
 *
 * HOW IT FITS IN THE APP: Admin Dashboard → Oracle Insights panel
 * Also importable by Trainer Dashboard and TeachModeSidebar.
 *
 * ┌─── SUB-COMPONENT: OracleInsightsWidget ────────────────────┐
 * │ PARENT: AdminOverviewPanel / TrainerDashboard               │
 * │ PURPOSE: Curated fitness content feed from SerpAPI          │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────┐                     │
 * │ │ 🔮 Swan Oracle          [📰][🎓][▶️] │                     │
 * │ │ ─────────────────────────────────── │                     │
 * │ │ Article Title              source   │                     │
 * │ │ Snippet text here...       2h ago   │                     │
 * │ │ ─────────────────────────────────── │                     │
 * │ │ Article Title              source   │                     │
 * │ └──────────────────────────────────────┘                     │
 * │ Props: { defaultTab?, defaultQuery?, compact? }              │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Tab: News] → fetches GET /api/oracle/news?q=fitness        │
 * │ [Tab: Scholar] → fetches GET /api/oracle/scholar?q=exercise │
 * │ [Tab: YouTube] → fetches GET /api/oracle/youtube?q=workout  │
 * │ [Article link] → Opens in new tab                           │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Newspaper, GraduationCap, Play, RefreshCcw, ExternalLink, Loader2 } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
type OracleTab = 'news' | 'scholar' | 'youtube';

interface NewsArticle {
  title: string;
  snippet: string;
  link: string;
  source: string;
  date: string;
  thumbnail: string | null;
}

interface ScholarArticle {
  title: string;
  snippet: string;
  link: string;
  authors: string;
  citedBy: number;
}

interface YouTubeVideo {
  title: string;
  link: string;
  channel: string;
  views: number;
  length: string;
  thumbnail: string | null;
  description: string;
}

interface OracleInsightsWidgetProps {
  defaultTab?: OracleTab;
  defaultQuery?: string;
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Default Queries (fitness-only)
// ─────────────────────────────────────────────────────────────
const DEFAULT_QUERIES: Record<OracleTab, string> = {
  news: 'personal training fitness industry',
  scholar: 'resistance training exercise science',
  youtube: 'NASM exercise technique form',
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const OracleInsightsWidget: React.FC<OracleInsightsWidgetProps> = ({
  defaultTab = 'news',
  defaultQuery,
  compact = false,
}) => {
  const { authAxios } = useAuth();
  const [activeTab, setActiveTab] = useState<OracleTab>(defaultTab);
  const [query, setQuery] = useState(defaultQuery || DEFAULT_QUERIES[defaultTab]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newsResults, setNewsResults] = useState<NewsArticle[]>([]);
  const [scholarResults, setScholarResults] = useState<ScholarArticle[]>([]);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (tab: OracleTab, q: string) => {
    // Abort any in-flight request to prevent stale data overwrites
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const endpoint = tab === 'news' ? 'news' : tab === 'scholar' ? 'scholar' : 'youtube';
      const res = await authAxios.get(`/api/oracle/${endpoint}`, {
        params: { q, num: compact ? 4 : 6 },
        signal: controller.signal,
      });
      if (res.data?.success) {
        setFromCache(res.data.fromCache || false);
        if (tab === 'news') setNewsResults(res.data.articles || []);
        else if (tab === 'scholar') setScholarResults(res.data.articles || []);
        else setYoutubeResults(res.data.videos || []);
      } else {
        setError(res.data?.error || 'Failed to fetch');
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'CanceledError' || (err as Error)?.name === 'AbortError') return;
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Oracle unavailable. Check API key configuration.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [authAxios, compact]);

  useEffect(() => {
    fetchData(activeTab, query);
    return () => { abortRef.current?.abort(); };
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (tab: OracleTab) => {
    setActiveTab(tab);
    if (!defaultQuery) setQuery(DEFAULT_QUERIES[tab]);
  };

  const handleRefresh = () => fetchData(activeTab, query);

  return (
    <WidgetContainer $compact={compact}>
      <WidgetHeader>
        <HeaderTitle>Swan Oracle</HeaderTitle>
        <TabRow>
          <TabBtn $active={activeTab === 'news'} onClick={() => handleTabChange('news')} aria-label="Fitness News">
            <Newspaper size={14} />
          </TabBtn>
          <TabBtn $active={activeTab === 'scholar'} onClick={() => handleTabChange('scholar')} aria-label="Exercise Science">
            <GraduationCap size={14} />
          </TabBtn>
          <TabBtn $active={activeTab === 'youtube'} onClick={() => handleTabChange('youtube')} aria-label="Training Videos">
            <Play size={14} />
          </TabBtn>
          <RefreshBtn onClick={handleRefresh} disabled={loading} aria-label="Refresh">
            <RefreshCcw size={12} />
          </RefreshBtn>
        </TabRow>
      </WidgetHeader>

      {fromCache && <CacheBadge>cached</CacheBadge>}

      <ContentArea>
        {loading ? (
          <LoadingState>
            <Loader2 size={20} className="animate-spin" />
            <span>Searching fitness content...</span>
          </LoadingState>
        ) : error ? (
          <ErrorState>{error}</ErrorState>
        ) : activeTab === 'news' ? (
          newsResults.length === 0 ? <EmptyState>No fitness news found.</EmptyState> : (
            newsResults.map((a, i) => (
              <ArticleRow key={i} href={a.link?.startsWith('http') ? a.link : '#'} target="_blank" rel="noopener noreferrer">
                <ArticleContent>
                  <ArticleTitle>{a.title}</ArticleTitle>
                  <ArticleMeta>{a.source} {a.date && `· ${a.date}`}</ArticleMeta>
                </ArticleContent>
                <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.4 }} />
              </ArticleRow>
            ))
          )
        ) : activeTab === 'scholar' ? (
          scholarResults.length === 0 ? <EmptyState>No research articles found.</EmptyState> : (
            scholarResults.map((a, i) => (
              <ArticleRow key={i} href={a.link?.startsWith('http') ? a.link : '#'} target="_blank" rel="noopener noreferrer">
                <ArticleContent>
                  <ArticleTitle>{a.title}</ArticleTitle>
                  <ArticleMeta>
                    {a.authors && <span>{a.authors}</span>}
                    {a.citedBy > 0 && <span>· Cited {a.citedBy}×</span>}
                  </ArticleMeta>
                </ArticleContent>
                <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.4 }} />
              </ArticleRow>
            ))
          )
        ) : (
          youtubeResults.length === 0 ? <EmptyState>No training videos found.</EmptyState> : (
            youtubeResults.map((v, i) => (
              <VideoRow key={i} href={v.link?.startsWith('http') ? v.link : '#'} target="_blank" rel="noopener noreferrer">
                {v.thumbnail && <VideoThumb src={v.thumbnail} alt="" loading="lazy" />}
                <ArticleContent>
                  <ArticleTitle>{v.title}</ArticleTitle>
                  <ArticleMeta>{v.channel} {v.length && `· ${v.length}`}</ArticleMeta>
                </ArticleContent>
              </VideoRow>
            ))
          )
        )}
      </ContentArea>
    </WidgetContainer>
  );
};

export default OracleInsightsWidget;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Frosted glass design per Gemini directive
// WHY: Graphite 70% + blur(16px) + Ice Wing 15% border
// ─────────────────────────────────────────────────────────────
const shimmer = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

const WidgetContainer = styled.div<{ $compact?: boolean }>`
  background: rgba(26, 26, 36, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 14px;
  padding: ${({ $compact }) => $compact ? '12px' : '16px'};
  position: relative;

  @supports not (backdrop-filter: blur(16px)) {
    background: rgba(26, 26, 36, 0.95);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }
`;

const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const HeaderTitle = styled.h3`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  margin: 0;
`;

const TabRow = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const TabBtn = styled.button<{ $active?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(96, 192, 240, 0.1)'};
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.15)' : 'transparent'};
  color: ${({ $active }) => $active ? '#E0ECF4' : 'rgba(224, 236, 244, 0.5)'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    color: #E0ECF4;
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const RefreshBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgba(224, 236, 244, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: 4px;

  &:hover { color: var(--accent-primary, #60C0F0); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const CacheBadge = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.55rem;
  color: rgba(224, 236, 244, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(96, 192, 240, 0.15); border-radius: 2px; }
`;

const ArticleRow = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s ease;
  min-height: 44px;

  &:hover {
    background: rgba(96, 192, 240, 0.05);
  }
`;

const VideoRow = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s ease;
  min-height: 44px;

  &:hover {
    background: rgba(96, 192, 240, 0.05);
  }
`;

const VideoThumb = styled.img`
  width: 64px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
`;

const ArticleContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ArticleTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ArticleMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  color: rgba(224, 236, 244, 0.4);
  margin-top: 2px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 0;
  color: rgba(224, 236, 244, 0.5);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  animation: ${shimmer} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const ErrorState = styled.div`
  padding: 16px;
  text-align: center;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  border-left: 3px solid #C92A54;
  background: rgba(26, 26, 36, 0.5);
  border-radius: 0 8px 8px 0;
`;

const EmptyState = styled.div`
  padding: 24px;
  text-align: center;
  color: rgba(224, 236, 244, 0.4);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
`;
