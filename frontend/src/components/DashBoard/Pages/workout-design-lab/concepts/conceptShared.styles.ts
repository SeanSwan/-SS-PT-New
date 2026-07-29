import styled from 'styled-components';

/**
 * `.lens2-surface` is the FORM hook for the `surface.card` recipe axis (Slice
 * W0.2). Before this hook existed the axis was TOKEN-ONLY — two worlds could
 * satisfy the ≥3-axis distinctness gate on an axis that rendered nothing.
 * The className is MERGED (not replaced) so the callers' grid-area classes
 * (`.hero`/`.dial`/`.work`/`.context`/`.actions`) keep working.
 */
export const Panel = styled.section.attrs<{ className?: string }>((props) => ({
  className: ['lens2-surface', props.className].filter(Boolean).join(' '),
}))`
  border: 1px solid
    color-mix(in srgb, var(--world-accent, #60c0f0) 34%, transparent);
  border-radius: var(--world-panel-radius, var(--world-radius, 22px));
  background: color-mix(in srgb, var(--world-panel, #141419) 92%, transparent);
  box-shadow: 0 24px 70px
    color-mix(in srgb, var(--world-shadow, #0a0a0f) 45%, transparent);
  backdrop-filter: blur(14px);
`;

export const Kicker = styled.p`
  margin: 0;
  color: var(--world-accent, #60c0f0);
  font:
    700 12px/1.4 "Sora",
    sans-serif;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

export const WorldTitle = styled.h2`
  margin: 10px 0 12px;
  max-width: 12ch;
  color: var(--world-text, #e0ecf4);
  font: var(
    --world-title-font,
    750 clamp(38px, 6vw, 88px)/0.94 "Plus Jakarta Sans",
    sans-serif
  );
  letter-spacing: var(--world-letter-spacing, -0.055em);
`;

export const BodyCopy = styled.p`
  margin: 0;
  max-width: 62ch;
  color: var(--world-muted, #b8c8d8);
  font:
    500 clamp(16px, 1.2vw, 18px)/1.65 "Plus Jakarta Sans",
    sans-serif;
`;

export const SignalRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  span {
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    padding: 5px 12px;
    border-radius: 999px;
    border: 1px solid
      color-mix(in srgb, var(--world-accent, #60c0f0) 36%, transparent);
    background: color-mix(
      in srgb,
      var(--world-panel, #141419) 75%,
      transparent
    );
    color: var(--world-text, #e0ecf4);
    font:
      650 12px/1.2 "Sora",
      sans-serif;
  }
`;

/**
 * `.lens2-chart` is the FORM hook for the `chart.progress` recipe axis (Slice
 * W0.2) — same reason as `.lens2-surface` above. The conic gradient is the
 * DATA channel (readiness %): variant CSS may only reshape the geometry
 * (footprint, ring thickness, numeral scale), never replace the gradient.
 */
export const ReadinessDial = styled.div.attrs<{ className?: string }>((props) => ({
  className: ['lens2-chart', props.className].filter(Boolean).join(' '),
}))<{ $readiness: number }>`
  width: clamp(126px, 15vw, 210px);
  aspect-ratio: 1;
  border-radius: var(--world-dial-radius, 50%);
  display: grid;
  place-items: center;
  background: conic-gradient(
    var(--world-accent, #60c0f0) 0 ${({ $readiness }) => $readiness}%,
    color-mix(in srgb, var(--world-text, #e0ecf4) 14%, transparent)
      ${({ $readiness }) => $readiness}%
  );
  position: relative;
  flex: 0 0 auto;
  &::after {
    content: "";
    position: absolute;
    inset: 12px;
    border-radius: inherit;
    background: var(--world-panel, #141419);
  }
  div {
    position: relative;
    z-index: 1;
    text-align: center;
    color: var(--world-text, #e0ecf4);
  }
  strong {
    display: block;
    font:
      800 clamp(38px, 5vw, 68px)/1 "Fira Code",
      monospace;
  }
  span {
    font:
      650 12px/1.4 "Sora",
      sans-serif;
  }
`;

export const ExerciseStack = styled.div`
  display: grid;
  gap: 10px;
`;
export const ExerciseRow = styled.article`
  display: grid;
  grid-template-columns: var(
    --world-row-columns,
    minmax(140px, 1.4fr) repeat(4, minmax(62px, 0.45fr))
  );
  gap: 10px;
  align-items: center;
  min-height: 68px;
  padding: 12px 14px;
  border: 1px solid
    color-mix(in srgb, var(--world-text, #e0ecf4) 12%, transparent);
  border-radius: var(
    --world-row-radius,
    calc(var(--world-radius, 22px) * 0.66)
  );
  background: color-mix(in srgb, var(--world-panel, #141419) 72%, transparent);
  color: var(--world-text, #e0ecf4);
  h3 {
    margin: 0;
    font:
      750 16px/1.25 "Plus Jakarta Sans",
      sans-serif;
  }
  p {
    margin: 4px 0 0;
    color: var(--world-muted, #b8c8d8);
    font:
      500 12px/1.35 "Sora",
      sans-serif;
  }
  dl {
    margin: 0;
  }
  dt {
    color: var(--world-muted, #b8c8d8);
    font:
      600 10px/1.2 "Sora",
      sans-serif;
    text-transform: uppercase;
  }
  dd {
    margin: 3px 0 0;
    font:
      700 13px/1.2 "Fira Code",
      monospace;
  }
  @media (max-width: 620px) {
    grid-template-columns: 1fr 1fr;
    min-height: auto;
    > div:first-child {
      grid-column: 1 / -1;
    }
  }
`;


export const ContextList = styled.div`
  display: grid;
  gap: 12px;
  color: var(--world-text, #e0ecf4);
  p {
    margin: 0;
    display: grid;
    grid-template-columns: 22px 1fr;
    gap: 9px;
    align-items: start;
    color: var(--world-muted, #b8c8d8);
    font:
      550 14px/1.45 "Plus Jakarta Sans",
      sans-serif;
  }
  strong {
    color: var(--world-text, #e0ecf4);
  }
`;


export const ActionBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  button {
    min-height: 48px;
    border-radius: 13px;
    padding: 0 18px;
    cursor: pointer;
    font:
      750 14px/1 "Sora",
      sans-serif;
  }
`;
export const Primary = styled.button`
  border: 1px solid var(--world-accent, #60c0f0);
  background: var(--world-action, #002060);
  color: var(--world-text, #e0ecf4);
  box-shadow: 0 0 24px
    color-mix(in srgb, var(--wing-purple, #8b5cf6) 36%, transparent);
  &:focus-visible {
    outline: 3px solid var(--wing-purple, #8b5cf6);
    outline-offset: 3px;
  }
`;
export const Secondary = styled.button`
  border: 1px solid
    color-mix(in srgb, var(--world-accent, #60c0f0) 55%, transparent);
  background: color-mix(in srgb, var(--world-panel, #141419) 86%, transparent);
  color: var(--world-text, #e0ecf4);
  &:focus-visible {
    outline: 3px solid var(--world-accent, #60c0f0);
    outline-offset: 3px;
  }
`;


export const PrototypeNote = styled.p`
  margin: 0;
  color: var(--world-muted, #b8c8d8);
  font:
    650 12px/1.45 "Sora",
    sans-serif;
  /* The Lab owns ONE page-level SafetyCard; inside it (World, Style, AND
     Compare modes) concept-level notes hide. Outside the Lab they render. */
  [data-lab-safety='page'] & {
    display: none;
  }
`;
