/**
 * ============================================================================
 * FILE: dispatchers/equipmentDispatchers.mjs
 * PURPOSE: Dispatcher handlers for equipment-domain AI commands (Slice S6)
 * ============================================================================
 *
 * COMMANDS:
 *   O01: equipment_list_profiles — T0 read, requesting user's OWN profiles only
 *   O02: equipment_list_items    — T0 read, approved item names/categories for
 *        one owned profile (names only — Rule 8, matches contextBuilder)
 *   O03: equipment_gap_report    — T0 read via buildEquipmentGapReport
 *   O04: equipment_add_item      — T2 bounded write, confirmation-gated by the
 *        registry; ALWAYS creates approvalStatus 'manual'. NEVER auto-approves.
 *
 * OWNERSHIP CONTRACT (every handler that takes a profileId):
 *   - profile must exist, else honest not-found error
 *   - profile.trainerId === ctx.user.id OR ctx.user.role === 'admin'
 *     (same rule as equipmentRoutes.getOwnedProfile) — else honest denial
 *   - list_profiles is ALWAYS self-scoped: it never enumerates other trainers'
 *     profiles, even for admin (admins use the dashboard for cross-trainer views)
 *
 * All handlers return flat card-safe scalars per the dispatcher contract.
 */
import { Op } from 'sequelize';
import { getEquipmentItem, getEquipmentProfile } from '../../../models/index.mjs';
import {
  buildEquipmentGapReport,
  COUNTED_APPROVAL_STATUSES,
} from '../../equipmentGapReport.mjs';

// Mirrors equipmentRoutes.mjs — the model's category validate list.
const VALID_CATEGORIES = [
  'barbell', 'dumbbell', 'kettlebell', 'cable_machine', 'resistance_band',
  'bodyweight', 'machine', 'bench', 'rack', 'cardio', 'foam_roller',
  'lacrosse_ball', 'stability_ball', 'medicine_ball', 'pull_up_bar', 'trx',
  'other',
];

const MAX_LISTED_ITEM_NAMES = 25;

/** Escape LIKE wildcards so Op.iLike is an exact case-insensitive match. */
const escapeLikeLiteral = (value) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Resolve a profile the requesting user is allowed to act on, or throw an
 * honest error. Same ownership rule as equipmentRoutes.getOwnedProfile.
 *
 * @param {number} rawProfileId
 * @param {{ id: number, role: string }} user
 * @returns {Promise<import('../../../models/EquipmentProfile.mjs').default>}
 */
export async function resolveOwnedProfile(rawProfileId, user) {
  const profileId = Number(rawProfileId);
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    throw new Error('Please specify a valid equipment profile ID.');
  }
  const EquipmentProfile = getEquipmentProfile();
  const profile = await EquipmentProfile.findByPk(profileId);
  if (!profile) {
    throw new Error(`Equipment profile #${profileId} was not found.`);
  }
  if (profile.trainerId !== Number(user.id) && user.role !== 'admin') {
    throw new Error('You can only access your own equipment profiles.');
  }
  return profile;
}

/**
 * O01: equipment_list_profiles — the requesting user's own active profiles,
 * names + counts only.
 *
 * @returns {{ profileCount, profiles: string|null }}
 */
export async function dispatchEquipmentListProfiles(params, ctx) {
  const EquipmentProfile = getEquipmentProfile();
  const profiles = await EquipmentProfile.findAll({
    where: { trainerId: ctx.user.id, isActive: true },
    attributes: ['id', 'name', 'equipmentCount'],
    order: [['isDefault', 'DESC'], ['name', 'ASC']],
  });

  return {
    profileCount: profiles.length,
    profiles: profiles.length > 0
      ? profiles.map((p) => `#${p.id} ${p.name} (${p.equipmentCount} items)`).join(', ')
      : null,
  };
}

/**
 * O02: equipment_list_items — approved/manual item names + categories for one
 * owned profile. Count is always truthful; the name list caps at 25.
 *
 * @param {{ profileId: number }} params
 * @returns {{ profileId, profileName, itemCount, items: string|null }}
 */
export async function dispatchEquipmentListItems(params, ctx) {
  const profile = await resolveOwnedProfile(params.profileId, ctx.user);

  const EquipmentItem = getEquipmentItem();
  const items = await EquipmentItem.findAll({
    where: {
      profileId: profile.id,
      isActive: true,
      approvalStatus: { [Op.in]: COUNTED_APPROVAL_STATUSES },
    },
    attributes: ['name', 'trainerLabel', 'category', 'quantity'],
    order: [['name', 'ASC']],
  });

  const listed = items.slice(0, MAX_LISTED_ITEM_NAMES).map((item) => {
    const name = item.trainerLabel || item.name;
    const qty = item.quantity && item.quantity > 1 ? ` x${item.quantity}` : '';
    return `${name}${qty} [${item.category}]`;
  });
  const overflow = items.length - listed.length;

  return {
    profileId: profile.id,
    profileName: profile.name,
    itemCount: items.length,
    items: listed.length > 0
      ? listed.join(', ') + (overflow > 0 ? ` (+${overflow} more)` : '')
      : null,
  };
}

/**
 * O03: equipment_gap_report — deterministic movement-pattern coverage for one
 * owned profile, flattened to card-safe scalars.
 *
 * @param {{ profileId: number }} params
 * @returns {{
 *   profileId, profileName, overallCoverage, weakestPattern,
 *   patternCoverage, gapPatterns, topSuggestion, suggestions
 * }}
 */
export async function dispatchEquipmentGapReport(params, ctx) {
  const profile = await resolveOwnedProfile(params.profileId, ctx.user);
  const report = await buildEquipmentGapReport(profile.id);

  const gapPatterns = report.patterns.filter((p) => p.coverage === 0).map((p) => p.pattern);

  return {
    profileId: profile.id,
    profileName: profile.name,
    overallCoverage: `${Math.round(report.overallCoverage * 100)}%`,
    weakestPattern: report.weakestPattern,
    patternCoverage: report.patterns
      .map((p) => `${p.pattern} ${Math.round(p.coverage * 100)}%`)
      .join(', '),
    gapPatterns: gapPatterns.length > 0 ? gapPatterns.join(', ') : null,
    topSuggestion: report.suggestions[0]?.addition ?? null,
    suggestions: report.suggestions.length > 0
      ? report.suggestions
          .map((s) => `${s.addition} → ${s.unlocksPatterns.join('/')}`)
          .join('; ')
      : null,
  };
}

/**
 * O04: equipment_add_item — confirmation-gated bounded write. Creates ONE
 * EquipmentItem with approvalStatus 'manual' (model enum verified). Never
 * touches approval workflow state of scanned items.
 *
 * @param {{ profileId: number, name: string, category?: string, quantity?: number }} params
 * @returns {{ itemId, profileId, profileName, name, category, quantity, approvalStatus }}
 */
export async function dispatchEquipmentAddItem(params, ctx) {
  const profile = await resolveOwnedProfile(params.profileId, ctx.user);

  const name = String(params.name || '').trim().slice(0, 150);
  if (name.length === 0) {
    throw new Error('Equipment name is required.');
  }
  const category = VALID_CATEGORIES.includes(params.category) ? params.category : 'other';
  const quantity = Math.max(1, parseInt(params.quantity, 10) || 1);

  const EquipmentItem = getEquipmentItem();

  // Duplicate pre-check — ACTIVE rows, case-insensitive, matching the
  // lower(name) partial unique index semantics (same as equipmentRoutes).
  const existing = await EquipmentItem.findOne({
    where: {
      profileId: profile.id,
      name: { [Op.iLike]: escapeLikeLiteral(name) },
      isActive: true,
    },
  });
  if (existing) {
    throw new Error(`"${name}" already exists in ${profile.name}. Nothing was added.`);
  }

  let item;
  try {
    item = await EquipmentItem.create({
      profileId: profile.id,
      name,
      category,
      quantity,
      approvalStatus: 'manual', // NEVER 'approved' — no auto-approval from chat
      isActive: true,
    });
  } catch (err) {
    // Race backstop: the partial unique index rejects a concurrent duplicate.
    if (err?.name === 'SequelizeUniqueConstraintError') {
      throw new Error(`"${name}" already exists in ${profile.name}. Nothing was added.`);
    }
    throw err;
  }

  // Refresh the cached count (same bookkeeping as the manual-add route).
  const count = await EquipmentItem.count({
    where: { profileId: profile.id, isActive: true },
  });
  await profile.update({ equipmentCount: count });

  return {
    itemId: item.id,
    profileId: profile.id,
    profileName: profile.name,
    name,
    category,
    quantity,
    approvalStatus: 'manual',
  };
}
