/**
 * ============================================================================
 * FILE: globalClientNormalize.ts
 * PURPOSE: Roster response normalisation for the GlobalClient roster.
 * ============================================================================
 * Extracted from GlobalClientContext.tsx (Rule 4 cap). Pure functions and one
 * constant — no React, no module state — so the response-shape handling is
 * unit-testable without a DOM harness. GlobalClientContext.tsx re-exports all
 * three, so every existing import path keeps working unchanged.
 *
 * Response-shape drift is a real incident class here (CLAUDE.md rule 58 #7):
 * the admin path reads `data.data.clients`, the trainer path reads
 * `assignments`. Both fallbacks below are deliberate and covered by
 * GlobalClientContext.test.ts.
 */
import type { ActiveClient } from './globalClientTypes';

export const ADMIN_CLIENT_LIST_LIMIT = 500;

const optionalGender = (value: unknown) => (value ? { gender: String(value) } : {});

export function normalizeClientListResponse(data: any, role: string): ActiveClient[] {
  if (role === 'admin') {
    const raw = data?.data?.clients ?? (Array.isArray(data?.data) ? data.data : []);
    return raw.map((c: any) => ({
      id: c.id,
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      photo: c.profileImageUrl ?? c.photo,
      bodyMapHeadPhoto: c.bodyMapHeadPhoto ?? undefined,
      ...optionalGender(c.gender),
      role: c.role,
      availableSessions: typeof c.availableSessions === 'number' ? c.availableSessions : undefined,
      clientSource: c.clientSource ?? undefined,
      membershipLevel: c.membershipLevel ?? undefined,
      totalWorkouts: typeof c.totalWorkouts === 'number' ? c.totalWorkouts : undefined,
      lastWorkoutDate: c.lastWorkoutDate ?? c.lastWorkout?.date ?? c.lastWorkout?.sessionDate ?? undefined,
      nextSessionDate: c.nextSessionDate ?? c.nextSession?.sessionDate ?? c.nextSession?.date ?? undefined,
    }));
  }

  const assignments = Array.isArray(data?.assignments)
    ? data.assignments
    : Array.isArray(data?.data)
    ? data.data
    : data?.data?.assignments ?? [];

  return assignments.map((a: any) => {
    const c = a.client ?? a.Client ?? a;
    return {
      id: c.id,
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      photo: c.profileImageUrl ?? c.photo,
      bodyMapHeadPhoto: c.bodyMapHeadPhoto ?? undefined,
      ...optionalGender(c.gender),
      role: c.role,
      availableSessions: typeof c.availableSessions === 'number' ? c.availableSessions : undefined,
      clientSource: c.clientSource ?? undefined,
      totalWorkouts: typeof c.totalWorkouts === 'number' ? c.totalWorkouts : undefined,
      lastWorkoutDate: c.lastWorkoutDate ?? c.lastWorkout?.date ?? c.lastWorkout?.sessionDate ?? undefined,
      nextSessionDate: c.nextSessionDate ?? c.nextSession?.sessionDate ?? c.nextSession?.date ?? undefined,
    };
  });
}
