/**
 * GalleryStatsRow — at-a-glance studio metrics
 * ============================================
 * Compact media-first KPI tiles from GET /api/admin/gallery/stats.
 */

import React from 'react';
import styled from 'styled-components';
import { Camera, DollarSign, Image as ImageIcon, Sparkles, Users } from 'lucide-react';
import type { GalleryStats } from '../types';

interface Props {
  stats: GalleryStats | null;
}

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

const GalleryStatsRow: React.FC<Props> = ({ stats }) => {
  if (!stats) return null;
  const tiles = [
    { icon: Camera, label: 'Events', value: String(stats.totalEvents ?? 0) },
    { icon: ImageIcon, label: 'Photos', value: String(stats.totalPhotos ?? 0) },
    { icon: Users, label: 'Visitors', value: String(stats.totalVisitors ?? 0) },
    { icon: Sparkles, label: 'Enhancements', value: String(stats.totalEnhancements ?? 0) },
    { icon: DollarSign, label: 'Donations', value: usd(stats.totalDonationAmount) },
  ];

  return (
    <Row>
      {tiles.map(({ icon: Icon, label, value }) => (
        <Tile key={label}>
          <Icon size={18} aria-hidden="true" />
          <div>
            <Value>{value}</Value>
            <Label>{label}</Label>
          </div>
        </Tile>
      ))}
    </Row>
  );
};

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
`;

const Tile = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.85rem 1rem;
  background: var(--card-bg, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.14));
  border-radius: 12px;
  color: var(--accent-primary, #60c0f0);
`;

const Value = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #e0ecf4);
  line-height: 1.1;
`;

const Label = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted, #8fa3b8);
`;

export default GalleryStatsRow;
