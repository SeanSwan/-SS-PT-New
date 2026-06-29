import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, X } from 'lucide-react';
import apiService from '../../services/api.service';
import { MEAL_TYPE_OPTIONS, cleanMacro, normalizeMealType } from './mealPhotoLog';
import { nutritionDraftToMacroPayloads } from './nutritionDraft.adapters';
import type { NutritionDraftFood, NutritionEntryDraft } from './nutritionDraft.types';
import {
  ActionRow,
  CloseButton,
  DrawerBackdrop,
  DrawerHeader,
  DrawerPanel,
  DrawerText,
  DrawerTitle,
  Eyebrow,
  FieldGroup,
  FoodList,
  FoodRow,
  HeaderCopy,
  MacroGrid,
  MacroInput,
  MealSelect,
  Pill,
  ProvenanceStrip,
  SaveButton,
  SecondaryButton,
  Status,
  TextInput,
} from './NutritionReviewDrawer.styles';

interface NutritionReviewSavedOptions {
  closeDrawer?: boolean;
}

interface NutritionReviewDrawerProps {
  draft: NutritionEntryDraft | null;
  onClose: () => void;
  onSaved?: (success: boolean, options?: NutritionReviewSavedOptions) => void;
}

const mealLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const reviewLabel = (confidence: string) => {
  if (confidence === 'ai_estimate') return 'AI estimate';
  if (confidence === 'community') return 'Community estimate';
  if (confidence === 'verified') return 'Verified entry';
  return 'Provider estimate';
};
const foodLabel = (food: NutritionDraftFood, index: number) => food.displayName || food.description || `food ${index + 1}`;
const editableFoods = (draft: NutritionEntryDraft | null): NutritionDraftFood[] =>
  draft ? draft.foods.map((food) => ({ ...food })) : [];

type FoodField = keyof Pick<NutritionDraftFood, 'description' | 'mealType' | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber'>;

const NutritionReviewDrawer: React.FC<NutritionReviewDrawerProps> = ({ draft, onClose, onSaved }) => {
  const [foods, setFoods] = useState<NutritionDraftFood[]>(() => editableFoods(draft));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setFoods(editableFoods(draft));
    setStatus('');
    setError('');
  }, [draft]);

  useEffect(() => {
    if (!draft) return undefined;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [draft, onClose]);

  if (!draft) return null;

  const updateFood = (id: string, field: FoodField, value: string) => {
    setFoods((current) => current.map((food) => {
      if (food.id !== id) return food;
      if (field === 'description') return { ...food, description: value };
      if (field === 'mealType') return { ...food, mealType: normalizeMealType(value) };
      return { ...food, [field]: cleanMacro(value) };
    }));
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    const payloads = nutritionDraftToMacroPayloads({ ...draft, foods });
    setStatus('');
    setError('');

    if (payloads.length === 0) {
      setStatus('Add at least one food before saving.');
      onSaved?.(false, { closeDrawer: false });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const settled = await Promise.allSettled(payloads.map((payload) => apiService.post('/api/macros', payload)));
      const saved = settled.filter((result) => result.status === 'fulfilled').length;
      const failed = settled.length - saved;
      if (failed > 0) {
        setError(saved > 0 ? `Saved ${saved} of ${settled.length}; review the rest before retrying.` : 'Could not save this nutrition draft. Review and try again.');
        onSaved?.(saved > 0, { closeDrawer: false });
        return;
      }
      setStatus(`Saved ${saved} ${saved === 1 ? 'item' : 'items'} to My Macros.`);
      onSaved?.(true, { closeDrawer: true });
    } catch {
      setError('Could not save this nutrition draft. Review and try again.');
      onSaved?.(false, { closeDrawer: false });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const savableCount = foods.filter((food) => food.description.trim()).length;
  const providerNames = Array.from(new Set(foods.map((food) => food.provider).filter(Boolean)));
  const reviewCopy = `${reviewLabel(draft.sourceConfidence)} - review before saving. Nutrition data can be incomplete, so edits stay available until you approve.`;

  return (
    <DrawerBackdrop>
      <DrawerPanel role="dialog" aria-modal="true" aria-label={draft.title}>
        <DrawerHeader>
          <HeaderCopy>
            <Eyebrow>{draft.sourceLabel}</Eyebrow>
            <DrawerTitle>{draft.title}</DrawerTitle>
            <DrawerText>{reviewCopy}</DrawerText>
          </HeaderCopy>
          <CloseButton ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close nutrition review"><X size={18} /></CloseButton>
        </DrawerHeader>

        <ProvenanceStrip aria-label="Nutrition draft provenance">
          <Pill>{draft.sourceConfidence.replace('_', ' ')}</Pill>
          {providerNames.map((provider) => <Pill key={provider}>Provider: {provider}</Pill>)}
          <Pill>{draft.verified ? 'Verified' : 'Not verified'}</Pill>
          <Pill>Editable before save</Pill>
        </ProvenanceStrip>

        <FoodList>
          {foods.map((food, index) => {
            const label = foodLabel(food, index);
            return (
              <FoodRow key={food.id}>
                <FieldGroup>
                  Food {index + 1} description
                  <TextInput
                    aria-label={`Food ${index + 1} description`}
                    value={food.description}
                    onChange={(event) => updateFood(food.id, 'description', event.target.value)}
                  />
                </FieldGroup>
                <FieldGroup>
                  Meal type
                  <MealSelect
                    aria-label={`Meal type for ${label}`}
                    value={food.mealType}
                    onChange={(event) => updateFood(food.id, 'mealType', event.target.value)}
                  >
                    {MEAL_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{mealLabel(type)}</option>)}
                  </MealSelect>
                </FieldGroup>
                <MacroGrid>
                  {(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((field) => (
                    <FieldGroup key={field}>
                      {field === 'calories' ? 'Calories' : field[0].toUpperCase()}
                      <MacroInput
                        aria-label={`${field === 'calories' ? 'Calories' : field} for ${label}`}
                        type="number"
                        min="0"
                        value={food[field] ?? ''}
                        onChange={(event) => updateFood(food.id, field, event.target.value)}
                      />
                    </FieldGroup>
                  ))}
                </MacroGrid>
              </FoodRow>
            );
          })}
        </FoodList>

        <ActionRow>
          <SaveButton type="button" onClick={handleSave} disabled={saving} aria-busy={saving}>
            <ClipboardCheck size={16} /> {saving ? 'Saving...' : `Approve and save ${savableCount} ${savableCount === 1 ? 'item' : 'items'}`}
          </SaveButton>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
        </ActionRow>
        {status && <Status role="status" aria-live="polite"><CheckCircle2 size={14} /> {status}</Status>}
        {error && <Status role="status" aria-live="polite" $error><AlertTriangle size={14} /> {error}</Status>}
      </DrawerPanel>
    </DrawerBackdrop>
  );
};

export default NutritionReviewDrawer;
