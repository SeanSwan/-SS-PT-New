/*
 * App — the console shell (S1).
 *
 * Scope note: S1 ships the shell + StatusBoard + adapters. CD3's split view
 * (constellation left, operations deck right) arrives with S5; the shell is
 * deliberately structured so that region slots in without a rewrite.
 *
 * The adapter is a PROP, not a module-level singleton: that is the S7 embed
 * contract (02-blueprint.md §2, 08-slices-operations.md S7 note).
 */

import { useMemo } from 'react';
import type { ReactElement } from 'react';
import styled from 'styled-components';
import { LocalEngineAdapter, type ConsoleDataAdapter } from './adapters';
import { useStatus } from './hooks/useStatus';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StatusBoard } from './components/StatusBoard';

const Shell = styled.div`
  min-height: 100vh;
  background: var(--obsidian-black, #0a0a0f);
  color: var(--text-primary, #e0ecf4);
  font-family: var(--font-ui, system-ui, sans-serif);
  padding: var(--space-6, 32px);
  box-sizing: border-box;
`;

const Header = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4, 16px);
  margin-bottom: var(--space-6, 32px);
  padding-bottom: var(--space-4, 16px);
  border-bottom: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
`;

const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.01em;
`;

const Subtitle = styled.span`
  font-family: var(--font-data, monospace);
  font-size: 12px;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
`;

/* CD3 leaves the constellation as beauty and the deck as the working surface. */
const Region = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 2fr) minmax(360px, 3fr);
  gap: var(--space-5, 24px);
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ConstellationSlot = styled.div`
  border: 1px dashed var(--border-electric, rgba(96, 192, 240, 0.2));
  border-radius: var(--radius-card, 20px);
  padding: var(--space-5, 24px);
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-drama, Georgia, serif);
  font-style: italic;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
  text-align: center;
`;

export interface AppProps {
  /** Injected by SwanGuard at S7; defaults to the loopback bridge. */
  adapter?: ConsoleDataAdapter;
  /** Poll cadence in ms; 0 disables polling (tests). */
  pollMs?: number;
}

export function App({ adapter, pollMs = 5000 }: AppProps): ReactElement {
  const active = useMemo(() => adapter ?? new LocalEngineAdapter(), [adapter]);
  const status = useStatus(active, { pollMs });

  return (
    <Shell>
      <Header>
        <Title>Creator Brains Console</Title>
        <Subtitle>loopback · single operator</Subtitle>
      </Header>
      <Region>
        <ConstellationSlot data-testid="constellation-slot">
          The constellation arrives in S5 (CD3 “Vault Observatory”).
        </ConstellationSlot>
        {/* S1-H17: a throw inside the board must not take the shell down with
            it. The boundary sits INSIDE the shell so the header survives and the
            page never goes blank. */}
        <ErrorBoundary scope="The status board">
          <StatusBoard state={status} />
        </ErrorBoundary>
      </Region>
    </Shell>
  );
}

export default App;
