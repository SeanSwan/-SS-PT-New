/**
 * Command Registry — Index
 * =========================
 * Merges the domain-split command registries into a unified registry.
 * Call initializeRegistry() once at server startup.
 *
 * Commands are registered across categories A-N. The per-category counts below
 * are hand-maintained and DRIFT — as of 2026-07-25 they sum to 119 while the
 * registries actually define 134 commands. Treat them as a rough map, never as
 * a figure to quote: two commit messages cited the stale 119 before anyone
 * counted. To get the real number, count definitions rather than trusting this
 * block.
 *
 * A: Client Management (14)   B: Workouts (17)      C: Scheduling (10)
 * D: Health & Pain (8)        E: Nutrition (6)       F: Social (6)
 * G: Dashboard (8)            H: Trainer Mgmt (6)    I: Goals (6)
 * J: Onboarding (6)           K: System (4)          L: Client Self-Service (10)
 * M: Hermes Agent (2)       N: Intake Workspace (16)
 */
import { register as registerClient } from './clientCommands.mjs';
import { register as registerWorkout } from './workoutCommands.mjs';
import { register as registerPlannerSequence } from './plannerSequenceCommands.mjs';
import { register as registerBootcamp } from './bootcampCommands.mjs';
import { register as registerPainChart } from './painChartCommands.mjs';
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
import { register as registerHermes } from './hermesCommands.mjs';
import { register as registerCoachIntake } from './coachIntakeCommands.mjs';
import { register as registerPlaudStructuredActions } from './plaudStructuredActionCommands.mjs';
import { register as registerPlaud } from './plaudCommands.mjs';
import { getAllCommands } from './baseSchemas.mjs';
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
  registerPlannerSequence();
  registerBootcamp();
  registerPainChart();
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
  registerHermes();
  registerCoachIntake();
  registerPlaudStructuredActions();
  registerPlaud();

  initialized = true;

  logger.info(`[CommandRegistry] Initialized with ${getAllCommands().length} commands across 14 categories`);
}
