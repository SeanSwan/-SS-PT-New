/**
 * Tropical Storm Performance Deck — independent Workout Design Lab composition.
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
  --world-bg: var(--storm-bg, #07111c);
  --world-panel: var(--storm-panel, #12293d);
  --world-accent: var(--storm-accent, #65bfff);
  --world-text: var(--storm-text, #eef8ff);
  --world-muted: var(--storm-muted, #a9bfd0);
  --world-action: var(--storm-action, #064e7a);
  --world-shadow: var(--obsidian-black, #0a0a0f);
  --world-radius: 14px;
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
    linear-gradient(
      132deg,
      transparent 40%,
      color-mix(in srgb, var(--world-accent) 26%, transparent) 41%,
      transparent 43%
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
  grid-template-columns: minmax(0, 1.1fr) minmax(240px, 0.65fr) minmax(
      220px,
      0.5fr
    );
  grid-template-areas: "hero hero dial" "work context dial" "work actions actions";
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

export const TropicalStormPerformanceDeck: React.FC<ConceptProps> = (props) => {
  const { model, conceptName } = props;
  return (
    <Scene aria-label={conceptName} data-composition="storm">
      <Composition>
        <Panel className="hero">
          <Kicker>STORM / ADAPTIVE DECK</Kicker>
          <WorldTitle>Read the weather. Adjust the work.</WorldTitle>
          <BodyCopy>
            Controlled lightning accents highlight real-time coaching changes.
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
