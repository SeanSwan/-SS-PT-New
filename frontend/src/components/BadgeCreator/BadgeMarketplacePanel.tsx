/**
 * ┌─── COMPONENT: BadgeMarketplacePanel ────────────────────────┐
 * │ PURPOSE: Browse & share badges in the marketplace.          │
 * │ Admin can share own badges or claim shared ones.            │
 * │ PHASE 3: Badge marketplace (share/claim, no currency).      │
 * │ CEO RULING: Simple share/clone model, no trading currency.  │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Share2, Download, Image, Loader, ShoppingBag,
  CheckCircle, X,
} from 'lucide-react';
import apiService from '../../services/api.service';

// ── Types ──
interface MarketBadge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: string;
  isAnimated: boolean;
  createdAt: string;
}

// ── Rarity styling ──
const legendaryGlow = keyframes`
  0% { border-color: #C6A84B; box-shadow: 0 0 8px rgba(198, 168, 75, 0.3); }
  33% { border-color: #8B5CF6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.3); }
  66% { border-color: #60C0F0; box-shadow: 0 0 8px rgba(96, 192, 240, 0.3); }
  100% { border-color: #C6A84B; box-shadow: 0 0 8px rgba(198, 168, 75, 0.3); }
`;

const RARITY_BORDERS: Record<string, string> = {
  common: '2px solid rgba(64, 112, 192, 0.4)',
  rare: '2px solid rgba(198, 168, 75, 0.6)',
  epic: '2px solid rgba(139, 92, 246, 0.6)',
  legendary: '2px solid #C6A84B',
};

const RARITY_COLORS: Record<string, string> = {
  common: '#4070C0',
  rare: '#C6A84B',
  epic: '#8B5CF6',
  legendary: '#C6A84B',
};

// ── Styled Components ──
const Panel = styled.div`padding: 0;`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
`;

const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const Count = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
`;

const Card = styled.div<{ $rarity: string }>`
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: ${({ $rarity }) => RARITY_BORDERS[$rarity] || RARITY_BORDERS.common};
  ${({ $rarity }) => $rarity === 'legendary' ? `animation: ${legendaryGlow} 3s ease-in-out infinite;` : ''}
  overflow: hidden;
  transition: transform 0.15s;
  &:hover { transform: translateY(-2px); }
`;

const CardImg = styled.div`
  width: 100%;
  aspect-ratio: 1;
  background: rgba(10, 10, 15, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  img { width: 100%; height: 100%; object-fit: contain; }
`;

const CardBody = styled.div`padding: 12px;`;

const CardName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RarityTag = styled.span<{ $rarity: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ $rarity }) => RARITY_COLORS[$rarity] || '#4070C0'};
`;

const ClaimBtn = styled.button`
  min-height: 44px;
  width: 100%;
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #002060, #8B5CF6);
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 16px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  gap: 8px;
`;

const StatusBanner = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ $type }) => $type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'};
  border: 1px solid ${({ $type }) => $type === 'success' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'};
  color: ${({ $type }) => $type === 'success' ? '#10B981' : '#EF4444'};
`;

const BadgeMarketplacePanel: React.FC = () => {
  const [badges, setBadges] = useState<MarketBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMarketplace = useCallback(async () => {
    try {
      const res = await apiService.get<{ success: boolean; data: MarketBadge[] }>('/api/admin/badge-creator/marketplace');
      const d = res.data;
      if (d.success) setBadges(d.data);
    } catch { /* best-effort */ }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchMarketplace(); }, [fetchMarketplace]);

  const handleClaim = async (badgeId: string, badgeName: string) => {
    setClaiming(badgeId);
    setStatus(null);
    try {
      const res = await apiService.post<{ success: boolean; message?: string }>(`/api/admin/badge-creator/marketplace/claim/${badgeId}`, undefined, {
        validateStatus: status => status < 500,
      });
      const d = res.data;
      if (d.success) {
        setStatus({ type: 'success', text: `Claimed "${badgeName}"! Check your gallery.` });
      } else {
        setStatus({ type: 'error', text: d.message || 'Claim failed' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error' });
    }
    setClaiming(null);
  };

  if (loading) {
    return (
      <LoadingState>
        <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Loading marketplace...
      </LoadingState>
    );
  }

  return (
    <Panel>
      <Header>
        <ShoppingBag size={18} color="var(--accent-primary, #60C0F0)" />
        <Title>Badge Marketplace</Title>
        <Count>{badges.length} shared</Count>
      </Header>

      {status && (
        <StatusBanner $type={status.type}>
          {status.type === 'success' ? <CheckCircle size={14} /> : <X size={14} />}
          {status.text}
        </StatusBanner>
      )}

      {badges.length === 0 ? (
        <EmptyState>
          <Share2 size={36} style={{ marginBottom: 8, opacity: 0.3 }} />
          <div>No shared badges yet</div>
          <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
            Share badges from the Gallery tab to list them here
          </div>
        </EmptyState>
      ) : (
        <Grid>
          {badges.map(badge => (
            <Card key={badge.id} $rarity={badge.rarity}>
              <CardImg>
                {badge.imageUrl ? (
                  <img src={badge.imageUrl} alt={badge.name} />
                ) : (
                  <Image size={32} style={{ opacity: 0.3 }} />
                )}
              </CardImg>
              <CardBody>
                <CardName>{badge.name}</CardName>
                <RarityTag $rarity={badge.rarity}>{badge.rarity}</RarityTag>
                <ClaimBtn
                  onClick={() => handleClaim(badge.id, badge.name)}
                  disabled={claiming === badge.id}
                >
                  <Download size={14} />
                  {claiming === badge.id ? 'Claiming...' : 'Claim Badge'}
                </ClaimBtn>
              </CardBody>
            </Card>
          ))}
        </Grid>
      )}
    </Panel>
  );
};

export default BadgeMarketplacePanel;
