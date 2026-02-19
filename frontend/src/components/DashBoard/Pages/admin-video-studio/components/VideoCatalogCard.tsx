/**
 * VideoCatalogCard.tsx
 * ====================
 * Reusable card component for displaying a video in the library grid.
 * Shows thumbnail, title, source/status badges, visibility icon,
 * view count, and duration with hover animations.
 */

import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  Eye, Globe, Lock, Link2, Clock, Youtube, Upload,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
export interface VideoCard {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  source: 'youtube' | 'upload';
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'members_only' | 'unlisted';
  viewCount: number;
  durationSeconds: number;
}

interface VideoCatalogCardProps {
  video: VideoCard;
  onClick: (id: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

// ── Styled Components ──────────────────────────────────────────────────────
const Card = styled(motion.div)`
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.25s;
  position: relative;

  &:hover {
    border-color: rgba(0, 255, 255, 0.5);
  }
`;

const ThumbnailWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
`;

const Thumbnail = styled.div<{ $src?: string | null }>`
  width: 100%;
  height: 100%;
  background: ${p =>
    p.$src
      ? `url(${p.$src}) center/cover no-repeat`
      : 'linear-gradient(135deg, rgba(30, 58, 138, 0.5) 0%, rgba(0, 255, 255, 0.08) 100%)'};
`;

const DurationBadge = styled.span`
  position: absolute;
  bottom: 6px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.75);
  color: #e2e8f0;
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const CardBody = styled.div`
  padding: 0.85rem;
`;

const TitleText = styled.h3`
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 0.5rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
`;

const Badge = styled.span<{ $color: string; $bg: string; $border: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: ${p => p.$color};
  background: ${p => p.$bg};
  border: 1px solid ${p => p.$border};
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #64748b;
  font-size: 0.78rem;
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
`;

// ── Badge config ───────────────────────────────────────────────────────────
const SOURCE_BADGES = {
  youtube: { label: 'YouTube', color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', icon: Youtube },
  upload: { label: 'Upload', color: '#93c5fd', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', icon: Upload },
};

const STATUS_BADGES = {
  draft: { label: 'Draft', color: '#fde047', bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)' },
  published: { label: 'Published', color: '#4ade80', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)' },
  archived: { label: 'Archived', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)' },
};

const VISIBILITY_ICONS = {
  public: { icon: Globe, label: 'Public' },
  members_only: { icon: Lock, label: 'Members Only' },
  unlisted: { icon: Link2, label: 'Unlisted' },
};

// ── Component ──────────────────────────────────────────────────────────────
const VideoCatalogCard: React.FC<VideoCatalogCardProps> = ({ video, onClick }) => {
  const source = SOURCE_BADGES[video.source];
  const status = STATUS_BADGES[video.status];
  const vis = VISIBILITY_ICONS[video.visibility];
  const VisIcon = vis.icon;
  const SourceIcon = source.icon;

  return (
    <Card
      whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(0, 255, 255, 0.15)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(video.id)}
      role="button"
      tabIndex={0}
      aria-label={`${video.title} - ${status.label} ${source.label} video`}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(video.id);
        }
      }}
    >
      {/* Thumbnail */}
      <ThumbnailWrap>
        <Thumbnail $src={video.thumbnailUrl} />
        {video.durationSeconds > 0 && (
          <DurationBadge>
            <Clock size={10} />
            {formatDuration(video.durationSeconds)}
          </DurationBadge>
        )}
      </ThumbnailWrap>

      {/* Body */}
      <CardBody>
        <TitleText title={video.title}>{video.title}</TitleText>

        <BadgeRow>
          <Badge $color={source.color} $bg={source.bg} $border={source.border}>
            <SourceIcon size={11} /> {source.label}
          </Badge>
          <Badge $color={status.color} $bg={status.bg} $border={status.border}>
            {status.label}
          </Badge>
        </BadgeRow>

        <MetaRow>
          <MetaItem>
            <Eye size={13} />
            {formatViews(video.viewCount)}
          </MetaItem>
          <MetaItem title={vis.label}>
            <VisIcon size={13} />
            {vis.label}
          </MetaItem>
        </MetaRow>
      </CardBody>
    </Card>
  );
};

export default VideoCatalogCard;
