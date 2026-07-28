/**
 * FILE: CoachCommandHeaderActions.ts
 * PURPOSE: Route-safe quick actions for the Coach Command Center header.
 *
 * These actions reduce the common workout flow by one click: Log, Build, Intake,
 * and Audio are visible before the Ops drawer opens. They only navigate or switch
 * local tabs; Logger/Planner remain the save owners.
 */
export type CoachHeaderQuickActionIcon = 'log' | 'builder' | 'client' | 'intake' | 'plaud';

export type CoachHeaderQuickAction = {
  ariaLabel: string;
  detail: string;
  href?: string;
  icon: CoachHeaderQuickActionIcon;
  label: string;
  onClick?: () => void;
  tone?: 'primary' | 'standard';
};

type BuildCoachHeaderQuickActionsOptions = {
  clientPickerRoute: string;
  isClientMode: boolean;
  onOpenIntake: () => void;
  onOpenPlaud: () => void;
  scopeLabel: string;
  workoutLoggerRoute: string | null;
  workoutPlannerRoute: string | null;
};

export function buildCoachHeaderQuickActions({
  clientPickerRoute,
  isClientMode,
  onOpenIntake,
  onOpenPlaud,
  scopeLabel,
  workoutLoggerRoute,
  workoutPlannerRoute,
}: BuildCoachHeaderQuickActionsOptions): CoachHeaderQuickAction[] {
  const actions: CoachHeaderQuickAction[] = [];

  if (workoutLoggerRoute) {
    actions.push({
      ariaLabel: `Log workout for ${scopeLabel}`,
      detail: scopeLabel,
      href: workoutLoggerRoute,
      icon: 'log',
      label: scopeLabel === 'My workout log' ? 'Self Log' : 'Log Workout',
      tone: 'primary',
    });
  } else if (!isClientMode) {
    actions.push({
      ariaLabel: 'Pick client for workout logging',
      detail: 'Client first',
      href: clientPickerRoute,
      icon: 'client',
      label: 'Pick Client',
      tone: 'primary',
    });
  }

  if (workoutPlannerRoute) {
    actions.push({
      ariaLabel: `${isClientMode ? 'Open workouts' : 'Build workout'} for ${scopeLabel}`,
      detail: scopeLabel,
      href: workoutPlannerRoute,
      icon: 'builder',
      label: isClientMode ? 'Workouts' : 'Build',
    });
  }

  if (!isClientMode && scopeLabel === 'My workout log') {
    actions.push({
      ariaLabel: 'Pick a client for workout logging',
      detail: 'Client',
      href: clientPickerRoute,
      icon: 'client',
      label: 'Pick Client',
    });
  }

  if (!isClientMode) {
    actions.push(
      {
        ariaLabel: 'Review intake queue',
        detail: 'Queue',
        icon: 'intake',
        label: 'Intake',
        onClick: onOpenIntake,
      },
      {
        ariaLabel: 'Import audio',
        detail: 'Audio',
        icon: 'plaud',
        label: 'Audio',
        onClick: onOpenPlaud,
      },
    );
  }

  return actions;
}
