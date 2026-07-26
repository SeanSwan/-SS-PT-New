/** Deterministic SDIR aggregation caps. */
import { SPEC_CAPS } from './reference-modes.mjs';
const dayKey = (date) => date.toISOString().slice(0, 10);
const quarterKey = (date) => `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
const withinDays = (date, now, days) => now.getTime() - date.getTime() >= 0
  && now.getTime() - date.getTime() <= days * 86_400_000;

export function assertSpecCaps(spec, existingSpecs, now = new Date()) {
  const rows = Array.isArray(existingSpecs) ? existingSpecs : [];
  if (rows.some((row) => row.taskId === spec.taskId)) throw new Error(`SDIR cap: ${SPEC_CAPS.perTask} per task`);
  const today = dayKey(now);
  const daily = rows.filter((row) => dayKey(new Date(row.createdAt)) === today).length;
  if (daily >= SPEC_CAPS.perDay) throw new Error(`SDIR cap: ${SPEC_CAPS.perDay} per day`);
  const surface = rows.filter((row) => row.swanSurface === spec.swanSurface
    && withinDays(new Date(row.createdAt), now, 30)).length;
  if (surface >= SPEC_CAPS.perSurface30Days) throw new Error(`SDIR cap: ${SPEC_CAPS.perSurface30Days} per surface per rolling 30 days`);
  const quarter = quarterKey(now);
  const quarterly = rows.filter((row) => quarterKey(new Date(row.createdAt)) === quarter).length;
  if (quarterly >= SPEC_CAPS.perQuarter) throw new Error(`SDIR cap: ${SPEC_CAPS.perQuarter} per quarter`);
  return true;
}