import type { ConceptRegistryItem, EnvironmentFamily } from './conceptRegistry.types';
import { CONCEPT_REGISTRY_PART_ONE } from './conceptRegistry.partOne';
import { CONCEPT_REGISTRY_PART_TWO } from './conceptRegistry.partTwo';

export type { ConceptRegistryItem, EnvironmentFamily };
export const DEFAULT_CONCEPT_ID = 'crystalline-swan-world';
export const WORKOUT_DESIGN_CONCEPT_COUNT = 25;
export const CONCEPT_REGISTRY: ConceptRegistryItem[] = [
  ...CONCEPT_REGISTRY_PART_ONE,
  ...CONCEPT_REGISTRY_PART_TWO,
];
