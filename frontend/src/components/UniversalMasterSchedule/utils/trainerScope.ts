export type ScheduleMode = 'admin' | 'trainer' | 'client';
export type AdminViewScope = 'my' | 'global';

export interface TrainerScopeTrainer {
  id: string | number;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  profileImageUrl?: string | null;
  photo?: string | null;
  [key: string]: unknown;
}

export interface TrainerScopeSession {
  trainerId?: string | number | null;
  [key: string]: unknown;
}

interface BuildScheduleTrainerScopeParams<TSession extends TrainerScopeSession> {
  mode: ScheduleMode;
  adminViewScope: AdminViewScope;
  currentUser?: TrainerScopeTrainer | null;
  trainers: TrainerScopeTrainer[];
  sessions: TSession[];
  selectedTrainerId?: string | number | null;
}

export interface ScheduleTrainerScope<TSession extends TrainerScopeSession> {
  displaySessions: TSession[];
  calendarTrainers: TrainerScopeTrainer[];
  headerTitle: string;
  headerSubtitle: string;
  headerImageUrl?: string;
}

function idsMatch(left?: string | number | null, right?: string | number | null): boolean {
  return left != null && right != null && String(left) === String(right);
}

function buildName(person?: TrainerScopeTrainer | null): string {
  if (!person) return '';
  const explicit = typeof person.name === 'string' ? person.name.trim() : '';
  if (explicit) return explicit;
  return [person.firstName, person.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim())
    .join(' ');
}

function normalizeTrainer(trainer: TrainerScopeTrainer): TrainerScopeTrainer {
  const name = buildName(trainer) || `Trainer ${trainer.id}`;
  return {
    ...trainer,
    name,
  };
}

function findTrainer(
  trainers: TrainerScopeTrainer[],
  id?: string | number | null,
  fallback?: TrainerScopeTrainer | null,
): TrainerScopeTrainer | null {
  const found = trainers.find((trainer) => idsMatch(trainer.id, id));
  if (found) return found;
  if (fallback?.id != null && idsMatch(fallback.id, id)) return normalizeTrainer(fallback);
  return null;
}

function sessionsForTrainer<TSession extends TrainerScopeSession>(
  sessions: TSession[],
  trainerId?: string | number | null,
): TSession[] {
  if (trainerId == null) return sessions;
  return sessions.filter((session) => idsMatch(session.trainerId, trainerId));
}

function possessive(firstName: string): string {
  if (!firstName) return 'Schedule';
  return `${firstName}${firstName.endsWith('s') ? "'" : "'s"} Schedule`;
}

export function buildScheduleTrainerScope<TSession extends TrainerScopeSession>({
  mode,
  adminViewScope,
  currentUser,
  trainers,
  sessions,
  selectedTrainerId,
}: BuildScheduleTrainerScopeParams<TSession>): ScheduleTrainerScope<TSession> {
  const normalizedTrainers = trainers.map(normalizeTrainer);
  const currentTrainer = findTrainer(normalizedTrainers, currentUser?.id, currentUser);
  const selectedTrainer = findTrainer(normalizedTrainers, selectedTrainerId, null);

  if (mode === 'admin' && adminViewScope === 'global') {
    if (selectedTrainer) {
      const selectedName = buildName(selectedTrainer);
      return {
        displaySessions: sessionsForTrainer(sessions, selectedTrainer.id),
        calendarTrainers: [selectedTrainer],
        headerTitle: possessive(String(selectedTrainer.firstName || selectedName.split(' ')[0] || 'Trainer')),
        headerSubtitle: selectedName,
        headerImageUrl: String(selectedTrainer.profileImageUrl || selectedTrainer.photo || '') || undefined,
      };
    }

    return {
      displaySessions: sessions,
      calendarTrainers: normalizedTrainers,
      headerTitle: 'All Trainer Schedules',
      headerSubtitle: `${normalizedTrainers.length} trainer${normalizedTrainers.length === 1 ? '' : 's'}`,
    };
  }

  const scopedTrainer = mode === 'client' ? null : currentTrainer;
  const currentName = buildName(scopedTrainer || currentUser) || 'Account holder';
  const firstName = String((scopedTrainer || currentUser)?.firstName || currentName.split(' ')[0] || '');

  return {
    displaySessions: mode === 'client' ? sessions : sessionsForTrainer(sessions, scopedTrainer?.id || currentUser?.id),
    calendarTrainers: scopedTrainer ? [scopedTrainer] : normalizedTrainers,
    headerTitle: mode === 'client' ? 'Your Schedule' : possessive(firstName),
    headerSubtitle: currentName,
    headerImageUrl: String((scopedTrainer || currentUser)?.profileImageUrl || (scopedTrainer || currentUser)?.photo || '') || undefined,
  };
}
