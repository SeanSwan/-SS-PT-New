/**
 * Deep-Ocean Trench Observatory — independent Workout Design Lab composition.
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
  --world-bg: var(--sonar-bg, #020b16);
  --world-panel: var(--sonar-panel, #071b2c);
  --world-accent: var(--sonar-accent, #54f0d1);
  --world-text: var(--sonar-text, #e9ffff);
  --world-muted: var(--sonar-muted, #91bac3);
  --world-action: var(--sonar-action, #064e6a);
  --world-shadow: var(--obsidian-black, #0a0a0f);
  --world-radius: 18px;
  --world-title-font: 800 clamp(36px, 5.5vw, 82px)/0.96 "Fira Code", monospace;
  --world-letter-spacing: -0.045em;
  --world-dial-radius: 18px;
  --world-row-radius: 22px 6px;
  --world-row-columns: minmax(180px, 2fr) repeat(4, minmax(58px, 0.4fr));
  --world-panel-radius: 20px 4px;
  min-height: 760px;
  padding: clamp(24px, 4vw, 72px);
  color: var(--world-text);
  background:
    repeating-radial-gradient(
      circle at 12% 24%,
      transparent 0 34px,
      color-mix(in srgb, var(--world-accent) 11%, transparent) 35px 36px
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
  grid-template-areas: "dial hero" "context work" "actions work";
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

export const DeepOceanTrenchObservatory: React.FC<ConceptProps> = (props) => {
  const { model, conceptName } = props;
  return (
    <Scene aria-label={conceptName} data-composition="sonar">
      <Composition>
        <Panel className="hero">
          <Kicker>TRENCH / DIAGNOSTICS</Kicker>
          <WorldTitle>See what pressure reveals.</WorldTitle>
          <BodyCopy>
            Sonar layers prioritize biometrics, fatigue, readiness, and data
            quality.
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
