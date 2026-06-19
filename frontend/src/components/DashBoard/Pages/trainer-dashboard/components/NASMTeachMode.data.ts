import { movementScreenTeachData } from './NASMTeachMode.data.movement';
import { performanceTeachData } from './NASMTeachMode.data.performance';
import { postureTeachData } from './NASMTeachMode.data.posture';
import type { TeachModeData } from './NASMTeachMode.data.types';

export const TEACH_DATA: Record<string, TeachModeData> = {
  movement_screen: movementScreenTeachData,
  postural_analysis: postureTeachData,
  performance_test: performanceTeachData,
};
