import type { PainEntry, PainType } from '../../services/painEntryService';
import { getRegionById } from './bodyRegions';

export type PainRiskBand = 'clear' | 'low' | 'moderate' | 'review';
export type PainSeverityTrendDirection = 'improving' | 'worsening' | 'steady' | 'insufficient';

export interface PainWorkoutConstraints {
  riskBand: PainRiskBand;
  avoidMovements: string[];
  modifyMovements: string[];
  warmupPriorities: string[];
  cautionRegions: string[];
  promptSnippet: string;
}

export interface PainSeverityTrendPoint {
  id: number;
  painLevel: number;
  regionLabel: string;
  label: string;
  recordedAt: string;
  isActive: boolean;
}

export interface PainSeverityTrend {
  direction: PainSeverityTrendDirection;
  delta: number;
  summary: string;
  points: PainSeverityTrendPoint[];
}

export interface PainChartInsightOptions {
  now?: Date | string | number;
  staleDays?: number;
}

export interface PainChartInsight {
  activeEntries: PainEntry[];
  resolvedEntries: PainEntry[];
  timelineEntries: PainEntry[];
  severeCount: number;
  moderateCount: number;
  mildCount: number;
  needsTrainerReview: boolean;
  redFlagTypes: PainType[];
  safetyMessages: string[];
  workoutConstraints: PainWorkoutConstraints;
  severityTrend: PainSeverityTrend;
  followUpReminders: string[];
}

const RED_FLAG_PAIN_TYPES = new Set<PainType>(['numbness', 'tingling', 'burning']);
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_MOVEMENT_RULES: Array<{ pattern: RegExp; avoid: string[]; modify: string[]; warmup: string[] }> = [
  {
    pattern: /shoulder|rotator|rear_delt|trap|chest|bicep|tricep|elbow|forearm/i,
    avoid: ['Heavy overhead pressing', 'High-volume upper-body loading'],
    modify: ['Pressing range of motion', 'Pulling volume', 'Loaded carries'],
    warmup: ['Shoulder mobility', 'Scapular activation', 'Rotator cuff prep'],
  },
  {
    pattern: /lower_back|mid_back|neck|oblique|abs/i,
    avoid: ['Heavy spinal loading', 'Fast loaded twisting'],
    modify: ['Hinge depth', 'Loaded rotation', 'Axial loading'],
    warmup: ['Core bracing prep', 'Hip mobility', 'Controlled trunk activation'],
  },
  {
    pattern: /knee|quad|hamstring|shin|calf|achilles|ankle/i,
    avoid: ['Plyometrics', 'Heavy knee-dominant loading'],
    modify: ['Squat depth', 'Lunge volume', 'Running impact'],
    warmup: ['Ankle mobility', 'Glute activation', 'Controlled knee tracking'],
  },
  {
    pattern: /hip|glute|inner_thigh/i,
    avoid: ['Deep loaded hip positions'],
    modify: ['Hip range of motion', 'Lateral movement volume'],
    warmup: ['Hip mobility', 'Glute activation', 'Adductor prep'],
  },
];

const unique = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const parseTime = (value: Date | string | number | null | undefined) => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
};

const entryDate = (entry: PainEntry) => {
  const value = entry.resolvedAt || entry.updatedAt || entry.createdAt || entry.onsetDate || '';
  return parseTime(value);
};

const sortNewestFirst = (a: PainEntry, b: PainEntry) => entryDate(b) - entryDate(a);
const sortOldestFirst = (a: PainEntry, b: PainEntry) => entryDate(a) - entryDate(b);

const formatShortDate = (time: number) => {
  if (!time) return 'No date';
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const formatPainRegionLabel = (region: string) => {
  const defined = getRegionById(region)?.label;
  if (defined) return defined;
  return region
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const parseMovementList = (value: string | null | undefined) =>
  unique((value || '').split(/[;,\n]/g).map((movement) => movement.trim()));

const movementRulesFor = (entry: PainEntry) =>
  DEFAULT_MOVEMENT_RULES.filter((rule) => rule.pattern.test(entry.bodyRegion));

const buildRiskBand = (activeEntries: PainEntry[], redFlagTypes: PainType[]): PainRiskBand => {
  if (activeEntries.length === 0) return 'clear';
  if (redFlagTypes.length > 0 || activeEntries.some((entry) => entry.painLevel >= 7)) return 'review';
  if (activeEntries.some((entry) => entry.painLevel >= 4)) return 'moderate';
  return 'low';
};

const buildSafetyMessages = (activeEntries: PainEntry[], redFlagTypes: PainType[]) => {
  const messages: string[] = [];
  const severeRegions = activeEntries
    .filter((entry) => entry.painLevel >= 7)
    .map((entry) => `${formatPainRegionLabel(entry.bodyRegion)} ${entry.painLevel}/10`);

  if (severeRegions.length > 0) {
    messages.push(`Trainer review needed before hard loading: ${severeRegions.join(', ')}.`);
  }

  if (redFlagTypes.length > 0) {
    messages.push('Numbness, tingling, or burning was reported. Keep programming conservative and escalate outside normal workout soreness.');
  }

  const sharpRegions = activeEntries
    .filter((entry) => entry.painType === 'sharp')
    .map((entry) => formatPainRegionLabel(entry.bodyRegion));
  if (sharpRegions.length > 0) {
    messages.push(`Sharp pain logged in ${unique(sharpRegions).join(', ')}. Avoid forcing painful ranges.`);
  }

  return messages;
};

const buildWorkoutConstraints = (activeEntries: PainEntry[], riskBand: PainRiskBand): PainWorkoutConstraints => {
  const avoid: string[] = [];
  const modify: string[] = [];
  const promptAvoid: string[] = [];
  const promptModify: string[] = [];
  const warmup: string[] = [];
  const cautionRegions = activeEntries.map(
    (entry) => `${formatPainRegionLabel(entry.bodyRegion)} ${entry.painLevel}/10 ${entry.painType || 'reported'}`,
  );

  for (const entry of activeEntries) {
    const aggravating = parseMovementList(entry.aggravatingMovements);
    const rules = movementRulesFor(entry);
    if (entry.painLevel >= 7) {
      avoid.push(...aggravating);
      for (const rule of rules) {
        avoid.push(...rule.avoid);
        promptAvoid.push(...rule.avoid);
      }
    } else if (entry.painLevel >= 4) {
      modify.push(...aggravating);
      for (const rule of rules) {
        modify.push(...rule.modify);
        promptModify.push(...rule.modify);
      }
    }

    for (const rule of rules) warmup.push(...rule.warmup);
    if (entry.relievingFactors) warmup.push(...parseMovementList(entry.relievingFactors).map((factor) => `${factor} if pain-free`));
  }

  const safeRegions = cautionRegions.slice(0, 6).join('; ');
  const safeAvoid = unique(promptAvoid).slice(0, 6).join(', ');
  const safeModify = unique(promptModify).slice(0, 6).join(', ');
  const promptParts = [
    safeRegions ? `Pain constraints: ${safeRegions}.` : '',
    safeAvoid ? `Avoid: ${safeAvoid}.` : '',
    safeModify ? `Modify: ${safeModify}.` : '',
  ].filter(Boolean);

  return {
    riskBand,
    avoidMovements: unique(avoid),
    modifyMovements: unique(modify),
    warmupPriorities: unique(warmup),
    cautionRegions,
    promptSnippet: promptParts.join(' '),
  };
};

/**
 * Slice 4 (B11 fix): the old trend sorted ALL entries (every region, active
 * and resolved) into one line — a resolved 2/10 ankle followed by a new 8/10
 * shoulder rendered as "Worsening: 2/10 to 8/10". A severity trend is only
 * truthful within ONE (region, side) series. We chart the highest-severity
 * ACTIVE region's own history and say which region it is.
 */
const buildSeverityTrend = (entries: PainEntry[]): PainSeverityTrend => {
  const active = entries.filter((entry) => entry.isActive);
  const focus = [...active].sort((a, b) => b.painLevel - a.painLevel)[0] ?? null;

  const series = focus
    ? entries.filter((entry) => entry.bodyRegion === focus.bodyRegion && entry.side === focus.side)
    : [];

  const points = [...series]
    .sort(sortOldestFirst)
    .slice(-6)
    .map((entry) => {
      const time = entryDate(entry);
      return {
        id: entry.id,
        painLevel: entry.painLevel,
        regionLabel: formatPainRegionLabel(entry.bodyRegion),
        label: formatShortDate(time),
        recordedAt: time ? new Date(time).toISOString() : '',
        isActive: entry.isActive,
      };
    });

  const focusLabel = focus ? formatPainRegionLabel(focus.bodyRegion) : null;

  if (points.length < 2) {
    return {
      direction: 'insufficient',
      delta: 0,
      summary: focusLabel
        ? `${focusLabel}: need at least two reports for this area to show a trend.`
        : 'Need at least two pain reports for the same area to show a severity trend.',
      points,
    };
  }

  const first = points[0].painLevel;
  const last = points[points.length - 1].painLevel;
  const delta = last - first;
  const direction: PainSeverityTrendDirection = delta >= 2 ? 'worsening' : delta <= -2 ? 'improving' : 'steady';
  const directionLabel = direction.charAt(0).toUpperCase() + direction.slice(1);

  return {
    direction,
    delta,
    summary: `${focusLabel} — ${directionLabel}: ${first}/10 to ${last}/10 across ${points.length} reports (same area only).`,
    points,
  };
};

const buildFollowUpReminders = (
  activeEntries: PainEntry[],
  redFlagTypes: PainType[],
  severityTrend: PainSeverityTrend,
  options: PainChartInsightOptions,
) => {
  const reminders: string[] = [];
  const severeRegions = unique(
    activeEntries.filter((entry) => entry.painLevel >= 7).map((entry) => formatPainRegionLabel(entry.bodyRegion)),
  );

  if (severeRegions.length > 0) {
    reminders.push(`Trainer review before next hard loading for ${severeRegions.join(', ')}.`);
  }

  if (redFlagTypes.length > 0) {
    reminders.push(`Follow up on ${redFlagTypes.join(', ')} reports before progression.`);
  }

  if (severityTrend.direction === 'worsening') {
    reminders.push('Trend is worsening - compare recent loading with pain changes before progression.');
  }

  const staleDays = Math.max(1, options.staleDays ?? 7);
  const nowTime = parseTime(options.now) || Date.now();
  for (const entry of activeEntries) {
    const lastUpdated = entryDate(entry);
    if (lastUpdated > 0 && nowTime - lastUpdated >= staleDays * DAY_MS) {
      reminders.push(`Re-check ${formatPainRegionLabel(entry.bodyRegion)} - active report has not been updated in ${staleDays}+ days.`);
    }
  }

  return unique(reminders);
};

export const buildPainChartInsight = (entries: PainEntry[] = [], options: PainChartInsightOptions = {}): PainChartInsight => {
  const activeEntries = entries.filter((entry) => entry.isActive).sort(sortNewestFirst);
  const resolvedEntries = entries.filter((entry) => !entry.isActive).sort(sortNewestFirst);
  const timelineEntries = [...entries].sort(sortNewestFirst);
  const redFlagTypes = unique(
    activeEntries
      .map((entry) => entry.painType)
      .filter((type): type is PainType => Boolean(type && RED_FLAG_PAIN_TYPES.has(type))),
  ) as PainType[];
  const riskBand = buildRiskBand(activeEntries, redFlagTypes);
  const severityTrend = buildSeverityTrend(entries);

  return {
    activeEntries,
    resolvedEntries,
    timelineEntries,
    severeCount: activeEntries.filter((entry) => entry.painLevel >= 7).length,
    moderateCount: activeEntries.filter((entry) => entry.painLevel >= 4 && entry.painLevel < 7).length,
    mildCount: activeEntries.filter((entry) => entry.painLevel < 4).length,
    needsTrainerReview: riskBand === 'review',
    redFlagTypes,
    safetyMessages: buildSafetyMessages(activeEntries, redFlagTypes),
    workoutConstraints: buildWorkoutConstraints(activeEntries, riskBand),
    severityTrend,
    followUpReminders: buildFollowUpReminders(activeEntries, redFlagTypes, severityTrend, options),
  };
};