export type PasswordChangeUserRole = 'admin' | 'trainer' | 'client' | 'user' | string | null | undefined;

export function resolvePostPasswordChangeRoute(role: PasswordChangeUserRole): string {
  switch (role) {
    case 'admin':
      return '/dashboard/admin/coach-assistant';
    case 'trainer':
      return '/dashboard/trainer/overview';
    case 'client':
      return '/dashboard/client/overview';
    case 'user':
    default:
      return '/user-dashboard';
  }
}