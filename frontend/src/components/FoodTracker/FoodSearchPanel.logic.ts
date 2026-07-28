import apiService from '../../services/api.service';
import { cleanMacro } from './mealPhotoLog';

export type FoodSource = 'USDA' | 'OFF';
export type HealthRating = 'good' | 'okay' | 'bad';

export interface FoodResult {
  id: string | number;
  name: string;
  brand?: string;
  category?: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  servingSize?: string;
  healthRating?: HealthRating;
  organic?: boolean;
  source?: FoodSource;
  iarcGroup?: '1' | '2A' | '2B';
  isEUBanned?: boolean;
  isGMO?: boolean;
}

interface FoodSearchProxyResponse {
  success: boolean;
  foods?: FoodResult[];
  message?: string;
}

export const CATEGORIES = [
  'All', 'Protein', 'Vegetables', 'Fruits', 'Grains',
  'Dairy', 'Snacks', 'Beverages', 'International',
] as const;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Protein: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'egg', 'tofu', 'protein', 'meat', 'steak', 'lamb', 'sausage', 'bacon', 'ham', 'whey', 'casein'],
  Vegetables: ['vegetable', 'broccoli', 'spinach', 'carrot', 'lettuce', 'tomato', 'pepper', 'onion', 'kale', 'celery', 'cucumber', 'zucchini', 'cauliflower', 'corn', 'peas', 'bean', 'potato', 'sweet potato', 'cabbage', 'asparagus', 'mushroom', 'salad', 'greens'],
  Fruits: ['fruit', 'apple', 'banana', 'orange', 'grape', 'berry', 'strawberry', 'blueberry', 'mango', 'pineapple', 'peach', 'pear', 'melon', 'watermelon', 'cherry', 'lemon', 'lime', 'avocado', 'kiwi'],
  Grains: ['grain', 'bread', 'rice', 'pasta', 'oat', 'wheat', 'cereal', 'quinoa', 'barley', 'tortilla', 'flour', 'noodle', 'bagel', 'muffin', 'cracker', 'granola'],
  Dairy: ['dairy', 'milk', 'cheese', 'yogurt', 'butter', 'cream', 'ice cream', 'cottage', 'mozzarella', 'cheddar', 'parmesan', 'whey'],
  Snacks: ['snack', 'chip', 'cookie', 'cake', 'candy', 'chocolate', 'bar', 'pretzel', 'popcorn', 'cracker', 'trail mix', 'nuts', 'almond', 'peanut', 'cashew', 'walnut', 'granola bar'],
  Beverages: ['beverage', 'drink', 'juice', 'soda', 'water', 'tea', 'coffee', 'smoothie', 'shake', 'beer', 'wine', 'milk', 'lemonade', 'energy drink', 'sports drink', 'kombucha'],
  International: ['sushi', 'ramen', 'curry', 'kimchi', 'naan', 'hummus', 'falafel', 'taco', 'burrito', 'gyoza', 'pho', 'pad thai', 'tikka', 'dim sum', 'samosa', 'empanada', 'pierogi', 'borscht', 'paella', 'bibimbap', 'miso', 'tempura', 'dosa', 'biryani'],
};

const strictFoodMacro = (value: unknown): number | null => {
  const cleaned = cleanMacro(value);
  return cleaned === null ? null : Math.round(cleaned);
};

const normalizeFoodResult = (food: FoodResult): FoodResult => ({
  ...food,
  calories: strictFoodMacro(food.calories),
  protein: strictFoodMacro(food.protein),
  carbs: strictFoodMacro(food.carbs),
  fat: strictFoodMacro(food.fat),
  source: food.source === 'OFF' ? 'OFF' : 'USDA',
});

const deduplicateResults = (items: FoodResult[]): FoodResult[] => {
  const seen = new Map<string, FoodResult>();
  for (const item of items) {
    const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
};

export const matchesCategory = (food: FoodResult, category: string): boolean => {
  if (category === 'All') return true;
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords) return true;
  const haystack = `${food.name} ${food.category || ''} ${food.brand || ''}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
};

export const fetchFoodSearchResults = async (query: string): Promise<FoodResult[]> => {
  try {
    const response = await apiService.get<FoodSearchProxyResponse>(
      `/api/nutrition/food-search?q=${encodeURIComponent(query)}&pageSize=15`,
    );
    if (!response.data?.success) return [];
    return deduplicateResults((response.data.foods || []).map(normalizeFoodResult));
  } catch {
    return [];
  }
};