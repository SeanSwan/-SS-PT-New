/**
 * NutritionPlanBuilder
 * ====================
 * Galaxy-Swan themed admin UI for creating nutrition plans for clients.
 */

import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';
import { Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import {
  PageTitle,
  SectionTitle,
  BodyText,
  SmallText,
  ErrorText,
  HelperText,
  Label,
  FormField,
  StyledInput,
  StyledTextarea,
  PrimaryButton,
  OutlinedButton,
  SecondaryButton,
  Card,
  CardHeader,
  CardBody,
  GridContainer,
  FlexBox
} from '../UniversalMasterSchedule/ui';
import { useNutritionPlan } from '../../hooks/useNutritionPlan';

type MealDraft = {
  name: string;
  time: string;
  items: string;
};

const defaultMeal: MealDraft = { name: '', time: '', items: '' };

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
    if (!existingPlan) {
      return;
    }

    setPlanName(existingPlan.name || '');
    setDailyCalories(existingPlan.dailyCalories ? String(existingPlan.dailyCalories) : '');
    setProteinGrams(existingPlan.macros?.protein ? String(existingPlan.macros.protein) : '');
    setCarbsGrams(existingPlan.macros?.carbs ? String(existingPlan.macros.carbs) : '');
    setFatGrams(existingPlan.macros?.fat ? String(existingPlan.macros.fat) : '');
    setNotes(existingPlan.notes || '');
    setStartDate(existingPlan.startDate ? existingPlan.startDate.split('T')[0] : '');
    setEndDate(existingPlan.endDate ? existingPlan.endDate.split('T')[0] : '');

    if (Array.isArray(existingPlan.meals) && existingPlan.meals.length > 0) {
      const mappedMeals = existingPlan.meals.map((meal) => ({
        name: meal.name || '',
        time: meal.time || '',
        items: Array.isArray(meal.foods)
          ? meal.foods.map((food) => food.name).join('\n')
          : ''
      }));
      setMeals(mappedMeals);
    }

    if (Array.isArray(existingPlan.groceryList)) {
      setGroceryListText(existingPlan.groceryList.join('\n'));
    }
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

  const parseList = (value: string) => value
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);

  const buildMealsPayload = () => meals
    .filter((meal) => meal.name.trim())
    .map((meal) => ({
      name: meal.name.trim(),
      time: meal.time.trim(),
      foods: parseList(meal.items).map((item) => ({
        name: item,
        portion: '1 serving'
      }))
    }));

  const handleGenerateGroceryList = () => {
    const items = meals.flatMap((meal) => parseList(meal.items));
    const uniqueItems = Array.from(new Set(items));
    setGroceryListText(uniqueItems.join('\n'));
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
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to save nutrition plans.');
        return;
      }

      const payload = {
        planName: planName.trim(),
        dailyCalories: Number(dailyCalories),
        proteinGrams: Number(proteinGrams) || 0,
        carbsGrams: Number(carbsGrams) || 0,
        fatGrams: Number(fatGrams) || 0,
        mealsJson: buildMealsPayload(),
        groceryListJson: parseList(groceryListText),
        notes: notes.trim(),
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || null
      };

      const response = await fetch(`/api/nutrition/${numericClientId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
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
      <HeaderRow>
        <div>
          <PageTitle>Nutrition Plan Builder</PageTitle>
          <BodyText secondary>
            Create structured nutrition plans with macros, meals, and grocery lists.
          </BodyText>
        </div>
      </HeaderRow>

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
              onChange={(event) => setClientIdInput(event.target.value)}
              placeholder="Enter client user ID"
              hasError={!numericClientId && clientIdInput.length > 0}
            />
            <HelperText>Use the numeric user ID from the client profile.</HelperText>
          </FormField>
          {loadError && <ErrorText>{loadError}</ErrorText>}
          {isLoading && <SmallText secondary>Loading existing plan...</SmallText>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Plan Overview</SectionTitle>
        </CardHeader>
        <CardBody>
          <GridContainer columns={2} gap="1.5rem">
            <FormField>
              <Label htmlFor="plan-name" required>Plan Name</Label>
              <StyledInput
                id="plan-name"
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
                placeholder="Custom Nutrition Plan"
              />
            </FormField>
            <FormField>
              <Label htmlFor="daily-calories" required>Daily Calories</Label>
              <StyledInput
                id="daily-calories"
                type="number"
                min={0}
                value={dailyCalories}
                onChange={(event) => setDailyCalories(event.target.value)}
                placeholder="2200"
              />
            </FormField>
            <FormField>
              <Label htmlFor="protein-grams">Protein (g)</Label>
              <StyledInput
                id="protein-grams"
                type="number"
                min={0}
                value={proteinGrams}
                onChange={(event) => setProteinGrams(event.target.value)}
                placeholder="150"
              />
            </FormField>
            <FormField>
              <Label htmlFor="carbs-grams">Carbs (g)</Label>
              <StyledInput
                id="carbs-grams"
                type="number"
                min={0}
                value={carbsGrams}
                onChange={(event) => setCarbsGrams(event.target.value)}
                placeholder="200"
              />
            </FormField>
            <FormField>
              <Label htmlFor="fat-grams">Fat (g)</Label>
              <StyledInput
                id="fat-grams"
                type="number"
                min={0}
                value={fatGrams}
                onChange={(event) => setFatGrams(event.target.value)}
                placeholder="70"
              />
            </FormField>
            <FormField>
              <Label htmlFor="nutrition-start-date">Start Date</Label>
              <StyledInput
                id="nutrition-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </FormField>
            <FormField>
              <Label htmlFor="nutrition-end-date">End Date</Label>
              <StyledInput
                id="nutrition-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </FormField>
          </GridContainer>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Meals</SectionTitle>
          <SecondaryButton type="button" onClick={handleAddMeal}>
            <Plus size={16} /> Add Meal
          </SecondaryButton>
        </CardHeader>
        <CardBody>
          {meals.map((meal, index) => (
            <MealCard key={`meal-${index}`}>
              <MealHeader>
                <Subheading>Meal {index + 1}</Subheading>
                <OutlinedButton type="button" onClick={() => handleRemoveMeal(index)}>
                  <Trash2 size={16} /> Remove
                </OutlinedButton>
              </MealHeader>
              <GridContainer columns={2} gap="1rem">
                <FormField>
                  <Label htmlFor={`meal-name-${index}`}>Meal Name</Label>
                  <StyledInput
                    id={`meal-name-${index}`}
                    value={meal.name}
                    onChange={(event) => handleMealChange(index, 'name', event.target.value)}
                    placeholder="Breakfast"
                  />
                </FormField>
                <FormField>
                  <Label htmlFor={`meal-time-${index}`}>Time</Label>
                  <StyledInput
                    id={`meal-time-${index}`}
                    value={meal.time}
                    onChange={(event) => handleMealChange(index, 'time', event.target.value)}
                    placeholder="7:00 AM"
                  />
                </FormField>
              </GridContainer>
              <FormField>
                <Label htmlFor={`meal-items-${index}`}>Ingredients</Label>
                <StyledTextarea
                  id={`meal-items-${index}`}
                  value={meal.items}
                  onChange={(event) => handleMealChange(index, 'items', event.target.value)}
                  placeholder="Oats, blueberries, almond butter"
                  rows={3}
                />
                <HelperText>Separate ingredients with commas or new lines.</HelperText>
              </FormField>
            </MealCard>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Grocery List</SectionTitle>
          <SecondaryButton type="button" onClick={handleGenerateGroceryList}>
            <Sparkles size={16} /> Generate from Meals
          </SecondaryButton>
        </CardHeader>
        <CardBody>
          <FormField>
            <Label htmlFor="grocery-list">Grocery List</Label>
            <StyledTextarea
              id="grocery-list"
              value={groceryListText}
              onChange={(event) => setGroceryListText(event.target.value)}
              placeholder="List each item on a new line"
              rows={6}
            />
          </FormField>
        </CardBody>
      </Card>

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
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add client-specific guidance, compliance tips, or nutrition coaching notes."
              rows={4}
            />
          </FormField>
        </CardBody>
      </Card>

      {formError && <ErrorText>{formError}</ErrorText>}
      {successMessage && <SuccessText>{successMessage}</SuccessText>}

      <ActionRow>
        <PrimaryButton type="button" onClick={handleSubmit} disabled={isSubmitting}>
          <Save size={16} />
          {isSubmitting ? 'Saving...' : 'Save Nutrition Plan'}
        </PrimaryButton>
      </ActionRow>
    </PageWrapper>
  );
};

export default NutritionPlanBuilder;

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Subheading = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
`;

const MealCard = styled(Card)`
  padding: 1rem;
  margin-bottom: 1rem;
`;

const MealHeader = styled(FlexBox)`
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.75rem;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
`;

const SuccessText = styled.span`
  display: block;
  font-size: 0.875rem;
  color: #10b981;
`;
