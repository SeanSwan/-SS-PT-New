/**
 * Quick-links data — which utility links a visitor actually has.
 *
 * The strip shipped role-blind: a logged-out stranger was offered "Client
 * Dashboard", "Trainer Dashboard" and "Trainer Staff Review" — three
 * destinations that bounce them to a login wall — while a signed-in client was
 * shown the trainer's dashboard. Links a visitor cannot use are not navigation,
 * they are noise (Blueprint v2 S5 / D5).
 *
 * @module pages/HomePage/components/sections/quickLinks.data
 */
export type QuickLinkId =
  | 'social'
  | 'client-dashboard'
  | 'trainer-dashboard'
  | 'photography'
  | 'waiver'
  | 'staff-review';

export interface QuickLinkSpec {
  id: QuickLinkId;
  label: string;
  to: string;
}

const SOCIAL: QuickLinkSpec = { id: 'social', label: 'SwanStudios Social', to: '/user-dashboard' };
const CLIENT: QuickLinkSpec = { id: 'client-dashboard', label: 'Client Dashboard', to: '/dashboard/client/overview' };
const TRAINER: QuickLinkSpec = { id: 'trainer-dashboard', label: 'Trainer Dashboard', to: '/dashboard/trainer/overview' };
const PHOTOGRAPHY: QuickLinkSpec = { id: 'photography', label: 'SwanStudios Photography', to: '/gallery' };
const WAIVER: QuickLinkSpec = { id: 'waiver', label: 'Waiver', to: '/waiver' };
/** Trainer interest routes through staff contact — never privileged self-signup. */
const STAFF_REVIEW: QuickLinkSpec = { id: 'staff-review', label: 'Trainer Staff Review', to: '/contact' };

/**
 * @param isAuthenticated from useAuth
 * @param role user.role — 'admin' | 'trainer' | 'client' | 'user' (AuthContextProvider)
 */
export const quickLinksFor = (
  isAuthenticated: boolean,
  role: string | null | undefined,
): QuickLinkSpec[] => {
  if (!isAuthenticated) return [PHOTOGRAPHY, WAIVER, STAFF_REVIEW];

  switch (role) {
    case 'admin':
      return [SOCIAL, CLIENT, TRAINER, PHOTOGRAPHY, WAIVER];
    case 'trainer':
      return [SOCIAL, TRAINER, PHOTOGRAPHY, WAIVER];
    case 'client':
      return [SOCIAL, CLIENT, PHOTOGRAPHY, WAIVER];
    default:
      // A signed-in account with no training relationship yet ('user'): the
      // social surface is theirs; neither dashboard is.
      return [SOCIAL, PHOTOGRAPHY, WAIVER];
  }
};
