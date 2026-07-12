import type { StyleLensSlot } from '../../core/style-lens-os';

interface SwanRoleSlotMapping {
  navigation: 'preserve-mounted-routes';
  primaryAction: StyleLensSlot;
  currentState: StyleLensSlot;
  progressProof: StyleLensSlot;
  routeOverrides: readonly string[];
}

const mapping = (): SwanRoleSlotMapping => ({
  navigation: 'preserve-mounted-routes',
  primaryAction: 'next-action',
  currentState: 'current-state',
  progressProof: 'progress-proof',
  routeOverrides: Object.freeze([]),
});

export const SWAN_ROLE_SLOT_MAP = Object.freeze({
  user: mapping(),
  client: mapping(),
  trainer: mapping(),
  admin: mapping(),
});
