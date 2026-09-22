/**
 * COMPONENT: SpotlightRail
 * PURPOSE: S3 Swan Spotlight rail — the client-facing end of the SwanGuard bridge
 *          (MEGA-BLUEPRINT §5 wireframe, §6 S3).
 *
 * WHAT IT DOES: reads GET /api/social/spotlights (max 3 live items, server-capped),
 * renders them as ice-cyan editorial cards in the Home rail, and lets the member dismiss
 * one item or mute the rail entirely.
 *
 * DESIGN CONSTRAINTS (enforced here, not just documented):
 *  - Editorial, never social: no like, comment, or share-count affordance exists.
 *  - Ice-cyan chrome only — gold means "earned" and purple means "AI coach" (ban #8).
 *  - Zero items renders NOTHING, not an empty box.
 *  - Dismiss/mute persist in localStorage and are honest: muted means no render at all,
 *    no nagging, no dark patterns.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { sanitizeLinkHref } from '../../../utils/linkUrl';
import {
  CuratedBy,
  DismissButton,
  MuteButton,
  RailHeader,
  RailSection,
  RailStatus,
  RailTitle,
  SourceChip,
  SpotlightCard,
  SpotlightDek,
  SpotlightFoot,
  SpotlightHeadline,
  SpotlightImage,
} from './SpotlightRail.styles';

export const SPOTLIGHT_MUTE_KEY = 'swan.spotlight.muted';
export const SPOTLIGHT_DISMISS_KEY = 'swan.spotlight.dismissed';

export interface SpotlightItem {
  itemId: string;
  headline: string;
  dek?: string | null;
  imageUrl?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  curatorNote?: string | null;
}

const readDismissed = (): string[] => {
  try {
    const raw = localStorage.getItem(SPOTLIGHT_DISMISS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const readMuted = (): boolean => {
  try {
    return localStorage.getItem(SPOTLIGHT_MUTE_KEY) === 'true';
  } catch {
    return false;
  }
};

const SpotlightRail: React.FC = () => {
  const { authAxios } = useAuth();
  const [items, setItems] = useState<SpotlightItem[] | null>(null);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const [muted, setMuted] = useState<boolean>(readMuted);

  useEffect(() => {
    if (muted) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authAxios.get('/api/social/spotlights');
        if (cancelled) return;
        const payload = res.data;
        // enabled:false is a silent kill switch, not an error state.
        setItems(payload?.enabled === false ? [] : payload?.spotlights ?? []);
      } catch {
        // A rail is ambient. If it fails, it simply does not appear.
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authAxios, muted]);

  const dismiss = useCallback((itemId: string) => {
    setDismissed((prev) => {
      const next = prev.includes(itemId) ? prev : [...prev, itemId];
      try {
        localStorage.setItem(SPOTLIGHT_DISMISS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — the in-memory dismissal still applies this session */
      }
      return next;
    });
  }, []);

  const mute = useCallback(() => {
    setMuted(true);
    try {
      localStorage.setItem(SPOTLIGHT_MUTE_KEY, 'true');
    } catch {
      /* see above */
    }
  }, []);

  if (muted || items === null) return null;

  const visible = items.filter((item) => !dismissed.includes(item.itemId));
  if (visible.length === 0) return null;

  return (
    <RailSection aria-label="Swan Spotlight" data-testid="spotlight-rail">
      <RailHeader>
        <RailTitle>
          <Sparkles size={13} /> Swan Spotlight
        </RailTitle>
        <MuteButton type="button" onClick={mute} aria-label="Hide Swan Spotlight">
          Hide
        </MuteButton>
      </RailHeader>

      {visible.map((item) => {
        // The source link is publisher-supplied and arrives through the HMAC-signed bridge
        // stored unvalidated (`bridgeIngestRoutes.mjs` `sourceUrl: str(source.url, 2048)`).
        // React 18 renders a `javascript:` href unchanged, so the scheme is allowlisted
        // here, at the sink. A refused URL degrades to the plain <span> below — the source
        // NAME still renders, so the reader loses a click, not the attribution.
        const safeSourceUrl = sanitizeLinkHref(item.sourceUrl);
        return (
        <SpotlightCard key={item.itemId} data-testid="spotlight-card">
          <DismissButton
            type="button"
            onClick={() => dismiss(item.itemId)}
            aria-label={`Dismiss: ${item.headline}`}
          >
            <X size={16} />
          </DismissButton>

          {item.imageUrl ? <SpotlightImage src={item.imageUrl} alt="" loading="lazy" /> : null}

          <SpotlightHeadline>{item.headline}</SpotlightHeadline>
          {item.dek ? <SpotlightDek>{item.dek}</SpotlightDek> : null}

          <SpotlightFoot>
            {item.sourceName ? (
              safeSourceUrl ? (
                <SourceChip href={safeSourceUrl} target="_blank" rel="noopener noreferrer">
                  {item.sourceName}
                </SourceChip>
              ) : (
                <span>{item.sourceName}</span>
              )
            ) : null}
            <CuratedBy>Curated by Swan</CuratedBy>
          </SpotlightFoot>
        </SpotlightCard>
        );
      })}

      {visible.some((item) => item.curatorNote) ? (
        <RailStatus>{visible.find((item) => item.curatorNote)?.curatorNote}</RailStatus>
      ) : null}
    </RailSection>
  );
};

export default SpotlightRail;
