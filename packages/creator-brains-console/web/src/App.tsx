/*
 * App — the console shell (S1) + the Roster and BrainDrawer (S2).
 *
 * Scope note: S1 ships the shell + StatusBoard + adapters. S2 adds the Roster
 * (with its two bounded writes) and the BrainDrawer. CD3's split view
 * (constellation left, operations deck right) arrives with S5; the shell is
 * deliberately structured so that region slots in without a rewrite.
 *
 * The adapter is a PROP, not a module-level singleton: that is the S7 embed
 * contract (02-blueprint.md §2, 08-slices-operations.md S7 note).
 */

import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import styled from 'styled-components';
import { LocalEngineAdapter, type ConsoleDataAdapter } from './adapters';
import { useStatus } from './hooks/useStatus';
import { useRoster } from './hooks/useRoster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StatusBoard } from './components/StatusBoard';
import { Roster } from './components/Roster';
import { BrainDrawer } from './components/BrainDrawer';
import { BrainConstellation } from './components/BrainConstellation';
import { QueryConsole } from './components/QueryConsole';
import { RunConsole } from './components/RunConsole';
import { OpsRail } from './components/OpsRail';

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


/* S2 adds two more panels below the board, so the right-hand column is a stack
 * rather than a single child. The order is deliberate: status (what the engine is
 * doing) → roster (who it is doing it for) → drawer (what it produced). */
const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-5, 24px);
  min-width: 0;
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
  // The roster does NOT poll by default: it changes only when the operator writes
  // to it, so a cadence would be traffic that cannot reveal anything new and would
  // race the deliberate re-read after each write (S2).
  const roster = useRoster(active);
  // Which creator's brain is open, if any. Held here rather than in the Roster so
  // the drawer survives a roster re-read — the drawer is keyed by channelId, not by
  // row identity, precisely so a refresh cannot close it.
  const [openBrain, setOpenBrain] = useState<string | null>(null);

  return (
    <Shell>
      <Header>
        <Title>Creator Brains Console</Title>
        <Subtitle>loopback · single operator</Subtitle>
      </Header>
      <Region>
        {/* S5 / CD3. The constellation is the LEFT half of the entry split view and
            it is deliberately filled by a component rather than inlined: its three
            gates (reduced-motion, WebGL, and the idle-after-first-poll chunk load)
            are the slice's contract, and a boundary here means a WebGL failure
            takes out the panel rather than the shell — `03 §state matrix` requires
            exactly that ("WebGL fail → static fallback list (roster remains)"). */}
        <ErrorBoundary scope="The brain constellation">
          <BrainConstellation
            rows={roster.rows}
            status={status.status}
            onOpenBrain={setOpenBrain}
          />
        </ErrorBoundary>
        {/* S1-H17: a throw inside a panel must not take the shell down with it.
            The boundaries sit INSIDE the shell so the header survives and the page
            never goes blank. One boundary per panel, so a failure in the roster
            does not also remove the status board. */}
        <Stack>
          <ErrorBoundary scope="The status board">
            <StatusBoard state={status} />
          </ErrorBoundary>
          <ErrorBoundary scope="The roster">
            <Roster
              adapter={active}
              rows={roster.rows}
              onChanged={roster.refresh}
            />
          </ErrorBoundary>
          <ErrorBoundary scope="The brain drawer">
            <BrainDrawer
              adapter={active}
              channelId={openBrain}
              title={roster.rows.find((r) => r.channelId === openBrain)?.title}
              onClose={() => setOpenBrain(null)}
            />
          </ErrorBoundary>
          {/* S3. The order follows the operator's own loop: search the brains,
              then act on the store. Repair can change what the roster shows, so
              it re-reads through the same `onChanged` the roster's writes use —
              one refresh path, not two that could disagree. */}
          <ErrorBoundary scope="The search console">
            <QueryConsole adapter={active} />
          </ErrorBoundary>
          {/* S4. The run console sits ABOVE the rail because it is the action an operator takes
              most often, and it OWNS ITS OWN POLL LOOP: the run state has a different cadence
              (2 s while a run is in flight) from the status board's, and driving one from the
              other's rate would either slow the run down or make the whole board pay for it. */}
          <ErrorBoundary scope="The run console">
            <RunConsole adapter={active} pollMs={pollMs === 0 ? 0 : undefined} />
          </ErrorBoundary>
          <ErrorBoundary scope="The operations rail">
            <OpsRail adapter={active} onChanged={roster.refresh} />
          </ErrorBoundary>
        </Stack>
      </Region>
    </Shell>
  );
}

export default App;
