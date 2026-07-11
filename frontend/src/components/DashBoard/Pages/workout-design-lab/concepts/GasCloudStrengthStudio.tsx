/**
 * Gas Cloud Strength Studio — independent Workout Design Lab composition.
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
  --world-bg: var(--cloud-bg, #0c0716);
  --world-panel: var(--cloud-panel, #221537);
  --world-accent: var(--cloud-accent, #5eead4);
  --world-text: var(--cloud-text, #fff1ff);
  --world-muted: var(--cloud-muted, #c9b7d8);
  --world-action: var(--cloud-action, #6d28d9);
  --world-shadow: var(--obsidian-black, #0a0a0f);
  --world-radius: 32px;
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
    radial-gradient(
      ellipse at 20% 70%,
      color-mix(in srgb, var(--world-accent) 25%, transparent),
      transparent 36%
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
  grid-template-columns: minmax(0, 1fr) minmax(260px, 1fr);
  grid-template-areas: "hero context" "work work" "dial actions";
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

export const GasCloudStrengthStudio: React.FC<ConceptProps> = (props) => {
  const { model, conceptName } = props;
  return (
    <Scene aria-label={conceptName} data-composition="cloud">
      <Composition>
        <Panel className="hero">
          <Kicker>PRESSURE / STRENGTH</Kicker>
          <WorldTitle>Shape load like atmosphere.</WorldTitle>
          <BodyCopy>
            Layered gas fields express pressure changes without generic SaaS
            purple.
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
