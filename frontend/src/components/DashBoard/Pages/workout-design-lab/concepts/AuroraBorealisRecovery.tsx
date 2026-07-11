/**
 * Aurora Borealis Recovery — independent Workout Design Lab composition.
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
  --world-bg: var(--recovery-bg, #06131d);
  --world-panel: var(--recovery-panel, #0d2530);
  --world-accent: var(--recovery-accent, #63e6be);
  --world-text: var(--recovery-text, #effffa);
  --world-muted: var(--recovery-muted, #a9c9d2);
  --world-action: var(--recovery-action, #065f46);
  --world-shadow: var(--obsidian-black, #0a0a0f);
  --world-radius: 34px;
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
    linear-gradient(
      105deg,
      transparent 18%,
      color-mix(in srgb, var(--world-accent) 20%, transparent) 35%,
      transparent 54%
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
  grid-template-columns: minmax(0, 1.25fr) minmax(220px, 0.75fr);
  grid-template-areas: "hero dial" "context dial" "work work" "actions actions";
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

export const AuroraBorealisRecovery: React.FC<ConceptProps> = (props) => {
  const { model, conceptName } = props;
  return (
    <Scene aria-label={conceptName} data-composition="recovery">
      <Composition>
        <Panel className="hero">
          <Kicker>AURORA / RECOVERY</Kicker>
          <WorldTitle>Restore range. Rebuild confidence.</WorldTitle>
          <BodyCopy>
            Soft aurora bands prioritize readiness, flexibility, and corrective
            work.
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
