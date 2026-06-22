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
  { name: 'Strawberries', risk: 'high', tip: 'Higher-residue category. Rinse well; organic can be useful when it fits your budget and access.' },
  { name: 'Spinach', risk: 'high', tip: 'Higher-residue leafy green. Rinse thoroughly and rotate greens when possible.' },
  { name: 'Kale', risk: 'high', tip: 'Residue can vary by source. Rinse well; organic is optional for daily use if it fits your plan.' },
  { name: 'Apples', risk: 'high', tip: 'Wash well. Peeling is an option when residue is a concern, but the peel also adds fiber.' },
  { name: 'Grapes', risk: 'high', tip: 'Thin skins benefit from thorough rinsing; a short baking-soda soak is optional.' },
  { name: 'Avocados', risk: 'low', tip: 'Thick peel limits edible-surface residue; conventional can be a practical budget choice.' },
  { name: 'Sweet Corn', risk: 'low', tip: 'Husk helps shield kernels; rinse after shucking and choose what fits your budget.' },
  { name: 'Pineapple', risk: 'low', tip: 'Thick rind limits edible-surface residue; wash the rind before cutting.' },
  { name: 'Onions', risk: 'low', tip: 'Outer layers are removed before eating; rinse after peeling when needed.' },
  { name: 'Sweet Potatoes', risk: 'low', tip: 'Scrub the skin well; a steady carbohydrate source that can fit many training days.' },
  { name: 'Bananas', risk: 'low', tip: 'Peel reduces edible-surface residue; portable carbohydrate for pre-training fuel.' },
  { name: 'Broccoli', risk: 'medium', tip: 'Rinse well and trim as preferred; steaming can support texture and digestion comfort.' },
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
  if (risk === 'high') return 'purple';
  if (risk === 'low') return 'cyan';
  return 'purple';
};

export const macroToneForRisk = (risk: ProduceRisk): MacroTone => {
  if (risk === 'high') return 'warning';
  if (risk === 'low') return 'success';
  return 'secondary';
};

export const riskLabel = (risk: ProduceRisk): string => {
  if (risk === 'high') return 'Higher Priority';
  if (risk === 'low') return 'Lower Priority';
  return 'Moderate Priority';
};

export const resultVariantForFastFood = (item: FastFoodItem): ResultVariant =>
  item.protein / item.cal > 0.08 ? 'cyan' : 'purple';
