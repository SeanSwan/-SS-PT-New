/**
 * Command Registry — Index
 * =========================
 * Merges all 12 domain-split command registries into a unified registry.
 * Call initializeRegistry() once at server startup.
 *
 * 94 commands across categories A-L:
 * A: Client Management (14)   B: Workouts (12)      C: Scheduling (8)
 * D: Health & Pain (8)        E: Nutrition (6)       F: Social (6)
 * G: Dashboard (8)            H: Trainer Mgmt (6)    I: Goals (6)
 * J: Onboarding (6)           K: System (4)          L: Client Self-Service (10)
 */
import { register as registerClient } from './clientCommands.mjs';
import { register as registerWorkout } from './workoutCommands.mjs';
import { register as registerSchedule } from './scheduleCommands.mjs';
import { register as registerHealth } from './healthCommands.mjs';
import { register as registerNutrition } from './nutritionCommands.mjs';
import { register as registerSocial } from './socialCommands.mjs';
import { register as registerDashboard } from './dashboardCommands.mjs';
import { register as registerTrainer } from './trainerCommands.mjs';
import { register as registerGoal } from './goalCommands.mjs';
import { register as registerOnboarding } from './onboardingCommands.mjs';
import { register as registerSystem } from './systemCommands.mjs';
import { register as registerClientSelfService } from './clientSelfService.mjs';
import logger from '../../../utils/logger.mjs';

export {
  getCommand,
  getAllCommands,
  getCommandsForRole,
  getAllCommandTypes,
  buildCommandSummaryForClassifier,
} from './baseSchemas.mjs';

let initialized = false;

/**
 * Initialize the full command registry. Call once at server startup.
 * Idempotent — safe to call multiple times.
 */
export function initializeRegistry() {
  if (initialized) return;

  registerClient();
  registerWorkout();
  registerSchedule();
  registerHealth();
  registerNutrition();
  registerSocial();
  registerDashboard();
  registerTrainer();
  registerGoal();
  registerOnboarding();
  registerSystem();
  registerClientSelfService();

  initialized = true;

  logger.info(`[CommandRegistry] Initialized with 94 commands across 12 categories`);
}
