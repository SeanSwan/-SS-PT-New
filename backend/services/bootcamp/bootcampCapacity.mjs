/**
 * ============================================================================
 * FILE: backend/services/bootcamp/bootcampCapacity.mjs
 * PURPOSE: Capacity truth for a class — equipment tokens WITH quantities,
 *          small-class station collapse, and per-station equipment
 *          feasibility. Extracted so the generator monolith doesn't grow.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-31 | SLICE: SWA-105 Slice 1
 * ============================================================================
 */

function addEquipmentToken(tokens, value) {
  if (typeof value !== 'string') return;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return;

  tokens.add(normalized);
  if (normalized.includes('_')) tokens.add(normalized.replace(/_/g, ' '));
  if (normalized.includes(' ')) tokens.add(normalized.replace(/\s+/g, '_'));
}

function isUsableItem(item) {
  return item
    && item.isActive !== false
    && item.approvalStatus !== 'rejected'
    && item.approvalStatus !== 'pending';
}

/** Token presence list (moved verbatim from the generator; behavior unchanged). */
export function buildAvailableEquipmentList(equipmentItems = []) {
  const tokens = new Set(['bodyweight', 'none']);
  for (const item of equipmentItems) {
    if (!isUsableItem(item)) continue;
    addEquipmentToken(tokens, item.trainerLabel);
    addEquipmentToken(tokens, item.name);
    addEquipmentToken(tokens, item.category);
    addEquipmentToken(tokens, item.resistanceType);
    addEquipmentToken(tokens, item.equipmentType);
  }
  return [...tokens];
}

/**
 * Token -> total QUANTITY. Presence cannot answer "is this station viable for
 * this headcount" — owning ONE kettlebell does not make a kettlebell station
 * work for 14 people (master prompt §5.8). Items without a usable quantity
 * count as 1 (the conservative read of "it's on the shelf").
 */
export function buildEquipmentCountMap(equipmentItems = []) {
  const counts = {};
  for (const item of equipmentItems) {
    if (!isUsableItem(item)) continue;
    const qty = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
    const tokens = new Set();
    addEquipmentToken(tokens, item.trainerLabel);
    addEquipmentToken(tokens, item.name);
    addEquipmentToken(tokens, item.category);
    addEquipmentToken(tokens, item.resistanceType);
    addEquipmentToken(tokens, item.equipmentType);
    for (const token of tokens) counts[token] = (counts[token] ?? 0) + qty;
  }
  return counts;
}

/**
 * Small-class collapse (SWA-105 R10.4). The real 6am class can be 4 people;
 * station math built for 12 yields empty stations and dead transitions at 4.
 * Cap stations so every station keeps at least `minPerStation` people.
 * Never collapses below 1; never touches full_group (stationCount 0).
 */
export function collapseStationCountForParticipants(stationCount, expectedParticipants, minPerStation = 2) {
  if (!(stationCount > 1) || !(expectedParticipants > 0)) {
    return { stationCount, collapsed: false };
  }
  const supportable = Math.max(1, Math.floor(expectedParticipants / minPerStation));
  if (supportable >= stationCount) return { stationCount, collapsed: false };
  return { stationCount: supportable, collapsed: true };
}

/**
 * Per-station equipment feasibility on REAL quantities.
 *
 * Coarse 1:1 model, deliberately: each person at the station needs one unit of
 * each station implement. That over-warns for genuinely shared kit (a bench in
 * a circuit) and is exactly right for dumbbells/kettlebells/bands — and a
 * false "may bottleneck" warning costs a glance, while a missed one stalls a
 * live station. Tokens absent from the count map are skipped (unknown ≠ zero).
 *
 * Mutates matching stations with `equipmentTight: true` and returns the
 * human-readable findings list (empty = feasible or unknowable).
 */
export function assessEquipmentFeasibility({ stations, equipmentCounts, expectedParticipants, stationCount }) {
  if (!equipmentCounts || !Array.isArray(stations) || !(stationCount > 0)) return [];
  const peoplePerStation = Math.ceil(Math.max(1, expectedParticipants || 1) / stationCount);
  const findings = [];

  for (const station of stations) {
    for (const token of station.equipmentTokens ?? []) {
      if (token === 'bodyweight' || token === 'none') continue;
      const have = equipmentCounts[token];
      if (have !== undefined && have < peoplePerStation) {
        station.equipmentTight = true;
        findings.push(`${station.stationName}: ${token} x${have} for ~${peoplePerStation} people`);
      }
    }
  }
  return findings;
}
