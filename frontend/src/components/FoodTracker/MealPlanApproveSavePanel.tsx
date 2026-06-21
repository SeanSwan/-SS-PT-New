import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Loader2 } from 'lucide-react';
import apiService from '../../services/api.service';
import {
  MEAL_PLAN_MEAL_TYPES,
  buildMacroDraftsFromMealPlan,
  buildMacroSavePayload,
  cleanMealPlanMacroValue,
  validateMacroDrafts,
  type MealPlanInput,
  type MealPlanMacroDraft,
} from './MealPlanApproveSavePanel.logic';
interface MealPlanApproveSavePanelProps {
  plan: MealPlanInput | null;
  onSaved?: (success: boolean) => void;
}

const todayIso = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const labelFor = (mealType: string) => mealType.charAt(0).toUpperCase() + mealType.slice(1);
const isSafeLogDate = (value: string, today = todayIso()) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= today;
const macroFields = ['calories', 'protein', 'carbs', 'fat'] as const;

const MealPlanApproveSavePanel: React.FC<MealPlanApproveSavePanelProps> = ({ plan, onSaved }) => {
  const [drafts, setDrafts] = useState<MealPlanMacroDraft[]>(() => buildMacroDraftsFromMealPlan(plan));
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const savingRef = useRef(false);

  useEffect(() => {
    setDrafts(buildMacroDraftsFromMealPlan(plan));
    setDate(todayIso());
    setStatus('');
    setError('');
    setSavedIds(new Set());
  }, [plan]);

  const updateDraft = (id: string, field: keyof MealPlanMacroDraft, value: string) => {
    setDrafts((current) => current.map((draft) => {
      if (draft.id !== id) return draft;
      if (field === 'description') return { ...draft, description: value };
      if (field === 'mealType') return { ...draft, mealType: value as MealPlanMacroDraft['mealType'] };
      return { ...draft, [field]: cleanMealPlanMacroValue(value) };
    }));
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    const validation = validateMacroDrafts(drafts);
    setStatus('');
    setError('');
    if (!validation.valid) {
      setError(validation.message);
      onSaved?.(false);
      return;
    }
    if (!isSafeLogDate(date)) {
      setError('Choose today or an earlier log date before saving.');
      onSaved?.(false);
      return;
    }

    const pending = drafts.filter((draft) => !savedIds.has(draft.id));
    if (pending.length === 0) {
      setStatus('Already saved to My Macros.');
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const results = await Promise.allSettled(
        pending.map((draft) => apiService.post('/api/macros', buildMacroSavePayload(draft, date))),
      );

      const nextSaved = new Set(savedIds);
      pending.forEach((draft, index) => {
        if (results[index].status === 'fulfilled') nextSaved.add(draft.id);
      });
      setSavedIds(nextSaved);

      const savedCount = results.filter((result) => result.status === 'fulfilled').length;
      const failedCount = pending.length - savedCount;

      if (failedCount > 0) {
        setError(savedCount > 0
          ? `Saved ${savedCount} of ${pending.length} meals; ${failedCount} could not be saved - review My Macros and retry the rest.`
          : 'Meal plan could not be saved. Review My Macros before retrying.');
        onSaved?.(savedCount > 0);
        return;
      }

      setStatus(`${nextSaved.size} ${nextSaved.size === 1 ? 'meal' : 'meals'} saved to My Macros`);
      onSaved?.(true);
    } catch {
      setError('Meal plan could not be saved. Review My Macros before retrying.');
      onSaved?.(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const allSaved = drafts.length > 0 && drafts.every((draft) => savedIds.has(draft.id));

  if (!plan || drafts.length === 0) return null;

  return (
    <Panel aria-label="Approve generated meal plan">
      <PanelHeader>
        <ClipboardCheck size={18} />
        <div>
          <PanelTitle>Approve and Save</PanelTitle>
          <PanelCopy>AI estimate - review every meal before it enters your macro log.</PanelCopy>
        </div>
      </PanelHeader>

      <DateRow>
        <label htmlFor="meal-plan-save-date">Log date</label>
        <DateInput id="meal-plan-save-date" type="date" max={todayIso()} value={date} onChange={(event) => setDate(event.target.value)} />
      </DateRow>

      <DraftList>
        {drafts.map((draft, index) => {
          const mealLabel = labelFor(draft.mealType);
          const rowLocked = saving || savedIds.has(draft.id);
          return (
            <DraftRow key={draft.id}>
              <MealTypeSelect
                aria-label={`Meal ${index + 1} type`}
                value={draft.mealType}
                onChange={(event) => updateDraft(draft.id, 'mealType', event.target.value)}
                disabled={rowLocked}
              >
                {MEAL_PLAN_MEAL_TYPES.map((type) => <option key={type} value={type}>{labelFor(type)}</option>)}
              </MealTypeSelect>
              <DescriptionInput
                aria-label={`${mealLabel} description`}
                value={draft.description}
                onChange={(event) => updateDraft(draft.id, 'description', event.target.value)}
                disabled={rowLocked}
              />
              <MacroFields>
                {macroFields.map((field) => (
                  <MacroField key={field}>
                    <span>{field === 'calories' ? 'cal' : field[0].toUpperCase()}</span>
                    <MacroInput aria-label={`${mealLabel} ${field}`} type="number" min="0" value={draft[field] ?? ''} onChange={(event) => updateDraft(draft.id, field, event.target.value)} disabled={rowLocked} />
                  </MacroField>
                ))}
              </MacroFields>
            </DraftRow>
          );
        })}
      </DraftList>

      <SaveButton type="button" onClick={handleSave} disabled={saving || allSaved} aria-busy={saving}>
        {saving
          ? <><Loader2 size={16} className="spin" /> Saving...</>
          : allSaved
            ? <><CheckCircle2 size={16} /> Saved to My Macros</>
            : <><ClipboardCheck size={16} /> Approve and save meal plan</>}
      </SaveButton>
      {status && <Status role="status" aria-live="polite" aria-atomic="true"><CheckCircle2 size={14} /> {status}</Status>}
      {error && <Status role="status" aria-live="polite" aria-atomic="true" $error><AlertTriangle size={14} /> {error}</Status>}
    </Panel>
  );
};

export default MealPlanApproveSavePanel;

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 82%, transparent);
`;

const PanelHeader = styled.div`
  display: flex;
  gap: 10px;
  color: var(--accent-primary, #60C0F0);
`;

const PanelTitle = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.95rem;
`;

const PanelCopy = styled.p`
  margin: 2px 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  font-size: 0.8rem;
`;

const DateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  label { color: var(--text-secondary, rgba(224, 236, 244, 0.72)); font-size: 0.82rem; }
`;

const DateInput = styled.input`
  min-height: 44px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 10px;
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  padding: 0 10px;
`;

const DraftList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const DraftRow = styled.div`
  display: grid;
  grid-template-columns: minmax(7rem, auto) minmax(12rem, 1fr) auto;
  gap: 10px;
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

const MealTypeSelect = styled.select`
  min-height: 44px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 10px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0 10px;
`;

const DescriptionInput = styled.input`
  min-height: 44px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 10px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0 10px;
`;

const MacroFields = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const MacroField = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-size: 0.7rem;
`;

const MacroInput = styled.input`
  width: 4rem;
  min-height: 44px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 10px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0 8px;
  text-align: center;
`;

const SaveButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: var(--text-inverse, #0F172A);
  font-weight: 800;
  cursor: pointer;
  &:disabled { cursor: not-allowed; opacity: 0.6; }
  .spin { animation: save-spin 1s linear infinite; }
  @keyframes save-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
`;

const Status = styled.div<{ $error?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ $error }) => ($error ? 'var(--accent-error, #C92A54)' : 'var(--accent-primary, #60C0F0)')};
  font-size: 0.83rem;
`;
