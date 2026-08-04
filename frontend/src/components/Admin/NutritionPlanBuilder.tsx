/**
 * NutritionPlanBuilder
 * ====================
 * Crystalline Swan themed admin UI for creating nutrition plans for clients.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorText } from '../UniversalMasterSchedule/ui';
import { useNutritionPlan } from '../../hooks/useNutritionPlan';
import apiService from '../../services/api.service';
import {
  buildNutritionPayload,
  defaultMeal,
  generateGroceryListText,
  mapExistingPlanMeals,
  mapNutritionApiErrors,
} from './NutritionPlanBuilder.logic';
import {
  BuilderHeader,
  ClientSelectionCard,
  GroceryListCard,
  MealsCard,
  NotesCard,
  NutritionSubmitFooter,
  PlanOverviewCard,
} from './NutritionPlanBuilder.sections';
import { PageWrapper } from './NutritionPlanBuilder.styles';
import type { MealDraft } from './NutritionPlanBuilder.types';

const NutritionPlanBuilder: React.FC = () => {
  const { clientId: clientIdParam } = useParams();
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(() => {
    const parsed = Number(clientIdParam);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  });
  const numericClientId = selectedClientId;

  const { data: existingPlan, isLoading, error: loadError, refetch } = useNutritionPlan(numericClientId);

  const [planName, setPlanName] = useState('');
  const [dailyCalories, setDailyCalories] = useState('');
  const [proteinGrams, setProteinGrams] = useState('');
  const [carbsGrams, setCarbsGrams] = useState('');
  const [fatGrams, setFatGrams] = useState('');
  const [notes, setNotes] = useState('');
  const [meals, setMeals] = useState<MealDraft[]>([{ ...defaultMeal }]);
  const [groceryListText, setGroceryListText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Switching clients starts a fresh conversation — stale save results,
  // bounds errors, AND form values from the previous client must not linger
  // (a leftover plan silently written to the wrong client is a data hazard).
  // If the new client has a plan, the existingPlan effect below refills it.
  useEffect(() => {
    setFormError(null);
    setFieldErrors({});
    setFormErrors([]);
    setSuccessMessage(null);
    setPlanName('');
    setDailyCalories('');
    setProteinGrams('');
    setCarbsGrams('');
    setFatGrams('');
    setNotes('');
    setMeals([{ ...defaultMeal }]);
    setGroceryListText('');
    setStartDate('');
    setEndDate('');
  }, [numericClientId]);

  useEffect(() => {
    if (!existingPlan) return;

    setPlanName(existingPlan.name || '');
    setDailyCalories(existingPlan.dailyCalories ? String(existingPlan.dailyCalories) : '');
    setProteinGrams(existingPlan.macros?.protein ? String(existingPlan.macros.protein) : '');
    setCarbsGrams(existingPlan.macros?.carbs ? String(existingPlan.macros.carbs) : '');
    setFatGrams(existingPlan.macros?.fat ? String(existingPlan.macros.fat) : '');
    setNotes(existingPlan.notes || '');
    setStartDate(existingPlan.startDate ? existingPlan.startDate.split('T')[0] : '');
    setEndDate(existingPlan.endDate ? existingPlan.endDate.split('T')[0] : '');

    const mappedMeals = mapExistingPlanMeals(existingPlan.meals);
    if (mappedMeals.length > 0) setMeals(mappedMeals);
    if (Array.isArray(existingPlan.groceryList)) setGroceryListText(existingPlan.groceryList.join('\n'));
  }, [existingPlan]);

  const handleAddMeal = () => {
    setMeals((prev) => [...prev, { ...defaultMeal }]);
  };

  const handleRemoveMeal = (index: number) => {
    setMeals((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMealChange = (index: number, field: keyof MealDraft, value: string) => {
    setMeals((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleGenerateGroceryList = () => {
    setGroceryListText(generateGroceryListText(meals));
  };

  const handleSubmit = async () => {
    setFormError(null);
    setFieldErrors({});
    setFormErrors([]);
    setSuccessMessage(null);

    if (!numericClientId) {
      setFormError('Select a client before saving.');
      return;
    }

    if (!planName.trim()) {
      setFormError('Plan name is required.');
      return;
    }

    if (!dailyCalories.trim()) {
      setFormError('Daily calories are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = buildNutritionPayload({
        carbsGrams,
        dailyCalories,
        endDate,
        fatGrams,
        groceryListText,
        meals,
        notes,
        planName,
        proteinGrams,
        startDate,
      });

      const response = await apiService.post(`/api/nutrition/${numericClientId}`, payload);
      const result = response.data;

      if (result?.success === false) {
        applyApiErrors(result?.errors, result?.message);
        return;
      }

      // The backend now also activates a versioned nutrition target when macro
      // fields are present, and returns it as `target`.
      setSuccessMessage(
        result?.target
          ? 'Nutrition plan saved. Macro targets are now active for adherence tracking.'
          : 'Nutrition plan saved successfully.'
      );
      await refetch();
    } catch (error: any) {
      console.error('Error saving nutrition plan:', error);
      const data = error?.response?.data;
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        applyApiErrors(data.errors, data?.message);
      } else if (data?.message) {
        setFormError(data.message);
      } else {
        setFormError('Network error saving nutrition plan.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Surface the backend's 400 `{ errors: [...] }` bounds violations inline. */
  const applyApiErrors = (errors: unknown, message?: string) => {
    const mapped = mapNutritionApiErrors(errors);
    const hasInline = Object.keys(mapped.fields).length > 0 || mapped.form.length > 0;
    setFieldErrors(mapped.fields);
    setFormErrors(mapped.form);
    setFormError(
      hasInline
        ? message || 'Some values are out of bounds — fix the highlighted fields.'
        : message || 'Failed to save nutrition plan.'
    );
  };

  return (
    <PageWrapper>
      <BuilderHeader />
      <ClientSelectionCard
        isLoading={isLoading}
        loadError={loadError}
        onSelectClient={setSelectedClientId}
        selectedClientId={selectedClientId}
      />
      <PlanOverviewCard
        carbsGrams={carbsGrams}
        dailyCalories={dailyCalories}
        endDate={endDate}
        fatGrams={fatGrams}
        fieldErrors={fieldErrors}
        formErrors={formErrors}
        planName={planName}
        proteinGrams={proteinGrams}
        setCarbsGrams={setCarbsGrams}
        setDailyCalories={setDailyCalories}
        setEndDate={setEndDate}
        setFatGrams={setFatGrams}
        setPlanName={setPlanName}
        setProteinGrams={setProteinGrams}
        setStartDate={setStartDate}
        startDate={startDate}
      />
      <MealsCard
        meals={meals}
        onAddMeal={handleAddMeal}
        onMealChange={handleMealChange}
        onRemoveMeal={handleRemoveMeal}
      />
      <GroceryListCard
        groceryListText={groceryListText}
        onGenerate={handleGenerateGroceryList}
        onGroceryListChange={setGroceryListText}
      />
      <NotesCard notes={notes} onNotesChange={setNotes} />

      {formError && <ErrorText role="alert">{formError}</ErrorText>}
      <NutritionSubmitFooter
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        successMessage={successMessage}
      />
    </PageWrapper>
  );
};

export default NutritionPlanBuilder;
