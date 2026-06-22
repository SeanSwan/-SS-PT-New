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

interface USDANutrient {
  nutrientNumber: string;
  value: unknown;
}

interface USDAFood {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  foodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: USDANutrient[];
}

interface OFFProduct {
  _id: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  serving_quantity?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: unknown;
    fat_100g?: unknown;
    carbohydrates_100g?: unknown;
  };
}

const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY';
const USDA_ENDPOINT = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const OFF_ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl';

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

const titleCase = (value: string): string =>
  value.toLowerCase().replace(/(?:^|\s|[-/,(])\S/g, (char) => char.toUpperCase());

const strictFoodMacro = (value: unknown): number | null => {
  const cleaned = cleanMacro(value);
  return cleaned === null ? null : Math.round(cleaned);
};

const servingLabel = (value: unknown, unit = 'g'): string => {
  const cleaned = cleanMacro(value);
  return cleaned === null || cleaned <= 0 ? '100g' : `${cleaned}${unit || 'g'}`;
};

const usdaNutrient = (nutrients: USDANutrient[], id: string): number | null => {
  const nutrient = nutrients.find((item) => item.nutrientNumber === id);
  return nutrient ? strictFoodMacro(nutrient.value) : null;
};

const mapUSDA = (item: USDAFood): FoodResult => {
  const servingSize = item.servingSize && item.servingSizeUnit
    ? servingLabel(item.servingSize, item.servingSizeUnit)
    : '100g';

  return {
    id: `usda-${item.fdcId}`,
    name: titleCase(item.description),
    brand: item.brandOwner || item.brandName || undefined,
    category: item.foodCategory || undefined,
    calories: usdaNutrient(item.foodNutrients, '208'),
    protein: usdaNutrient(item.foodNutrients, '203'),
    fat: usdaNutrient(item.foodNutrients, '204'),
    carbs: usdaNutrient(item.foodNutrients, '205'),
    servingSize,
    source: 'USDA',
  };
};

const mapOFF = (item: OFFProduct): FoodResult | null => {
  if (!item._id || !item.product_name || !item.nutriments) return null;
  const nutrients = item.nutriments;

  return {
    id: `off-${item._id}`,
    name: titleCase(item.product_name),
    brand: item.brands || undefined,
    category: item.categories?.split(',')[0]?.trim() || undefined,
    calories: strictFoodMacro(nutrients['energy-kcal_100g']),
    protein: strictFoodMacro(nutrients.proteins_100g),
    fat: strictFoodMacro(nutrients.fat_100g),
    carbs: strictFoodMacro(nutrients.carbohydrates_100g),
    servingSize: servingLabel(item.serving_quantity),
    source: 'OFF',
  };
};

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

const fetchUSDA = async (query: string): Promise<FoodResult[]> => {
  const params = new URLSearchParams({ api_key: USDA_API_KEY, query, pageSize: '15' });
  const response = await fetch(`${USDA_ENDPOINT}?${params}`);
  if (!response.ok) throw new Error(`USDA ${response.status}`);
  const data = await response.json();
  return ((data.foods || []) as USDAFood[]).map(mapUSDA);
};

const fetchOFF = async (query: string): Promise<FoodResult[]> => {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '15',
  });
  const response = await fetch(`${OFF_ENDPOINT}?${params}`);
  if (!response.ok) throw new Error(`OFF ${response.status}`);
  const data = await response.json();
  return ((data.products || []) as OFFProduct[]).map(mapOFF).filter((item): item is FoodResult => item !== null);
};

export const fetchFoodSearchResults = async (query: string): Promise<FoodResult[]> => {
  const [usdaResult, offResult] = await Promise.allSettled([fetchUSDA(query), fetchOFF(query)]);
  const usdaFoods = usdaResult.status === 'fulfilled' ? usdaResult.value : [];
  const offFoods = offResult.status === 'fulfilled' ? offResult.value : [];
  return deduplicateResults([...usdaFoods, ...offFoods]);
};
