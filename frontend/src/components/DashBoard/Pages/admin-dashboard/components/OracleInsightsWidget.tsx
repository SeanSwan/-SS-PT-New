/**
 * OracleInsightsWidget
 *
 * Active surfaces:
 * - AdminOverviewPanel coach/operator intelligence card
 * - Social Explore shared discovery module
 * - Teach Mode exercise research tab
 *
 * The backend Oracle routes are restricted to admins and trainers, so this
 * widget must guard client/user surfaces before making network requests.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  GraduationCap,
  Loader2,
  Newspaper,
  Play,
  RefreshCcw,
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ArticleContent,
  ArticleMeta,
  ArticleRow,
  ArticleTitle,
  CacheBadge,
  ContentArea,
  EmptyState,
  ErrorState,
  ExternalIcon,
  HeaderTitle,
  LoadingState,
  RefreshBtn,
  TabBtn,
  TabRow,
  VideoRow,
  VideoThumb,
  WidgetContainer,
  WidgetHeader,
} from './OracleInsightsWidget.styles';

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

const DEFAULT_QUERIES: Record<OracleTab, string> = {
  news: 'personal training fitness industry',
  scholar: 'resistance training exercise science',
  youtube: 'NASM exercise technique form',
};

const safeExternalHref = (link: string | null | undefined) => {
  if (typeof link !== 'string') return undefined;
  return /^https?:\/\//i.test(link) ? link : undefined;
};

const endpointForTab = (tab: OracleTab) => {
  if (tab === 'scholar') return 'scholar';
  if (tab === 'youtube') return 'youtube';
  return 'news';
};

const OracleInsightsWidget: React.FC<OracleInsightsWidgetProps> = ({
  defaultTab = 'news',
  defaultQuery,
  compact = false,
}) => {
  const { authAxios, user, loading: authLoading } = useAuth();
  const canUseOracle = user?.role === 'admin' || user?.role === 'trainer';
  const [activeTab, setActiveTab] = useState<OracleTab>(defaultTab);
  const [query, setQuery] = useState(defaultQuery || DEFAULT_QUERIES[defaultTab]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newsResults, setNewsResults] = useState<NewsArticle[]>([]);
  const [scholarResults, setScholarResults] = useState<ScholarArticle[]>([]);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastDefaultQueryRef = useRef(defaultQuery);

  const fetchData = useCallback(async (tab: OracleTab, q: string) => {
    if (!canUseOracle) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const endpoint = endpointForTab(tab);
      const res = await authAxios.get(`/api/oracle/${endpoint}`, {
        params: { q, num: compact ? 4 : 6 },
        signal: controller.signal,
      });

      if (!res.data?.success) {
        setError(res.data?.error || 'Failed to fetch Oracle insight.');
        return;
      }

      setFromCache(Boolean(res.data.fromCache));
      if (tab === 'news') setNewsResults(res.data.articles || []);
      else if (tab === 'scholar') setScholarResults(res.data.articles || []);
      else setYoutubeResults(res.data.videos || []);
    } catch (err: unknown) {
      const name = (err as Error)?.name;
      if (name === 'CanceledError' || name === 'AbortError') return;
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Oracle unavailable. Check API key configuration.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [authAxios, canUseOracle, compact]);

  useEffect(() => {
    if (!defaultQuery || defaultQuery === lastDefaultQueryRef.current) return;
    lastDefaultQueryRef.current = defaultQuery;
    setQuery(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    if (!canUseOracle) return;
    fetchData(activeTab, query);
    return () => { abortRef.current?.abort(); };
  }, [activeTab, canUseOracle, fetchData, query]);

  const handleTabChange = (tab: OracleTab) => {
    setActiveTab(tab);
    if (!defaultQuery) setQuery(DEFAULT_QUERIES[tab]);
  };

  const handleRefresh = () => {
    if (!canUseOracle) return;
    fetchData(activeTab, query);
  };

  const renderArticleLink = (
    key: React.Key,
    href: string | undefined,
    title: string,
    meta: React.ReactNode,
  ) => (
    <ArticleRow key={key} href={href} target="_blank" rel="noopener noreferrer" aria-disabled={!href}>
      <ArticleContent>
        <ArticleTitle>{title}</ArticleTitle>
        <ArticleMeta>{meta}</ArticleMeta>
      </ArticleContent>
      <ExternalIcon aria-hidden="true">
        <ExternalLink size={12} />
      </ExternalIcon>
    </ArticleRow>
  );

  const renderResults = () => {
    if (authLoading || loading) {
      return (
        <LoadingState>
          <Loader2 size={20} className="animate-spin" />
          <span>Searching fitness content...</span>
        </LoadingState>
      );
    }

    if (!canUseOracle) {
      return <EmptyState>Oracle insights are available for coaches and admins.</EmptyState>;
    }

    if (error) return <ErrorState role="alert">{error}</ErrorState>;

    if (activeTab === 'news') {
      if (newsResults.length === 0) return <EmptyState>No fitness news found.</EmptyState>;
      return newsResults.map((article, index) => renderArticleLink(
        index,
        safeExternalHref(article.link),
        article.title,
        <>{article.source} {article.date && `- ${article.date}`}</>,
      ));
    }

    if (activeTab === 'scholar') {
      if (scholarResults.length === 0) return <EmptyState>No research articles found.</EmptyState>;
      return scholarResults.map((article, index) => renderArticleLink(
        index,
        safeExternalHref(article.link),
        article.title,
        <>
          {article.authors && <span>{article.authors}</span>}
          {article.citedBy > 0 && <span>- Cited {article.citedBy}x</span>}
        </>,
      ));
    }

    if (youtubeResults.length === 0) return <EmptyState>No training videos found.</EmptyState>;
    return youtubeResults.map((video, index) => {
      const href = safeExternalHref(video.link);
      return (
        <VideoRow key={index} href={href} target="_blank" rel="noopener noreferrer" aria-disabled={!href}>
          {video.thumbnail && <VideoThumb src={video.thumbnail} alt="" loading="lazy" />}
          <ArticleContent>
            <ArticleTitle>{video.title}</ArticleTitle>
            <ArticleMeta>{video.channel} {video.length && `- ${video.length}`}</ArticleMeta>
          </ArticleContent>
        </VideoRow>
      );
    });
  };

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
          <RefreshBtn onClick={handleRefresh} disabled={loading || !canUseOracle} aria-label="Refresh">
            <RefreshCcw size={12} />
          </RefreshBtn>
        </TabRow>
      </WidgetHeader>
      {fromCache && canUseOracle && <CacheBadge>cached</CacheBadge>}
      <ContentArea>{renderResults()}</ContentArea>
    </WidgetContainer>
  );
};

export default OracleInsightsWidget;
