import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Flag, X } from 'lucide-react';
import apiService from '../../services/api.service';
import { cleanMacro, normalizeMealType, todayIso } from './mealPhotoLog';
import NutritionReviewFoodRow from './NutritionReviewFoodRow';
import { nutritionDraftToSavePayload, scaleNutrientsForServing } from './nutritionDraft.adapters';
import type {
  NutrientMap,
  NutritionDraftFood,
  NutritionEntryDraft,
  NutritionWorkoutProximity,
} from './nutritionDraft.types';
import { useNutritionReviewDialog } from './useNutritionReviewDialog';
import {
  ActionRow,
  CloseButton,
  DateInput,
  DrawerBackdrop,
  DrawerHeader,
  DrawerPanel,
  DrawerText,
  DrawerTitle,
  Eyebrow,
  FieldGroup,
  FoodList,
  HeaderCopy,
  MealSelect,
  Pill,
  ProvenanceStrip,
  ReviewNotes,
  SaveButton,
  SecondaryButton,
  Status,
  TertiaryButton,
  TopFields,
} from './NutritionReviewDrawer.styles';

interface NutritionReviewSavedOptions {
  closeDrawer?: boolean;
}

interface NutritionReviewDrawerProps {
  draft: NutritionEntryDraft | null;
  onClose: () => void;
  onSaved?: (success: boolean, options?: NutritionReviewSavedOptions) => void;
}

const WORKOUT_PROXIMITY: Array<{ value: NutritionWorkoutProximity; label: string }> = [
  { value: 'none', label: 'No workout timing' },
  { value: 'pre_workout', label: 'Pre-workout' },
  { value: 'intra_workout', label: 'During workout' },
  { value: 'post_workout', label: 'Post-workout' },
];

const reviewLabel = (confidence: string) => {
  if (confidence === 'ai_estimate') return 'AI estimate';
  if (confidence === 'community') return 'Self-reported estimate';
  if (confidence === 'verified') return 'Verified source';
  return 'Provider estimate';
};

const editableFoods = (draft: NutritionEntryDraft | null): NutritionDraftFood[] =>
  draft ? draft.foods.map((food) => ({
    ...food,
    serving: { ...food.serving },
    nutrients: { ...food.nutrients },
  })) : [];
const coherentServingLabel = (quantity: number | null, unit: string) =>
  [quantity, unit.trim()].filter((value) => value !== null && value !== '').join(' ') || 'Serving';


const NutritionReviewDrawer: React.FC<NutritionReviewDrawerProps> = ({ draft, onClose, onSaved }) => {
  const [foods, setFoods] = useState<NutritionDraftFood[]>(() => editableFoods(draft));
  const [date, setDate] = useState(todayIso());
  const [workoutProximity, setWorkoutProximity] = useState<NutritionWorkoutProximity>('none');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastServingQuantityRef = useRef(new Map<string, number>());
  const requestClose = useCallback(() => {
    if (!savingRef.current) onClose();
  }, [onClose]);


  useEffect(() => {
    const nextFoods = editableFoods(draft);
    setFoods(nextFoods);
    lastServingQuantityRef.current = new Map(nextFoods
      .filter((food) => food.serving.quantity !== null && food.serving.quantity > 0)
      .map((food) => [food.id, food.serving.quantity as number]));
    setDate(todayIso());
    setWorkoutProximity(draft?.workoutProximity || 'none');
    setStatus('');
    setError('');
  }, [draft]);

  useNutritionReviewDialog(Boolean(draft), requestClose, panelRef, closeButtonRef);

  if (!draft) return null;

  const updateDescription = (id: string, value: string) => {
    setFoods((current) => current.map((food) => food.id === id ? { ...food, description: value } : food));
  };

  const updateMealType = (id: string, value: string) => {
    setFoods((current) => current.map((food) =>
      food.id === id ? { ...food, mealType: normalizeMealType(value) } : food));
  };

  const updateNutrient = (id: string, field: keyof NutrientMap, value: string) => {
    setFoods((current) => current.map((food) => food.id === id
      ? { ...food, nutrients: { ...food.nutrients, [field]: cleanMacro(value) } }
      : food));
  };

  const updateServing = (id: string, field: 'basis' | 'quantity' | 'unit', value: string) => {
    setFoods((current) => current.map((food) => {
      if (food.id !== id) return food;
      if (field === 'basis') {
        return {
          ...food,
          serving: {
            ...food.serving,
            basis: value as NutritionDraftFood['serving']['basis'],
          },
        };
      }
      if (field === 'unit') {
        return {
          ...food,
          serving: {
            ...food.serving,
            unit: value,
            label: coherentServingLabel(food.serving.quantity, value),
          },
        };
      }
      const quantity = cleanMacro(value);
      const previousQuantity = food.serving.quantity ?? lastServingQuantityRef.current.get(id) ?? null;
      if (quantity !== null && quantity > 0) {
        lastServingQuantityRef.current.set(id, quantity);
      }
      return {
        ...food,
        serving: {
          ...food.serving,
          quantity,
          label: coherentServingLabel(quantity, food.serving.unit),
        },
        nutrients: scaleNutrientsForServing(food.nutrients, previousQuantity, quantity),
      };
    }));
  };

  const handleSave = async (reviewRequested = false) => {
    if (savingRef.current) return;
    const savableFoods = foods.filter((food) => food.description.trim());
    setStatus('');
    setError('');

    if (savableFoods.length === 0) {
      setStatus('Add at least one food before saving.');
      onSaved?.(false, { closeDrawer: false });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const payload = nutritionDraftToSavePayload({
        ...draft,
        workoutProximity,
        foods: savableFoods,
      }, { date, reviewRequested });
      const response = await apiService.post('/api/macros/drafts', payload);
      if (response?.data?.success === false) throw new Error('Draft save rejected');

      const savedCount = Array.isArray(response?.data?.entries)
        ? response.data.entries.length
        : savableFoods.length;
      const replayed = Boolean(response?.data?.replayed);
      setStatus(replayed
        ? 'This reviewed draft was already saved. My Macros is unchanged.'
        : reviewRequested
          ? `Saved ${savedCount} ${savedCount === 1 ? 'item' : 'items'} for coach review.`
          : `Saved ${savedCount} ${savedCount === 1 ? 'item' : 'items'} to My Macros.`);
      onSaved?.(true, { closeDrawer: true });
    } catch {
      setError('Could not save this nutrition draft. No diary entries were added; review and try again.');
      onSaved?.(false, { closeDrawer: false });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const savableCount = foods.filter((food) => food.description.trim()).length;
  const providerNames = Array.from(new Set(foods.map((food) => food.provider).filter(Boolean)));

  return createPortal(
    <DrawerBackdrop>
      <DrawerPanel ref={panelRef} role="dialog" aria-modal="true" aria-label={draft.title} tabIndex={-1}>
        <DrawerHeader>
          <HeaderCopy>
            <Eyebrow>{draft.sourceLabel}</Eyebrow>
            <DrawerTitle>{draft.title}</DrawerTitle>
            <DrawerText>
              {reviewLabel(draft.sourceConfidence)} - review serving and nutrient values before saving.
            </DrawerText>
          </HeaderCopy>
          <CloseButton
            ref={closeButtonRef}
            type="button"
            onClick={requestClose}
            disabled={saving}
            aria-label="Close nutrition review"
          >
            <X size={18} />
          </CloseButton>
        </DrawerHeader>

        <ProvenanceStrip aria-label="Nutrition draft provenance">
          <Pill>{draft.sourceConfidence.replace('_', ' ')}</Pill>
          {providerNames.map((provider) => <Pill key={provider}>Provider: {provider}</Pill>)}
          {draft.rawPayloadRef?.barcode && <Pill>Barcode: {draft.rawPayloadRef.barcode}</Pill>}
          <Pill>Not trainer verified</Pill>
        </ProvenanceStrip>

        <TopFields>
          <FieldGroup>
            Log date
            <DateInput
              aria-label="Nutrition log date"
              type="date"
              max={todayIso()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </FieldGroup>
          <FieldGroup>
            Workout timing
            <MealSelect
              aria-label="Workout timing"
              value={workoutProximity}
              onChange={(event) => setWorkoutProximity(event.target.value as NutritionWorkoutProximity)}
            >
              {WORKOUT_PROXIMITY.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </MealSelect>
          </FieldGroup>
        </TopFields>

        {draft.reviewNotes.length > 0 && (
          <ReviewNotes aria-label="Review questions">
            {draft.reviewNotes.map((note) => <li key={note}>{note}</li>)}
          </ReviewNotes>
        )}

        <FoodList>
          {foods.map((food, index) => (
            <NutritionReviewFoodRow
              key={food.id}
              food={food}
              index={index}
              onDescription={updateDescription}
              onMealType={updateMealType}
              onNutrient={updateNutrient}
              onServing={updateServing}
            />
          ))}
        {status && <Status role="status" aria-live="polite"><CheckCircle2 size={14} /> {status}</Status>}
        {error && <Status role="alert" aria-live="assertive" $error><AlertTriangle size={14} /> {error}</Status>}
        </FoodList>

        <ActionRow>
          <SaveButton type="button" onClick={() => handleSave(false)} disabled={saving} aria-busy={saving}>
            <ClipboardCheck size={17} />
            {saving ? 'Saving...' : `Approve and save ${savableCount} ${savableCount === 1 ? 'item' : 'items'}`}
          </SaveButton>
          <SecondaryButton type="button" onClick={() => handleSave(true)} disabled={saving}>
            <Flag size={17} /> Save for coach review
          </SecondaryButton>
          <TertiaryButton type="button" onClick={requestClose} disabled={saving}>Cancel</TertiaryButton>
        </ActionRow>
      </DrawerPanel>
    </DrawerBackdrop>,
    document.body,
  );
};

export default NutritionReviewDrawer;
