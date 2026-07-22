/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: MuscleReadinessCard (CC-1, Mobbin plan 1.3)      ║
 * ║  PURPOSE: Read-only "Recovery estimate" board on client home  ║
 * ║           — per-muscle-group readiness from REAL logged data. ║
 * ║  OWNER: Fable 5 | LAST VALIDATED: 2026-07-22                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Honesty contract (Kimi verdict): labeled "Recovery estimate" with a one-tap explainer —
 * "based on your last sessions and restore work — your trainer makes the call." Client is
 * read-only; no training decisions offered here (indispensability law). State is encoded by
 * luminance + hatch texture + text, never color alone. Renders nothing while empty-loading
 * (the card is ambient, not load-bearing) and nothing on error (quiet degradation — the
 * home page must never look broken because an estimate is unavailable).
 */
import React, { useState } from 'react';
import { Gauge } from 'lucide-react';
import { useMuscleReadiness } from './useMuscleReadiness';
import {
  Card, HeaderRow, Title, EstimateTag, Explainer, Rows, Row,
  GroupName, BarTrack, BarFill, ReadySheen, StateLabel,
} from './MuscleReadinessCard.styles';

const STATE_TEXT: Record<'ready' | 'caution' | 'loading', string> = {
  ready: 'ready',
  caution: 'recharging',
  loading: 'resting',
};

interface MuscleReadinessCardProps {
  userId: number | string | undefined;
}

const MuscleReadinessCard: React.FC<MuscleReadinessCardProps> = ({ userId }) => {
  const { board, loading, error } = useMuscleReadiness(Boolean(userId));
  const [showExplainer, setShowExplainer] = useState(false);

  if (loading || error || !board) return null;

  return (
    <Card data-testid="muscle-readiness-card" aria-label="Recovery estimate by muscle group">
      <HeaderRow>
        <Title>
          <Gauge size={16} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Muscle readiness
        </Title>
        <EstimateTag
          type="button"
          aria-expanded={showExplainer}
          onClick={() => setShowExplainer((v) => !v)}
        >
          Recovery estimate
        </EstimateTag>
      </HeaderRow>
      {showExplainer && (
        <Explainer data-testid="readiness-explainer">
          Based on your last sessions and restore work — your trainer makes the call.
        </Explainer>
      )}
      <Rows>
        {board.groups.map(({ group, pct, state }) => (
          <Row key={group} aria-label={`${group}: ${STATE_TEXT[state]}, ${pct} percent recovered`}>
            <GroupName>{group}</GroupName>
            <BarTrack>
              <BarFill $pct={pct} $state={state} />
              {state === 'ready' && <ReadySheen aria-hidden="true" />}
            </BarTrack>
            <StateLabel $state={state}>{STATE_TEXT[state]}</StateLabel>
          </Row>
        ))}
      </Rows>
    </Card>
  );
};

export default MuscleReadinessCard;
