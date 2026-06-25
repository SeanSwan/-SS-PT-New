/**
 * FILE: ExerciseCodexMatrix.logic.ts
 * PURPOSE: Merge the full exercise Rolodex with logged exercise frequency so
 * progress surfaces can show trained and untouched movements in one dense map.
 */
export type ExerciseCodexStatus = 'mastered' | 'trained' | 'sampled' | 'untrained';
export interface ExerciseCodexCatalogEntry {
  id?: string | number | null;
  name?: string | null;
  exerciseKey?: string | null;
  exercise_key?: string | null;
  exerciseType?: string | null;
  bodyPartCategory?: string | null;
  primaryMuscles?: unknown;
  secondaryMuscles?: unknown;
  equipment?: unknown;
  equipmentNeeded?: unknown;
  difficulty?: number | string | null;
  nasmMovementPattern?: string | null;
  previewVideoUrl?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  catalogVideoSample?: unknown;
}
export interface ExerciseCodexLoggedPoint {
  x?: string | null;
  y?: number | string | null;
  sets?: number | string | null;
}
export interface ExerciseCodexCoverageGroup {
  label: string;
  total: number;
  trained: number;
  pct: number;
}
export interface ExerciseCodexRow {
  id: string;
  name: string;
  exerciseKey: string;
  exerciseType: string;
  bodyPartCategory: string;
  pattern: string;
  primaryMuscles: string[];
  equipment: string[];
  difficulty: number;
  sessions: number;
  sets: number;
  status: ExerciseCodexStatus;
  intensityPct: number;
  hasDemo: boolean;
  priorityScore: number;
}
export interface ExerciseCodexSummary {
  totalExercises: number;
  loggedExercises: number;
  untrainedExercises: number;
  totalSessions: number;
  totalSets: number;
  coveragePct: number;
  statusCounts: Record<ExerciseCodexStatus, number>;
  mostTrained: ExerciseCodexRow | null;
  nextTargets: ExerciseCodexRow[];
  bodyPartCoverage: ExerciseCodexCoverageGroup[];
  patternCoverage: ExerciseCodexCoverageGroup[];
  difficultyBands: ExerciseCodexCoverageGroup[];
}
export interface ExerciseCodexMatrixResult {
  rows: ExerciseCodexRow[];
  summary: ExerciseCodexSummary;
}
const STATUS_ORDER: Record<ExerciseCodexStatus, number> = {
  mastered: 4,
  trained: 3,
  sampled: 2,
  untrained: 1,
};
const DIFFICULTY_BANDS = [
  { label: 'Foundation', min: 0, max: 99 },
  { label: 'Development', min: 100, max: 249 },
  { label: 'Advanced', min: 250, max: Number.POSITIVE_INFINITY },
];
const cleanText = (value: unknown, fallback = ''): string => (
  typeof value === 'string' && value.trim() ? value.trim() : fallback
);
const normalizeName = (value: unknown): string => cleanText(value)
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};
const parseTextArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parseTextArray(parsed);
    if (typeof parsed === 'string') return parseTextArray(parsed);
    return [];
  } catch {
    return value.split(',').map((item) => cleanText(item)).filter(Boolean);
  }
};
const getCatalogExerciseKey = (entry: ExerciseCodexCatalogEntry): string => (
  cleanText(entry.exerciseKey) || cleanText(entry.exercise_key)
);
const getLoggedMap = (logged: ExerciseCodexLoggedPoint[]) => {
  const byName = new Map<string, { sessions: number; sets: number; label: string }>();
  for (const point of logged) {
    const label = cleanText(point?.x);
    const key = normalizeName(label);
    const sessions = Math.max(0, toFiniteNumber(point?.y));
    const sets = Math.max(0, toFiniteNumber(point?.sets));
    if (!key || sessions <= 0) continue;
    const current = byName.get(key);
    byName.set(key, {
      label,
      sessions: (current?.sessions ?? 0) + sessions,
      sets: (current?.sets ?? 0) + sets,
    });
  }
  return byName;
};
const resolveStatus = (sessions: number): ExerciseCodexStatus => {
  if (sessions >= 10) return 'mastered';
  if (sessions >= 2) return 'trained';
  if (sessions >= 1) return 'sampled';
  return 'untrained';
};
const makeRow = (
  entry: ExerciseCodexCatalogEntry,
  logged: { sessions: number; sets: number } | undefined,
  index: number,
): ExerciseCodexRow => {
  const name = cleanText(entry.name, `Exercise ${index + 1}`);
  const sessions = logged?.sessions ?? 0;
  const sets = logged?.sets ?? 0;
  const status = resolveStatus(sessions);
  const exerciseKey = getCatalogExerciseKey(entry);
  const primaryMuscles = parseTextArray(entry.primaryMuscles);
  const equipment = parseTextArray(entry.equipment ?? entry.equipmentNeeded);
  const bodyPartCategory = cleanText(entry.bodyPartCategory, primaryMuscles[0] || 'Full Body');
  return {
    id: cleanText(entry.id, exerciseKey || normalizeName(name) || `exercise-${index + 1}`),
    name,
    exerciseKey,
    exerciseType: cleanText(entry.exerciseType, 'training'),
    bodyPartCategory,
    pattern: cleanText(entry.nasmMovementPattern, 'Unmapped'),
    primaryMuscles,
    equipment,
    difficulty: Math.max(0, toFiniteNumber(entry.difficulty)),
    sessions,
    sets,
    status,
    intensityPct: 0,
    hasDemo: Boolean(
      cleanText(entry.previewVideoUrl) ||
      cleanText(entry.videoUrl) ||
      cleanText(entry.imageUrl) ||
      cleanText(entry.thumbnailUrl) ||
      entry.catalogVideoSample
    ),
    priorityScore: STATUS_ORDER[status] * 100000 + sessions * 100 + sets,
  };
};
const buildCoverageGroups = (
  rows: ExerciseCodexRow[],
  getLabel: (row: ExerciseCodexRow) => string,
  limit = 8,
): ExerciseCodexCoverageGroup[] => {
  const groups = new Map<string, ExerciseCodexCoverageGroup>();
  for (const row of rows) {
    const label = cleanText(getLabel(row), 'Unmapped');
    const group = groups.get(label) ?? { label, total: 0, trained: 0, pct: 0 };
    group.total += 1;
    if (row.sessions > 0) group.trained += 1;
    groups.set(label, group);
  }
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      pct: group.total > 0 ? Math.round((group.trained / group.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
    .slice(0, limit);
};
const buildDifficultyBands = (rows: ExerciseCodexRow[]): ExerciseCodexCoverageGroup[] => (
  DIFFICULTY_BANDS.map((band) => {
    const matching = rows.filter((row) => row.difficulty >= band.min && row.difficulty <= band.max);
    const trained = matching.filter((row) => row.sessions > 0).length;
    return {
      label: band.label,
      total: matching.length,
      trained,
      pct: matching.length > 0 ? Math.round((trained / matching.length) * 100) : 0,
    };
  })
);
const finalizeRows = (rows: ExerciseCodexRow[]): ExerciseCodexRow[] => {
  const maxSessions = Math.max(...rows.map((row) => row.sessions), 1);
  return rows
    .map((row) => ({
      ...row,
      intensityPct: row.sessions > 0 ? Math.max(4, Math.round((row.sessions / maxSessions) * 100)) : 0,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.name.localeCompare(b.name));
};
export const buildExerciseCodexMatrix = (
  catalogEntries: ExerciseCodexCatalogEntry[],
  loggedEntries: ExerciseCodexLoggedPoint[],
): ExerciseCodexMatrixResult => {
  const loggedByName = getLoggedMap(Array.isArray(loggedEntries) ? loggedEntries : []);
  const catalog = (Array.isArray(catalogEntries) ? catalogEntries : []).filter((entry) => cleanText(entry?.name));
  const rows: ExerciseCodexRow[] = [];
  const matchedKeys = new Set<string>();
  catalog.forEach((entry, index) => {
    const key = normalizeName(entry.name);
    const logged = loggedByName.get(key);
    if (logged) matchedKeys.add(key);
    rows.push(makeRow(entry, logged, index));
  });
  if (catalog.length === 0) {
    Array.from(loggedByName.values()).forEach((logged, index) => {
      rows.push(makeRow({ name: logged.label, exerciseType: 'logged' }, logged, index));
    });
  } else {
    Array.from(loggedByName.entries()).forEach(([key, logged], index) => {
      if (!matchedKeys.has(key)) {
        rows.push(makeRow({ name: logged.label, exerciseType: 'logged' }, logged, catalog.length + index));
      }
    });
  }
  const finalizedRows = finalizeRows(rows);
  const loggedRows = finalizedRows.filter((row) => row.sessions > 0);
  const statusCounts = finalizedRows.reduce<Record<ExerciseCodexStatus, number>>((counts, row) => {
    counts[row.status] += 1;
    return counts;
  }, { mastered: 0, trained: 0, sampled: 0, untrained: 0 });
  const summary: ExerciseCodexSummary = {
    totalExercises: finalizedRows.length,
    loggedExercises: loggedRows.length,
    untrainedExercises: statusCounts.untrained,
    totalSessions: loggedRows.reduce((total, row) => total + row.sessions, 0),
    totalSets: loggedRows.reduce((total, row) => total + row.sets, 0),
    coveragePct: finalizedRows.length > 0 ? Math.round((loggedRows.length / finalizedRows.length) * 100) : 0,
    statusCounts,
    mostTrained: loggedRows[0] ?? null,
    nextTargets: finalizedRows.filter((row) => row.status === 'untrained').slice(0, 8),
    bodyPartCoverage: buildCoverageGroups(finalizedRows, (row) => row.bodyPartCategory),
    patternCoverage: buildCoverageGroups(finalizedRows, (row) => row.pattern, 6),
    difficultyBands: buildDifficultyBands(finalizedRows),
  };
  return { rows: finalizedRows, summary };
};
export const extractExerciseCatalogPayload = (payload: unknown): ExerciseCodexCatalogEntry[] => {
  if (!payload || typeof payload !== 'object') return [];
  const maybePayload = payload as { exercises?: unknown; data?: unknown };
  if (Array.isArray(maybePayload.exercises)) return maybePayload.exercises as ExerciseCodexCatalogEntry[];
  if (Array.isArray(maybePayload.data)) return maybePayload.data as ExerciseCodexCatalogEntry[];
  return [];
};
