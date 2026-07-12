/**
 * Desert Observatory — independent Workout Design Lab composition.
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
  --world-bg: var(--stargrid-bg, #17120e);
  --world-panel: var(--stargrid-panel, #2d2118);
  --world-accent: var(--stargrid-accent, #e9bd74);
  --world-text: var(--stargrid-text, #fff8ec);
  --world-muted: var(--stargrid-muted, #d2bea2);
  --world-action: var(--stargrid-action, #6b4f24);
  --world-shadow: var(--obsidian-black, #0a0a0f);
  --world-radius: 8px;
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
    repeating-linear-gradient(
      90deg,
      transparent 0 60px,
      color-mix(in srgb, var(--world-accent) 8%, transparent) 61px 62px
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
  grid-template-areas: "hero context" "dial context" "work work" "actions actions";
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

export const DesertObservatory: React.FC<ConceptProps> = (props) => {
  const { model, conceptName } = props;
  return (
    <Scene aria-label={conceptName} data-composition="stargrid">
      <Composition>
        <Panel className="hero">
          <Kicker>DESERT / STAR GRID</Kicker>
          <WorldTitle>Quiet inputs. Exact outputs.</WorldTitle>
          <BodyCopy>
            Sandstone warmth meets a midnight measurement grid for focused
            logging.
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
