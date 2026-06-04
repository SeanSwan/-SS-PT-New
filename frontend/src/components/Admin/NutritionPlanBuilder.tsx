/**
 * NutritionPlanBuilder
 * ====================
 * Crystalline Swan themed admin UI for creating nutrition plans for clients.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorText } from '../UniversalMasterSchedule/ui';
import { useNutritionPlan } from '../../hooks/useNutritionPlan';
import apiService from '../../services/api.service';
import {
  buildNutritionPayload,
  defaultMeal,
  generateGroceryListText,
  mapExistingPlanMeals,
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
  const [clientIdInput, setClientIdInput] = useState(clientIdParam || '');
  const numericClientId = useMemo(() => {
    const parsed = Number(clientIdInput);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [clientIdInput]);

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setSuccessMessage(null);

    if (!numericClientId) {
      setFormError('Valid client ID is required.');
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
        setFormError(result?.message || 'Failed to save nutrition plan.');
        return;
      }

      setSuccessMessage('Nutrition plan saved successfully.');
      await refetch();
    } catch (error) {
      console.error('Error saving nutrition plan:', error);
      setFormError('Network error saving nutrition plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <BuilderHeader />
      <ClientSelectionCard
        clientIdInput={clientIdInput}
        isLoading={isLoading}
        loadError={loadError}
        numericClientId={numericClientId}
        onClientIdChange={setClientIdInput}
      />
      <PlanOverviewCard
        carbsGrams={carbsGrams}
        dailyCalories={dailyCalories}
        endDate={endDate}
        fatGrams={fatGrams}
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

      {formError && <ErrorText>{formError}</ErrorText>}
      <NutritionSubmitFooter
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        successMessage={successMessage}
      />
    </PageWrapper>
  );
};

export default NutritionPlanBuilder;
