/**
 * AudienceView
 * PURPOSE: The TV surface. Renders an AudienceVM (audienceDirector.ts) — pure
 *          props in, pixels out. The shell owns all timers and channels.
 * PARENTS: the audience window opened by the Trainer Console (slice 7).
 * STATE: none. A stateless render of the single-writer state is what makes the
 *        BroadcastChannel model safe — there is nothing here to desync.
 * SWA-105 Slice 6b | AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 */
import React from 'react';
import type { AudienceVM, StationCardVM } from './audienceDirector';
import { pageSlice } from './AudienceView.logic';
import {
  AudienceRoot, ClockBand, PhaseLabel, Timer, MetaCorner, StageArea,
  HeroWrap, HeroName, HeroCue, StationGrid, StationCard, StationTag,
  ExerciseName, ModificationLine, EquipmentLine, NextUpLine,
  PageFade, PaperNotice, CompleteWrap, CompleteHeadline, CompleteStat,
} from './Audience.styles';

const fmtClock = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : String(s);
};

const Card: React.FC<{ card: StationCardVM }> = ({ card }) => (
  <StationCard data-testid={`station-card-${card.stationIndex}`}>
    <StationTag>{card.label}</StationTag>
    <ExerciseName $emphasis={card.emphasis}>{card.exerciseName}</ExerciseName>
    {card.equipmentLine ? <EquipmentLine>{card.equipmentLine}</EquipmentLine> : null}
    {card.nextUpName ? <NextUpLine>{card.nextUpName}</NextUpLine> : null}
    {card.modificationLine ? (
      <ModificationLine data-testid="mod-line">Easier: {card.modificationLine}</ModificationLine>
    ) : null}
  </StationCard>
);

export interface AudienceViewProps {
  vm: AudienceVM;
  /** Alternating-room page index; the shell advances it on a fixed cadence. */
  page?: number;
}

const AudienceView: React.FC<AudienceViewProps> = ({ vm, page = 0 }) => {
  const { clock, presentation } = vm;
  const isMove = vm.screen === 'S3';

  return (
    <AudienceRoot data-testid={`audience-${vm.screen}`}>
      <ClockBand>
        <PhaseLabel $alert={isMove}>{clock.phaseLabel}</PhaseLabel>
        {vm.screen !== 'S7' && vm.screen !== 'S0' ? (
          <Timer data-testid="timer">{fmtClock(clock.remainingSec)}</Timer>
        ) : null}
        <MetaCorner>
          <span data-testid="ends-label">{clock.endsAtLabel}</span>
          {vm.round ? <span data-testid="round-chip">{`Round ${vm.round.current} of ${vm.round.total}`}</span> : null}
        </MetaCorner>
      </ClockBand>

      <StageArea>
        {vm.screen === 'S7' ? (
          <CompleteWrap data-testid="complete">
            <CompleteHeadline>Class complete</CompleteHeadline>
            <CompleteStat>Great work — see you next time.</CompleteStat>
          </CompleteWrap>
        ) : vm.hero ? (
          <HeroWrap>
            <HeroName data-testid="hero-name">{vm.hero.exerciseName}</HeroName>
            {vm.hero.cue ? <HeroCue>{vm.hero.cue}</HeroCue> : null}
          </HeroWrap>
        ) : vm.screen === 'S0' ? (
          <PaperNotice data-testid="lobby">
            Find your starting station — class starts soon.
          </PaperNotice>
        ) : presentation.mode === 'rotation_only' ? (
          // Physics said no grid: too many stations for this screen. Paper is
          // the first-class output here, never shrunken type.
          <PaperNotice data-testid="rotation-only">
            Follow the printed card at your station.
            <br />
            Rotate on the horn.
          </PaperNotice>
        ) : (
          <StationGrid $count={pageSlice(vm.stations, presentation.perPage, page).length}>
            <PageFade key={presentation.mode === 'alternating' ? page % presentation.pages : 0}>
              {pageSlice(vm.stations, presentation.perPage, page).map((card) => (
                <Card key={card.stationIndex} card={card} />
              ))}
            </PageFade>
          </StationGrid>
        )}
      </StageArea>
    </AudienceRoot>
  );
};

export default AudienceView;
