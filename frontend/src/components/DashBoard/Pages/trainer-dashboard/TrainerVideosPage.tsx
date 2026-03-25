/**
 * ============================================================================
 * FILE: TrainerVideosPage.tsx
 * PURPOSE: Training video library with category filters and upload placeholder
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays a filterable grid of training videos organized
 * by category (technique, form correction, warm-up, cool-down, stretching).
 * HOW IT FITS IN THE APP: Trainer Dashboard → Videos tab
 * KEY DECISIONS: 2-col desktop / 1-col mobile grid, category filter chips, dark-first
 */
import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Video, Upload, Play, Clock, Tag } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Constants
// ─────────────────────────────────────────────────────────────
interface TrainingVideo {
  id: number;
  title: string;
  duration: string;
  category: string;
  thumbnailUrl?: string;
}

const CATEGORIES = ['All', 'Technique', 'Form Correction', 'Warm-Up', 'Cool-Down', 'Stretching'] as const;

// Placeholder data — replace with API fetch when backend supports it
const PLACEHOLDER_VIDEOS: TrainingVideo[] = [];

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const PageWrapper = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const UploadButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  background: var(--accent-secondary, #8B5CF6);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 0 16px rgba(139, 92, 246, 0.4); }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const FilterChip = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 99px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96,192,240,0.12))'};
  background: ${({ $active }) => $active ? 'rgba(96,192,240,0.12)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224,236,244,0.6))'};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const VideoCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 0 20px rgba(96,192,240,0.1); }
`;

const Thumbnail = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--bg-surface, #1A1A24);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const PlayOverlay = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(96, 192, 240, 0.2);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardBody = styled.div`padding: 16px;`;
const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 8px;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.8rem;
  color: var(--text-muted, rgba(224,236,244,0.5));
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const CategoryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  background: rgba(139, 92, 246, 0.15);
  color: var(--accent-secondary, #8B5CF6);
  font-size: 0.75rem;
  font-weight: 600;
`;

const EmptyWrapper = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 64px 24px;
`;

const EmptyIcon = styled.div`
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: var(--bg-elevated, #141419);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 8px;
`;

const EmptyText = styled.p`
  color: var(--text-muted, rgba(224,236,244,0.5));
  font-size: 0.9rem;
  margin: 0;
  max-width: 380px;
  margin: 0 auto;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const TrainerVideosPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return PLACEHOLDER_VIDEOS;
    return PLACEHOLDER_VIDEOS.filter(v => v.category === activeFilter);
  }, [activeFilter]);

  return (
    <PageWrapper>
      <HeaderRow>
        <Title><Video size={24} color="var(--accent-primary, #60C0F0)" /> Training Videos</Title>
        <UploadButton onClick={() => console.warn('TODO: implement video upload')}>
          <Upload size={18} /> Upload Video
        </UploadButton>
      </HeaderRow>

      <FilterRow>
        {CATEGORIES.map(cat => (
          <FilterChip key={cat} $active={activeFilter === cat} onClick={() => setActiveFilter(cat)}>
            {cat}
          </FilterChip>
        ))}
      </FilterRow>

      <VideoGrid>
        {filtered.length === 0 ? (
          <EmptyWrapper>
            <EmptyIcon><Video size={32} color="rgba(96,192,240,0.4)" /></EmptyIcon>
            <EmptyTitle>No training videos uploaded yet</EmptyTitle>
            <EmptyText>
              Videos help clients learn proper form between sessions.
              Upload technique demos, warm-up routines, and stretching guides.
            </EmptyText>
          </EmptyWrapper>
        ) : (
          filtered.map(video => (
            <VideoCard key={video.id}>
              <Thumbnail>
                <PlayOverlay><Play size={24} color="#60C0F0" /></PlayOverlay>
              </Thumbnail>
              <CardBody>
                <CardTitle>{video.title}</CardTitle>
                <MetaRow>
                  <MetaItem><Clock size={14} />{video.duration}</MetaItem>
                  <CategoryBadge><Tag size={12} />{video.category}</CategoryBadge>
                </MetaRow>
              </CardBody>
            </VideoCard>
          ))
        )}
      </VideoGrid>
    </PageWrapper>
  );
};

export default TrainerVideosPage;
