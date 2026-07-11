/**
 * South Pole Expedition — independent Workout Design Lab composition.
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
  --world-bg: var(--expedition-bg, #10263a);
  --world-panel: var(--expedition-panel, #183951);
  --world-accent: var(--expedition-accent, #ff6b5f);
  --world-text: var(--expedition-text, #f7fbff);
  --world-muted: var(--expedition-muted, #bdd0dd);
  --world-action: var(--expedition-action, #7c2d2d);
  --world-shadow: var(--obsidian-black, #0a0a0f);
  --world-radius: 12px;
  --world-title-font: 800 clamp(38px, 6vw, 88px)/0.92 "Sora", sans-serif;
  --world-letter-spacing: -0.06em;
  --world-dial-radius: 50%;
  --world-row-radius: 18px;
  --world-row-columns: minmax(160px, 1.6fr) repeat(4, minmax(62px, 0.45fr));
  --world-panel-radius: 26px;
  min-height: 760px;
  padding: clamp(24px, 4vw, 72px);
  color: var(--world-text);
  background:
    repeating-linear-gradient(
      135deg,
      transparent 0 24px,
      color-mix(in srgb, var(--world-accent) 10%, transparent) 25px 26px
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
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas: "hero hero" "dial context" "work work" "actions actions";
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

export const SouthPoleExpedition: React.FC<ConceptProps> = (props) => {
  const { model, conceptName } = props;
  return (
    <Scene aria-label={conceptName} data-composition="expedition">
      <Composition>
        <Panel className="hero">
          <Kicker>POLAR / EXPEDITION 042</Kicker>
          <WorldTitle>Advance only when the signals stay clear.</WorldTitle>
          <BodyCopy>
            An expedition route prioritizes endurance, recovery, and safety.
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
