/**
 * PrismCapture — container for the email-only speed-to-lead surface ("one beam in, spectrum out").
 * FAIL-CLOSED, flag-gated: the house gate is INSIDE — when the flag is off/unresolved, or a render throws, this
 * returns `null` so the LIVE hero is untouched (the whole surface ships dark and reverts with an env/flag flip).
 * State machine (usePrismCapture): idle/error → PrismBeam; refracted → PrismRefraction. Motion decision is made
 * in JS (usePrefersReducedMotion). Pure token consumer (prismTokens) — renders on today's palette, re-skins when
 * worlds land.
 *
 * Hardened after hostile review: the network error is now VISIBLE + announced (role=alert); when the build opted
 * in (PRISM_ENV_FALLBACK) a fixed-height placeholder reserves space during flag resolution to avoid CLS on the
 * hero; internal links use React Router.
 */
import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { PrismCaptureTokens } from './prismTokens';
import { usePrismCaptureFlag, PRISM_ENV_FALLBACK } from './flags';
import { usePrismCapture } from './usePrismCapture';
import { usePrefersReducedMotion } from './prismMotion';
import { PrismBeam } from './PrismBeam';
import { PrismSpectrum } from './PrismSpectrum';
import { PrismRefraction } from './PrismRefraction';
import { PRISM_COPY } from './prismCopy';

class GateBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children; // render error → fail closed, hero untouched
  }
}

// Self-contained outer band so the host can mount `<PrismCapture />` bare: when the flag is off the component
// returns null and NOTHING renders (no empty padded band). When on, this centers + spaces the card into the page.
const Band = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: clamp(24px, 5vw, 48px) clamp(16px, 5vw, 32px);
`;

const Shell = styled.section`
  position: relative;
  width: 100%;
  max-width: 620px;
  overflow: hidden;
  border-radius: var(--prism-r);
  padding: clamp(20px, 4vw, 32px);
  background: var(--prism-bg);
  box-shadow: var(--prism-glow);
  color: var(--prism-ink);
  isolation: isolate; /* keep the spectrum's z-index local */
`;

// Fixed-height placeholder shown only while the flag resolves AND the build opted in — reserves the card's space
// so enabling PRISM doesn't shove the page down after the flags round-trip (CLS on the primary marketing page).
const Placeholder = styled.div`
  width: 100%;
  max-width: 620px;
  min-height: 232px;
`;

const Inner = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Eyebrow = styled.span`
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--prism-ice);
`;

const Headline = styled.h2`
  margin: 0;
  font: 700 clamp(20px, 3.4vw, 28px) / 1.15 var(--prism-font-display);
  color: var(--prism-ink);
  max-width: 22ch;
`;

const Sub = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--prism-ink-2);
  max-width: 44ch;
`;

const TrainerLink = styled(Link)`
  align-self: flex-start;
  font-size: 13px;
  color: var(--prism-ink-2);
  text-decoration: underline;
  text-underline-offset: 3px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  &:hover {
    color: var(--prism-ice);
  }
`;

const Consent = styled.p`
  margin: 4px 0 0;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--prism-ink-2);
  opacity: 0.85;
  max-width: 46ch;
`;

const NetError = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--prism-danger);
`;

const Retry = styled.button`
  align-self: flex-start;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--prism-ice-14);
  border-radius: var(--prism-r-field);
  background: transparent;
  color: var(--prism-ink);
  font-size: 14px;
  cursor: pointer;
`;

function PrismCaptureInner() {
  const { state, error, shareCode, submittedEmail, submit, reset } = usePrismCapture();
  const reduced = usePrefersReducedMotion();

  const active = state === 'beaming' || state === 'refracted';
  const invalid = state === 'error' && error === 'invalid';
  const networkError = state === 'error' && error === 'network';

  const onSubmit = (value: string) => {
    void submit(value, 'spectrum');
  };

  return (
    <>
      <PrismCaptureTokens />
      <Band className="prism-capture">
        <Shell aria-labelledby="prism-headline">
          <PrismSpectrum active={active} animate={!reduced} />
          <Inner>
            <Eyebrow>{PRISM_COPY.eyebrow}</Eyebrow>
            <Headline id="prism-headline">{PRISM_COPY.headline}</Headline>
            {state !== 'refracted' ? <Sub>{PRISM_COPY.sub}</Sub> : null}

            {state === 'refracted' ? (
              <PrismRefraction email={submittedEmail} shareCode={shareCode} />
            ) : (
              <>
                <PrismBeam submitting={state === 'beaming'} invalid={invalid} onSubmit={onSubmit} />
                {networkError ? (
                  <>
                    <NetError role="alert">{PRISM_COPY.errorNetwork}</NetError>
                    <Retry type="button" onClick={reset}>
                      {PRISM_COPY.retry}
                    </Retry>
                  </>
                ) : null}
                <TrainerLink to="/contact?intent=trainer">{PRISM_COPY.trainerLink} →</TrainerLink>
                <Consent>{PRISM_COPY.consent}</Consent>
              </>
            )}
          </Inner>
        </Shell>
      </Band>
    </>
  );
}

export function PrismCapture() {
  const { prismCapture, resolved } = usePrismCaptureFlag();
  if (!resolved) {
    // Reserve the card's space ONLY when the build opted in, so enabling PRISM doesn't cause CLS; off-builds
    // render nothing (no wasted space on every homepage load).
    return PRISM_ENV_FALLBACK ? (
      <Band aria-hidden="true">
        <Placeholder />
      </Band>
    ) : null;
  }
  if (!prismCapture) return null; // fail-closed: nothing renders unless the flag resolves true
  return (
    <GateBoundary>
      <PrismCaptureInner />
    </GateBoundary>
  );
}

export default PrismCapture;
