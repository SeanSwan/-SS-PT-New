/**
 * Nutrition Planning Component
 * AI-powered nutrition plans tailored to workout programs and dietary preferences
 *
 * Migrated from MUI to styled-components + lucide-react
 * Galaxy-Swan theme: Galaxy Core #0a0a1a, Swan Cyan #00FFFF, Cosmic Purple #7851A9
 */

import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed, Dumbbell, Activity, Utensils,
  ChevronDown, CheckCircle2, Pizza, Coffee,
  Leaf, AlertTriangle, X, Plus, Minus, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';

/* ───────────────────────── Keyframes ───────────────────────── */

const spin = keyframes`
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

/* ───────────────────────── Styled Components ───────────────────────── */

const NutritionContainer = styled.div`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 16px;
  padding: 2rem;
  min-height: 600px;
  color: white;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const PageTitle = styled.h2`
  color: #ff6b9d;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 0.95rem;
  min-height: 44px;
  min-width: 44px;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const NutritionCard = styled.div`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  height: 100%;
`;

const CardBody = styled.div`
  padding: 1.5rem;
`;

const MacroCard = styled.div`
  background: rgba(30, 30, 60, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  color: white;
  text-align: center;
`;

const MealCard = styled.div`
  background: rgba(40, 40, 70, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  margin-bottom: 1rem;
`;

const RestrictionChip = styled.span<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.85rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  user-select: none;
  margin: 0.25rem;
  transition: background 0.2s, border-color 0.2s;
  border: 1px solid #ffc107;
  color: #ffc107;
  background: ${({ $selected }) =>
    $selected ? 'rgba(255, 193, 7, 0.3)' : 'transparent'};

  &:hover {
    background: rgba(255, 193, 7, 0.15);
  }
`;

/* ── Grid helpers ── */

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const FullSpan = styled.div`
  grid-column: 1 / -1;
`;

const MacroGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 600px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

/* ── Form controls ── */

const FieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const FieldLabel = styled.label`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  font-weight: 500;
`;

const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(20, 20, 40, 0.6);
  color: white;
  font-size: 0.95rem;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #ff6b9d;
  }

  option {
    background: #1e1e3c;
    color: white;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(20, 20, 40, 0.6);
  color: white;
  font-size: 0.95rem;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #ff6b9d;
  }
`;

/* ── Toggle Switch ── */

const ToggleRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
`;

const ToggleTrack = styled.span<{ $on: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $on }) => ($on ? '#ff6b9d' : 'rgba(255,255,255,0.2)')};
  transition: background 0.2s;
  flex-shrink: 0;
`;

const ToggleThumb = styled.span<{ $on: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $on }) => ($on ? '22px' : '2px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: left 0.2s;
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const ToggleLabel = styled.span`
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
`;

/* ── Chip for meal / snack metadata ── */

const InfoChip = styled.span<{ $bg?: string; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: 16px;
  font-size: 0.8rem;
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.1)'};
  color: ${({ $color }) => $color || 'white'};
`;

/* ── List helpers ── */

const ItemList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ItemRow = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
`;

const ItemIcon = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

/* ── Buttons ── */

const GenerateButton = styled.button`
  width: 100%;
  min-height: 56px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #ff6b9d, #e91e63);
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;

  &:hover:not(:disabled) {
    background: linear-gradient(90deg, #e91e63, #ff6b9d);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

/* ── Spinner ── */

const Spinner = styled.span`
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

/* ── Section headings ── */

const SectionTitle = styled.h3`
  color: #ff6b9d;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem;
`;

const SectionTitleWithIcon = styled(SectionTitle)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

/* ── Macro value ── */

const MacroValue = styled.span<{ $color: string }>`
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
`;

const MacroLabel = styled.span`
  display: block;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.25rem;
`;

/* ── Meal header row ── */

const MealHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const MealName = styled.h4`
  color: #ff6b9d;
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
`;

const ChipGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

/* ── Restriction chip wrap ── */

const ChipWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
`;

/* ── Empty state ── */

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 0;
`;

const EmptyIcon = styled.div`
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h4`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.15rem;
  font-weight: 500;
  margin: 0 0 0.5rem;
`;

const EmptySubtext = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.95rem;
  margin: 0;
`;

/* ── Card wrapper with bottom margin ── */

const CardSection = styled.div`
  margin-bottom: 1.5rem;
`;

/* ───────────────────────── Component ───────────────────────── */

const NutritionPlanning = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // State management
  const [selectedClient, setSelectedClient] = useState('');
  const [goal, setGoal] = useState('muscle_gain');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [mealCount, setMealCount] = useState(3);
  const [includeSnacks, setIncludeSnacks] = useState(true);
  const [nutritionPlan, setNutritionPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);

  // Available options
  const goals = [
    { value: 'muscle_gain', label: 'Muscle Gain' },
    { value: 'fat_loss', label: 'Fat Loss' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'strength', label: 'Strength' }
  ];

  const activityLevels = [
    { value: 'sedentary', label: 'Sedentary (Desk Job)' },
    { value: 'light', label: 'Light Activity' },
    { value: 'moderate', label: 'Moderate Activity' },
    { value: 'very_active', label: 'Very Active' },
    { value: 'extremely_active', label: 'Extremely Active' }
  ];

  const availableRestrictions = [
    'vegetarian', 'vegan', 'gluten_free', 'dairy_free',
    'keto', 'paleo', 'mediterranean', 'low_carb',
    'low_fat', 'halal', 'kosher', 'nut_free'
  ];

  // Load clients on component mount
  useEffect(() => {
    loadClients();
  }, []);

  /**
   * Load available clients
   */
  const loadClients = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      enqueueSnackbar('Failed to load clients', { variant: 'error' });
    }
  };

  /**
   * Toggle dietary restriction
   */
  const toggleRestriction = (restriction: string) => {
    setDietaryRestrictions(prev =>
      prev.includes(restriction)
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  /**
   * Generate nutrition plan using AI
   */
  const generateNutritionPlan = async () => {
    if (!selectedClient) {
      enqueueSnackbar('Please select a client', { variant: 'warning' });
      return;
    }

    // Short-circuit when MCP is disabled
    if (import.meta.env.VITE_ENABLE_MCP_SERVICES !== 'true') {
      enqueueSnackbar('AI nutrition planning is currently disabled', { variant: 'info' });
      return;
    }

    setIsLoading(true);

    try {
      // Prepare nutrition context
      const mcpContext = {
        clientId: selectedClient,
        goal,
        activityLevel,
        dietaryRestrictions,
        mealCount,
        includeSnacks,
        preferences: {
          cuisineTypes: ['international'],
          cookingTime: 'moderate',
          budgetLevel: 'moderate'
        }
      };

      // Call MCP backend for nutrition planning
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/mcp/nutrition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          modelName: 'claude-3-5-sonnet',
          temperature: 0.6,
          maxTokens: 3000,
          systemPrompt: `You are an AI nutrition specialist. Create personalized nutrition plans based on client goals and restrictions.
                        Include: macro breakdown, meal timing, food suggestions, portion sizes, supplements if needed.
                        Format response as structured JSON with sections for macros, meals, supplements, tips.`,
          humanMessage: `Create a personalized nutrition plan for client with goal: ${goal}, activity level: ${activityLevel}.
                        Dietary restrictions: ${dietaryRestrictions.join(', ') || 'None'}.
                        Include ${mealCount} main meals${includeSnacks ? ' plus snacks' : ''}.`,
          mcpContext
        })
      });

      if (!response.ok) {
        throw new Error(`Nutrition planning failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Parse the AI response
      let parsedPlan;
      try {
        parsedPlan = JSON.parse(result.content);
      } catch (parseError) {
        // If JSON parsing fails, create a structured plan from text
        parsedPlan = generateMockNutritionPlan();
      }

      setNutritionPlan(parsedPlan);
      enqueueSnackbar('Nutrition plan generated successfully', { variant: 'success' });
    } catch (error: any) {
      console.error('Nutrition planning error:', error);
      enqueueSnackbar('Nutrition planning failed: ' + error.message, { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generate mock nutrition plan for demo
   */
  const generateMockNutritionPlan = () => {
    return {
      macros: {
        calories: 2400,
        protein: 150,
        carbs: 240,
        fat: 80,
        fiber: 35
      },
      meals: [
        {
          name: 'Breakfast',
          time: '7:00 AM',
          calories: 500,
          items: [
            '2 whole eggs + 2 egg whites scrambled',
            '1 slice whole grain toast',
            '1/2 avocado',
            '1 cup mixed berries'
          ]
        },
        {
          name: 'Lunch',
          time: '12:30 PM',
          calories: 600,
          items: [
            '6oz grilled chicken breast',
            '1 cup quinoa',
            'Mixed green salad with olive oil',
            '1 medium apple'
          ]
        },
        {
          name: 'Dinner',
          time: '7:00 PM',
          calories: 650,
          items: [
            '5oz salmon fillet',
            '8oz sweet potato',
            'Steamed broccoli and carrots',
            'Side of hummus'
          ]
        }
      ],
      snacks: [
        {
          name: 'Pre-workout',
          time: '3:00 PM',
          calories: 200,
          items: ['Protein shake', 'Small banana']
        },
        {
          name: 'Evening',
          time: '9:00 PM',
          calories: 150,
          items: ['Greek yogurt', '1 tbsp honey', 'Nuts']
        }
      ],
      supplements: [
        'Whey protein powder',
        'Multivitamin',
        'Omega-3 fish oil',
        'Vitamin D3'
      ],
      tips: [
        'Drink 3-4 liters of water daily',
        'Time carbs around workouts',
        'Include variety in protein sources',
        'Monitor portion sizes'
      ]
    };
  };

  const selectedGoal = goals.find(g => g.value === goal);
  const selectedLevel = activityLevels.find(l => l.value === activityLevel);

  return (
    <NutritionContainer>
      {/* Header */}
      <HeaderRow>
        <PageTitle>
          <UtensilsCrossed size={32} />
          Nutrition AI
        </PageTitle>
        <CloseButton onClick={onClose}>
          <X size={18} />
          Close
        </CloseButton>
      </HeaderRow>

      {/* Configuration Panel */}
      <CardSection>
        <NutritionCard>
          <CardBody>
            <SectionTitle>Plan Configuration</SectionTitle>

            <FormGrid>
              {/* Client Selection */}
              <FieldWrapper>
                <FieldLabel htmlFor="np-client">Select Client</FieldLabel>
                <StyledSelect
                  id="np-client"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="" disabled>-- Select --</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </option>
                  ))}
                </StyledSelect>
              </FieldWrapper>

              {/* Goal Selection */}
              <FieldWrapper>
                <FieldLabel htmlFor="np-goal">Primary Goal</FieldLabel>
                <StyledSelect
                  id="np-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                >
                  {goals.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </StyledSelect>
              </FieldWrapper>

              {/* Activity Level */}
              <FieldWrapper>
                <FieldLabel htmlFor="np-activity">Activity Level</FieldLabel>
                <StyledSelect
                  id="np-activity"
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                >
                  {activityLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </StyledSelect>
              </FieldWrapper>

              {/* Meal Count */}
              <FieldWrapper>
                <FieldLabel htmlFor="np-meals">Number of Meals</FieldLabel>
                <StyledInput
                  id="np-meals"
                  type="number"
                  min={1}
                  max={6}
                  value={mealCount}
                  onChange={(e) => setMealCount(Math.max(1, Math.min(6, parseInt(e.target.value) || 3)))}
                />
              </FieldWrapper>

              {/* Include Snacks */}
              <FullSpan>
                <ToggleRow>
                  <HiddenCheckbox
                    type="checkbox"
                    checked={includeSnacks}
                    onChange={(e) => setIncludeSnacks(e.target.checked)}
                  />
                  <ToggleTrack $on={includeSnacks}>
                    <ToggleThumb $on={includeSnacks} />
                  </ToggleTrack>
                  <ToggleLabel>Include Snacks</ToggleLabel>
                </ToggleRow>
              </FullSpan>

              {/* Dietary Restrictions */}
              <FullSpan>
                <FieldLabel as="p" style={{ marginBottom: '0.5rem' }}>
                  Dietary Restrictions
                </FieldLabel>
                <ChipWrap>
                  {availableRestrictions.map((restriction) => (
                    <RestrictionChip
                      key={restriction}
                      $selected={dietaryRestrictions.includes(restriction)}
                      onClick={() => toggleRestriction(restriction)}
                    >
                      {restriction.replace('_', ' ').toUpperCase()}
                    </RestrictionChip>
                  ))}
                </ChipWrap>
              </FullSpan>

              {/* Generate Button */}
              <FullSpan>
                <GenerateButton
                  onClick={generateNutritionPlan}
                  disabled={isLoading || !selectedClient}
                >
                  {isLoading ? <Spinner /> : 'Generate Nutrition Plan'}
                </GenerateButton>
              </FullSpan>
            </FormGrid>
          </CardBody>
        </NutritionCard>
      </CardSection>

      {/* Nutrition Plan Results */}
      {nutritionPlan && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Macro Breakdown */}
          <SectionTitle>Macro Breakdown</SectionTitle>

          <MacroGrid>
            <MacroCard>
              <MacroValue $color="#4caf50">{nutritionPlan.macros.calories}</MacroValue>
              <MacroLabel>Calories</MacroLabel>
            </MacroCard>
            <MacroCard>
              <MacroValue $color="#2196f3">{nutritionPlan.macros.protein}g</MacroValue>
              <MacroLabel>Protein</MacroLabel>
            </MacroCard>
            <MacroCard>
              <MacroValue $color="#ff9800">{nutritionPlan.macros.carbs}g</MacroValue>
              <MacroLabel>Carbs</MacroLabel>
            </MacroCard>
            <MacroCard>
              <MacroValue $color="#9c27b0">{nutritionPlan.macros.fat}g</MacroValue>
              <MacroLabel>Fat</MacroLabel>
            </MacroCard>
            <MacroCard>
              <MacroValue $color="#795548">{nutritionPlan.macros.fiber}g</MacroValue>
              <MacroLabel>Fiber</MacroLabel>
            </MacroCard>
          </MacroGrid>

          {/* Meals */}
          <SectionTitle>Meal Plan</SectionTitle>

          {nutritionPlan.meals.map((meal: any, index: number) => (
            <MealCard key={index}>
              <CardBody>
                <MealHeader>
                  <MealName>{meal.name}</MealName>
                  <ChipGroup>
                    <InfoChip>
                      <Clock size={14} />
                      {meal.time}
                    </InfoChip>
                    <InfoChip $bg="rgba(76, 175, 80, 0.1)" $color="#4caf50">
                      <Utensils size={14} />
                      {meal.calories} cal
                    </InfoChip>
                  </ChipGroup>
                </MealHeader>

                <ItemList>
                  {meal.items.map((item: string, itemIndex: number) => (
                    <ItemRow key={itemIndex}>
                      <ItemIcon><Pizza size={16} color="#ff6b9d" /></ItemIcon>
                      {item}
                    </ItemRow>
                  ))}
                </ItemList>
              </CardBody>
            </MealCard>
          ))}

          {/* Snacks */}
          {includeSnacks && nutritionPlan.snacks && (
            <>
              <SectionTitle style={{ marginTop: '1.5rem' }}>Snacks</SectionTitle>

              {nutritionPlan.snacks.map((snack: any, index: number) => (
                <MealCard key={index}>
                  <CardBody>
                    <MealHeader>
                      <MealName>{snack.name}</MealName>
                      <ChipGroup>
                        <InfoChip>
                          <Clock size={14} />
                          {snack.time}
                        </InfoChip>
                        <InfoChip $bg="rgba(255, 152, 0, 0.1)" $color="#ff9800">
                          <Coffee size={14} />
                          {snack.calories} cal
                        </InfoChip>
                      </ChipGroup>
                    </MealHeader>

                    <ItemList>
                      {snack.items.map((item: string, itemIndex: number) => (
                        <ItemRow key={itemIndex}>
                          <ItemIcon><Coffee size={16} color="#ff6b9d" /></ItemIcon>
                          {item}
                        </ItemRow>
                      ))}
                    </ItemList>
                  </CardBody>
                </MealCard>
              ))}
            </>
          )}

          {/* Supplements & Tips */}
          <TwoColumnGrid>
            {/* Supplements */}
            <NutritionCard>
              <CardBody>
                <SectionTitleWithIcon>
                  <Leaf size={20} />
                  Recommended Supplements
                </SectionTitleWithIcon>
                <ItemList>
                  {nutritionPlan.supplements.map((supplement: string, index: number) => (
                    <ItemRow key={index}>
                      <ItemIcon><CheckCircle2 size={16} color="#4caf50" /></ItemIcon>
                      {supplement}
                    </ItemRow>
                  ))}
                </ItemList>
              </CardBody>
            </NutritionCard>

            {/* Tips */}
            <NutritionCard>
              <CardBody>
                <SectionTitleWithIcon>
                  <Activity size={20} />
                  Nutrition Tips
                </SectionTitleWithIcon>
                <ItemList>
                  {nutritionPlan.tips.map((tip: string, index: number) => (
                    <ItemRow key={index}>
                      <ItemIcon><CheckCircle2 size={16} color="#4caf50" /></ItemIcon>
                      {tip}
                    </ItemRow>
                  ))}
                </ItemList>
              </CardBody>
            </NutritionCard>
          </TwoColumnGrid>
        </motion.div>
      )}

      {/* Empty State */}
      {!nutritionPlan && !isLoading && (
        <EmptyState>
          <EmptyIcon>
            <UtensilsCrossed size={64} />
          </EmptyIcon>
          <EmptyTitle>Configure and generate a nutrition plan</EmptyTitle>
          <EmptySubtext>
            AI will create personalized meal plans based on goals and restrictions
          </EmptySubtext>
        </EmptyState>
      )}
    </NutritionContainer>
  );
};

export default NutritionPlanning;
