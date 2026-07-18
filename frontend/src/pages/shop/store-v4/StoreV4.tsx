/**
 * Store V4 — "The Crystal Case" orchestrator (KIMI-STORE-CORRECTED). Renders THROUGH the lens frame
 * (so `--world-*`/`--lens-*` resolve + `[data-style-lens-shell]` exists for the gate's contract check),
 * then the `.store-v4-shell` token scope. DESIGN-ONLY: binds the real money path (`/api/storefront`,
 * `useCart`), never redesigns it. Slice-1 = mountable spine (foundation); the hero / flagship pedestal /
 * drawer grid / Swan cards / cart pill land in Slice-2.
 */
import styled from 'styled-components';
import { StoreLensFrame } from './storeManifest';
import { StoreV4Tokens } from './storeV4.tokens';

const Shell = styled.div`
  min-height: 100vh;
  background: var(--store-bg);
  color: var(--store-ink);
  font-family: var(--store-font-display, inherit);
  padding: var(--store-pad, 24px);
`;

const Placeholder = styled.div`
  max-width: 720px;
  margin: 12vh auto;
  text-align: center;
  color: var(--store-ink-2);
`;

export default function StoreV4() {
  return (
    <StoreLensFrame>
      <StoreV4Tokens />
      <div className="store-v4-shell" data-testid="store-v4-shell">
        <Shell>
          <Placeholder data-testid="store-v4-placeholder">
            The Crystal Case is being set. Full storefront lands next slice.
          </Placeholder>
        </Shell>
      </div>
    </StoreLensFrame>
  );
}
