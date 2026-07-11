/**
 * Volcanic Core Training — independent Workout Design Lab composition.
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
  --world-bg: var(--forge-bg, #120b0a);
  --world-panel: var(--forge-panel, #2b1510);
  --world-accent: var(--forge-accent, #ff7a45);
  --world-text: var(--forge-text, #fff2e8);
  --world-muted: var(--forge-muted, #d8b7a8);
  --world-action: var(--forge-action, #7c2d12);
  --world-shadow: var(--obsidian-black, #0a0a0f);
  --world-radius: 10px;
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
    radial-gradient(
      circle at 12% 88%,
      color-mix(in srgb, var(--world-accent) 28%, transparent),
      transparent 31%
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
  grid-template-columns: minmax(260px, 0.65fr) minmax(0, 1.35fr);
  grid-template-areas: "dial hero" "dial actions" "context work";
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

export const VolcanicCoreTraining: React.FC<ConceptProps> = (props) => {
  const { model, conceptName } = props;
  return (
    <Scene aria-label={conceptName} data-composition="forge">
      <Composition>
        <Panel className="hero">
          <Kicker>CORE / CONTROLLED HEAT</Kicker>
          <WorldTitle>Pressure, directed with control.</WorldTitle>
          <BodyCopy>
            Obsidian and ember cues make load visible without aggressive
            language.
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
