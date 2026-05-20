/**
 * ============================================================================
 * FILE: MealPlanTab.tsx
 * PURPOSE: AI meal plan generator, food photo analysis, and golf nutrition
 *          presets in a unified tab with 3 sub-sections
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Three sections — (1) AI meal plan generator with
 * calorie/macro inputs, dietary restrictions, and OPT phase selection;
 * (2) Snap-a-Meal photo analysis via Gemini Vision; (3) Golf nutrition
 * presets for pre-round, on-course, post-round, and tournament day.
 *
 * HOW IT FITS IN THE APP: NutritionWorkspace → MealPlanTab
 *
 * CLICK-OUTCOMES:
 * [Generate Plan] → POST /api/meal-plans/generate → shows structured meal plan
 * [Upload Photo] → POST /api/meal-plans/analyze-photo → shows identified foods + macros
 * [Golf Preset Card] → expands to show full preset details
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Camera, CircleDot, ChevronDown, ChevronUp,
  Clock, ShoppingCart, Lightbulb, AlertTriangle,
  Upload, X, Loader2,
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || '';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface MealFood {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  mealType: string;
  time: string;
  name: string;
  foods: MealFood[];
  totalCalories: number;
  prepTime: string;
}

interface MealPlan {
  planName: string;
  dailyTargets: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  meals: Meal[];
  groceryList: string[];
  nasmNote: string;
  tips: string[];
  fdaDisclaimer: string;
}

interface PhotoFood {
  name: string;
  estimatedServing: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
}

interface PhotoAnalysis {
  foods: PhotoFood[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealType: string;
  overallConfidence: number;
  notes: string;
  fdaDisclaimer: string;
}

interface GolfPreset {
  id: string;
  name: string;
  timing: string;
  description: string;
  macroSplit: { carbPct: number; proteinPct: number; fatPct: number };
  calorieRange: string;
  sampleMeals: string[];
  hydration: string;
  avoid: string[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────
const RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto',
  'Paleo', 'Low-Sodium', 'Nut-Free', 'Halal', 'Kosher',
];

const HEALTH_CONDITIONS = [
  'Diabetes', 'Hypertension', 'Celiac Disease', 'Lactose Intolerance',
  'IBS', 'GERD', 'High Cholesterol', 'Kidney Disease',
];

const OPT_PHASES = [
  'Phase 1 — Stabilization Endurance',
  'Phase 2 — Strength Endurance',
  'Phase 3 — Hypertrophy',
  'Phase 4 — Maximal Strength',
  'Phase 5 — Power',
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const MealPlanTab: React.FC = () => {
  // Meal Plan state
  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [optPhase, setOptPhase] = useState(OPT_PHASES[0]);
  const [activityType, setActivityType] = useState('general fitness');
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);

  // Photo analysis state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoResult, setPhotoResult] = useState<PhotoAnalysis | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Golf presets state
  const [golfPresets, setGolfPresets] = useState<GolfPreset[]>([]);
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/meal-plans/golf-presets`)
      .then(r => r.json())
      .then(d => { if (d.success) setGolfPresets(d.presets); })
      .catch(() => {});
  }, []);

  const toggleRestriction = (r: string) => {
    setSelectedRestrictions(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  };

  const toggleCondition = (c: string) => {
    setSelectedConditions(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const generatePlan = useCallback(async () => {
    setPlanLoading(true);
    setPlanError('');
    setPlan(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/meal-plans/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          calories: parseInt(calories),
          protein: protein ? parseInt(protein) : undefined,
          carbs: carbs ? parseInt(carbs) : undefined,
          fat: fat ? parseInt(fat) : undefined,
          restrictions: selectedRestrictions,
          healthConditions: selectedConditions,
          activityType,
          optPhase,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || (res.status === 401 ? 'Log in to generate meal plans' : 'Generation failed'));
      }
      const data = await res.json();
      setPlan(data.plan);
    } catch (err: unknown) {
      setPlanError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setPlanLoading(false);
    }
  }, [calories, protein, carbs, fat, selectedRestrictions, selectedConditions, activityType, optPhase]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoResult(null);
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const analyzePhoto = useCallback(async () => {
    if (!photoFile) return;
    setPhotoLoading(true);
    setPhotoError('');
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('photo', photoFile);
      const res = await fetch(`${API}/api/meal-plans/analyze-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Photo analysis failed');
      }
      const data = await res.json();
      setPhotoResult(data.analysis);
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setPhotoLoading(false);
    }
  }, [photoFile]);

  return (
    <TabRoot>
      {/* ── SECTION 1: AI Meal Plan Generator ── */}
      <Section>
        <SectionHeader>
          <Sparkles size={18} />
          AI Meal Plan Generator
        </SectionHeader>
        <SectionDesc>Get a personalized daily meal plan based on your targets, restrictions, and training phase.</SectionDesc>

        <FormGrid>
          <FormGroup>
            <Label htmlFor="meal-plan-calories">Daily Calories *</Label>
            <Input id="meal-plan-calories" type="number" value={calories} onChange={e => setCalories(e.target.value)} min="800" max="6000" placeholder="2000" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="meal-plan-protein">Protein (g)</Label>
            <Input id="meal-plan-protein" type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="Auto" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="meal-plan-carbs">Carbs (g)</Label>
            <Input id="meal-plan-carbs" type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="Auto" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="meal-plan-fat">Fat (g)</Label>
            <Input id="meal-plan-fat" type="number" value={fat} onChange={e => setFat(e.target.value)} placeholder="Auto" />
          </FormGroup>
        </FormGrid>

        <FormGroup>
          <Label htmlFor="meal-plan-activity">Activity Type</Label>
          <Select id="meal-plan-activity" value={activityType} onChange={e => setActivityType(e.target.value)}>
            <option value="general fitness">General Fitness</option>
            <option value="golf performance">Golf Performance</option>
            <option value="bodybuilding">Bodybuilding</option>
            <option value="endurance">Endurance / Cardio</option>
            <option value="weight loss">Weight Loss</option>
            <option value="muscle gain">Muscle Gain</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="meal-plan-opt-phase">NASM OPT Phase</Label>
          <Select id="meal-plan-opt-phase" value={optPhase} onChange={e => setOptPhase(e.target.value)}>
            {OPT_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </FormGroup>

        <FormGroup>
          <GroupLabel>Dietary Restrictions</GroupLabel>
          <ChipRow>
            {RESTRICTIONS.map(r => (
              <FilterChip key={r} $active={selectedRestrictions.includes(r)} onClick={() => toggleRestriction(r)}>
                {r}
              </FilterChip>
            ))}
          </ChipRow>
        </FormGroup>

        <FormGroup>
          <GroupLabel>Health Conditions</GroupLabel>
          <ChipRow>
            {HEALTH_CONDITIONS.map(c => (
              <FilterChip key={c} $active={selectedConditions.includes(c)} onClick={() => toggleCondition(c)}>
                {c}
              </FilterChip>
            ))}
          </ChipRow>
        </FormGroup>

        <GenerateBtn onClick={generatePlan} disabled={planLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {planLoading ? <><Loader2 size={16} className="spin" /> Generating...</> : <><Sparkles size={16} /> Generate Meal Plan</>}
        </GenerateBtn>

        {planError && <ErrorText><AlertTriangle size={14} /> {planError}</ErrorText>}

        {/* Generated Plan Display */}
        <AnimatePresence>
          {plan && (
            <PlanResult initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PlanTitle>{plan.planName}</PlanTitle>
              <TargetRow>
                <TargetChip>{plan.dailyTargets.calories} cal</TargetChip>
                <TargetChip>{plan.dailyTargets.protein}g protein</TargetChip>
                <TargetChip>{plan.dailyTargets.carbs}g carbs</TargetChip>
                <TargetChip>{plan.dailyTargets.fat}g fat</TargetChip>
              </TargetRow>

              {plan.nasmNote && <NasmNote><Lightbulb size={14} /> {plan.nasmNote}</NasmNote>}

              {plan.meals.map((meal, i) => (
                <MealCard key={i}>
                  <MealHeader type="button" onClick={() => setExpandedMeal(expandedMeal === i ? null : i)}>
                    <MealInfo>
                      <MealType>{meal.mealType}</MealType>
                      <MealName>{meal.name}</MealName>
                    </MealInfo>
                    <MealMeta>
                      {meal.time && <MealTime><Clock size={12} /> {meal.time}</MealTime>}
                      <MealCal>{meal.totalCalories} cal</MealCal>
                      {expandedMeal === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </MealMeta>
                  </MealHeader>
                  <AnimatePresence>
                    {expandedMeal === i && (
                      <MealExpanded initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        {meal.prepTime && <PrepTime><Clock size={12} /> Prep: {meal.prepTime}</PrepTime>}
                        <FoodTable>
                          <thead>
                            <tr><th>Food</th><th>Serving</th><th>Cal</th><th>P</th><th>C</th><th>F</th></tr>
                          </thead>
                          <tbody>
                            {meal.foods.map((f, j) => (
                              <tr key={j}>
                                <td>{f.name}</td>
                                <td>{f.serving}</td>
                                <td>{f.calories}</td>
                                <td>{f.protein}g</td>
                                <td>{f.carbs}g</td>
                                <td>{f.fat}g</td>
                              </tr>
                            ))}
                          </tbody>
                        </FoodTable>
                      </MealExpanded>
                    )}
                  </AnimatePresence>
                </MealCard>
              ))}

              {plan.groceryList.length > 0 && (
                <GrocerySection>
                  <GroceryTitle><ShoppingCart size={16} /> Grocery List</GroceryTitle>
                  <GroceryGrid>
                    {plan.groceryList.map((item, i) => (
                      <GroceryItem key={i}>{item}</GroceryItem>
                    ))}
                  </GroceryGrid>
                </GrocerySection>
              )}

              {plan.tips.length > 0 && (
                <TipsSection>
                  {plan.tips.map((tip, i) => <Tip key={i}><Lightbulb size={12} /> {tip}</Tip>)}
                </TipsSection>
              )}

              <Disclaimer>{plan.fdaDisclaimer}</Disclaimer>
            </PlanResult>
          )}
        </AnimatePresence>
      </Section>

      {/* ── SECTION 2: Snap-a-Meal Photo Analysis ── */}
      <Section>
        <SectionHeader>
          <Camera size={18} />
          Snap-a-Meal
        </SectionHeader>
        <SectionDesc>Take a photo of your meal and AI will identify the foods and estimate macros.</SectionDesc>

        <PhotoArea>
          {photoPreview ? (
            <PreviewWrap>
              <PreviewImg src={photoPreview} alt="Meal preview" />
              <ClearBtn onClick={() => { setPhotoFile(null); setPhotoPreview(null); setPhotoResult(null); }}>
                <X size={16} />
              </ClearBtn>
            </PreviewWrap>
          ) : (
            <UploadZone type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={28} />
              <span>Tap to upload a meal photo</span>
              <small>JPEG, PNG, or WebP · Max 10MB</small>
            </UploadZone>
          )}
          <HiddenFileInput ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} />
        </PhotoArea>

        {photoFile && !photoResult && (
          <GenerateBtn onClick={analyzePhoto} disabled={photoLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {photoLoading ? <><Loader2 size={16} className="spin" /> Analyzing...</> : <><Camera size={16} /> Analyze Meal</>}
          </GenerateBtn>
        )}

        {photoError && <ErrorText><AlertTriangle size={14} /> {photoError}</ErrorText>}

        <AnimatePresence>
          {photoResult && (
            <PhotoResultWrap initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TargetRow>
                <TargetChip>{photoResult.totalCalories} cal</TargetChip>
                <TargetChip>{photoResult.totalProtein}g P</TargetChip>
                <TargetChip>{photoResult.totalCarbs}g C</TargetChip>
                <TargetChip>{photoResult.totalFat}g F</TargetChip>
                <ConfChip $val={photoResult.overallConfidence}>{Math.round(photoResult.overallConfidence * 100)}% confident</ConfChip>
              </TargetRow>
              {photoResult.notes && <NasmNote>{photoResult.notes}</NasmNote>}
              <FoodTable>
                <thead>
                  <tr><th>Food</th><th>Serving</th><th>Cal</th><th>P</th><th>C</th><th>F</th><th>Conf</th></tr>
                </thead>
                <tbody>
                  {photoResult.foods.map((f, i) => (
                    <tr key={i}>
                      <td>{f.name}</td>
                      <td>{f.estimatedServing}</td>
                      <td>{f.calories}</td>
                      <td>{f.protein}g</td>
                      <td>{f.carbs}g</td>
                      <td>{f.fat}g</td>
                      <td>{Math.round(f.confidence * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </FoodTable>
              <Disclaimer>{photoResult.fdaDisclaimer}</Disclaimer>
            </PhotoResultWrap>
          )}
        </AnimatePresence>
      </Section>

      {/* ── SECTION 3: Golf Nutrition Presets ── */}
      <Section>
        <SectionHeader>
          <CircleDot size={18} />
          Golf Nutrition Presets
        </SectionHeader>
        <SectionDesc>NASM-aligned nutrition protocols for every stage of your round.</SectionDesc>

        <PresetGrid>
          {golfPresets.map(preset => (
            <PresetCard key={preset.id}>
              <PresetHeader type="button" onClick={() => setExpandedPreset(expandedPreset === preset.id ? null : preset.id)}>
                <div>
                  <PresetName>{preset.name}</PresetName>
                  <PresetTiming>{preset.timing}</PresetTiming>
                </div>
                <PresetCals>{preset.calorieRange} cal</PresetCals>
              </PresetHeader>
              <PresetDesc>{preset.description}</PresetDesc>
              <AnimatePresence>
                {expandedPreset === preset.id && (
                  <PresetExpanded initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <PresetSection>
                      <PresetLabel>Macro Split</PresetLabel>
                      <MacroRow>
                        <MacroChip>Carbs {preset.macroSplit.carbPct}%</MacroChip>
                        <MacroChip>Protein {preset.macroSplit.proteinPct}%</MacroChip>
                        <MacroChip>Fat {preset.macroSplit.fatPct}%</MacroChip>
                      </MacroRow>
                    </PresetSection>
                    <PresetSection>
                      <PresetLabel>Sample Meals</PresetLabel>
                      {preset.sampleMeals.map((m, i) => <SampleMeal key={i}>• {m}</SampleMeal>)}
                    </PresetSection>
                    <PresetSection>
                      <PresetLabel>Hydration</PresetLabel>
                      <PresetText>{preset.hydration}</PresetText>
                    </PresetSection>
                    <PresetSection>
                      <PresetLabel>Avoid</PresetLabel>
                      <AvoidRow>
                        {preset.avoid.map((a, i) => <AvoidChip key={i}>{a}</AvoidChip>)}
                      </AvoidRow>
                    </PresetSection>
                  </PresetExpanded>
                )}
              </AnimatePresence>
            </PresetCard>
          ))}
        </PresetGrid>
      </Section>
    </TabRoot>
  );
};

export default MealPlanTab;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const TabRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const Section = styled.div`
  background: color-mix(in srgb, var(--bg-elevated, #141419) 80%, transparent);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 20px;
`;

const SectionHeader = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 4px;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const SectionDesc = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin: 0 0 16px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

const GroupLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

const Input = styled.input`
  padding: 10px 12px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 14px;
  min-height: 44px;
  font-family: 'Fira Code', monospace;

  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: -1px; }
  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.3)); }
`;

const Select = styled.select`
  padding: 10px 12px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
  min-height: 44px;
  cursor: pointer;

  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); }
  option { background: var(--bg-surface, #1A1A24); }
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border: 1px solid ${p => p.$active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${p => p.$active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)' : 'transparent'};
  color: ${p => p.$active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-muted, rgba(224, 236, 244, 0.5))'};
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  min-height: 32px;
  transition: all 0.15s;

  &:hover { border-color: var(--accent-secondary, #8B5CF6); color: var(--text-primary, #E0ECF4); }
`;

const GenerateBtn = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  width: 100%;
  margin-top: 8px;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:hover:not(:disabled) { box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent); }
`;

const ErrorText = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--accent-error, #C92A54);
  margin: 8px 0 0;
`;

const PlanResult = styled(motion.div)`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
`;

const PlanTitle = styled.h4`
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 10px;
`;

const TargetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`;

const TargetChip = styled.span`
  padding: 4px 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
`;

const ConfChip = styled.span<{ $val: number }>`
  padding: 4px 10px;
  background: color-mix(in srgb, ${p => p.$val > 0.7 ? 'var(--accent-primary, #60C0F0)' : 'var(--accent-gold, #C6A84B)'} 10%, transparent);
  border: 1px solid color-mix(in srgb, ${p => p.$val > 0.7 ? 'var(--accent-primary, #60C0F0)' : 'var(--accent-gold, #C6A84B)'} 20%, transparent);
  border-radius: 12px;
  font-size: 12px;
  color: ${p => p.$val > 0.7 ? 'var(--accent-primary, #60C0F0)' : 'var(--accent-gold, #C6A84B)'};
`;

const NasmNote = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-style: italic;
  margin: 0 0 12px;
  padding: 10px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 6%, transparent);
  border-radius: 8px;

  svg { flex-shrink: 0; margin-top: 2px; }
`;

const MealCard = styled.div`
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
`;

const MealHeader = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  cursor: pointer;
  min-height: 44px;
  background: transparent;
  border: 0;
  color: inherit;
  text-align: left;
  width: 100%;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent); }
`;

const MealInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const MealType = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-secondary, #8B5CF6);
  padding: 2px 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  border-radius: 8px;
`;

const MealName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
`;

const MealMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

const MealTime = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
`;

const MealCal = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
`;

const MealExpanded = styled(motion.div)`
  overflow: hidden;
  padding: 0 14px 14px;
`;

const PrepTime = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin: 0 0 8px;
`;

const FoodTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th {
    text-align: left;
    padding: 6px 8px;
    color: var(--text-muted, rgba(224, 236, 244, 0.5));
    font-weight: 500;
    border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  }

  td {
    padding: 6px 8px;
    color: var(--text-secondary, rgba(224, 236, 244, 0.7));
    border-bottom: 1px solid color-mix(in srgb, var(--border-soft, rgba(96, 192, 240, 0.08)) 50%, transparent);
  }

  td:nth-child(n+3) { font-family: 'Fira Code', monospace; text-align: right; }
  th:nth-child(n+3) { text-align: right; }
`;

const GrocerySection = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
`;

const GroceryTitle = styled.h5`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 10px;
`;

const GroceryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px;
`;

const GroceryItem = styled.span`
  padding: 6px 10px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 80%, transparent);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const TipsSection = styled.div`
  margin-top: 12px;
`;

const Tip = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin: 4px 0;

  svg { flex-shrink: 0; margin-top: 1px; color: var(--accent-gold, #C6A84B); }
`;

const Disclaimer = styled.p`
  font-size: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.35));
  line-height: 1.4;
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
`;

const PhotoArea = styled.div`
  margin-bottom: 12px;
`;

const UploadZone = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 20px;
  border: 2px dashed var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 12px;
  cursor: pointer;
  background: transparent;
  transition: all 0.15s;
  min-height: 120px;
  width: 100%;

  svg { color: var(--accent-primary, #60C0F0); }
  span { font-size: 14px; color: var(--text-secondary, rgba(224, 236, 244, 0.6)); }
  small { font-size: 11px; color: var(--text-muted, rgba(224, 236, 244, 0.4)); }

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent);
  }
`;

const PreviewWrap = styled.div`
  position: relative;
  display: inline-block;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const PreviewImg = styled.img`
  max-width: 100%;
  max-height: 300px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
`;

const ClearBtn = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { background: var(--accent-error, #C92A54); }
`;

const PhotoResultWrap = styled(motion.div)`
  margin-top: 16px;
`;

const PresetGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PresetCard = styled.div`
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 90%, transparent);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 10px;
  padding: 14px;
`;

const PresetHeader = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: transparent;
  border: 0;
  color: inherit;
  min-height: 44px;
  text-align: left;
  width: 100%;
`;

const PresetName = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const PresetTiming = styled.p`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin: 2px 0 0;
`;

const PresetCals = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  white-space: nowrap;
`;

const PresetDesc = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 8px 0 0;
  line-height: 1.4;
`;

const PresetExpanded = styled(motion.div)`
  overflow: hidden;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
`;

const PresetSection = styled.div`
  margin-bottom: 12px;
`;

const PresetLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-secondary, #8B5CF6);
  display: block;
  margin-bottom: 6px;
`;

const MacroRow = styled.div`
  display: flex;
  gap: 8px;
`;

const MacroChip = styled.span`
  padding: 4px 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border-radius: 8px;
  font-size: 12px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
`;

const SampleMeal = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 4px 0;
  line-height: 1.4;
`;

const PresetText = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 0;
  line-height: 1.4;
`;

const AvoidRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const AvoidChip = styled.span`
  padding: 3px 8px;
  background: color-mix(in srgb, var(--accent-error, #C92A54) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-error, #C92A54) 20%, transparent);
  border-radius: 10px;
  font-size: 11px;
  color: color-mix(in srgb, var(--accent-error, #C92A54) 80%, var(--text-primary, #E0ECF4));
`;
