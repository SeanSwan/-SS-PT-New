import { lazy } from 'react';
import type { ConceptTheme } from './ConceptTypes';

/* ─── Theme Imports ─── */
import { natureWellnessTheme } from '../NatureWellness/NatureWellnessTheme';
import { natureWellnessV2Theme } from '../NatureWellness/NatureWellnessV2Theme';
import { cyberpunkPremiumTheme } from '../CyberpunkPremium/CyberpunkPremiumTheme';
import { cyberpunkPremiumV2Theme } from '../CyberpunkPremium/CyberpunkPremiumV2Theme';
import { marbleLuxuryTheme } from '../MarbleLuxury/MarbleLuxuryTheme';
import { marbleLuxuryV2Theme } from '../MarbleLuxury/MarbleLuxuryV2Theme';
import { hybridNatureTechTheme } from '../HybridNatureTech/HybridNatureTechTheme';
import { hybridNatureTechV2Theme } from '../HybridNatureTech/HybridNatureTechV2Theme';
import { funAndBoldTheme } from '../FunAndBold/FunAndBoldTheme';
import { funAndBoldV2Theme } from '../FunAndBold/FunAndBoldV2Theme';
import { artDecoGlamourTheme } from '../ArtDecoGlamour/ArtDecoGlamourTheme';

/* ─── All 11 Concepts (flat) ─── */
export const allConcepts: ConceptTheme[] = [
  natureWellnessTheme,
  natureWellnessV2Theme,
  cyberpunkPremiumTheme,
  cyberpunkPremiumV2Theme,
  marbleLuxuryTheme,
  marbleLuxuryV2Theme,
  hybridNatureTechTheme,
  hybridNatureTechV2Theme,
  funAndBoldTheme,
  funAndBoldV2Theme,
  artDecoGlamourTheme,
];

/* ─── Category Grouping ─── */
export interface ConceptCategory {
  category: string;
  label: string;
  concepts: ConceptTheme[];
}

export const conceptCategories: ConceptCategory[] = [
  { category: 'nature-wellness', label: 'Nature Wellness', concepts: [natureWellnessTheme, natureWellnessV2Theme] },
  { category: 'cyberpunk-premium', label: 'Cyberpunk Premium', concepts: [cyberpunkPremiumTheme, cyberpunkPremiumV2Theme] },
  { category: 'marble-luxury', label: 'Marble Professional Luxury', concepts: [marbleLuxuryTheme, marbleLuxuryV2Theme] },
  { category: 'hybrid-nature-tech', label: 'Hybrid Nature-Tech', concepts: [hybridNatureTechTheme, hybridNatureTechV2Theme] },
  { category: 'fun-and-bold', label: 'Fun & Bold', concepts: [funAndBoldTheme, funAndBoldV2Theme] },
  { category: 'art-deco-glamour', label: 'Art Deco Glamour', concepts: [artDecoGlamourTheme] },
];

/* ─── Lazy-Loaded Homepage Components ─── */
export const conceptComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  'nature-wellness-v1': lazy(() => import('../NatureWellness/NatureWellnessHomepage')),
  'nature-wellness-v2': lazy(() => import('../NatureWellness/NatureWellnessV2Homepage')),
  'cyberpunk-premium-v1': lazy(() => import('../CyberpunkPremium/CyberpunkPremiumHomepage')),
  'cyberpunk-premium-v2': lazy(() => import('../CyberpunkPremium/CyberpunkPremiumV2Homepage')),
  'marble-luxury-v1': lazy(() => import('../MarbleLuxury/MarbleLuxuryHomepage')),
  'marble-luxury-v2': lazy(() => import('../MarbleLuxury/MarbleLuxuryV2Homepage')),
  'hybrid-nature-tech-v1': lazy(() => import('../HybridNatureTech/HybridNatureTechHomepage')),
  'hybrid-nature-tech-v2': lazy(() => import('../HybridNatureTech/HybridNatureTechV2Homepage')),
  'fun-and-bold-v1': lazy(() => import('../FunAndBold/FunAndBoldHomepage')),
  'fun-and-bold-v2': lazy(() => import('../FunAndBold/FunAndBoldV2Homepage')),
  'art-deco-glamour-v1': lazy(() => import('../ArtDecoGlamour/ArtDecoGlamourHomepage')),
};

/* ─── Quick Lookup ─── */
export const conceptNames: Record<string, string> = Object.fromEntries(
  allConcepts.map((c) => [c.id, c.name])
);
