/**
 * Swiss Precision Lab — independent Workout Design Lab composition.
 */
import React from "react";
import styled from "styled-components";
import {
  BodyCopy,
  ConceptActions,
  ExerciseList,
  Kicker,
  Panel,
  PrototypeNote,
  ReadinessDial,
  SessionContext,
  SignalRow,
  WorldTitle,
  type ConceptProps,
} from "./conceptShared";

const Scene = styled.section`
  --world-bg: var(--calibration-bg, #17191d);
  --world-panel: var(--calibration-panel, #292c32);
  --world-accent: var(--calibration-accent, #ff5b5b);
  --world-text: var(--calibration-text, #ffffff);
  --world-muted: var(--calibration-muted, #c4c7ce);
  --world-action: var(--calibration-action, #374151);
  --world-shadow: var(--obsidian-black, #0a0a0f);
  --world-radius: 0px;
  --world-title-font:
    italic 700 clamp(42px, 6vw, 92px)/0.94 "Cormorant Garamond", serif;
  --world-letter-spacing: -0.025em;
  --world-dial-radius: 28%;
  --world-row-radius: 999px;
  --world-row-columns: minmax(200px, 1.8fr) repeat(4, minmax(60px, 0.42fr));
  --world-panel-radius: 8px;
  min-height: 760px;
  padding: clamp(24px, 4vw, 72px);
  color: var(--world-text);
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0 39px,
      color-mix(in srgb, var(--world-accent) 12%, transparent) 40px
    ),
    radial-gradient(
      circle at 82% 12%,
      color-mix(in srgb, var(--world-accent) 20%, transparent),
      transparent 29%
    ),
    var(--world-bg);
`;
const Composition = styled.div`
  max-width: 1880px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(240px, 0.55fr) minmax(0, 1.45fr);
  grid-template-areas: "context hero" "dial work" "actions work";
  gap: clamp(16px, 2vw, 28px);
  align-items: stretch;
  > .hero {
    grid-area: hero;
    padding: clamp(18px, 3vw, 38px);
  }
  > .dial {
    grid-area: dial;
    display: grid;
    place-items: center;
    padding: 18px;
  }
  > .work {
    grid-area: work;
    padding: clamp(14px, 2vw, 26px);
  }
  > .context {
    grid-area: context;
    padding: clamp(16px, 2vw, 28px);
  }
  > .actions {
    grid-area: actions;
    padding: 16px;
    display: grid;
    align-content: center;
  }
  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    grid-template-areas: "hero" "dial" "work" "context" "actions";
  }
`;

export const SwissPrecisionLab: React.FC<ConceptProps> = (props) => {
  const { model, conceptName } = props;
  return (
    <Scene aria-label={conceptName} data-composition="calibration">
      <Composition>
        <Panel className="hero">
          <Kicker>CALIBRATION / EXACT SETS</Kicker>
          <WorldTitle>Nothing hidden. Nothing approximate.</WorldTitle>
          <BodyCopy>
            Measurement grids expose sets, tempo, RPE, rest, pain, and form at a
            glance.
          </BodyCopy>
          <SignalRow>
            <span>{model.prototypeClient}</span>
            <span>{model.dateContext}</span>
            <span>{model.missedDaySignal}</span>
          </SignalRow>
          <PrototypeNote>
            Prototype only · no client data is written
          </PrototypeNote>
        </Panel>
        <Panel className="dial">
          <ReadinessDial $readiness={model.readiness}>
            <div>
              <strong>{model.readiness}</strong>
              <span>{model.readinessLabel}</span>
            </div>
          </ReadinessDial>
        </Panel>
        <Panel className="work">
          <ExerciseList model={model} />
        </Panel>
        <Panel className="context">
          <SessionContext model={model} />
        </Panel>
        <Panel className="actions">
          <ConceptActions {...props} />
        </Panel>
      </Composition>
    </Scene>
  );
};
