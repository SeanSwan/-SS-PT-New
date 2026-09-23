/**
 * BLUEPRINT: Application Error Boundary
 * PURPOSE: Recover from render failures and offer a privacy-safe Report Room handoff.
 * PRIVACY: Two destinations, two different postures - do not conflate them.
 *          ANALYTICS (window.gtag) still receives ONLY the stable code
 *          'APP_RENDER_ERROR' - never messages, stacks, URLs, user agents, query
 *          strings, or component trees. That is unchanged.
 *          ERROR REPORTING (Sentry, SWA-225 EX-4) receives the exception itself,
 *          because a crash report without a stack cannot be acted on - that is the
 *          entire point of the tool. It is scrubbed by `beforeSend` in
 *          instrument.ts (emails and key shapes redacted, request object dropped,
 *          breadcrumb query strings stripped) and is inert unless VITE_SENTRY_DSN
 *          is set. The React component tree is deliberately NOT attached: the
 *          stack alone locates the throw, so the tree buys little and is the one
 *          field this boundary has always promised to withhold.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

import { buildSupportErrorRoute } from '../../pages/support/supportErrorRoute';
import { logger } from '../../utils/logger';
import { reportError } from '../../instrument';

interface Props { children: ReactNode }
interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  buildTimestamp: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      buildTimestamp: new Date().toISOString(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[ErrorBoundary] APP_RENDER_ERROR');
    this.setState({ error, errorInfo });
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: 'APP_RENDER_ERROR',
        fatal: true,
      });
    }
    // reportError self-gates on the DSN and loads the SDK lazily, so with none
    // configured this boundary behaves exactly as it did before EX-4, and the
    // vendor SDK never reaches the entry chunk.
    reportError(error);
  }

  handleRetry = () => {
    logger.log(`[ErrorBoundary] retry ${this.state.retryCount + 1}`);
    this.setState((previous) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: previous.retryCount + 1,
    }));
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <ErrorContainer>
        <ErrorContent role="alert" aria-labelledby="app-error-title">
          <ErrorIcon aria-hidden="true">!</ErrorIcon>
          <ErrorTitle id="app-error-title">Something interrupted this page</ErrorTitle>
          <ErrorMessage>
            Your session is still here. Try the page again, or send Swan Coach a private report so the issue can be investigated.
            {this.state.retryCount > 0 && ` Retry attempt: ${this.state.retryCount}.`}
          </ErrorMessage>

          {import.meta.env.DEV && this.state.error && (
            <ErrorDetails>
              <summary>Error details (development only)</summary>
              <pre>{this.state.error.message}</pre>
              <pre>{this.state.error.stack}</pre>
              <pre>{this.state.errorInfo?.componentStack}</pre>
            </ErrorDetails>
          )}

          <ErrorActions>
            <RetryButton type="button" onClick={this.handleRetry}>Try again</RetryButton>
            <ReportLink href={buildSupportErrorRoute(window.location.pathname, 'APP_RENDER_ERROR')}>
              Report this problem
            </ReportLink>
          </ErrorActions>

          <BuildInfo>Incident time: {this.state.buildTimestamp.slice(0, 19)}</BuildInfo>
        </ErrorContent>
      </ErrorContainer>
    );
  }
}

const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: clamp(20px, 4vw, 32px);
  color: var(--frost-white, #E0ECF4);
  /* --error-page-bg was never defined anywhere, so this gradient could never respond
     to theming and rendered its fallback forever. These two tokens are real and
     carry exactly these values (Midnight Sapphire, Royal Depth). */
  background: linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--royal-depth, #003080));
`;

const ErrorContent = styled.div`
  width: min(100%, 520px);
  padding: clamp(28px, 6vw, 48px) clamp(20px, 5vw, 32px);
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.28));
  border-radius: 18px;
  text-align: center;
  background: var(--error-card, rgba(20, 20, 25, 0.9));
  box-shadow: 0 24px 70px var(--shadow-deep, rgba(3, 7, 18, 0.45));
`;

const ErrorIcon = styled.div`
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border: 1px solid var(--gilded-fern, #C6A84B);
  border-radius: 50%;
  color: var(--gilded-fern, #C6A84B);
  font: 700 32px/1 'Sora', sans-serif;
`;

const ErrorTitle = styled.h1`
  margin: 0 0 14px;
  color: var(--frost-white, #E0ECF4);
  font: 700 clamp(24px, 5vw, 32px)/1.2 'Plus Jakarta Sans', sans-serif;
`;

const ErrorMessage = styled.p`
  margin: 0 0 28px;
  color: var(--text-secondary, #B8C7D9);
  font: 500 15px/1.65 'Plus Jakarta Sans', sans-serif;
`;

const ErrorDetails = styled.details`
  margin-bottom: 24px;
  padding: 12px;
  border-radius: 10px;
  text-align: left;
  background: var(--graphite, #1A1A24);
  summary { min-height: 44px; cursor: pointer; font-weight: 650; }
  pre { max-width: 100%; margin: 8px 0; overflow-x: auto; white-space: pre-wrap; }
`;

const ErrorActions = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  @media (max-width: 480px) { > * { width: 100%; } }
`;

const controlCss = css`
  min-height: 44px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  border-radius: 10px;
  color: var(--frost-white, #E0ECF4);
  font: 700 14px 'Plus Jakarta Sans', sans-serif;
  text-decoration: none;
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 3px; }
`;

const RetryButton = styled.button`
  ${controlCss}
  border: 1px solid var(--wing-purple, #8B5CF6);
  background: var(--midnight-sapphire, #002060);
  transition: transform 160ms ease, box-shadow 160ms ease;
  @media (hover: hover) { &:hover { transform: translateY(-1px); box-shadow: 0 6px 18px var(--purple-glow, rgba(139, 92, 246, 0.28)); } }
  @media (prefers-reduced-motion: reduce) { transition: none; &:hover { transform: none; } }
`;

const ReportLink = styled.a`
  ${controlCss}
  border: 1px solid var(--ice-wing, #60C0F0);
  background: transparent;
`;

const BuildInfo = styled.div`
  margin-top: 16px;
  color: var(--text-muted, #91A2B6);
  font: 500 12px/1.5 'Fira Code', monospace;
`;