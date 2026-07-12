import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { MEAL_TYPE_OPTIONS } from './mealPhotoLog';
import { reconcileCalories } from './nutritionDraft.adapters';
import type {
  NutrientMap,
  NutritionDraftFood,
  NutritionServingBasis,
} from './nutritionDraft.types';
import {
  FieldGroup,
  FoodRow,
  MacroGrid,
  MacroInput,
  MealSelect,
  Pill,
  ReconciliationPanel,
  ServingGrid,
  TextInput,
} from './NutritionReviewDrawer.styles';

const NUTRIENT_FIELDS: Array<{ key: keyof NutrientMap; label: string }> = [
  { key: 'calories', label: 'Calories' },
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'fiber', label: 'Fiber' },
  { key: 'sugar', label: 'Sugar' },
  { key: 'sodium', label: 'Sodium' },
];

const SERVING_BASES: Array<{ value: NutritionServingBasis; label: string }> = [
  { value: 'label', label: 'Label serving' },
  { value: 'per_100g', label: 'Per 100 g' },
  { value: 'weighed', label: 'Weighed amount' },
  { value: 'household', label: 'Household measure' },
  { value: 'estimated', label: 'Estimated serving' },
];

interface NutritionReviewFoodRowProps {
  food: NutritionDraftFood;
  index: number;
  onDescription: (id: string, value: string) => void;
  onMealType: (id: string, value: string) => void;
  onNutrient: (id: string, field: keyof NutrientMap, value: string) => void;
  onServing: (id: string, field: 'basis' | 'quantity' | 'unit', value: string) => void;
}

const mealLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const NutritionReviewFoodRow: React.FC<NutritionReviewFoodRowProps> = ({
  food,
  index,
  onDescription,
  onMealType,
  onNutrient,
  onServing,
}) => {
  const label = food.displayName || food.description || `food ${index + 1}`;
  const reconciliation = reconcileCalories(food.nutrients);

  return (
    <FoodRow>
      <FieldGroup>
        Food {index + 1} description
        <TextInput
          aria-label={`Food ${index + 1} description`}
          value={food.description}
          onChange={(event) => onDescription(food.id, event.target.value)}
        />
      </FieldGroup>
      <FieldGroup>
        Meal type
        <MealSelect
          aria-label={`Meal type for ${label}`}
          value={food.mealType}
          onChange={(event) => onMealType(food.id, event.target.value)}
        >
          {MEAL_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{mealLabel(type)}</option>)}
        </MealSelect>
      </FieldGroup>

      <ServingGrid>
        <FieldGroup>
          Serving basis
          <MealSelect
            aria-label={`Serving basis for ${label}`}
            value={food.serving.basis}
            onChange={(event) => onServing(food.id, 'basis', event.target.value)}
          >
            {SERVING_BASES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </MealSelect>
        </FieldGroup>
        <FieldGroup>
          Serving quantity
          <MacroInput
            aria-label={`Serving quantity for ${label}`}
            type="number"
            min="0"
            step="0.1"
            value={food.serving.quantity ?? ''}
            onChange={(event) => onServing(food.id, 'quantity', event.target.value)}
          />
        </FieldGroup>
        <FieldGroup>
          Serving unit
          <TextInput
            aria-label={`Serving unit for ${label}`}
            value={food.serving.unit}
            onChange={(event) => onServing(food.id, 'unit', event.target.value)}
          />
        </FieldGroup>
      </ServingGrid>

      <MacroGrid>
        {NUTRIENT_FIELDS.map(({ key, label: nutrientLabel }) => (
          <FieldGroup key={key}>
            {nutrientLabel}
            <MacroInput
              aria-label={`${nutrientLabel} for ${label}`}
              type="number"
              min="0"
              step="0.1"
              value={food.nutrients[key] ?? ''}
              onChange={(event) => onNutrient(food.id, key, event.target.value)}
            />
          </FieldGroup>
        ))}
      </MacroGrid>

      <ReconciliationPanel $warning={reconciliation.status === 'metabolic_deviation'}>
        {reconciliation.calculatedCalories === null
          ? 'Atwater check needs protein, carbs, and fat.'
          : `Atwater estimate: ${reconciliation.calculatedCalories} kcal. ${reconciliation.differenceCalories === null
            ? 'No reported calorie value to compare.'
            : `Difference: ${reconciliation.differenceCalories} kcal (${reconciliation.differencePercent}%).`}`}
        {reconciliation.status === 'metabolic_deviation' && (
          <Pill><AlertTriangle size={14} /> Metabolic deviation - coach review recommended</Pill>
        )}
      </ReconciliationPanel>
    </FoodRow>
  );
};

export default NutritionReviewFoodRow;
