/**
 * FILE: MealPhotoReview.tsx
 * PURPOSE: Editable approve-before-save panel for AI meal-photo analysis.
 * Decision #2: clients self-log via POST /api/macros, not the coach gate.
 * Care: saved entries stay verified:false and confidence is labeled AI estimate.
 */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { CheckCircle2, ClipboardCheck, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import apiService from '../../services/api.service';
import {
  MEAL_TYPE_OPTIONS,
  cleanMacro,
  normalizeMealType,
  toMacroPayload,
  summarizeSave,
  type EditableFood,
} from './mealPhotoLog';

interface PhotoFoodInput {
  name: string;
  estimatedServing?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  confidence?: number;
}

interface MealPhotoReviewProps {
  analysis: { foods?: PhotoFoodInput[]; mealType?: string } | null;
  onSaved?: () => void;
}

type SaveSummary = { saved: number; failed: number; total: number };

const toEditable = (foods?: PhotoFoodInput[]): EditableFood[] =>
  (Array.isArray(foods) ? foods : []).map((f) => ({
    name: String(f?.name || ''),
    estimatedServing: f?.estimatedServing,
    calories: f?.calories ?? null,
    protein: f?.protein ?? null,
    carbs: f?.carbs ?? null,
    fat: f?.fat ?? null,
    fiber: f?.fiber ?? null,
    confidence: f?.confidence,
  }));

const confidencePercent = (value: unknown): number | null => {
  const cleaned = cleanMacro(value);
  return cleaned === null ? null : Math.round(Math.max(0, Math.min(1, cleaned)) * 100);
};

const ConfidenceBadge = ({ value }: { value: unknown }) => {
  const pct = confidencePercent(value);
  return pct === null ? null : <Conf $low={pct < 60}>AI estimate {pct}%</Conf>;
};

const MealPhotoReview: React.FC<MealPhotoReviewProps> = ({ analysis, onSaved }) => {
  const [foods, setFoods] = useState<EditableFood[]>(toEditable(analysis?.foods));
  const [mealType, setMealType] = useState<string>(normalizeMealType(analysis?.mealType));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveSummary | null>(null);
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  // Re-seed when a new photo is analyzed.
  useEffect(() => {
    setFoods(toEditable(analysis?.foods));
    setMealType(normalizeMealType(analysis?.mealType));
    setResult(null);
    setError('');
  }, [analysis]);

  const updateField = (idx: number, field: keyof EditableFood, value: string) => {
    setFoods((prev) => prev.map((f, i) => {
      if (i !== idx) return f;
      if (field === 'name') return { ...f, name: value };
      return { ...f, [field]: cleanMacro(value) };
    }));
  };

  const removeFood = (idx: number) => setFoods((prev) => prev.filter((_, i) => i !== idx));

  const fullySaved = result != null && result.failed === 0 && result.saved > 0;
  const blankNameRows = foods.filter((food) => String(food.name || '').trim().length === 0).length;
  const savableFoodCount = foods.filter((food) => String(food.name || '').trim().length > 0).length;
  const blankNameCopy = `${blankNameRows} unnamed ${blankNameRows === 1 ? 'row' : 'rows'} will be skipped when saving.`;

  const handleSave = async () => {
    if (savingRef.current) return; // synchronous guard: rapid double-tap can't double-write
    setError('');
    setResult(null);
    const savable = foods
      .map((food, index) => ({ food, index }))
      .filter(({ food }) => String(food.name || '').trim().length > 0);
    if (savable.length === 0) {
      setError('Add at least one food before saving.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const settled = await Promise.allSettled(
        savable.map(({ food }) => apiService.post('/api/macros', toMacroPayload(food, { mealType }))),
      );
      // Keep failed rows so retry cannot duplicate already-saved foods.
      const savedIndexes = new Set(
        savable.filter((_, k) => settled[k].status === 'fulfilled').map(({ index }) => index),
      );
      setFoods((prev) => prev.filter((_, i) => !savedIndexes.has(i)));
      const summary = summarizeSave(settled.map((s) => ({ ok: s.status === 'fulfilled' })));
      setResult(summary);
      if (summary.saved > 0 && onSaved) onSaved();
    } catch {
      setError('Could not save that meal. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!analysis) return null;

  return (
    <Wrap>
      <EditHint><AlertTriangle size={14} /> AI estimate - review &amp; edit before saving to your log.</EditHint>

      <MealTypeRow>
        <label htmlFor="meal-photo-type">Meal</label>
        <Select id="meal-photo-type" value={mealType} onChange={(e) => setMealType(e.target.value)} disabled={saving || fullySaved}>
          {MEAL_TYPE_OPTIONS.map((m) => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
        </Select>
      </MealTypeRow>

      <FoodList>
        {foods.map((f, i) => (
          <FoodRow key={i}>
            <NameInput
              aria-label={`Food ${i + 1} name`}
              value={f.name}
              onChange={(e) => updateField(i, 'name', e.target.value)}
              disabled={saving || fullySaved}
              placeholder="Food name"
            />
            <Macros>
              <NumField><span>cal</span><NumInput aria-label={`Calories for ${f.name || `food ${i + 1}`}`} type="number" min="0" value={f.calories ?? ''} onChange={(e) => updateField(i, 'calories', e.target.value)} disabled={saving || fullySaved} /></NumField>
              <NumField><span>P</span><NumInput aria-label={`Protein for ${f.name || `food ${i + 1}`}`} type="number" min="0" value={f.protein ?? ''} onChange={(e) => updateField(i, 'protein', e.target.value)} disabled={saving || fullySaved} /></NumField>
              <NumField><span>C</span><NumInput aria-label={`Carbs for ${f.name || `food ${i + 1}`}`} type="number" min="0" value={f.carbs ?? ''} onChange={(e) => updateField(i, 'carbs', e.target.value)} disabled={saving || fullySaved} /></NumField>
              <NumField><span>F</span><NumInput aria-label={`Fat for ${f.name || `food ${i + 1}`}`} type="number" min="0" value={f.fat ?? ''} onChange={(e) => updateField(i, 'fat', e.target.value)} disabled={saving || fullySaved} /></NumField>
            </Macros>
            <ConfidenceBadge value={f.confidence} />
            <RemoveBtn type="button" aria-label={`Remove ${f.name || `food ${i + 1}`}`} onClick={() => removeFood(i)} disabled={saving || fullySaved}>
              <Trash2 size={16} />
            </RemoveBtn>
          </FoodRow>
        ))}
      </FoodList>

      {blankNameRows > 0 && !fullySaved && (
        <StatusMsg><AlertTriangle size={14} /> {blankNameCopy}</StatusMsg>
      )}

      {!fullySaved && (
        <SaveBtn type="button" onClick={handleSave} disabled={saving || savableFoodCount === 0} aria-busy={saving}>
          {saving ? <><Loader2 size={16} className="spin" /> Saving...</> : <><ClipboardCheck size={16} /> Approve &amp; save to today's log</>}
        </SaveBtn>
      )}

      {error && <StatusMsg role="status" aria-live="polite" aria-atomic="true" $error><AlertTriangle size={14} /> {error}</StatusMsg>}
      {result && result.failed === 0 && (
        <StatusMsg role="status" aria-live="polite" aria-atomic="true"><CheckCircle2 size={14} /> Saved {result.saved} {result.saved === 1 ? 'item' : 'items'} to today's log.</StatusMsg>
      )}
      {result && result.failed > 0 && (
        <StatusMsg role="status" aria-live="polite" aria-atomic="true" $error><AlertTriangle size={14} /> Saved {result.saved} of {result.total}; {result.failed} failed - adjust and try again.</StatusMsg>
      )}
    </Wrap>
  );
};

export default MealPhotoReview;

// SECTION: Styles (Crystalline Swan tokens, dark-first, 44px targets)
const Wrap = styled.div`
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const EditHint = styled.div`
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--accent-gold, #C6A84B);
`;

const MealTypeRow = styled.div`
  display: flex; align-items: center; gap: 0.6rem;
  label { font-size: 0.85rem; color: var(--text-secondary, #A0B0C0); }
`;

const Select = styled.select`
  min-height: 44px;
  padding: 0 0.75rem;
  border-radius: 10px;
  background: var(--surface-dark, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  border: 1px solid var(--border-subtle, rgba(96,192,240,0.25));
  font-size: 0.9rem;
`;

const FoodList = styled.div`
  display: flex; flex-direction: column; gap: 0.5rem;
`;

const FoodRow = styled.div`
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  padding: 0.5rem;
  border-radius: 10px;
  background: var(--card-dark, #141419);
  border: 1px solid var(--border-subtle, rgba(96,192,240,0.18));
`;

const NameInput = styled.input`
  flex: 1 1 9rem; min-width: 8rem; min-height: 44px;
  padding: 0 0.6rem; border-radius: 8px;
  background: var(--surface-dark, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  border: 1px solid var(--border-subtle, rgba(96,192,240,0.25));
  font-size: 0.9rem;
`;

const Macros = styled.div`
  display: flex; gap: 0.35rem; flex-wrap: wrap;
`;

const NumField = styled.label`
  display: flex; flex-direction: column; align-items: center;
  font-size: 0.65rem; color: var(--text-secondary, #A0B0C0);
  span { margin-bottom: 2px; }
`;

const NumInput = styled.input`
  width: 3.6rem; min-height: 44px;
  padding: 0 0.4rem; border-radius: 8px; text-align: center;
  background: var(--surface-dark, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  border: 1px solid var(--border-subtle, rgba(96,192,240,0.25));
  font-size: 0.85rem;
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button, &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
`;

const Conf = styled.span<{ $low?: boolean }>`
  font-size: 0.72rem; font-weight: 600;
  padding: 2px 8px; border-radius: 999px;
  color: ${({ $low }) => ($low ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)')};
  background: ${({ $low }) => ($low ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)')};
`;

const RemoveBtn = styled.button`
  min-width: 44px; min-height: 44px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 8px; cursor: pointer;
  background: transparent;
  color: var(--text-secondary, #A0B0C0);
  border: 1px solid var(--border-subtle, rgba(96,192,240,0.2));
  transition: color 160ms ease, border-color 160ms ease;
  &:hover:not(:disabled) { color: var(--accent-error, #ff6b6b); border-color: color-mix(in srgb, var(--accent-error, #ff6b6b) 40%, transparent); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SaveBtn = styled.button`
  min-height: 44px;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0 1.1rem; border-radius: 12px; cursor: pointer; font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  background: var(--accent-primary-bg, #002060);
  border: 1px solid var(--accent-primary, #60C0F0);
  box-shadow: 0 0 0 0 transparent;
  transition: box-shadow 200ms ease, transform 120ms ease;
  &:hover:not(:disabled) { box-shadow: 0 0 14px 1px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 45%, transparent); }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  .spin { animation: mpr-spin 1s linear infinite; }
  @keyframes mpr-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spin { animation: none; } transition: none; }
`;

const StatusMsg = styled.div<{ $error?: boolean }>`
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 0.82rem;
  color: ${({ $error }) => ($error ? 'var(--accent-error, #ff8585)' : 'var(--accent-primary, #60C0F0)')};
`;
