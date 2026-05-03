/**
 * CorrectiveRecommendationsPanel — V3c.6 (Protocol Spine)
 * ========================================================
 *
 * Crystalline Swan dark-first informational panel that surfaces the
 * V3b.3 NASM CES corrective exercise recommendations for a client's
 * OHSA compensation profile.
 *
 * Wires through the V3c chain end-to-end:
 *   V3c.4 → MovementProfile.commonCompensations
 *   V3c.2 → POST /api/workout-builder/corrective-recommendations
 *   V3c.1 → 4-step grouped registry rows
 *
 * Surface intent: trainer/admin scans this while building a workout
 * for a client. Information density and clinical trust > visual
 * exhibit. Concept direction "Protocol Spine" picked via
 * swan-design-router 2026-05-03 — Gilded Fern hairline spine + the
 * Cormorant Garamond Italic step labels turn a list into a curated
 * NASM document.
 *
 * Stack: styled-components-first, no Tailwind, no MUI. Crystalline
 * Swan tokens via the shared `WorkoutLoggerCS.CS` palette. Motion
 * is tier-2 (lean) by default — gentle stagger fade + hover row glow,
 * collapses to instant render on `prefers-reduced-motion`.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { ApiService } from '../../services/api.service';
import { CS, withAlpha, reducedMotionSafe } from './WorkoutLoggerCS';

// ─── Types ────────────────────────────────────────────────────────

export type CesProtocolStep = 'inhibit' | 'lengthen' | 'activate' | 'integrate';

export interface CorrectiveExerciseRow {
  id: string;
  name: string;
  exerciseKey: string;
  bodyPartCategory?: string;
  sourceCitation?: string;
  cesProtocolStep?: CesProtocolStep;
}

export interface CorrectiveRecommendations {
  tags: string[];
  matchedCount: number;
  inhibit: CorrectiveExerciseRow[];
  lengthen: CorrectiveExerciseRow[];
  activate: CorrectiveExerciseRow[];
  integrate: CorrectiveExerciseRow[];
}

/**
 * Compensation input. Accepts either:
 *   - string[] (e.g. `['knee_valgus', 'low_back_arch']`)
 *   - object[] in clientIntelligenceService shape
 *     (e.g. `[{ type: 'knee_valgus', avgSeverity: 7 }]`)
 *
 * The backend normalizes both. We pass through verbatim.
 */
export type CompensationInput =
  | string
  | { type: string; avgSeverity?: number; frequency?: number; trend?: string };

interface Props {
  clientId: number;
  compensations: CompensationInput[];
  /**
   * Optional restriction to a subset of CES steps. Defaults to all
   * four. Useful when a parent surface only wants warmup-relevant
   * steps (inhibit + lengthen).
   */
  includeSteps?: CesProtocolStep[];
  /**
   * Optional title override. Default: "Corrective Recommendations".
   */
  title?: string;
  /**
   * Optional subtitle override — the panel auto-derives a description
   * from the compensation list, but a parent surface can supply one.
   */
  subtitle?: string;
  className?: string;
}

// ─── Step display config ──────────────────────────────────────────

const STEP_ORDER: CesProtocolStep[] = ['inhibit', 'lengthen', 'activate', 'integrate'];

const STEP_LABELS: Record<CesProtocolStep, string> = {
  inhibit: 'Inhibit',
  lengthen: 'Lengthen',
  activate: 'Activate',
  integrate: 'Integrate',
};

const STEP_DESCRIPTIONS: Record<CesProtocolStep, string> = {
  inhibit: 'Self-myofascial release for over-active tissue',
  lengthen: 'Static stretches for tight, shortened muscles',
  activate: 'Isolated drills for under-active stabilizers',
  integrate: 'Whole-chain integration patterns under load',
};

// ─── Animations ───────────────────────────────────────────────────

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Styled components ───────────────────────────────────────────

const Container = styled.section`
  position: relative;
  background: ${CS.cardSolid};
  background: linear-gradient(180deg, ${withAlpha('#141419', 0.92)} 0%, ${withAlpha('#1A1A24', 0.88)} 100%);
  border: 1px solid ${withAlpha('#C6A84B', 0.18)};
  border-radius: 14px;
  padding: 24px 24px 16px;
  color: ${CS.text};
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  box-shadow: 0 1px 0 ${withAlpha('#C6A84B', 0.08)} inset,
              0 18px 48px ${withAlpha('#0A0A0F', 0.45)};

  @media (max-width: 640px) {
    padding: 18px 16px 12px;
    border-radius: 12px;
  }
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${withAlpha('#60C0F0', 0.12)};
  margin-bottom: 18px;
`;

const Title = styled.h3`
  font-family: 'Cormorant Garamond', 'Plus Jakarta Sans', serif;
  font-style: italic;
  font-weight: 500;
  font-size: clamp(20px, 2.4vw, 26px);
  letter-spacing: 0.01em;
  margin: 0;
  color: ${CS.text};
  line-height: 1.15;
`;

const Subtitle = styled.p`
  font-size: 13.5px;
  line-height: 1.45;
  color: ${CS.textMuted};
  margin: 0;
  max-width: 70ch;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const TagChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${CS.text};
  background: ${withAlpha('#8B5CF6', 0.14)};
  border: 1px solid ${withAlpha('#8B5CF6', 0.32)};
  border-radius: 999px;
  font-family: 'Fira Code', ui-monospace, monospace;
`;

/* The vertical Gilded Fern spine — the panel's signature moment. */
const Spine = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1px 1fr;
  gap: 0 22px;

  &::before {
    content: '';
    grid-column: 1;
    grid-row: 1 / -1;
    width: 1px;
    background: linear-gradient(
      180deg,
      ${withAlpha('#C6A84B', 0.0)}  0%,
      ${withAlpha('#C6A84B', 0.6)}  12%,
      ${withAlpha('#C6A84B', 0.85)} 50%,
      ${withAlpha('#C6A84B', 0.6)}  88%,
      ${withAlpha('#C6A84B', 0.0)}  100%
    );
  }

  @media (max-width: 480px) {
    gap: 0 16px;
  }
`;

const StepBlock = styled.div<{ $idx: number }>`
  grid-column: 2;
  padding: 10px 0 22px;
  ${reducedMotionSafe}
  animation: ${fadeInUp} 320ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
  animation-delay: ${({ $idx }) => 60 + $idx * 70}ms;

  &:last-child { padding-bottom: 4px; }
`;

const StepHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
`;

const StepLabel = styled.h4`
  font-family: 'Cormorant Garamond', 'Plus Jakarta Sans', serif;
  font-style: italic;
  font-weight: 500;
  font-size: clamp(18px, 2vw, 22px);
  letter-spacing: 0.01em;
  margin: 0;
  color: ${CS.accent};
  line-height: 1.1;
`;

const StepCount = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${CS.text};
  background: ${withAlpha('#60C0F0', 0.1)};
  border: 1px solid ${withAlpha('#60C0F0', 0.28)};
  border-radius: 4px;
  font-family: 'Fira Code', ui-monospace, monospace;
`;

const StepDescription = styled.p`
  font-size: 12.5px;
  line-height: 1.4;
  color: ${CS.textMuted};
  margin: 0 0 10px;
`;

const ExerciseList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const ExerciseRow = styled.li<{ $idx: number }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 12px;
  background: ${withAlpha('#1A1A24', 0.55)};
  border-left: 2px solid transparent;
  border-radius: 4px;
  transition: background 220ms ease, border-color 220ms ease;
  ${reducedMotionSafe}
  animation: ${fadeInUp} 260ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
  animation-delay: ${({ $idx }) => 80 + $idx * 24}ms;

  &:hover, &:focus-within {
    background: ${withAlpha('#1A1A24', 0.85)};
    border-left-color: ${withAlpha('#C6A84B', 0.55)};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ExerciseNameRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
`;

const ExerciseName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${CS.text};
  letter-spacing: 0.005em;
`;

const ExerciseKey = styled.code`
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 11px;
  color: ${CS.textMuted};
  background: ${withAlpha('#0A0A0F', 0.6)};
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid ${withAlpha('#60C0F0', 0.1)};
`;

const ExerciseMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  font-size: 11.5px;
  color: ${CS.textMuted};

  & > span:not(:last-child)::after {
    content: '·';
    margin-left: 14px;
    color: ${withAlpha('#60C0F0', 0.4)};
  }
`;

const Citation = styled.span`
  font-style: italic;
  color: ${withAlpha('#C6A84B', 0.85)};
`;

const EmptyStep = styled.p`
  font-size: 12.5px;
  color: ${CS.textMuted};
  margin: 0;
  font-style: italic;
  opacity: 0.7;
`;

const StateMessage = styled.div<{ $tone?: 'info' | 'warn' | 'error' }>`
  padding: 16px 18px;
  border-radius: 8px;
  font-size: 13.5px;
  line-height: 1.5;
  ${({ $tone }) => $tone === 'error' && css`
    color: ${CS.errorText};
    background: ${CS.errorBg};
    border: 1px solid ${CS.errorBorder};
  `}
  ${({ $tone }) => $tone === 'warn' && css`
    color: ${CS.warningText};
    background: ${CS.warningBg};
    border: 1px solid ${CS.warningBorder};
  `}
  ${({ $tone }) => (!$tone || $tone === 'info') && css`
    color: ${CS.textSecondary};
    background: ${withAlpha('#1A1A24', 0.6)};
    border: 1px solid ${withAlpha('#60C0F0', 0.18)};
  `}
`;

// ─── Helpers ──────────────────────────────────────────────────────

function describeCompensations(comps: CompensationInput[]): string {
  if (!comps.length) return 'No OHSA compensations on file for this client.';
  const types = comps
    .map((c) => (typeof c === 'string' ? c : c?.type))
    .filter((t): t is string => typeof t === 'string' && t.length > 0)
    .map((t) => t.replace(/_/g, ' '));
  if (types.length === 0) return '';
  if (types.length === 1) return `Targeting ${types[0]} compensation.`;
  if (types.length === 2) return `Targeting ${types[0]} and ${types[1]} compensations.`;
  const last = types[types.length - 1];
  return `Targeting ${types.slice(0, -1).join(', ')}, and ${last} compensations.`;
}

// ─── Component ────────────────────────────────────────────────────

const CorrectiveRecommendationsPanel: React.FC<Props> = ({
  clientId,
  compensations,
  includeSteps,
  title = 'Corrective Recommendations',
  subtitle,
  className,
}) => {
  const [recs, setRecs] = useState<CorrectiveRecommendations | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Stable serialization for effect dependency — we don't want a fresh
  // array reference to trigger a refetch when contents are unchanged.
  const compsKey = useMemo(() => JSON.stringify(compensations || []), [compensations]);
  const stepsKey = useMemo(() => JSON.stringify(includeSteps || null), [includeSteps]);

  const fetchRecommendations = useCallback(async () => {
    if (!clientId || !Array.isArray(compensations) || compensations.length === 0) {
      // Empty / no-OHSA case — render the empty-state UI without
      // hitting the network. The render-branch guard handles the
      // visual; this guard prevents a no-op API call.
      setRecs(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const api = new ApiService();
      const body: Record<string, unknown> = { clientId, compensations };
      if (Array.isArray(includeSteps) && includeSteps.length > 0) {
        body.includeSteps = includeSteps;
      }
      const res = await api.post('/api/workout-builder/corrective-recommendations', body);
      const payload = res?.data ?? res;
      if (payload && typeof payload === 'object' && (payload as { success?: boolean }).success) {
        setRecs((payload as { recommendations: CorrectiveRecommendations }).recommendations);
      } else {
        const message =
          (payload && typeof payload === 'object' && (payload as { error?: string }).error) ||
          'Could not fetch corrective recommendations';
        setError(message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
    } finally {
      setLoading(false);
    }
    // compsKey/stepsKey are intentionally the trigger — clientId is
    // already in the closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, compsKey, stepsKey]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // ─── Render branches ───────────────────────────────────────────

  if (!Array.isArray(compensations) || compensations.length === 0) {
    return (
      <Container className={className} aria-label={title}>
        <Header>
          <Title>{title}</Title>
        </Header>
        <StateMessage>
          No OHSA compensations on file. Run an Overhead Squat Assessment from
          the client's Movement Analysis tab to populate corrective
          recommendations here.
        </StateMessage>
      </Container>
    );
  }

  if (loading && !recs) {
    return (
      <Container className={className} aria-label={title}>
        <Header>
          <Title>{title}</Title>
          <Subtitle>{subtitle ?? describeCompensations(compensations)}</Subtitle>
        </Header>
        <StateMessage>Loading corrective recommendations…</StateMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className={className} aria-label={title}>
        <Header>
          <Title>{title}</Title>
          <Subtitle>{subtitle ?? describeCompensations(compensations)}</Subtitle>
        </Header>
        <StateMessage $tone="error" role="alert">
          {error}
        </StateMessage>
      </Container>
    );
  }

  if (!recs) return null;

  if (recs.matchedCount === 0) {
    return (
      <Container className={className} aria-label={title}>
        <Header>
          <Title>{title}</Title>
          <Subtitle>{subtitle ?? describeCompensations(compensations)}</Subtitle>
        </Header>
        <StateMessage $tone="warn">
          No V3b.3-validated correctives matched these compensations yet.
          The workout planner will fall back to NASM CES-MAP synthesized
          warmup entries.
        </StateMessage>
      </Container>
    );
  }

  return (
    <Container className={className} aria-label={title}>
      <Header>
        <Title>{title}</Title>
        <Subtitle>{subtitle ?? describeCompensations(compensations)}</Subtitle>
        {recs.tags.length > 0 && (
          <TagRow aria-label="Detected NASM corrective categories">
            {recs.tags.map((t) => (
              <TagChip key={t}>{t.replace(/_/g, ' ')}</TagChip>
            ))}
          </TagRow>
        )}
      </Header>

      <Spine>
        {STEP_ORDER.map((step, idx) => {
          const rows = recs[step] || [];
          if (Array.isArray(includeSteps) && includeSteps.length > 0 && !includeSteps.includes(step)) {
            return null;
          }
          return (
            <StepBlock key={step} $idx={idx}>
              <StepHeader>
                <StepLabel>{STEP_LABELS[step]}</StepLabel>
                <StepCount>{rows.length}</StepCount>
              </StepHeader>
              <StepDescription>{STEP_DESCRIPTIONS[step]}</StepDescription>
              {rows.length === 0 ? (
                <EmptyStep>No matched correctives for this step.</EmptyStep>
              ) : (
                <ExerciseList>
                  {rows.map((row, rIdx) => (
                    <ExerciseRow key={row.id || row.exerciseKey} $idx={rIdx}>
                      <ExerciseNameRow>
                        <ExerciseName>{row.name}</ExerciseName>
                        {row.exerciseKey && <ExerciseKey>{row.exerciseKey}</ExerciseKey>}
                      </ExerciseNameRow>
                      <ExerciseMetaRow>
                        {row.bodyPartCategory && <span>{row.bodyPartCategory.replace(/_/g, ' ')}</span>}
                        {row.sourceCitation && <Citation>{row.sourceCitation}</Citation>}
                      </ExerciseMetaRow>
                    </ExerciseRow>
                  ))}
                </ExerciseList>
              )}
            </StepBlock>
          );
        })}
      </Spine>
    </Container>
  );
};

export default CorrectiveRecommendationsPanel;
