/**
 * ============================================================================
 * FILE: RestoreCard.tsx
 * PURPOSE: "Restore" — the off-day recovery ritual on the client home.
 *          Auto-queried, 100% real-client-data-grounded (Sean's hard law),
 *          CES-ordered checkable sequence with the Restore Ring + Wing Sweep.
 * BLUEPRINT: full panel on off-days (rest / active-recovery / unplanned);
 *   collapsed cooldown strip on training days; honest cold-start otherwise.
 *   Slot priority (Kimi H5): TodaysAssignment > Restore full > Restore strip.
 *   Every item shows block-level provenance (zero taps) + per-item why sheet
 *   (one tap on the thumbnail). Reduced-motion parity is mandatory.
 * SPEC: RECOVERY-COMPASS-OFF-DAY-SPEC-2026-07-21.md · Kimi R1 co-design.
 * ============================================================================
 */
import React, { useMemo, useState } from 'react';
import { Check, Info, Sparkles } from 'lucide-react';
import { useRestoreToday } from './useRestoreToday';
import { BLOCK_LABELS } from './RestoreCard.types';
import type { RestoreBlock, RestoreItem } from './RestoreCard.types';
import {
  Block, BlockLabel, Card, CheckButton, ColdBody, CompleteLine, CtaButton,
  GhostRow, HeaderMeta, HeaderRow, Headline, ProvenanceLine, RingWrap, Row,
  RowBody, RowDose, RowName, Sheet, SheetOverlay, StripButton, SweepOverlay,
  ThumbButton,
} from './RestoreCard.styles';

const RING_R = 16;
const RING_C = 2 * Math.PI * RING_R;

function RestoreRing({ done, total }: { done: number; total: number }) {
  const fraction = total > 0 ? done / total : 0;
  return (
    <RingWrap aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <defs>
          <linearGradient id="restore-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary, #60c0f0)" />
            <stop offset="100%" stopColor="var(--accent-glow, #8b5cf6)" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r={RING_R} fill="none" stroke="rgba(96,192,240,0.08)" strokeWidth="3" />
        <circle
          cx="20" cy="20" r={RING_R} fill="none"
          stroke="url(#restore-ring-grad)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - fraction)}
          transform="rotate(-90 20 20)"
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      {fraction >= 1 && <SweepOverlay data-testid="wing-sweep" />}
    </RingWrap>
  );
}

const HEADLINES: Record<string, string> = {
  rest: 'Restore — pull your body back',
  'active-recovery': 'Restore — pull your body back',
  unplanned: 'Restore — pull your body back',
  training: 'Restore — cooldown tools',
  'already-trained': 'Restore — cooldown tools',
  'no-plan': 'Restore — start with the foundations',
};

export interface RestoreCardProps {
  userId: unknown;
  onNavigate?: (path: string) => void;
}

const RestoreCard: React.FC<RestoreCardProps> = ({ userId, onNavigate }) => {
  const state = useRestoreToday(Boolean(userId));
  const [expanded, setExpanded] = useState(false);
  const [sheetItem, setSheetItem] = useState<RestoreItem | null>(null);
  const { data, loading, error, completed, completeItem, retry } = state;

  const allItems = useMemo(
    () => (data?.blocks || []).flatMap((block) => block.items),
    [data],
  );
  const doneCount = allItems.filter((item) => completed.has(item.exerciseId)).length;
  const allDone = allItems.length > 0 && doneCount === allItems.length;

  if (!userId) return null;

  if (loading) {
    return (
      <Card $complete={false} data-testid="restore-card-loading" aria-busy="true">
        <HeaderRow><Headline>Restore</Headline></HeaderRow>
        <GhostRow /><GhostRow style={{ marginTop: 8 }} /><GhostRow style={{ marginTop: 8 }} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card $complete={false} data-testid="restore-card-error">
        <HeaderRow><Headline>Restore is catching its breath.</Headline></HeaderRow>
        <CtaButton type="button" onClick={retry}>Retry</CtaButton>
      </Card>
    );
  }

  if (!data) return null;

  // ── Cold start: honest, never fabricated (hard law) ────────────────────────
  if (data.mode === 'cold') {
    const reason = data.coldStart?.reason;
    return (
      <Card $complete={false} data-testid="restore-card-cold">
        <HeaderRow><Headline>{HEADLINES['no-plan']}</Headline></HeaderRow>
        <ColdBody>
          {reason === 'pain-needs-coach' && (
            <>
              <span>You have an active pain report — your coach should guide recovery work directly.</span>
              <CtaButton type="button" onClick={() => onNavigate?.('/dashboard/client/messages')}>
                Message your coach
              </CtaButton>
            </>
          )}
          {reason === 'no-plan' && (
            <>
              <span>
                Restore personalizes from your movement screen and logged training.
                Complete your movement screen so your coach&apos;s protocol can build this for you.
              </span>
              <CtaButton type="button" onClick={() => onNavigate?.('/dashboard/client/coach-assistant')}>
                Complete your movement screen
              </CtaButton>
            </>
          )}
          {reason === 'library-curating' && (
            <span>Your coach&apos;s recovery library is being curated for your training — check back soon.</span>
          )}
        </ColdBody>
      </Card>
    );
  }

  // ── Training-day strip (Kimi K3): one collapsed row, assignment card wins ──
  if (data.mode === 'strip' && !expanded) {
    const stripCount = allItems.length;
    if (stripCount === 0) return null;
    return (
      <StripButton
        type="button"
        data-testid="restore-strip"
        onClick={() => setExpanded(true)}
        aria-expanded={false}
      >
        <Sparkles size={16} aria-hidden="true" />
        <span>Cooldown tools · {stripCount} {stripCount === 1 ? 'move' : 'moves'} for what you trained</span>
      </StripButton>
    );
  }

  // ── Full ritual (also the expanded strip) ─────────────────────────────────
  const headline = HEADLINES[data.dayState] || HEADLINES.unplanned;
  return (
    <Card $complete={allDone} data-testid="restore-card" aria-label="Restore recovery ritual">
      <HeaderRow>
        <RestoreRing done={doneCount} total={allItems.length} />
        <Headline>{headline}</Headline>
        <HeaderMeta>{doneCount}/{allItems.length}</HeaderMeta>
      </HeaderRow>

      {/* CC-2 "why" transparency — client-safe plain language only (two-tier copy law). */}
      {data.focus?.clientSummary && (
        <ProvenanceLine data-testid="restore-focus">{data.focus.clientSummary}</ProvenanceLine>
      )}

      {data.blocks.map((block: RestoreBlock) => (
        <Block key={block.key}>
          <BlockLabel>{BLOCK_LABELS[block.key] || block.key}</BlockLabel>
          <ProvenanceLine>{block.conflictNote || block.provenance}</ProvenanceLine>
          {block.items.map((item) => {
            const done = completed.has(item.exerciseId);
            return (
              <Row key={item.exerciseId} $done={done} $active={!done}>
                <ThumbButton
                  type="button"
                  aria-label={`Why ${item.name}? Open details`}
                  style={item.thumbnailUrl ? { backgroundImage: `url(${item.thumbnailUrl})` } : undefined}
                  onClick={() => setSheetItem(item)}
                >
                  {!item.thumbnailUrl && <Info size={16} aria-hidden="true" />}
                </ThumbButton>
                <RowBody>
                  <RowName $done={done}>{item.name}</RowName>
                  <RowDose>{item.dose}</RowDose>
                </RowBody>
                <CheckButton
                  type="button"
                  $done={done}
                  aria-pressed={done}
                  aria-label={done ? `${item.name} completed` : `Mark ${item.name} complete`}
                  onClick={() => { if (!done) void completeItem(item, block.key); }}
                >
                  <Check size={18} aria-hidden="true" />
                </CheckButton>
              </Row>
            );
          })}
        </Block>
      ))}

      {allDone && (
        <CompleteLine role="status">Ritual complete — see you tomorrow.</CompleteLine>
      )}

      {sheetItem && (
        <SheetOverlay role="dialog" aria-modal="true" aria-label={`${sheetItem.name} details`} onClick={() => setSheetItem(null)}>
          <Sheet onClick={(event) => event.stopPropagation()}>
            <Headline as="h4">{sheetItem.name}</Headline>
            {sheetItem.why.map((line) => <ProvenanceLine key={line} style={{ WebkitLineClamp: 3 }}>{line}</ProvenanceLine>)}
            <RowDose>{sheetItem.dose} · +{sheetItem.xp} XP</RowDose>
            {sheetItem.videoUrl && (
              <CtaButton type="button" onClick={() => window.open(sheetItem.videoUrl as string, '_blank', 'noopener')}>
                Watch how
              </CtaButton>
            )}
            <CtaButton type="button" onClick={() => setSheetItem(null)}>Close</CtaButton>
          </Sheet>
        </SheetOverlay>
      )}
    </Card>
  );
};

export default RestoreCard;
