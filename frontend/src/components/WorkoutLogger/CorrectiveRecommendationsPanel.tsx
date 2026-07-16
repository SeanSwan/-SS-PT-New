/**
 * CorrectiveRecommendationsPanel - V3c.6 Protocol Spine.
 * Surfaces NASM CES corrective recommendations while a trainer/admin
 * builds a client workout. Runtime flow stays tied to
 * POST /api/workout-builder/corrective-recommendations; presentation
 * lives in CorrectiveRecommendationsPanel.styles.ts.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiService } from '../../services/api.service';
import { Citation, Container, EmptyStep, ExerciseKey, ExerciseList, ExerciseMetaRow, ExerciseName, ExerciseNameRow, ExerciseRow, Header, Spine, StateMessage, StepBlock, StepCount, StepDescription, StepHeader, StepLabel, Subtitle, TagChip, TagRow, Title } from './CorrectiveRecommendationsPanel.styles';
import type { CompensationInput, CorrectiveRecommendations, CorrectiveRecommendationsPanelProps as Props, CesProtocolStep } from './CorrectiveRecommendationsPanel.types';
export type { CompensationInput, CorrectiveExerciseRow, CorrectiveRecommendations, CesProtocolStep } from './CorrectiveRecommendationsPanel.types';

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

  // V3c.6.2 (Codex Round 1 LOW): canonical key builder. JSON.stringify
  // on a fresh object literal is order-sensitive, so two semantically
  // equivalent compensation arrays could produce different keys and
  // trigger a redundant refetch. The canonical key normalizes shape
  // (string entries → { type }) and sorts by type.
  const compsKey = useMemo(() => {
    if (!Array.isArray(compensations)) return '[]';
    const normalized = compensations
      .map((c) => {
        if (typeof c === 'string') return { type: c };
        return {
          type: c?.type ?? '',
          avgSeverity: c?.avgSeverity ?? null,
          frequency: c?.frequency ?? null,
          trend: c?.trend ?? null,
        };
      })
      .sort((a, b) => (a.type || '').localeCompare(b.type || ''));
    return JSON.stringify(normalized);
  }, [compensations]);
  const stepsKey = useMemo(() => {
    if (!Array.isArray(includeSteps)) return 'null';
    return JSON.stringify([...includeSteps].sort());
  }, [includeSteps]);

  // V3c.6.2 (Codex Round 1 MEDIUM 1): sequence guard against stale
  // responses overwriting newer state. A monotonically increasing
  // requestId is captured at fetch start; only the latest id can
  // write state when the response arrives.
  const requestIdRef = useRef<number>(0);

  const fetchRecommendations = useCallback(async () => {
    // V3c.6.3 (Codex Round 2 MEDIUM): increment the sequence id BEFORE
    // any early return so empty/invalid-state transitions invalidate
    // any in-flight request from the previous query. Without this,
    // a non-empty → empty transition leaves the prior request's id
    // matching ref.current; when it resolves, it bypasses the
    // stale-check and can re-populate `recs` with stale data even
    // though the panel is now in the empty state.
    const requestId = ++requestIdRef.current;

    if (!clientId || !Array.isArray(compensations) || compensations.length === 0) {
      // Empty / no-OHSA case — render the empty-state UI without
      // hitting the network. The render-branch guard handles the
      // visual; this guard prevents a no-op API call.
      setRecs(null);
      setLoading(false);
      setError(null);
      return;
    }
    // V3c.6.2 (Codex Round 1 MEDIUM 1): clear stale data when the
    // query key changes so the populated branch can't show old recs
    // for the wrong client/compensations during the new fetch.
    setRecs(null);
    setLoading(true);
    setError(null);

    try {
      const api = new ApiService();
      const body: Record<string, unknown> = { clientId, compensations };
      if (Array.isArray(includeSteps) && includeSteps.length > 0) {
        body.includeSteps = includeSteps;
      }
      const res = await api.post('/api/workout-builder/corrective-recommendations', body);
      // Stale response — a newer fetch already started, drop this one.
      if (requestId !== requestIdRef.current) return;
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
      if (requestId !== requestIdRef.current) return;
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
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
          the client&apos;s Movement Analysis tab to populate corrective
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
