/**
 * ConsoleView
 * PURPOSE: The trainer's private Runner surface — transport, per-station swap,
 *          degradation banners. The TV never shows controls; this does.
 * PARENTS: the Runner shell (console window); the audience window renders
 *          AudienceView from the same single-writer state.
 * STATE: none — pure render of props. The shell owns state, channels, timers.
 * SWA-105 Slice 7 | AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 */
import React from 'react';
import type { RunnerCommandType } from './runnerProtocol';
import type { SwapDeckResult } from './swapDeck';
import {
  ConsoleRoot, NowBar, NowLabel, NowClock, Transport,
  PrimaryButton, CoachButton, QuietButton,
  StationList, StationRow, DeckPanel, DeckRowButton, Chip, OutsNotice, DegradedBanner,
} from './Console.styles';

export interface ConsoleStationVM {
  stationIndex: number;
  label: string;
  exerciseName: string;
  slotId: string;
  equipmentTight?: boolean;
}

export interface ConsoleViewProps {
  phaseLabel: string;
  remainingLabel: string;
  paused: boolean;
  stations: ConsoleStationVM[];
  /** Non-null while a swap is being chosen for a slot. */
  deck: (SwapDeckResult & { forSlotId: string }) | null;
  degraded: string[];
  onCommand: (type: RunnerCommandType) => void;
  onOpenDeck: (slotId: string) => void;
  onPickSwap: (slotId: string, exerciseRef: string, rung: string) => void;
  onCloseDeck: () => void;
}

const ConsoleView: React.FC<ConsoleViewProps> = ({
  phaseLabel, remainingLabel, paused, stations, deck, degraded,
  onCommand, onOpenDeck, onPickSwap, onCloseDeck,
}) => (
  <ConsoleRoot data-testid="trainer-console">
    {degraded.map((message) => (
      <DegradedBanner key={message} role="alert">{message}</DegradedBanner>
    ))}

    <NowBar>
      <NowLabel>{phaseLabel}</NowLabel>
      <NowClock data-testid="console-clock">{remainingLabel}</NowClock>
    </NowBar>

    <Transport>
      <PrimaryButton data-testid="btn-pause" onClick={() => onCommand(paused ? 'RESUME' : 'PAUSE')}>
        {paused ? 'Resume' : 'Pause'}
      </PrimaryButton>
      <QuietButton data-testid="btn-prev" onClick={() => onCommand('PREV')}>Back</QuietButton>
      <QuietButton data-testid="btn-skip" onClick={() => onCommand('SKIP')}>Skip</QuietButton>
      <QuietButton data-testid="btn-extend" onClick={() => onCommand('EXTEND_60')}>+60s</QuietButton>
      <QuietButton data-testid="btn-end" onClick={() => onCommand('END_CLASS')}>End class</QuietButton>
    </Transport>

    <StationList>
      {stations.map((station) => (
        <StationRow key={station.stationIndex} $tight={station.equipmentTight}>
          <div>
            <strong>{station.label}</strong>
            {' — '}
            {station.exerciseName}
          </div>
          <CoachButton
            data-testid={`btn-swap-${station.stationIndex}`}
            onClick={() => onOpenDeck(station.slotId)}
          >
            Swap
          </CoachButton>
        </StationRow>
      ))}
    </StationList>

    {deck ? (
      <DeckPanel data-testid="swap-deck">
        {deck.exhausted ? (
          <OutsNotice data-testid="structural-outs">
            No legal swap exists for this room and this day.
            {' '}
            {deck.structuralOuts.map((out: { label: string }) => out.label).join(' · ')}
          </OutsNotice>
        ) : (
          deck.rows.map((row) => (
            <DeckRowButton
              key={row.candidate.exerciseRef}
              data-testid={`deck-row-${row.candidate.exerciseRef}`}
              $relaxed={row.rung !== 'R0'}
              onClick={() => onPickSwap(deck.forSlotId, row.candidate.exerciseRef, row.rung)}
            >
              <span>{row.candidate.displayName}</span>
              <span>
                {row.chips.map(({ chip, tone }) => (
                  <Chip key={chip} $tone={tone as 'structural' | 'earned' | 'relaxed'}>
                    {chip.replace(/_/g, ' ')}
                  </Chip>
                ))}
              </span>
            </DeckRowButton>
          ))
        )}
        <QuietButton data-testid="btn-close-deck" onClick={onCloseDeck}>Cancel</QuietButton>
      </DeckPanel>
    ) : null}
  </ConsoleRoot>
);

export default ConsoleView;
