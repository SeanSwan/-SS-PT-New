import { Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import {
  BodyText,
  Card,
  CardBody,
  CardHeader,
  ErrorText,
  FormField,
  GridContainer,
  HelperText,
  Label,
  OutlinedButton,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  SmallText,
  StyledInput,
  StyledTextarea,
  PageTitle,
} from '../UniversalMasterSchedule/ui';
import { ActionRow, HeaderRow, MealCard, MealHeader, Subheading, SuccessText } from './NutritionPlanBuilder.styles';
import type { MealDraft } from './NutritionPlanBuilder.types';

export const BuilderHeader = () => (
  <HeaderRow>
    <div>
      <PageTitle>Nutrition Plan Builder</PageTitle>
      <BodyText secondary>Create structured nutrition plans with macros, meals, and grocery lists.</BodyText>
    </div>
  </HeaderRow>
);

export const ClientSelectionCard = ({
  clientIdInput,
  isLoading,
  loadError,
  numericClientId,
  onClientIdChange,
}: {
  clientIdInput: string;
  isLoading: boolean;
  loadError: string | null;
  numericClientId?: number;
  onClientIdChange: (value: string) => void;
}) => (
  <Card>
    <CardHeader>
      <SectionTitle>Client Selection</SectionTitle>
    </CardHeader>
    <CardBody>
      <FormField>
        <Label htmlFor="nutrition-client-id" required>Client ID</Label>
        <StyledInput
          id="nutrition-client-id"
          type="number"
          value={clientIdInput}
          onChange={(event) => onClientIdChange(event.target.value)}
          placeholder="Enter client user ID"
          hasError={!numericClientId && clientIdInput.length > 0}
        />
        <HelperText>Use the numeric user ID from the client profile.</HelperText>
      </FormField>
      {loadError && <ErrorText>{loadError}</ErrorText>}
      {isLoading && <SmallText secondary>Loading existing plan...</SmallText>}
    </CardBody>
  </Card>
);

export const PlanOverviewCard = ({
  carbsGrams,
  dailyCalories,
  endDate,
  fatGrams,
  planName,
  proteinGrams,
  setCarbsGrams,
  setDailyCalories,
  setEndDate,
  setFatGrams,
  setPlanName,
  setProteinGrams,
  setStartDate,
  startDate,
}: {
  carbsGrams: string;
  dailyCalories: string;
  endDate: string;
  fatGrams: string;
  planName: string;
  proteinGrams: string;
  setCarbsGrams: (value: string) => void;
  setDailyCalories: (value: string) => void;
  setEndDate: (value: string) => void;
  setFatGrams: (value: string) => void;
  setPlanName: (value: string) => void;
  setProteinGrams: (value: string) => void;
  setStartDate: (value: string) => void;
  startDate: string;
}) => (
  <Card>
    <CardHeader>
      <SectionTitle>Plan Overview</SectionTitle>
    </CardHeader>
    <CardBody>
      <GridContainer columns={2} gap="1.5rem">
        <NutritionInput id="plan-name" label="Plan Name" required value={planName} onChange={setPlanName} placeholder="Custom Nutrition Plan" />
        <NutritionInput id="daily-calories" label="Daily Calories" required type="number" value={dailyCalories} onChange={setDailyCalories} placeholder="2200" />
        <NutritionInput id="protein-grams" label="Protein (g)" type="number" value={proteinGrams} onChange={setProteinGrams} placeholder="150" />
        <NutritionInput id="carbs-grams" label="Carbs (g)" type="number" value={carbsGrams} onChange={setCarbsGrams} placeholder="200" />
        <NutritionInput id="fat-grams" label="Fat (g)" type="number" value={fatGrams} onChange={setFatGrams} placeholder="70" />
        <NutritionInput id="nutrition-start-date" label="Start Date" type="date" value={startDate} onChange={setStartDate} />
        <NutritionInput id="nutrition-end-date" label="End Date" type="date" value={endDate} onChange={setEndDate} />
      </GridContainer>
    </CardBody>
  </Card>
);

const NutritionInput = ({
  id,
  label,
  onChange,
  placeholder,
  required,
  type,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) => (
  <FormField>
    <Label htmlFor={id} required={required}>{label}</Label>
    <StyledInput
      id={id}
      min={type === 'number' ? 0 : undefined}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
      value={value}
    />
  </FormField>
);

export const MealsCard = ({
  meals,
  onAddMeal,
  onMealChange,
  onRemoveMeal,
}: {
  meals: MealDraft[];
  onAddMeal: () => void;
  onMealChange: (index: number, field: keyof MealDraft, value: string) => void;
  onRemoveMeal: (index: number) => void;
}) => (
  <Card>
    <CardHeader>
      <SectionTitle>Meals</SectionTitle>
      <SecondaryButton type="button" onClick={onAddMeal}><Plus size={16} /> Add Meal</SecondaryButton>
    </CardHeader>
    <CardBody>
      {meals.map((meal, index) => (
        <MealCard key={`meal-${index}`}>
          <MealHeader>
            <Subheading>Meal {index + 1}</Subheading>
            <OutlinedButton type="button" onClick={() => onRemoveMeal(index)}><Trash2 size={16} /> Remove</OutlinedButton>
          </MealHeader>
          <GridContainer columns={2} gap="1rem">
            <NutritionInput id={`meal-name-${index}`} label="Meal Name" value={meal.name} onChange={(value) => onMealChange(index, 'name', value)} placeholder="Breakfast" />
            <NutritionInput id={`meal-time-${index}`} label="Time" value={meal.time} onChange={(value) => onMealChange(index, 'time', value)} placeholder="7:00 AM" />
          </GridContainer>
          <FormField>
            <Label htmlFor={`meal-items-${index}`}>Ingredients</Label>
            <StyledTextarea
              id={`meal-items-${index}`}
              value={meal.items}
              onChange={(event) => onMealChange(index, 'items', event.target.value)}
              placeholder="Oats, blueberries, almond butter"
              rows={3}
            />
            <HelperText>Separate ingredients with commas or new lines.</HelperText>
          </FormField>
        </MealCard>
      ))}
    </CardBody>
  </Card>
);

export const GroceryListCard = ({
  groceryListText,
  onGenerate,
  onGroceryListChange,
}: {
  groceryListText: string;
  onGenerate: () => void;
  onGroceryListChange: (value: string) => void;
}) => (
  <Card>
    <CardHeader>
      <SectionTitle>Grocery List</SectionTitle>
      <SecondaryButton type="button" onClick={onGenerate}><Sparkles size={16} /> Generate from Meals</SecondaryButton>
    </CardHeader>
    <CardBody>
      <FormField>
        <Label htmlFor="grocery-list">Grocery List</Label>
        <StyledTextarea
          id="grocery-list"
          value={groceryListText}
          onChange={(event) => onGroceryListChange(event.target.value)}
          placeholder="List each item on a new line"
          rows={6}
        />
      </FormField>
    </CardBody>
  </Card>
);

export const NotesCard = ({ notes, onNotesChange }: { notes: string; onNotesChange: (value: string) => void }) => (
  <Card>
    <CardHeader>
      <SectionTitle>Notes</SectionTitle>
    </CardHeader>
    <CardBody>
      <FormField>
        <Label htmlFor="nutrition-notes">Plan Notes</Label>
        <StyledTextarea
          id="nutrition-notes"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Add client-specific guidance, compliance tips, or nutrition coaching notes."
          rows={4}
        />
      </FormField>
    </CardBody>
  </Card>
);

export const NutritionSubmitFooter = ({
  isSubmitting,
  onSubmit,
  successMessage,
}: {
  isSubmitting: boolean;
  onSubmit: () => void;
  successMessage: string | null;
}) => (
  <>
    {successMessage && <SuccessText>{successMessage}</SuccessText>}
    <ActionRow>
      <PrimaryButton type="button" onClick={onSubmit} disabled={isSubmitting}>
        <Save size={16} />
        {isSubmitting ? 'Saving...' : 'Save Nutrition Plan'}
      </PrimaryButton>
    </ActionRow>
  </>
);
