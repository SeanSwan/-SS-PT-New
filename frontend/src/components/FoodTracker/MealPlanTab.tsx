/**
 * MealPlanTab
 *
 * Controller for generated meal plans, photo analysis, and golf nutrition
 * presets. Render sections and styles live beside this file to keep the
 * mounted NutritionWorkspace tab inside SwanStudios line-cap rules.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../../services/api.service';
import {
  GolfPreset,
  MealPlan,
  MealPlanTabProps,
  OPT_PHASES,
  PHOTO_ERROR_COPY,
  PhotoAnalysis,
  PLAN_ERROR_COPY,
} from './MealPlanTab.types';
import {
  GolfPresetSection,
  MealPlanGeneratorSection,
  PhotoAnalysisSection,
} from './MealPlanTab.sections';
import { TabRoot } from './MealPlanTab.styles';

const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

const parseMealPlanTarget = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed || !DECIMAL_NUMBER_PATTERN.test(trimmed)) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const MealPlanTab: React.FC<MealPlanTabProps> = ({ onDataSent }) => {
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoResult, setPhotoResult] = useState<PhotoAnalysis | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [golfPresets, setGolfPresets] = useState<GolfPreset[]>([]);
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);

  useEffect(() => {
    apiService.get('/api/meal-plans/golf-presets')
      .then((response) => {
        if (response.data.success) setGolfPresets(response.data.presets);
      })
      .catch(() => {});
  }, []);

  const toggleRestriction = useCallback((restriction: string) => {
    setSelectedRestrictions((prev) =>
      prev.includes(restriction) ? prev.filter((item) => item !== restriction) : [...prev, restriction],
    );
  }, []);

  const toggleCondition = useCallback((condition: string) => {
    setSelectedConditions((prev) =>
      prev.includes(condition) ? prev.filter((item) => item !== condition) : [...prev, condition],
    );
  }, []);

  const generatePlan = useCallback(async () => {
    setPlanLoading(true);
    setPlanError('');
    setPlan(null);
    try {
      const calorieTarget = parseMealPlanTarget(calories);
      const response = await apiService.post('/api/meal-plans/generate', {
        calories: calorieTarget,
        protein: parseMealPlanTarget(protein),
        carbs: parseMealPlanTarget(carbs),
        fat: parseMealPlanTarget(fat),
        restrictions: selectedRestrictions,
        healthConditions: selectedConditions,
        activityType,
        optPhase,
      });
      setPlan(response.data.plan);
    } catch (err: any) {
      setPlanError(err?.response?.status === 401 ? 'Log in to generate meal plans' : PLAN_ERROR_COPY);
    } finally {
      setPlanLoading(false);
    }
  }, [activityType, calories, carbs, fat, optPhase, protein, selectedConditions, selectedRestrictions]);

  const handlePhotoSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoResult(null);
    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const clearPhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoResult(null);
    setPhotoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const analyzePhoto = useCallback(async () => {
    if (!photoFile) return;
    setPhotoLoading(true);
    setPhotoError('');
    try {
      const form = new FormData();
      form.append('photo', photoFile);
      const response = await apiService.post('/api/meal-plans/analyze-photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotoResult(response.data.analysis);
    } catch (err: any) {
      setPhotoError(err?.response?.status === 401 ? 'Log in to analyze meal photos' : PHOTO_ERROR_COPY);
    } finally {
      setPhotoLoading(false);
    }
  }, [photoFile]);

  return (
    <TabRoot>
      <MealPlanGeneratorSection
        calories={calories}
        protein={protein}
        carbs={carbs}
        fat={fat}
        activityType={activityType}
        optPhase={optPhase}
        selectedRestrictions={selectedRestrictions}
        selectedConditions={selectedConditions}
        plan={plan}
        planLoading={planLoading}
        planError={planError}
        expandedMeal={expandedMeal}
        onCaloriesChange={setCalories}
        onProteinChange={setProtein}
        onCarbsChange={setCarbs}
        onFatChange={setFat}
        onActivityTypeChange={setActivityType}
        onOptPhaseChange={setOptPhase}
        onToggleRestriction={toggleRestriction}
        onToggleCondition={toggleCondition}
        onGeneratePlan={generatePlan}
        onExpandMeal={setExpandedMeal}
        onDataSent={onDataSent}
      />
      <PhotoAnalysisSection
        photoFile={photoFile}
        photoPreview={photoPreview}
        photoResult={photoResult}
        photoLoading={photoLoading}
        photoError={photoError}
        fileInputRef={fileInputRef}
        onPhotoSelect={handlePhotoSelect}
        onAnalyzePhoto={analyzePhoto}
        onClearPhoto={clearPhoto}
        onDataSent={onDataSent}
      />
      <GolfPresetSection
        golfPresets={golfPresets}
        expandedPreset={expandedPreset}
        onExpandPreset={setExpandedPreset}
      />
    </TabRoot>
  );
};

export default MealPlanTab;
