/**
 * COMPONENT: WorkoutPlannerBlendDialog
 * PARENT: WorkoutPlannerSavedPlansSection
 * PURPOSE: Compose a NEW draft plan from week picks against two of the
 *          client's saved plans (charter v3 P3 — typically primary + AI
 *          backup). v1 = manual per-week A/B picks; sources stay immutable.
 * DATA: GET /api/workout-plans/:id (week counts) · POST /api/workout-plans/blend
 */

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { GitMerge, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import type { SavedPlanSummary } from './SavedPlanCard';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  /* 2200 = house precedent for full-screen dialogs (WorkoutDayDrilldown,
     PostMediaLightbox): clears the fixed header (1250), dropdowns (1260),
     and toasts (1300). */
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--bg-base, #030712) 72%, transparent);
`;

const Panel = styled.div`
  width: min(560px, 100%);
  max-height: 86vh;
  overflow-y: auto;
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 0.35rem;
`;

const CloseButton = styled.button`
  margin-left: auto;
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
`;

const Note = styled.p`
  margin: 0.25rem 0 0.75rem;
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.74rem;
`;

const FieldRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
  font-size: 0.76rem;

  select, input {
    flex: 1;
    min-height: 44px;
    padding: 0 0.6rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
    background: var(--bg-elevated, #141419);
    color: var(--text-primary, #E0ECF4);
  }
`;

const WeekRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  font-size: 0.76rem;
`;

const SourceToggle = styled.button<{ $active: boolean }>`
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  background: ${({ $active }) => ($active ? 'var(--accent-deep, #002060)' : 'transparent')};
  color: var(--text-primary, #E0ECF4);

  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const SubmitButton = styled.button`
  min-height: 44px;
  margin-top: 0.6rem;
  padding: 0 1rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 45%, transparent);
  background: var(--accent-deep, #002060);
  color: var(--text-primary, #E0ECF4);
  font-weight: 700;
  cursor: pointer;

  &:disabled { opacity: 0.6; cursor: progress; }
`;

interface WorkoutPlannerBlendDialogProps {
  open: boolean;
  savedPlans: SavedPlanSummary[];
  onClose: () => void;
  onBlended: () => void;
}

const useWeekCount = (planId: string) => {
  const { authAxios } = useAuth();
  const [weeks, setWeeks] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!authAxios || !planId) { setWeeks(null); setFailed(false); return; }
    let mounted = true;
    setWeeks(null);
    setFailed(false);
    authAxios.get(`/api/workout-plans/${planId}`)
      .then((res: { data?: { success?: boolean; plan?: { planData?: { weeks?: unknown[] } } } }) => {
        if (!mounted) return;
        const count = res?.data?.plan?.planData?.weeks?.length ?? 0;
        setWeeks(count);
      })
      // A fetch failure is NOT "this plan has no weeks" — keep them distinct
      // so a coach with two valid plans isn't told their plans are empty.
      .catch(() => { if (mounted) { setWeeks(0); setFailed(true); } });
    return () => { mounted = false; };
  }, [authAxios, planId]);
  return { weeks, failed };
};

const WorkoutPlannerBlendDialog: React.FC<WorkoutPlannerBlendDialogProps> = ({
  open,
  savedPlans,
  onClose,
  onBlended,
}) => {
  const { authAxios } = useAuth();
  const [planAId, setPlanAId] = useState('');
  const [planBId, setPlanBId] = useState('');
  const [title, setTitle] = useState('');
  const [picks, setPicks] = useState<Record<number, 'A' | 'B'>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setPicks({});
    setTitle('');
    setPlanAId(savedPlans.find((plan) => plan.isPrimary)?.id ?? savedPlans[0]?.id ?? '');
    setPlanBId(savedPlans.find((plan) => plan.id !== (savedPlans.find((p) => p.isPrimary)?.id ?? savedPlans[0]?.id))?.id ?? '');
  }, [open, savedPlans]);

  // House dialog contract (WorkoutDayDrilldown): focus in on open, restore on
  // close, lock background scroll, Escape closes. Keyed on `open` because
  // this component stays mounted while closed.
  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      const opener = openerRef.current;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const { weeks: weeksA, failed: weeksAFailed } = useWeekCount(open ? planAId : '');
  const { weeks: weeksB, failed: weeksBFailed } = useWeekCount(open ? planBId : '');

  if (!open) return null;

  const maxWeeks = Math.max(weeksA ?? 0, weeksB ?? 0);
  const loadingWeeks = (planAId && weeksA === null) || (planBId && weeksB === null);
  const weeksFailed = weeksAFailed || weeksBFailed;
  const sourceFor = (week: number): 'A' | 'B' =>
    picks[week] ?? (week <= (weeksA ?? 0) ? 'A' : 'B');

  const handleBlend = async () => {
    if (!authAxios || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const body = {
        planAId: parseInt(planAId, 10),
        planBId: parseInt(planBId, 10),
        picks: Array.from({ length: maxWeeks }, (_, index) => ({
          source: sourceFor(index + 1),
          weekNumber: index + 1,
        })),
        ...(title.trim() ? { title: title.trim() } : {}),
      };
      const res = await authAxios.post('/api/workout-plans/blend', body);
      const data = res?.data as { success?: boolean; message?: string } | undefined;
      if (data?.success) {
        onBlended();
        onClose();
      } else {
        setMessage(data?.message || 'Could not blend these plans.');
      }
    } catch (error) {
      const axiosMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(axiosMessage || 'Could not blend these plans right now.');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = Boolean(planAId && planBId && planAId !== planBId && maxWeeks > 0 && !loadingWeeks);

  return (
    <Overlay onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Panel role="dialog" aria-modal="true" aria-label="Blend two plans">
        <TitleRow>
          <GitMerge size={16} aria-hidden="true" />
          Blend Plans
          <CloseButton ref={closeRef} type="button" onClick={onClose} aria-label="Close blend dialog">
            <X size={16} aria-hidden="true" />
          </CloseButton>
        </TitleRow>
        <Note>
          Pick which plan supplies each week. A new draft plan is created; both
          source plans stay untouched.
        </Note>

        <FieldRow>
          Plan A
          <select value={planAId} onChange={(e) => { setPlanAId(e.target.value); setPicks({}); }} aria-label="Plan A source">
            {savedPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name}</option>
            ))}
          </select>
        </FieldRow>
        <FieldRow>
          Plan B
          <select value={planBId} onChange={(e) => { setPlanBId(e.target.value); setPicks({}); }} aria-label="Plan B source">
            {savedPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name}</option>
            ))}
          </select>
        </FieldRow>
        <FieldRow>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Blended plan (optional)"
            aria-label="Blended plan title"
          />
        </FieldRow>

        {planAId === planBId && <Note role="status">Choose two different plans to blend.</Note>}
        {loadingWeeks && <Note role="status">Loading plan weeks...</Note>}
        {!loadingWeeks && weeksFailed && (
          <Note role="alert">Couldn&apos;t load these plans&apos; weeks right now — close and reopen to try again.</Note>
        )}
        {!loadingWeeks && !weeksFailed && planAId !== planBId && maxWeeks === 0 && (
          <Note role="status">These plans have no week structure to blend.</Note>
        )}

        {!loadingWeeks && planAId !== planBId && Array.from({ length: maxWeeks }, (_, index) => {
          const week = index + 1;
          const active = sourceFor(week);
          return (
            <WeekRow key={week}>
              <span>Week {week}</span>
              <SourceToggle
                type="button"
                $active={active === 'A'}
                disabled={week > (weeksA ?? 0)}
                onClick={() => setPicks((prev) => ({ ...prev, [week]: 'A' }))}
                aria-label={`Week ${week} from plan A`}
              >
                A
              </SourceToggle>
              <SourceToggle
                type="button"
                $active={active === 'B'}
                disabled={week > (weeksB ?? 0)}
                onClick={() => setPicks((prev) => ({ ...prev, [week]: 'B' }))}
                aria-label={`Week ${week} from plan B`}
              >
                B
              </SourceToggle>
            </WeekRow>
          );
        })}

        {message && <Note role="status">{message}</Note>}

        <SubmitButton type="button" onClick={handleBlend} disabled={!canSubmit || busy}>
          {busy ? 'Blending...' : 'Create blended plan'}
        </SubmitButton>
      </Panel>
    </Overlay>
  );
};

export default WorkoutPlannerBlendDialog;
