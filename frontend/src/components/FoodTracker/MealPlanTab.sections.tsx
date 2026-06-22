import React from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Camera, ChevronDown, ChevronUp, CircleDot, Clock, Lightbulb, Loader2, ShoppingCart, Sparkles, Upload, X } from 'lucide-react';
import MealPlanApproveSavePanel from './MealPlanApproveSavePanel';
import MealPhotoReview from './MealPhotoReview';
import { cleanMacro } from './mealPhotoLog';
import { buttonMotion, expandMotion, fadeSlideMotion } from './MealPlanTab.motion';
import type { GolfPreset, MealPlan, PhotoAnalysis } from './MealPlanTab.types';
import { HEALTH_CONDITIONS, OPT_PHASES, RESTRICTIONS } from './MealPlanTab.types';
import {
  AvoidChip,
  AvoidRow,
  ChipRow,
  ClearBtn,
  ConfChip,
  Disclaimer,
  ErrorText,
  FilterChip,
  FoodTable,
  FormGrid,
  FormGroup,
  GenerateBtn,
  GroceryGrid,
  GroceryItem,
  GrocerySection,
  GroceryTitle,
  GroupLabel,
  HiddenFileInput,
  Input,
  Label,
  MacroChip,
  MacroRow,
  MealCal,
  MealCard,
  MealExpanded,
  MealHeader,
  MealInfo,
  MealMeta,
  MealName,
  MealTime,
  MealType,
  NasmNote,
  PhotoArea,
  PhotoResultWrap,
  PlanResult,
  PlanTitle,
  PrepTime,
  PresetCard,
  PresetCals,
  PresetDesc,
  PresetExpanded,
  PresetGrid,
  PresetHeader,
  PresetLabel,
  PresetName,
  PresetSection,
  PresetText,
  PresetTiming,
  PreviewImg,
  PreviewWrap,
  SampleMeal,
  Section,
  SectionDesc,
  SectionHeader,
  Select,
  TargetChip,
  TargetRow,
  Tip,
  TipsSection,
  UploadZone,
} from './MealPlanTab.styles';

const formatMacro = (value: unknown, suffix = '') => {
  const cleaned = cleanMacro(value); return cleaned === null ? 'N/A' : `${cleaned}${suffix}`;
};
const formatConfidence = (value: unknown) => {
  const cleaned = cleanMacro(value); return cleaned === null ? 'N/A' : `${Math.round(Math.max(0, Math.min(1, cleaned)) * 100)}%`;
};

interface GeneratorProps {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  activityType: string;
  optPhase: string;
  selectedRestrictions: string[];
  selectedConditions: string[];
  plan: MealPlan | null;
  planLoading: boolean;
  planError: string;
  expandedMeal: number | null;
  onCaloriesChange: (value: string) => void;
  onProteinChange: (value: string) => void;
  onCarbsChange: (value: string) => void;
  onFatChange: (value: string) => void;
  onActivityTypeChange: (value: string) => void;
  onOptPhaseChange: (value: string) => void;
  onToggleRestriction: (value: string) => void;
  onToggleCondition: (value: string) => void;
  onGeneratePlan: () => void;
  onExpandMeal: (index: number | null) => void;
  onDataSent?: (success: boolean) => void;
}

export const MealPlanGeneratorSection = (props: GeneratorProps) => {
  const reduceMotion = Boolean(useReducedMotion());

  return <Section>
    <SectionHeader><Sparkles size={18} />AI Meal Plan Generator</SectionHeader>
    <SectionDesc>Get a personalized daily meal plan based on your targets, restrictions, and training phase.</SectionDesc>
    <FormGrid>
      <MacroInput id="meal-plan-calories" label="Daily Calories *" value={props.calories} onChange={props.onCaloriesChange} min="800" max="6000" placeholder="2000" />
      <MacroInput id="meal-plan-protein" label="Protein (g)" value={props.protein} onChange={props.onProteinChange} placeholder="Auto" />
      <MacroInput id="meal-plan-carbs" label="Carbs (g)" value={props.carbs} onChange={props.onCarbsChange} placeholder="Auto" />
      <MacroInput id="meal-plan-fat" label="Fat (g)" value={props.fat} onChange={props.onFatChange} placeholder="Auto" />
    </FormGrid>
    <FormGroup>
      <Label htmlFor="meal-plan-activity">Activity Type</Label>
      <Select id="meal-plan-activity" value={props.activityType} onChange={(event) => props.onActivityTypeChange(event.target.value)}>
        <option value="general fitness">General Fitness</option>
        <option value="golf performance">Golf Performance</option>
        <option value="bodybuilding">Bodybuilding</option>
        <option value="endurance">Endurance / Cardio</option>
        <option value="weight loss">Weight Loss</option>
        <option value="muscle gain">Muscle Gain</option>
      </Select>
    </FormGroup>
    <OptionSelect id="meal-plan-opt-phase" label="NASM OPT Phase" value={props.optPhase} options={OPT_PHASES} onChange={props.onOptPhaseChange} />
    <ToggleGroup label="Dietary Restrictions" values={RESTRICTIONS} selected={props.selectedRestrictions} onToggle={props.onToggleRestriction} />
    <ToggleGroup label="Health Conditions" values={HEALTH_CONDITIONS} selected={props.selectedConditions} onToggle={props.onToggleCondition} />
    <GenerateBtn onClick={props.onGeneratePlan} disabled={props.planLoading} {...buttonMotion(reduceMotion)}>
      {props.planLoading ? <><Loader2 size={16} className="spin" /> Generating...</> : <><Sparkles size={16} /> Generate Meal Plan</>}
    </GenerateBtn>
    {props.planError && <ErrorText><AlertTriangle size={14} /> {props.planError}</ErrorText>}
    <AnimatePresence>
      {props.plan && <GeneratedPlan plan={props.plan} expandedMeal={props.expandedMeal} onExpandMeal={props.onExpandMeal} onDataSent={props.onDataSent} reduceMotion={reduceMotion} />}
    </AnimatePresence>
  </Section>;
};

const MacroInput = ({ id, label, value, onChange, min, max, placeholder }: {
  id: string; label: string; value: string; onChange: (value: string) => void; min?: string; max?: string; placeholder: string;
}) => (
  <FormGroup>
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} type="number" value={value} onChange={(event) => onChange(event.target.value)} min={min} max={max} placeholder={placeholder} />
  </FormGroup>
);

const OptionSelect = ({ id, label, value, options, onChange }: {
  id: string; label: string; value: string; options: string[]; onChange: (value: string) => void;
}) => (
  <FormGroup>
    <Label htmlFor={id}>{label}</Label>
    <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </Select>
  </FormGroup>
);

const ToggleGroup = ({ label, values, selected, onToggle }: {
  label: string; values: string[]; selected: string[]; onToggle: (value: string) => void;
}) => (
  <FormGroup>
    <GroupLabel>{label}</GroupLabel>
    <ChipRow>{values.map((value) => <FilterChip key={value} type="button" $active={selected.includes(value)} onClick={() => onToggle(value)}>{value}</FilterChip>)}</ChipRow>
  </FormGroup>
);

const GeneratedPlan = ({ plan, expandedMeal, onExpandMeal, onDataSent, reduceMotion }: {
  plan: MealPlan; expandedMeal: number | null; onExpandMeal: (index: number | null) => void; onDataSent?: (success: boolean) => void; reduceMotion: boolean;
}) => (
  <PlanResult {...fadeSlideMotion(reduceMotion)}>
    <PlanTitle>{plan.planName}</PlanTitle>
    <TargetRow>
      <TargetChip>{formatMacro(plan.dailyTargets.calories, ' cal')}</TargetChip>
      <TargetChip>{formatMacro(plan.dailyTargets.protein, 'g protein')}</TargetChip>
      <TargetChip>{formatMacro(plan.dailyTargets.carbs, 'g carbs')}</TargetChip>
      <TargetChip>{formatMacro(plan.dailyTargets.fat, 'g fat')}</TargetChip>
    </TargetRow>
    {plan.nasmNote && <NasmNote><Lightbulb size={14} /> {plan.nasmNote}</NasmNote>}
    {plan.meals.map((meal, index) => (
      <MealCard key={`${meal.mealType}-${index}`}>
        <MealHeader type="button" onClick={() => onExpandMeal(expandedMeal === index ? null : index)}>
          <MealInfo><MealType>{meal.mealType}</MealType><MealName>{meal.name}</MealName></MealInfo>
          <MealMeta>{meal.time && <MealTime><Clock size={12} /> {meal.time}</MealTime>}<MealCal>{formatMacro(meal.totalCalories, ' cal')}</MealCal>{expandedMeal === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</MealMeta>
        </MealHeader>
        <AnimatePresence>{expandedMeal === index && <MealFoodRows meal={meal} reduceMotion={reduceMotion} />}</AnimatePresence>
      </MealCard>
    ))}
    {plan.groceryList.length > 0 && <GroceryList items={plan.groceryList} />}
    {plan.tips.length > 0 && <TipsSection>{plan.tips.map((tip, index) => <Tip key={`${tip}-${index}`}><Lightbulb size={12} /> {tip}</Tip>)}</TipsSection>}
    <Disclaimer>{plan.fdaDisclaimer}</Disclaimer>
    <MealPlanApproveSavePanel plan={plan} onSaved={onDataSent} />
  </PlanResult>
);

const MealFoodRows = ({ meal, reduceMotion }: { meal: MealPlan['meals'][number]; reduceMotion: boolean }) => (
  <MealExpanded {...expandMotion(reduceMotion)}>
    {meal.prepTime && <PrepTime><Clock size={12} /> Prep: {meal.prepTime}</PrepTime>}
    <FoodTable>
      <thead><tr><th>Food</th><th>Serving</th><th>Cal</th><th>P</th><th>C</th><th>F</th></tr></thead>
      <tbody>{meal.foods.map((food, index) => <tr key={`${food.name}-${index}`}><td>{food.name}</td><td>{food.serving}</td><td>{formatMacro(food.calories)}</td><td>{formatMacro(food.protein, 'g')}</td><td>{formatMacro(food.carbs, 'g')}</td><td>{formatMacro(food.fat, 'g')}</td></tr>)}</tbody>
    </FoodTable>
  </MealExpanded>
);

const GroceryList = ({ items }: { items: string[] }) => (
  <GrocerySection>
    <GroceryTitle><ShoppingCart size={16} /> Grocery List</GroceryTitle>
    <GroceryGrid>{items.map((item, index) => <GroceryItem key={`${item}-${index}`}>{item}</GroceryItem>)}</GroceryGrid>
  </GrocerySection>
);

interface PhotoProps {
  photoFile: File | null;
  photoPreview: string | null;
  photoResult: PhotoAnalysis | null;
  photoLoading: boolean;
  photoError: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyzePhoto: () => void;
  onClearPhoto: () => void;
  onDataSent?: (success: boolean) => void;
}

export const PhotoAnalysisSection = (props: PhotoProps) => {
  const reduceMotion = Boolean(useReducedMotion());

  return <Section>
    <SectionHeader><Camera size={18} />Snap-a-Meal</SectionHeader>
    <SectionDesc>Take a photo of your meal and AI will identify the foods and estimate macros.</SectionDesc>
    <PhotoArea>
      {props.photoPreview ? (
        <PreviewWrap><PreviewImg src={props.photoPreview} alt="Meal preview" /><ClearBtn type="button" onClick={props.onClearPhoto} aria-label="Clear meal photo"><X size={16} /></ClearBtn></PreviewWrap>
      ) : (
        <UploadZone type="button" onClick={() => props.fileInputRef.current?.click()}><Upload size={28} /><span>Tap to upload a meal photo</span><small>JPEG, PNG, or WebP | Max 10MB</small></UploadZone>
      )}
      <HiddenFileInput ref={props.fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={props.onPhotoSelect} />
    </PhotoArea>
    {props.photoFile && !props.photoResult && <GenerateBtn onClick={props.onAnalyzePhoto} disabled={props.photoLoading} {...buttonMotion(reduceMotion)}>{props.photoLoading ? <><Loader2 size={16} className="spin" /> Analyzing...</> : <><Camera size={16} /> Analyze Meal</>}</GenerateBtn>}
    {props.photoError && <ErrorText><AlertTriangle size={14} /> {props.photoError}</ErrorText>}
    <AnimatePresence>{props.photoResult && <PhotoResult result={props.photoResult} onDataSent={props.onDataSent} reduceMotion={reduceMotion} />}</AnimatePresence>
  </Section>;
};

const PhotoResult = ({ result, onDataSent, reduceMotion }: { result: PhotoAnalysis; onDataSent?: (success: boolean) => void; reduceMotion: boolean }) => (
  <PhotoResultWrap {...fadeSlideMotion(reduceMotion)}>
    <TargetRow>
      <TargetChip>{formatMacro(result.totalCalories, ' cal')}</TargetChip><TargetChip>{formatMacro(result.totalProtein, 'g P')}</TargetChip><TargetChip>{formatMacro(result.totalCarbs, 'g C')}</TargetChip><TargetChip>{formatMacro(result.totalFat, 'g F')}</TargetChip>
      <ConfChip $val={cleanMacro(result.overallConfidence) ?? 0}>AI estimate {formatConfidence(result.overallConfidence)}</ConfChip>
    </TargetRow>
    {result.notes && <NasmNote>{result.notes}</NasmNote>}
    <MealPhotoReview analysis={result} onSaved={() => onDataSent?.(true)} />
    <Disclaimer>{result.fdaDisclaimer}</Disclaimer>
  </PhotoResultWrap>
);

export const GolfPresetSection = ({ golfPresets, expandedPreset, onExpandPreset }: {
  golfPresets: GolfPreset[];
  expandedPreset: string | null;
  onExpandPreset: (id: string | null) => void;
}) => {
  const reduceMotion = Boolean(useReducedMotion());

  return <Section>
    <SectionHeader><CircleDot size={18} />Golf Nutrition Presets</SectionHeader>
    <SectionDesc>NASM-aligned nutrition protocols for every stage of your round.</SectionDesc>
    <PresetGrid>{golfPresets.map((preset) => <GolfPresetCard key={preset.id} preset={preset} expanded={expandedPreset === preset.id} onToggle={() => onExpandPreset(expandedPreset === preset.id ? null : preset.id)} reduceMotion={reduceMotion} />)}</PresetGrid>
  </Section>;
};

const GolfPresetCard = ({ preset, expanded, onToggle, reduceMotion }: { preset: GolfPreset; expanded: boolean; onToggle: () => void; reduceMotion: boolean }) => (
  <PresetCard>
    <PresetHeader type="button" onClick={onToggle}>
      <div><PresetName>{preset.name}</PresetName><PresetTiming>{preset.timing}</PresetTiming></div>
      <PresetCals>{preset.calorieRange} cal</PresetCals>
    </PresetHeader>
    <PresetDesc>{preset.description}</PresetDesc>
    <AnimatePresence>{expanded && <PresetDetails preset={preset} reduceMotion={reduceMotion} />}</AnimatePresence>
  </PresetCard>
);

const PresetDetails = ({ preset, reduceMotion }: { preset: GolfPreset; reduceMotion: boolean }) => (
  <PresetExpanded {...expandMotion(reduceMotion)}>
    <PresetSection><PresetLabel>Macro Split</PresetLabel><MacroRow><MacroChip>Carbs {preset.macroSplit.carbPct}%</MacroChip><MacroChip>Protein {preset.macroSplit.proteinPct}%</MacroChip><MacroChip>Fat {preset.macroSplit.fatPct}%</MacroChip></MacroRow></PresetSection>
    <PresetSection><PresetLabel>Sample Meals</PresetLabel>{preset.sampleMeals.map((meal, index) => <SampleMeal key={`${meal}-${index}`}>- {meal}</SampleMeal>)}</PresetSection>
    <PresetSection><PresetLabel>Hydration</PresetLabel><PresetText>{preset.hydration}</PresetText></PresetSection>
    <PresetSection><PresetLabel>Plan Around</PresetLabel><AvoidRow>{preset.avoid.map((item, index) => <AvoidChip key={`${item}-${index}`}>{item}</AvoidChip>)}</AvoidRow></PresetSection>
  </PresetExpanded>
);
