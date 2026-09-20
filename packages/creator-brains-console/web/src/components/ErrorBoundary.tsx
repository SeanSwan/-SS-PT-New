/*
 * ErrorBoundary — the console's last-resort net (S1-H17).
 *
 * WHY THIS EXISTS. In React 18 an error thrown during render that no boundary
 * catches unmounts the whole root: `main.tsx` renders into an empty container and
 * the operator is left with a BLANK page — no reading, no message, and nothing in
 * the UI naming the field that was wrong. `StatusBoard` dereferences 13 top-level
 * paths on its first ready render, so one missing or retyped key in an
 * `/api/status` payload was enough to do it.
 *
 * TWO LAYERS, AND THIS IS THE SECOND. The first is the adapter seam
 * (adapters/validate.ts): a wrong-shaped 200 from the live bridge becomes a typed
 * `ConsoleApiError`, which `useStatus` catches into `phase: 'error'` and
 * `StatusBoard` renders as its existing refusal banner — the board stays up and
 * the next poll can still recover it. This boundary covers what that cannot: an
 * adapter that does not validate (the mock, or a future one) and any render throw
 * nobody predicted. It is a net, not the primary defence.
 *
 * WHY IT LATCHES INSTEAD OF SELF-CLEARING. A boundary that reset itself on the
 * next poll would re-throw on every poll, forever, against a payload that is not
 * going to change — a render-throw loop every 5 s in place of one clean refusal.
 * Latching is the honest behaviour: refuse once, name the fault, let the operator
 * reload. The self-healing path is layer 1, where it belongs.
 *
 * WHAT IT CANNOT CATCH. React does not route errors from event handlers, from
 * `setTimeout`, or from async code through a boundary. Only render, lifecycle and
 * constructor throws arrive here.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

const Panel = styled.section`
  background: var(--carbon, #141419);
  border: 1px solid var(--danger, #e5484d);
  border-radius: var(--radius-card, 20px);
  padding: var(--space-5, 24px);
  color: var(--text-primary, #e0ecf4);
  font-family: var(--font-ui, system-ui, sans-serif);
`;

const Head = styled.h2`
  margin: 0 0 var(--space-3, 12px);
  font-size: 18px;
  font-weight: 600;
`;

const Body = styled.p`
  margin: 0 0 var(--space-3, 12px);
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
`;

const Detail = styled.pre`
  margin: 0 0 var(--space-3, 12px);
  padding: var(--space-3, 12px);
  border-radius: var(--radius-control, 12px);
  background: rgba(229, 72, 77, 0.1);
  border: 1px solid var(--border-gold, rgba(198, 168, 75, 0.3));
  font-family: var(--font-data, monospace);
  font-size: 12px;
  white-space: pre-wrap;
  overflow-x: auto;
`;

const Hint = styled.p`
  margin: 0;
  font-family: var(--font-data, monospace);
  font-size: 12px;
  color: var(--warn, #c6a84b);
`;

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Named in the panel, so a multi-region console says WHICH region failed. */
  scope?: string;
}

interface ErrorBoundaryState {
  error: unknown;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Not swallowed: the panel shows the message, devtools gets the component
    // stack, which the panel has no room for.
    console.error('console fault contained by ErrorBoundary', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    const { children, scope = 'this region' } = this.props;

    if (error === null) return children;

    // A child may throw a non-Error; `message` is then absent and the thrown
    // value itself is the only thing worth showing.
    const detail =
      error instanceof Error && error.message ? error.message : String(error);

    return (
      <Panel role="alert" data-testid="console-fault">
        <Head>The console hit an error it could not render.</Head>
        <Body>
          {scope} failed to render and was contained, so the rest of the console is still up.
          Nothing was written and nothing changed — this is a display failure only.
        </Body>
        <Detail data-testid="console-fault-detail">{detail}</Detail>
        <Hint>reload the page to try again · the component stack is in the browser console</Hint>
      </Panel>
    );
  }
}
