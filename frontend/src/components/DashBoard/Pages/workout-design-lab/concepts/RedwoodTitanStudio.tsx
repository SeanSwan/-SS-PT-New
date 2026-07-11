/**
 * Redwood Titan Studio — independent Workout Design Lab composition.
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
  --world-bg: var(--rings-bg, #0b1712);
  --world-panel: var(--rings-panel, #1d2b21);
  --world-accent: var(--rings-accent, #9bc57c);
  --world-text: var(--rings-text, #f4f8ed);
  --world-muted: var(--rings-muted, #b6c6b5);
  --world-action: var(--rings-action, #355e3b);
  --world-shadow: var(--obsidian-black, #0a0a0f);
  --world-radius: 22px;
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
      circle at 12% 50%,
      transparent 0 28px,
      color-mix(in srgb, var(--world-accent) 12%, transparent) 29px 31px
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
  grid-template-columns: minmax(220px, 0.55fr) minmax(0, 1.45fr);
  grid-template-areas: "dial hero" "dial context" "work work" "actions actions";
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

export const RedwoodTitanStudio: React.FC<ConceptProps> = (props) => {
  const { model, conceptName } = props;
  return (
    <Scene aria-label={conceptName} data-composition="rings">
      <Composition>
        <Panel className="hero">
          <Kicker>TITAN / LONGEVITY</Kicker>
          <WorldTitle>Count the rings, not the noise.</WorldTitle>
          <BodyCopy>
            Tree-ring growth makes consistency and long-term strength tangible.
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
