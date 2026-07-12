/**
 * Mediterranean Training Villa — independent Workout Design Lab composition.
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
  --world-bg: var(--villa-bg, #16201e);
  --world-panel: var(--villa-panel, #293a34);
  --world-accent: var(--villa-accent, #d98a62);
  --world-text: var(--villa-text, #fff8ea);
  --world-muted: var(--villa-muted, #d2cabb);
  --world-action: var(--villa-action, #365f55);
  --world-shadow: var(--obsidian-black, #0a0a0f);
  --world-radius: 28px;
  --world-title-font:
    750 clamp(40px, 6.2vw, 90px)/0.9 "Plus Jakarta Sans", sans-serif;
  --world-letter-spacing: -0.07em;
  --world-dial-radius: 50% 50% 32% 32%;
  --world-row-radius: 4px;
  --world-row-columns: minmax(150px, 1.45fr) repeat(4, minmax(64px, 0.48fr));
  --world-panel-radius: 36px;
  min-height: 760px;
  padding: clamp(24px, 4vw, 72px);
  color: var(--world-text);
  background:
    linear-gradient(
      90deg,
      transparent 68%,
      color-mix(in srgb, var(--world-accent) 13%, transparent) 69%
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
  grid-template-columns: minmax(0, 1.25fr) minmax(240px, 0.75fr);
  grid-template-areas: "hero dial" "work context" "actions context";
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

export const MediterraneanTrainingVilla: React.FC<ConceptProps> = (props) => {
  const { model, conceptName } = props;
  return (
    <Scene aria-label={conceptName} data-composition="villa">
      <Composition>
        <Panel className="hero">
          <Kicker>VILLA / PLAN TABLE</Kicker>
          <WorldTitle>Make space for the whole athlete.</WorldTitle>
          <BodyCopy>
            Limestone, olive, and sea light support training, nutrition, and
            recovery context.
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
