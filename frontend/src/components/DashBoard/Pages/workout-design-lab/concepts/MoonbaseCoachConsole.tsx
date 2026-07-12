/**
 * Moonbase Coach Console — independent Workout Design Lab composition.
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
  --world-bg: var(--modules-bg, #111319);
  --world-panel: var(--modules-panel, #24272e);
  --world-accent: var(--modules-accent, #ff9b55);
  --world-text: var(--modules-text, #f4f5f7);
  --world-muted: var(--modules-muted, #b9bdc6);
  --world-action: var(--modules-action, #4b5563);
  --world-shadow: var(--obsidian-black, #0a0a0f);
  --world-radius: 6px;
  --world-title-font: 700 clamp(40px, 5.8vw, 86px)/1 "Sora", sans-serif;
  --world-letter-spacing: -0.015em;
  --world-dial-radius: 18% 50% 18% 50%;
  --world-row-radius: 0 18px 18px 0;
  --world-row-columns: minmax(140px, 1.2fr) repeat(4, minmax(68px, 0.5fr));
  --world-panel-radius: 14px 28px;
  min-height: 760px;
  padding: clamp(24px, 4vw, 72px);
  color: var(--world-text);
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0 79px,
      color-mix(in srgb, var(--world-accent) 9%, transparent) 80px 81px
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
  grid-template-columns: minmax(260px, 0.7fr) minmax(0, 1.3fr);
  grid-template-areas: "context hero" "context work" "dial actions";
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

export const MoonbaseCoachConsole: React.FC<ConceptProps> = (props) => {
  const { model, conceptName } = props;
  return (
    <Scene aria-label={conceptName} data-composition="modules">
      <Composition>
        <Panel className="hero">
          <Kicker>LUNAR / COACH CONSOLE</Kicker>
          <WorldTitle>Build the mission, module by module.</WorldTitle>
          <BodyCopy>
            Technical cards keep plan construction and exercise selection crisp.
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
