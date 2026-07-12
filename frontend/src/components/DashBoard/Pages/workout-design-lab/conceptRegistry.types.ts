import type React from 'react';
import type { ConceptProps } from './concepts/conceptShared';

export type EnvironmentFamily =
  | 'Polar'
  | 'Forest'
  | 'Ocean'
  | 'Coast'
  | 'City'
  | 'Space'
  | 'Geologic'
  | 'Desert'
  | 'Storm'
  | 'Technical'
  | 'Swan Signature';

export interface ConceptRegistryItem {
  id: string;
  number: string;
  name: string;
  description: string;
  environmentFamily: EnvironmentFamily;
  interactionModel: string;
  paletteTokens: string[];
  typographyDirection: string;
  backgroundStrategy: string;
  component: React.ComponentType<ConceptProps>;
  writeCapability: 'prototype-only';
  reducedMotion: 'static' | 'reduced';
  primaryActionLabel: string;
  recommended?: boolean;
}

export const CONCEPT_PALETTE = [
  '--world-bg', '--world-panel', '--world-accent', '--world-text', '--world-muted',
];
