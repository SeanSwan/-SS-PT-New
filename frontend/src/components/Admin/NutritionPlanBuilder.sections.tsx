import { Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import {
  BodyText,
  CardBody,
  CardHeader,
  ErrorText,
  FormField,
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
import {
  ActionRow,
  BuilderCard,
  FieldErrorText,
  FormErrorList,
  FormGrid,
  HeaderRow,
  MealCard,
  MealHeader,
  Subheading,
  SuccessText,
} from './NutritionPlanBuilder.styles';
import NutritionPlanBuilderClientPicker from './NutritionPlanBuilderClientPicker';
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
  isLoading,
  loadError,
  onSelectClient,
  selectedClientId,
}: {
  isLoading: boolean;
  loadError: string | null;
  onSelectClient: (clientId: number) => void;
  selectedClientId?: number;
}) => (
  <BuilderCard>
    <CardHeader>
      <SectionTitle>Client</SectionTitle>
    </CardHeader>
    <CardBody>
      <FormField>
        {/* The dropdown trigger carries its own aria-label; htmlFor would
            dangle when the picker renders the dropdown branch. */}
        <Label as="span" required>Client</Label>
        <NutritionPlanBuilderClientPicker
          selectedClientId={selectedClientId}
          onSelectClient={onSelectClient}
        />
        <HelperText>Search by name or email — recent clients appear first.</HelperText>
      </FormField>
      {loadError && <ErrorText>{loadError}</ErrorText>}
      {isLoading && <SmallText secondary>Loading existing plan...</SmallText>}
    </CardBody>
  </BuilderCard>
);

export const PlanOverviewCard = ({
  carbsGrams,
  dailyCalories,
  endDate,
  fatGrams,
  fieldErrors,
  formErrors,
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
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
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
  <BuilderCard>
    <CardHeader>
      <SectionTitle>Plan Overview</SectionTitle>
    </CardHeader>
    <CardBody>
      <FormGrid>
        <NutritionInput id="plan-name" label="Plan Name" required value={planName} onChange={setPlanName} placeholder="Custom Nutrition Plan" error={fieldErrors.planName?.[0]} />
        <NutritionInput id="daily-calories" label="Daily Calories" required type="number" value={dailyCalories} onChange={setDailyCalories} placeholder="2200" error={fieldErrors.dailyCalories?.[0]} />
        <NutritionInput id="protein-grams" label="Protein (g)" type="number" value={proteinGrams} onChange={setProteinGrams} placeholder="150" error={fieldErrors.proteinGrams?.[0]} />
        <NutritionInput id="carbs-grams" label="Carbs (g)" type="number" value={carbsGrams} onChange={setCarbsGrams} placeholder="200" error={fieldErrors.carbsGrams?.[0]} />
        <NutritionInput id="fat-grams" label="Fat (g)" type="number" value={fatGrams} onChange={setFatGrams} placeholder="70" error={fieldErrors.fatGrams?.[0]} />
        <NutritionInput id="nutrition-start-date" label="Start Date" type="date" value={startDate} onChange={setStartDate} error={fieldErrors.startDate?.[0]} />
        <NutritionInput id="nutrition-end-date" label="End Date" type="date" value={endDate} onChange={setEndDate} error={fieldErrors.endDate?.[0]} />
      </FormGrid>
      {formErrors.length > 0 && (
        <FormErrorList role="alert">
          {formErrors.map((message) => <li key={message}>{message}</li>)}
        </FormErrorList>
      )}
    </CardBody>
  </BuilderCard>
);

const NutritionInput = ({
  error,
  id,
  label,
  onChange,
  placeholder,
  required,
  type,
  value,
}: {
  error?: string;
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
      hasError={!!error}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
    />
    {error && <FieldErrorText id={`${id}-error`}>{error}</FieldErrorText>}
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
  <BuilderCard>
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
          <FormGrid>
            <NutritionInput id={`meal-name-${index}`} label="Meal Name" value={meal.name} onChange={(value) => onMealChange(index, 'name', value)} placeholder="Breakfast" />
            <NutritionInput id={`meal-time-${index}`} label="Time" value={meal.time} onChange={(value) => onMealChange(index, 'time', value)} placeholder="7:00 AM" />
          </FormGrid>
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
  </BuilderCard>
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
  <BuilderCard>
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
  </BuilderCard>
);

export const NotesCard = ({ notes, onNotesChange }: { notes: string; onNotesChange: (value: string) => void }) => (
  <BuilderCard>
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
  </BuilderCard>
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
    {successMessage && <SuccessText role="status">{successMessage}</SuccessText>}
    <ActionRow>
      <PrimaryButton type="button" onClick={onSubmit} disabled={isSubmitting}>
        <Save size={16} />
        {isSubmitting ? 'Saving...' : 'Save Nutrition Plan'}
      </PrimaryButton>
    </ActionRow>
  </>
);
