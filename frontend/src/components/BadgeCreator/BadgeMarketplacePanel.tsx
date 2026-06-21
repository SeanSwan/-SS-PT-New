/**
 * COMPONENT: BadgeMarketplacePanel
 * PURPOSE: Browse and claim admin-shared badge designs.
 * DATA: Uses the protected `/api/admin/badge-creator/marketplace` routes.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Download, X } from 'lucide-react';
import apiService from '../../services/api.service';
import { safeBadgeImageUrl } from './BadgeCreatorImageSafety';
import { normalizeMarketplaceBadges, type MarketplaceBadgeRow } from './BadgeCreatorPayloadSafety';
import {
  Card,
  CardBody,
  CardImg,
  CardName,
  ClaimBtn,
  Count,
  EmptyHint,
  EmptyIcon,
  EmptyState,
  Grid,
  Header,
  HeaderIcon,
  LoadingSpinner,
  LoadingState,
  Panel,
  PlaceholderIcon,
  RarityTag,
  StatusBanner,
  Title,
} from './BadgeMarketplacePanel.styles';

type MarketBadge = MarketplaceBadgeRow;

const BADGE_MARKETPLACE_CLAIM_ERROR =
  'Unable to claim badge. Refresh the marketplace and try again.';
const BADGE_MARKETPLACE_NETWORK_ERROR =
  'Badge marketplace service is temporarily unavailable. Please try again.';
const BADGE_MARKETPLACE_LOAD_ERROR =
  'Badge marketplace could not load. Refresh and try again.';

const buildClaimPath = (badgeId: string) =>
  `/api/admin/badge-creator/marketplace/claim/${encodeURIComponent(badgeId)}`;

const BadgeMarketplacePanel: React.FC = () => {
  const [badges, setBadges] = useState<MarketBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const claimingRef = useRef<string | null>(null);

  const fetchMarketplace = useCallback(async () => {
    try {
      const res = await apiService.get<{ success: boolean; data: unknown }>('/api/admin/badge-creator/marketplace');
      const d = res.data;
      if (d.success && Array.isArray(d.data)) {
        setBadges(normalizeMarketplaceBadges(d.data));
      } else {
        setStatus({ type: 'error', text: BADGE_MARKETPLACE_LOAD_ERROR });
      }
    } catch {
      setStatus({ type: 'error', text: BADGE_MARKETPLACE_LOAD_ERROR });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchMarketplace(); }, [fetchMarketplace]);

  const handleClaim = async (badgeId: string, badgeName: string) => {
    if (claimingRef.current || claimedIds.has(badgeId)) return;
    claimingRef.current = badgeId;
    setClaiming(badgeId);
    setStatus(null);

    try {
      const res = await apiService.post<{ success: boolean }>(buildClaimPath(badgeId), undefined, {
        validateStatus: status => status < 500,
      });
      if (res.data.success) {
        setClaimedIds(prev => new Set(prev).add(badgeId));
        setStatus({ type: 'success', text: `Claimed "${badgeName}"! Check your gallery.` });
      } else {
        setStatus({ type: 'error', text: BADGE_MARKETPLACE_CLAIM_ERROR });
      }
    } catch {
      setStatus({ type: 'error', text: BADGE_MARKETPLACE_NETWORK_ERROR });
    } finally {
      claimingRef.current = null;
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <LoadingState role="status" aria-live="polite">
        <LoadingSpinner size={18} aria-hidden="true" />
        Loading marketplace...
      </LoadingState>
    );
  }

  return (
    <Panel>
      <Header>
        <HeaderIcon size={18} aria-hidden="true" />
        <Title>Badge Marketplace</Title>
        <Count>{badges.length} shared</Count>
      </Header>

      {status && (
        <StatusBanner $type={status.type} role="status" aria-live="polite">
          {status.type === 'success' ? <CheckCircle size={14} /> : <X size={14} />}
          {status.text}
        </StatusBanner>
      )}

      {badges.length === 0 ? (
        <EmptyState>
          <EmptyIcon size={36} aria-hidden="true" />
          <div>No shared badges yet</div>
          <EmptyHint>Share badges from the Gallery tab to list them here</EmptyHint>
        </EmptyState>
      ) : (
        <Grid>
          {badges.map(badge => {
            const isClaimed = claimedIds.has(badge.id);
            const isClaiming = claiming === badge.id;
            const safeImageUrl = safeBadgeImageUrl(badge.imageUrl);
            return (
              <Card key={badge.id} $rarity={badge.rarity}>
                <CardImg>
                  {safeImageUrl ? (
                    <img src={safeImageUrl} alt={badge.name} />
                  ) : (
                    <PlaceholderIcon size={32} aria-hidden="true" />
                  )}
                </CardImg>
                <CardBody>
                  <CardName>{badge.name}</CardName>
                  <RarityTag $rarity={badge.rarity}>{badge.rarity}</RarityTag>
                  <ClaimBtn
                    type="button"
                    aria-busy={isClaiming}
                    aria-label={isClaimed ? `${badge.name} already claimed` : `Claim ${badge.name}`}
                    onClick={() => void handleClaim(badge.id, badge.name)}
                    disabled={Boolean(claiming) || isClaimed}
                  >
                    {isClaimed ? <CheckCircle size={14} /> : <Download size={14} />}
                    {isClaimed ? 'Claimed' : isClaiming ? 'Claiming...' : 'Claim Badge'}
                  </ClaimBtn>
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      )}
    </Panel>
  );
};

export default BadgeMarketplacePanel;
