/**
 * PlaudMergePage.tsx
 * ===================
 * Standalone /dashboard/plaud-merge route shell.
 *
 * The reusable workflow lives in PlaudMergeWorkspace so the same queue,
 * review, and confirm flow can mount inside the admin Clients & Team
 * Training tab without duplicating transcript logic.
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlaudMergeWorkspace } from '../../components/PlaudClipMerge/PlaudMergeWorkspace';

function parseClientId(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export function PlaudMergePage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialClientId = parseClientId(searchParams.get('clientId'));

  return (
    <PlaudMergeWorkspace
      initialClientId={initialClientId}
      backLabel="Dashboard"
      onBack={() => navigate('/dashboard')}
    />
  );
}

export default PlaudMergePage;
