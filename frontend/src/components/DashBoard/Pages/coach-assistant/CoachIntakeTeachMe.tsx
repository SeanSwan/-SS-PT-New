import React from 'react';
import styled from 'styled-components';
import TeachMeToggle from '../../../Shared/TeachMeToggle';

interface CoachIntakeTeachMeProps {
  onCommandPrompt: (message: string) => void;
}

const Shell = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 12px;
  min-width: 0;
`;

const GuideList = styled.ol`
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;

  li {
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
    background: color-mix(in srgb, var(--bg-base, #030712) 32%, transparent);
    overflow-wrap: anywhere;
  }

  strong {
    color: var(--text-primary, #E0ECF4);
  }
`;

const MemoryStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;

  span {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);
    background: color-mix(in srgb, var(--accent-gold, #C6A84B) 8%, transparent);
    color: var(--accent-gold, #C6A84B);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    line-height: 1.2;
    max-width: 100%;
    overflow-wrap: anywhere;
    padding: 0 10px;
    white-space: normal;
  }
`;

const intakeGuide = (
  <>
    <MemoryStrip aria-label="Hive mind intake quick rules">
      <span>First click: Review next intake</span>
      <span>No silent writes</span>
    </MemoryStrip>
    <GuideList>
      <li><strong>Review next intake first.</strong> Let the queue pick the highest-risk item so you are not hunting through tabs.</li>
      <li><strong>Resolve client, date, and audio order.</strong> Do that before trusting the prepared workout or session note.</li>
      <li><strong>Ask Coach to inspect pieces.</strong> Use the command buttons when a clip bundle, client match, or duplicate risk needs a second pass.</li>
      <li><strong>Review the prepared draft.</strong> Approve, reject, or hold it from the review panel after the intake facts are clean.</li>
      <li><strong>Final writes stay approval-gated.</strong> The workspace can prepare the log, but it does not silently save client history.</li>
    </GuideList>
  </>
);

export function CoachIntakeTeachMe({ onCommandPrompt }: CoachIntakeTeachMeProps): JSX.Element {
  const askCoach = React.useCallback(() => {
    onCommandPrompt('teach me how to process Coach intake safely');
  }, [onCommandPrompt]);

  return (
    <Shell>
      <TeachMeToggle
        sectionId="coach-intake-hive-mind"
        title="Hive mind intake review"
        content={intakeGuide}
        onAskAI={askCoach}
        defaultOpen={false}
      />
    </Shell>
  );
}

export default CoachIntakeTeachMe;
