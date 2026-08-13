/**
 * SocialPostComplianceResult — blockers are not warnings
 * ============================================================================
 * The compliance panel rendered `warnings` as one undifferentiated amber list.
 * The server has always returned two different things in there:
 *
 *  - a WARNING it already remedied (a promotional post gets #ad appended, and
 *    still raises a warning saying so), and
 *  - a BLOCKER it cannot remedy (a medical claim, a client testimonial), which
 *    makes the publish route return 422 and refuse the post outright.
 *
 * Because the panel showed both the same way, Sean could run Check Compliance,
 * read some amber text, press Publish, and only then discover the post was
 * never going out. The panel has to say which of those two situations he is in
 * BEFORE he presses the button.
 *
 * `compliant` cannot carry this: it is `warnings.length === 0`, so an
 * auto-tagged promo post is "non-compliant" while being perfectly publishable.
 * `blocked` is the real gate, which is why the route branches on it.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SocialPostComplianceResult from './SocialPostComplianceResult';

const BLOCKER = 'FDA: Content contains "cures" which may constitute a medical claim.';
const ADVISORY = 'FTC: Promotional content detected — #ad was added automatically.';

describe('a post that will be refused says so before Publish is pressed', () => {
  it('names every blocker', () => {
    render(<SocialPostComplianceResult result={{
      compliant: false, blocked: true, warnings: [BLOCKER], blockers: [BLOCKER], autoTags: [],
    }} />);

    expect(screen.getByText(BLOCKER)).toBeInTheDocument();
  });

  it('states the post will not publish, rather than merely warning', () => {
    render(<SocialPostComplianceResult result={{
      compliant: false, blocked: true, warnings: [BLOCKER], blockers: [BLOCKER], autoTags: [],
    }} />);

    // Sean must learn this here, not from a 422 after pressing Publish.
    expect(screen.getByText(/will not be published|cannot be published|refused/i)).toBeInTheDocument();
  });

  it('separates an advisory that was already remedied from the blocker', () => {
    render(<SocialPostComplianceResult result={{
      compliant: false,
      blocked: true,
      warnings: [BLOCKER, ADVISORY],
      blockers: [BLOCKER],
      autoTags: ['#ad'],
    }} />);

    expect(screen.getByText(BLOCKER)).toBeInTheDocument();
    expect(screen.getByText(ADVISORY)).toBeInTheDocument();
    // The remedied advisory must not be listed a second time as a blocker.
    expect(screen.getAllByText(ADVISORY)).toHaveLength(1);
  });
});

describe('a publishable post is not dressed up as a failure', () => {
  it('does not claim refusal when nothing is blocking', () => {
    render(<SocialPostComplianceResult result={{
      compliant: false, blocked: false, warnings: [ADVISORY], blockers: [], autoTags: ['#ad'],
    }} />);

    expect(screen.queryByText(/will not be published|cannot be published|refused/i)).not.toBeInTheDocument();
    expect(screen.getByText(ADVISORY)).toBeInTheDocument();
  });

  it('still shows the auto-tags that were appended', () => {
    render(<SocialPostComplianceResult result={{
      compliant: false, blocked: false, warnings: [ADVISORY], blockers: [], autoTags: ['#ad'],
    }} />);

    // Match the auto-tags line specifically — the advisory sentence also
    // contains "#ad", so a bare /#ad/ matches two elements and proves nothing.
    expect(screen.getByText(/Auto-tags:/)).toHaveTextContent('#ad');
  });

  it('reports a clean pass unchanged', () => {
    render(<SocialPostComplianceResult result={{
      compliant: true, blocked: false, warnings: [], blockers: [], autoTags: [],
    }} />);

    expect(screen.getByText(/passes FTC\/FDA compliance/i)).toBeInTheDocument();
  });

  it('renders nothing at all before a check has run', () => {
    const { container } = render(<SocialPostComplianceResult result={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('tolerates an older server that omits the new fields', () => {
  it('falls back to plain warnings when blockers are absent', () => {
    // A cached bundle talking to a deployed server, or vice versa, must not
    // crash on `blockers.map`.
    render(<SocialPostComplianceResult result={{
      compliant: false, warnings: [ADVISORY], autoTags: [],
    } as never} />);

    expect(screen.getByText(ADVISORY)).toBeInTheDocument();
    expect(screen.queryByText(/will not be published|refused/i)).not.toBeInTheDocument();
  });
});
