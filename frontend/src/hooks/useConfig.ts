import { useContext } from 'react';
import { useTheme } from '@mui/material/styles';
import { ConfigContext } from '../context/ConfigContext';

/**
 * Enhanced hook for training app configuration
 * Adds fitness-specific helper functions while using the existing ConfigContext
 */
const useConfig = () => {
  const context = useContext(ConfigContext);
  const theme = useTheme();

  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }

  // Extended with fitness/training specific helpers
  return {
    ...context,
    // Training-specific helper functions
    formatWeightUnit: (weight: number): string => {
      // Since you don't have settings.useMetric, we'll use a fitness app convention
      // Default to imperial for US locale, metric for others
      const useMetric = context.locale !== 'en-US';
      return useMetric ? `${weight} kg` : `${Math.round(weight * 2.20462)} lbs`;
    },
    
    calculateBMI: (heightCm: number, weightKg: number): number => {
      const heightM = heightCm / 100;
      return Number((weightKg / (heightM * heightM)).toFixed(1));
    },
    
    getCalorieTarget: (gender: string, age: number, weightKg: number, heightCm: number, activityLevel: string): number => {
      // Basic BMR calculation (Mifflin-St Jeor Equation)
      let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
      bmr = gender === 'male' ? bmr + 5 : bmr - 161;
      
      // Activity multipliers
      const activityMultipliers = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very_active': 1.9
      };
      
      const multiplier = activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.2;
      return Math.round(bmr * multiplier);
    },
    
    // Dashboard specific helpers utilizing your context properties
    getChartColorScheme: () => {
      // Use navType instead of themeMode since that's what your context has
      const isDarkMode = context.navType === 'dark';
      
      return isDarkMode
        ? ['#ff5722', '#ffc107', '#4caf50', '#2196f3', '#9c27b0'] 
        : ['#ff7043', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc'];
    },
    
    // Add more fitness app specific helpers that utilize your config
    getFitnessTheme: () => {
      // Return color theme based on your presetColor
      switch(context.presetColor) {
        case 'theme1':
          return 'strength';
        case 'theme2':
          return 'cardio';
        case 'theme3':
          return 'flexibility';
        case 'theme4':
          return 'nutrition';
        case 'theme5':
          return 'recovery';
        case 'theme6':
          return 'balance';
        default:
          return 'general';
      }
    },
    
    // Convert between metric and imperial
    convertHeight: (height: number, toMetric: boolean): number => {
      return toMetric 
        ? Math.round(height * 2.54) // inches to cm
        : Math.round(height / 2.54); // cm to inches
    },
    
    convertWeight: (weight: number, toMetric: boolean): number => {
      return toMetric
        ? Number((weight / 2.20462).toFixed(1)) // lbs to kg
        : Number((weight * 2.20462).toFixed(1)); // kg to lbs
    }
  };
};

export default useConfig;