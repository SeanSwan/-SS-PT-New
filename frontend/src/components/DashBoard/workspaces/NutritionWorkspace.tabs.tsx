import type { ReactNode } from 'react';
import {
  BookOpen,
  Brain,
  Building2,
  CalendarCheck,
  Droplets,
  MapPin,
  Mic,
  PieChart,
  Pill,
  ScanBarcode,
  Search,
  Sprout,
  Utensils,
} from 'lucide-react';

export type Tab =
  | 'today'
  | 'log'
  | 'voice'
  | 'search'
  | 'barcode'
  | 'restaurant'
  | 'hydration'
  | 'macros'
  | 'intelligence'
  | 'learn'
  | 'garden'
  | 'farms'
  | 'supplements'
  | 'meal-plan';

export interface NutritionTabConfig {
  id: Tab;
  label: string;
  icon: ReactNode;
}

const NUTRITION_PRIMARY_TABS: NutritionTabConfig[] = [
  { id: 'log', label: 'Manual Meal', icon: <Utensils size={16} /> },
  { id: 'search', label: 'Food Search', icon: <Search size={16} /> },
  { id: 'barcode', label: 'Barcode', icon: <ScanBarcode size={16} /> },
  { id: 'voice', label: 'Speak a Meal', icon: <Mic size={16} /> },
  { id: 'restaurant', label: 'Restaurant', icon: <Building2 size={16} /> },
];

const NUTRITION_MORE_TABS: NutritionTabConfig[] = [
  { id: 'today', label: 'Today Dashboard', icon: <CalendarCheck size={16} /> },
  { id: 'hydration', label: 'Hydration', icon: <Droplets size={16} /> },
  { id: 'macros', label: 'My Macros', icon: <PieChart size={16} /> },
  { id: 'meal-plan', label: 'Swan Coach Meal Plan', icon: <Brain size={16} /> },
  { id: 'intelligence', label: 'Intelligence', icon: <Search size={16} /> },
  { id: 'learn', label: 'Learn', icon: <BookOpen size={16} /> },
  { id: 'garden', label: 'Garden', icon: <Sprout size={16} /> },
  { id: 'farms', label: 'Farm Finder', icon: <MapPin size={16} /> },
  { id: 'supplements', label: 'Supplements', icon: <Pill size={16} /> },
];

/** Every nutrition tab (id + label + icon). The SegmentedTabBar groups these
 *  ids into 4 intent segments — see NutritionWorkspace.segments.ts. */
export const NUTRITION_ALL_TABS: readonly NutritionTabConfig[] = [...NUTRITION_PRIMARY_TABS, ...NUTRITION_MORE_TABS];

export const NUTRITION_TAB_LABELS = NUTRITION_ALL_TABS.reduce<Record<Tab, string>>((labels, tab) => {
  labels[tab.id] = tab.label;
  return labels;
}, {} as Record<Tab, string>);

export const nutritionPanelId = (tab: Tab) => `nutrition-tab-${tab}`;
