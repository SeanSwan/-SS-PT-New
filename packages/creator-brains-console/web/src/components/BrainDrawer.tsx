/*
 * BrainDrawer — read one creator's PUBLISHED brain (S2).
 *
 * ── WHAT "PUBLISHED GENERATION" MEANS, AND WHY THE DRAWER SHOWS IT ──────────
 *
 * The engine publishes a brain by pointer: `lib/brains.mjs` resolves a namespace
 * to a GENERATION DIRECTORY, and `BrainDoc.generation` is that directory's name.
 * `null` means the pointer named no generation.
 *
 * The drawer shows it for one reason: a document with no generation is a document
 * whose age cannot be established. Without it, a reader cannot tell a brain built
 * this morning from one built in August, and both render identically. So the
 * generation is displayed whenever it exists, and its ABSENCE is displayed too —
 * "no generation published" is a fact about the store, not a rendering detail.
 *
 * ── THE DAMAGE BANNER IS NOT AN ERROR STATE ────────────────────────────────
 *
 * S2's exit criterion is "damage paths banner". A damaged read is NOT the same as
 * a failed request: the route answered, and its answer says the store could not
 * be read. The three sub-cases are distinct and are labelled distinctly:
 *
 *   skipped[]   the engine skipped a document and said WHICH and WHY. Shown in
 *               full, because `skipped` is the engine's own accounting and
 *               dropping it is how a partial brain comes to look complete.
 *   generation  null — the pointer names no generation.
 *   no brain    a 404: this creator has never been published.
 *
 * A thrown fetch is a fourth case and is different again: the bridge did not
 * answer. That is `error`, and it is the only one presented as a failure.
 */

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { BrainDoc, ConsoleDataAdapter } from '../adapters';

const Panel = styled.section`
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
  border-radius: var(--radius-card, 20px);
  background: var(--carbon, #141419);
  padding: var(--space-5, 24px);
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const PanelHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3, 12px);
  margin-bottom: var(--space-4, 16px);
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
`;

const CloseButton = styled.button`
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
  background: transparent;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  border-radius: var(--radius-control, 10px);
  padding: var(--space-1, 4px) var(--space-3, 12px);
  font-size: 12px;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8b5cf6);
    outline-offset: 2px;
  }
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3, 12px);
  margin-bottom: var(--space-3, 12px);
  font-family: var(--font-data, monospace);
  font-size: 11px;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
`;

const Generation = styled.span<{ $missing: boolean }>`
  color: ${(p) => (p.$missing
    ? 'var(--warn, #c6a84b)'
    : 'var(--text-faint, rgba(224, 236, 244, 0.38))')};
`;

const Banner = styled.div`
  margin-bottom: var(--space-3, 12px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-radius: var(--radius-control, 10px);
  border: 1px solid var(--warn, #c6a84b);
  background: rgba(198, 168, 75, 0.10);
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-primary, #e0ecf4);
`;

const ErrorBox = styled.div`
  margin-bottom: var(--space-3, 12px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-radius: var(--radius-control, 10px);
  border: 1px solid var(--danger, #e5484d);
  background: rgba(229, 72, 77, 0.10);
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-primary, #e0ecf4);
`;

const Body = styled.div`
  overflow-y: auto;
  min-height: 0;
  flex: 1;
`;

const Doc = styled.article`
  border-top: 1px solid var(--border-hairline, rgba(96, 192, 240, 0.12));
  padding: var(--space-3, 12px) 0;
`;

const DocLabel = styled.h3`
  margin: 0 0 var(--space-2, 8px);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ice-wing, #60c0f0);
`;

/* The engine's markdown, rendered as text. A markdown renderer is NOT S2's job,
 * and injecting raw HTML here would be an XSS surface for an engine document. */
const Pre = styled.pre`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-data, monospace);
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
`;

const Muted = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
`;

const DOCS: Array<{ key: keyof BrainDoc; label: string }> = [
  { key: 'index', label: 'Index' },
  { key: 'topics', label: 'Topics' },
  { key: 'timeline', label: 'Timeline' },
];

export interface BrainDrawerProps {
  adapter: ConsoleDataAdapter;
  /** The creator whose brain to read; `null` means the drawer is closed. */
  channelId: string | null;
  /** The creator's display name, for the heading (the route is keyed by id). */
  title?: string;
  onClose: () => void;
}

export function BrainDrawer({ adapter, channelId, title, onClose }: BrainDrawerProps): ReactElement | null {
  const [doc, setDoc] = useState<BrainDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // A late answer for a creator the operator has already navigated away from must
  // not be rendered as the current one. Same discipline as the worker epoch.
  const requestFor = useRef<string | null>(null);

  useEffect(() => {
    if (channelId === null) {
      requestFor.current = null;
      setDoc(null);
      setError(null);
      return;
    }
    requestFor.current = channelId;
    setLoading(true);
    setError(null);
    setDoc(null);
    adapter.getBrain(channelId)
      .then((d) => {
        if (requestFor.current !== channelId) return; // superseded
        setDoc(d);
      })
      .catch((e: unknown) => {
        if (requestFor.current !== channelId) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (requestFor.current === channelId) setLoading(false);
      });
  }, [adapter, channelId]);

  if (channelId === null) return null;

  const skipped = doc?.skipped ?? [];
  const generationMissing = doc !== null && doc.generation === null;

  return (
    <Panel data-testid="brain-drawer" aria-label="Brain drawer">
      <PanelHead>
        <PanelTitle>{doc?.title ?? title ?? channelId}</PanelTitle>
        <CloseButton type="button" onClick={onClose} data-testid="drawer-close">
          Close
        </CloseButton>
      </PanelHead>

      <Meta>
        <span>{channelId}</span>
        <Generation $missing={generationMissing} data-testid="drawer-generation">
          {doc === null
            ? 'reading…'
            : doc.generation === null
              ? 'no generation published'
              : `generation ${doc.generation}`}
        </Generation>
      </Meta>

      {error !== null && (
        <ErrorBox role="alert" data-testid="drawer-error">
          The bridge did not answer: {error}
        </ErrorBox>
      )}

      {skipped.length > 0 && (
        <Banner data-testid="drawer-skipped">
          The engine skipped {skipped.length} document{skipped.length === 1 ? '' : 's'} while
          building this brain. Everything below is what it could read.
          <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
            {skipped.map((s, i) => (
              <li key={i}>{JSON.stringify(s)}</li>
            ))}
          </ul>
        </Banner>
      )}

      <Body>
        {loading && <Muted>Reading the published generation…</Muted>}
        {!loading && doc === null && error === null && <Muted>Nothing to show.</Muted>}
        {doc !== null && DOCS.map(({ key, label }) => {
          const text = String(doc[key] ?? '');
          return (
            <Doc key={String(key)}>
              <DocLabel>{label}</DocLabel>
              {text.trim() === ''
                ? <Muted>{generationMissing ? 'No generation to read.' : 'Empty document.'}</Muted>
                : <Pre>{text}</Pre>}
            </Doc>
          );
        })}
      </Body>
    </Panel>
  );
}

export default BrainDrawer;
