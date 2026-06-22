import React from 'react';
import { Activity, Pencil, Plus, Trash2, UtensilsCrossed, X, Zap } from 'lucide-react';
import type { FoodItem, FoodQuality, MealType, SavedMacroEntry } from './FoodIntakeForm.logic';
import { FOOD_QUALITY } from './FoodIntakeForm.logic';
import {
  AddButton,
  Chip,
  FieldError,
  FieldGroup,
  FoodCard,
  FoodCardHeader,
  FoodCardTitle,
  FoodFieldGrid,
  FormGrid,
  HelperText,
  IconBtn,
  InputWithUnit,
  Label,
  MacroFieldGrid,
  SavedMealActions,
  SavedMealCard,
  SavedMealHeader,
  SavedMealMeta,
  SavedMealTitle,
  SecondaryButton,
  Spinner,
  StatusRow,
  StyledInput,
  StyledSelect,
  SubmitButton,
  SummaryCard,
  SummaryGrid,
  SummaryHeading,
  SummaryLabel,
  SummaryValue,
  ToastCloseBtn,
  ToastContent,
  ToastOverlay,
  UnitSuffix,
} from './FoodIntakeForm.styles';

type FoodItemChange = <K extends keyof FoodItem>(id: string, field: K, value: FoodItem[K]) => void;
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

const parseMacroInput = (value: string): number => {
  const trimmed = value.trim();
  if (!trimmed || !DECIMAL_NUMBER_PATTERN.test(trimmed)) return 0;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

interface StatusChipsProps {
  statusMessage: string | null;
}

export const StatusChips = ({ statusMessage }: StatusChipsProps) => (
  <>
    <StatusRow>
      <Chip $active><Zap />Nutrition API: Active</Chip>
      <Chip $active><Activity />Gamification API: Connected</Chip>
    </StatusRow>
    {statusMessage && <SavedMealMeta role="status" aria-live="polite">{statusMessage}</SavedMealMeta>}
  </>
);

interface SavedMealNoticeProps {
  entry: SavedMacroEntry | null;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const SavedMealNotice = ({ entry, deleting, onEdit, onDelete }: SavedMealNoticeProps) => {
  if (!entry) return null;
  const canEdit = entry.id !== undefined && entry.id !== null;
  return (
    <SavedMealCard aria-live="polite">
      <SavedMealHeader>
        <div>
          <SavedMealTitle>Saved to My Macros</SavedMealTitle>
          <SavedMealMeta>{entry.description}</SavedMealMeta>
        </div>
        <SavedMealMeta>
          {Math.round(entry.calories)} kcal | P {Math.round(entry.protein)}g | C {Math.round(entry.carbs)}g | F {Math.round(entry.fat)}g
        </SavedMealMeta>
      </SavedMealHeader>
      <SavedMealActions>
        <SecondaryButton type="button" onClick={onEdit} disabled={!canEdit}>
          <Pencil /> Edit saved meal
        </SecondaryButton>
        <SecondaryButton type="button" $danger onClick={onDelete} disabled={!canEdit || deleting} aria-busy={deleting}>
          {deleting ? <Spinner /> : <Trash2 />} Remove saved meal
        </SecondaryButton>
      </SavedMealActions>
    </SavedMealCard>
  );
};

interface FoodItemsEditorProps {
  foodItems: FoodItem[];
  fieldErrors: Record<string, string>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: FoodItemChange;
}

export const FoodItemsEditor = ({ foodItems, fieldErrors, onAdd, onRemove, onChange }: FoodItemsEditorProps) => (
  <>
    {foodItems.map((item, index) => {
      const qualityId = `food-quality-${item.id}`;
      return (
        <FoodCard key={item.id}>
          <FoodCardHeader>
            <FoodCardTitle>Food Item #{index + 1}</FoodCardTitle>
            <IconBtn
              type="button"
              $danger
              $disabled={foodItems.length <= 1}
              disabled={foodItems.length <= 1}
              onClick={() => onRemove(item.id)}
              aria-label={`Remove food item ${index + 1}`}
            >
              <Trash2 />
            </IconBtn>
          </FoodCardHeader>
          <FoodFieldGrid>
            <TextField id={`food-name-${item.id}`} label="Food Name" value={item.name} error={fieldErrors[`food-name-${item.id}`]} onChange={(value) => onChange(item.id, 'name', value)} />
            <TextField id={`food-portion-${item.id}`} label="Portion/Serving Size" value={item.portion} error={fieldErrors[`food-portion-${item.id}`]} onChange={(value) => onChange(item.id, 'portion', value)} />
          </FoodFieldGrid>
          <MacroFieldGrid>
            <NumberField id={`food-cal-${item.id}`} label="Calories" value={item.calories} unit="kcal" onChange={(value) => onChange(item.id, 'calories', value)} />
            <NumberField id={`food-protein-${item.id}`} label="Protein" value={item.protein} unit="g" onChange={(value) => onChange(item.id, 'protein', value)} />
            <NumberField id={`food-carbs-${item.id}`} label="Carbs" value={item.carbs} unit="g" onChange={(value) => onChange(item.id, 'carbs', value)} />
            <NumberField id={`food-fat-${item.id}`} label="Fat" value={item.fat} unit="g" onChange={(value) => onChange(item.id, 'fat', value)} />
          </MacroFieldGrid>
          <FieldGroup>
            <Label htmlFor={qualityId}>Food Quality</Label>
            <StyledSelect id={qualityId} value={item.quality} onChange={(event) => onChange(item.id, 'quality', event.target.value as FoodQuality)}>
              {FOOD_QUALITY.map((quality) => <option key={quality.value} value={quality.value}>{quality.label}</option>)}
            </StyledSelect>
            <HelperText>Use the closest honest quality label; consistency beats perfect tracking.</HelperText>
          </FieldGroup>
        </FoodCard>
      );
    })}
    <AddButton type="button" onClick={onAdd}><Plus />Add Another Food Item</AddButton>
  </>
);

const TextField = ({ id, label, value, error, onChange }: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) => (
  <FieldGroup>
    <Label htmlFor={id}>{label}</Label>
    <StyledInput
      id={id}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required
      placeholder={label === 'Food Name' ? 'e.g., Grilled Chicken' : 'e.g., 1 cup, 100g'}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      $hasError={!!error}
    />
    {error && <FieldError id={`${id}-error`} role="alert">{error}</FieldError>}
  </FieldGroup>
);

const NumberField = ({ id, label, value, unit, onChange }: {
  id: string;
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) => (
  <FieldGroup>
    <Label htmlFor={id}>{label}</Label>
    <InputWithUnit>
      <StyledInput id={id} type="number" value={value} onChange={(event) => onChange(parseMacroInput(event.target.value))} min={0} $hasUnit />
      <UnitSuffix>{unit}</UnitSuffix>
    </InputWithUnit>
  </FieldGroup>
);

export const NutritionSummary = ({ totals }: { totals: { calories: number; protein: number; carbs: number; fat: number } }) => (
  <div>
    <SummaryHeading>Nutrition Summary</SummaryHeading>
    <SummaryGrid>
      <SummaryTile label="Calories" value={`${totals.calories} kcal`} />
      <SummaryTile label="Protein" value={`${totals.protein} g`} />
      <SummaryTile label="Carbs" value={`${totals.carbs} g`} />
      <SummaryTile label="Fat" value={`${totals.fat} g`} />
    </SummaryGrid>
  </div>
);

const SummaryTile = ({ label, value }: { label: string; value: string }) => (
  <SummaryCard>
    <SummaryLabel>{label}</SummaryLabel>
    <SummaryValue>{value}</SummaryValue>
  </SummaryCard>
);

export const SubmitRow = ({ loading, editing }: { loading: boolean; editing: boolean }) => (
  <SubmitButton type="submit" disabled={loading} $loading={loading} aria-busy={loading}>
    {loading ? <Spinner /> : <UtensilsCrossed />}
    {loading ? (editing ? 'Updating...' : 'Submitting...') : (editing ? 'Update Saved Meal' : 'Log Food Intake')}
  </SubmitButton>
);

export const FoodFormGrid = FormGrid;

export const SuccessToast = ({ visible, exiting, message, onClose }: {
  visible: boolean;
  exiting: boolean;
  message: string;
  onClose: () => void;
}) => visible ? (
  <ToastOverlay $exiting={exiting}>
    <ToastContent role="status" aria-live="polite" aria-atomic="true">
      {message}
      <ToastCloseBtn type="button" onClick={onClose} aria-label="Close notification"><X /></ToastCloseBtn>
    </ToastContent>
  </ToastOverlay>
) : null;

export const mealTypeLabel = (mealType: MealType) =>
  mealType.charAt(0).toUpperCase() + mealType.slice(1);
