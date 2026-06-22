export type FoodIntelligenceTabId = 'nutrition' | 'food-search' | 'produce' | 'fast-food' | 'motivation';
export type ProduceRisk = 'high' | 'medium' | 'low';
export type ResultVariant = 'cyan' | 'purple' | 'alert';
export type MacroTone = 'warning' | 'accent' | 'secondary' | 'text' | 'success' | 'danger';

export interface FoodResult {
  name?: string;
  description?: string;
  calories?: number;
  protein_g?: number;
  carbohydrates_total_g?: number;
  fat_total_g?: number;
  fiber_g?: number;
  serving_size_g?: number;
}

export interface ProduceItem {
  name: string;
  risk: ProduceRisk;
  tip: string;
}

export interface FastFoodItem {
  name: string;
  restaurant: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  verdict: string;
}

export const SAFE_INTELLIGENCE_ERROR = 'Nutrition intelligence is unavailable right now. Please try again.';

export const PRODUCE_DATA: ProduceItem[] = [
  { name: 'Strawberries', risk: 'high', tip: 'Always buy organic. #1 on Dirty Dozen list. Wash thoroughly under running water.' },
  { name: 'Spinach', risk: 'high', tip: 'High pesticide residue. Choose organic when possible. Triple-wash before consuming.' },
  { name: 'Kale', risk: 'high', tip: 'Increasing pesticide contamination. Organic recommended for daily smoothies.' },
  { name: 'Apples', risk: 'high', tip: 'Wax coating traps pesticides. Peel non-organic or buy organic.' },
  { name: 'Grapes', risk: 'high', tip: 'Thin skin absorbs chemicals easily. Wash with baking soda solution.' },
  { name: 'Avocados', risk: 'low', tip: 'Thick skin protects fruit. #1 on Clean Fifteen - conventional is fine.' },
  { name: 'Sweet Corn', risk: 'low', tip: 'Husk protects kernels. Very low pesticide residue.' },
  { name: 'Pineapple', risk: 'low', tip: 'Thick rind means minimal pesticide exposure. Conventional is safe.' },
  { name: 'Onions', risk: 'low', tip: 'Outer layers are removed before eating. Very clean produce choice.' },
  { name: 'Sweet Potatoes', risk: 'low', tip: 'Underground growth reduces exposure. Great nutrient-dense carb source.' },
  { name: 'Bananas', risk: 'low', tip: 'Peel before eating eliminates most residue. Great pre-workout snack.' },
  { name: 'Broccoli', risk: 'medium', tip: 'Moderate pesticide levels. Wash well and steam to reduce residue.' },
];

export const FAST_FOOD_ITEMS: FastFoodItem[] = [
  { name: 'Grilled Chicken Sandwich', restaurant: 'Most chains', cal: 380, protein: 32, carbs: 38, fat: 10, verdict: 'Protein-forward option. Sauce on the side gives you more control over the meal.' },
  { name: 'Double Cheeseburger', restaurant: 'Most chains', cal: 740, protein: 42, carbs: 48, fat: 42, verdict: 'Higher energy and fat. Plan it around your day and training context.' },
  { name: 'Caesar Salad (with dressing)', restaurant: 'Most chains', cal: 470, protein: 18, carbs: 22, fat: 35, verdict: 'Dressing and croutons drive much of the energy; asking for dressing on the side gives more control.' },
  { name: 'Egg McMuffin', restaurant: 'McDonald\'s', cal: 300, protein: 17, carbs: 30, fat: 12, verdict: 'Balanced breakfast option with a practical protein-to-energy ratio.' },
  { name: 'Protein Bowl (no rice)', restaurant: 'Chipotle', cal: 420, protein: 46, carbs: 14, fat: 22, verdict: 'Strong protein profile. Add extra protein if your coach has set a higher-protein day.' },
  { name: 'Large Fries', restaurant: 'Most chains', cal: 490, protein: 7, carbs: 63, fat: 24, verdict: 'Mostly carbohydrate and fat with little protein; pair with a protein source if it fits your plan.' },
];

export const resultVariantForRisk = (risk: ProduceRisk): ResultVariant => {
  if (risk === 'high') return 'alert';
  if (risk === 'low') return 'cyan';
  return 'purple';
};

export const macroToneForRisk = (risk: ProduceRisk): MacroTone => {
  if (risk === 'high') return 'danger';
  if (risk === 'low') return 'success';
  return 'warning';
};

export const riskLabel = (risk: ProduceRisk): string => {
  if (risk === 'high') return 'High Risk';
  if (risk === 'low') return 'Low Risk';
  return 'Moderate';
};

export const resultVariantForFastFood = (item: FastFoodItem): ResultVariant =>
  item.protein / item.cal > 0.08 ? 'cyan' : 'purple';
