/**
 * YouTubeGrowthTab.tsx
 * ====================
 * YouTube import tools and outbound click analytics.
 * - Import Single Video form
 * - Import Playlist form
 * - CTA analytics preview table
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  Youtube,
  Link,
  ListVideo,
  ExternalLink,
  TrendingUp,
  ArrowRight,
  Loader2,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return res.json();
};

// ─── Types ───────────────────────────────────────────
interface OutboundRow {
  videoId: number;
  title: string;
  outboundClicks: number;
  ctr: number;
  ctaStrategy: string;
}

// ─── Styled Components ──────────────────────────────
const Container = styled.div`
  display: grid;
  gap: 24px;
`;

const Section = styled.div`
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    width: 20px;
    height: 20px;
    color: #00ffff;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: white;
  font-size: 14px;
  min-height: 44px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  &:focus {
    outline: none;
    border-color: #00ffff;
  }
`;

const Select = styled.select`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: white;
  font-size: 14px;
  min-height: 44px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }

  option {
    background: #0a0a1a;
  }
`;

const PrimaryButton = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(45deg, #3b82f6, #00ffff);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: ${(p) => (p.$loading ? 'wait' : 'pointer')};
  min-height: 44px;
  opacity: ${(p) => (p.$loading ? 0.7 : 1)};
  transition: opacity 0.2s;
  width: fit-content;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
`;

const Td = styled.td`
  padding: 12px 14px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
`;

const EmptyRow = styled.td`
  padding: 32px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
`;

const StatusMsg = styled.p<{ $error?: boolean }>`
  font-size: 14px;
  color: ${(p) => (p.$error ? '#ef4444' : '#22c55e')};
  margin: 8px 0 0;
`;

const StrategyBadge = styled.span`
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(120, 81, 169, 0.5);
  color: white;
`;

// ─── Component ───────────────────────────────────────
const YouTubeGrowthTab: React.FC = () => {
  // Single import form state
  const [videoId, setVideoId] = useState('');
  const [title, setTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [ctaStrategy, setCtaStrategy] = useState('end_screen');
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Playlist import state
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistMsg, setPlaylistMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Outbound analytics
  const [outbound, setOutbound] = useState<OutboundRow[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const fetchOutbound = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await fetchWithAuth('/api/v2/admin/video-analytics/outbound');
      setOutbound(data.data || data.rows || []);
    } catch (err) {
      console.error('Failed to fetch outbound analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutbound();
  }, [fetchOutbound]);

  const handleImportSingle = async () => {
    if (!videoId.trim()) return;
    setImportLoading(true);
    setImportMsg(null);
    try {
      const data = await fetchWithAuth('/api/v2/admin/youtube/import', {
        method: 'POST',
        body: JSON.stringify({
          youtubeVideoId: videoId.trim(),
          title: title.trim() || undefined,
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          visibility,
          ctaStrategy,
        }),
      });
      if (data.error) {
        setImportMsg({ text: data.error, error: true });
      } else {
        setImportMsg({ text: `Imported successfully: ${data.video?.title || videoId}`, error: false });
        setVideoId('');
        setTitle('');
        setThumbnailUrl('');
      }
    } catch (err: any) {
      setImportMsg({ text: err.message || 'Import failed', error: true });
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportPlaylist = async () => {
    if (!playlistUrl.trim()) return;
    setPlaylistLoading(true);
    setPlaylistMsg(null);
    try {
      const data = await fetchWithAuth('/api/v2/admin/youtube/import-playlist', {
        method: 'POST',
        body: JSON.stringify({ playlistUrl: playlistUrl.trim() }),
      });
      if (data.error) {
        setPlaylistMsg({ text: data.error, error: true });
      } else {
        setPlaylistMsg({
          text: `Playlist import started. ${data.jobCount || 0} videos queued.`,
          error: false,
        });
        setPlaylistUrl('');
      }
    } catch (err: any) {
      setPlaylistMsg({ text: err.message || 'Playlist import failed', error: true });
    } finally {
      setPlaylistLoading(false);
    }
  };

  return (
    <Container>
      {/* Single Video Import */}
      <Section>
        <SectionTitle>
          <Youtube /> Import Single Video
        </SectionTitle>
        <FormRow>
          <FormField>
            <Label>YouTube Video ID *</Label>
            <Input
              placeholder="e.g. dQw4w9WgXcQ"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
            />
          </FormField>
          <FormField>
            <Label>Title (optional)</Label>
            <Input
              placeholder="Custom title override"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>
          <FormField>
            <Label>Thumbnail URL (optional)</Label>
            <Input
              placeholder="https://..."
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
            />
          </FormField>
        </FormRow>
        <FormRow>
          <FormField>
            <Label>Visibility</Label>
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="public">Public</option>
              <option value="members_only">Members Only</option>
              <option value="private">Private</option>
            </Select>
          </FormField>
          <FormField>
            <Label>CTA Strategy</Label>
            <Select value={ctaStrategy} onChange={(e) => setCtaStrategy(e.target.value)}>
              <option value="end_screen">End Screen</option>
              <option value="pinned_comment">Pinned Comment</option>
              <option value="description_link">Description Link</option>
              <option value="overlay">Overlay</option>
              <option value="none">None</option>
            </Select>
          </FormField>
        </FormRow>
        <PrimaryButton $loading={importLoading} onClick={handleImportSingle} disabled={importLoading}>
          {importLoading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          Import Video
        </PrimaryButton>
        {importMsg && <StatusMsg $error={importMsg.error}>{importMsg.text}</StatusMsg>}
      </Section>

      {/* Playlist Import */}
      <Section>
        <SectionTitle>
          <ListVideo /> Import Playlist
        </SectionTitle>
        <FormRow>
          <FormField style={{ flex: 1 }}>
            <Label>Playlist URL</Label>
            <Input
              placeholder="https://www.youtube.com/playlist?list=..."
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
            />
          </FormField>
        </FormRow>
        <PrimaryButton $loading={playlistLoading} onClick={handleImportPlaylist} disabled={playlistLoading}>
          {playlistLoading ? <Loader2 /> : <ArrowRight />}
          Start Import
        </PrimaryButton>
        {playlistMsg && <StatusMsg $error={playlistMsg.error}>{playlistMsg.text}</StatusMsg>}
      </Section>

      {/* Outbound Analytics */}
      <Section>
        <SectionTitle>
          <TrendingUp /> Outbound Click Analytics
        </SectionTitle>
        {analyticsLoading ? (
          <EmptyRow as="p">Loading analytics...</EmptyRow>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <thead>
                <tr>
                  <Th>Video</Th>
                  <Th>CTA Strategy</Th>
                  <Th>Outbound Clicks</Th>
                  <Th>CTR</Th>
                </tr>
              </thead>
              <tbody>
                {outbound.length === 0 ? (
                  <tr>
                    <EmptyRow colSpan={4}>No outbound analytics data yet.</EmptyRow>
                  </tr>
                ) : (
                  outbound.map((row) => (
                    <tr key={row.videoId}>
                      <Td>{row.title}</Td>
                      <Td>
                        <StrategyBadge>{row.ctaStrategy}</StrategyBadge>
                      </Td>
                      <Td>{row.outboundClicks}</Td>
                      <Td>{(row.ctr * 100).toFixed(1)}%</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Section>
    </Container>
  );
};

export default YouTubeGrowthTab;
