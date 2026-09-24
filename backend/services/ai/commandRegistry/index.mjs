/**
 * Command Registry — Index
 * =========================
 * Merges the domain-split command registries into a unified registry.
 * Call initializeRegistry() once at server startup.
 *
 * Commands are registered across categories A-N. The per-category counts below
 * are hand-maintained and DRIFT. As of 2026-07-25 they summed to 119 while the
 * registries defined 134; re-counted 2026-08-21 the real total is 139 and the
 * hand list still says 119. Two commit messages once cited the stale 119, and a
 * 2026-08-20 external audit cited the stale 134 as if it were current.
 *
 * TREAT EVERY NUMBER IN THIS BLOCK AS WRONG. It is a rough category map, never a
 * figure to quote. To get the real number, count:
 *   getAllCommands().length              (after initializeRegistry())
 * and for what each command can actually DO:
 *   getCommandExecutionLane(command)     -- a definition existing is not the same
 *                                           as a capability working.
 *
 * No live lane counts are written here on purpose. A first draft of this comment
 * added a dated snapshot of the split, which is the very mechanism that made 119
 * and 134 stale — a block that says "every number here is wrong" must not then
 * mint five more. The authoritative, self-updating split is asserted in
 * tests/unit/commandRegistryCoverage.test.mjs, which fails when it drifts.
 *
 * A: Client Management (14)   B: Workouts (17)      C: Scheduling (10)
 * D: Health & Pain (8)        E: Nutrition (6)       F: Social (6)
 * G: Dashboard (8)            H: Trainer Mgmt (6)    I: Goals (6)
 * J: Onboarding (6)           K: System (4)          L: Client Self-Service (10)
 * M: Hermes Agent (2)       N: Intake Workspace (16)
 * O: Equipment Intelligence (4)
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
import { register as registerEquipment } from './equipmentCommands.mjs';
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
  registerEquipment();

  initialized = true;

  logger.info(`[CommandRegistry] Initialized with ${getAllCommands().length} commands across 14 categories`);
}
