/**
 * CC-4 PainChartCoachDockMount contracts: region tool validates against the REAL body-region
 * catalog (id OR label match; unknown → ack(false), zero selection); dock demands a client
 * context; receipts announce selections.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../services/api.service', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../hooks/useAIChat', () => ({ useAIChat: () => ({ sendMessageWithConversation: vi.fn() }) }));
vi.mock('../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({ executeCommand: vi.fn() }),
  commandErrorReceiptText: (e: string) => e,
}));
vi.mock('../DashBoard/Pages/coach-assistant/hooks/useCoachBrowserSpeechInput', () => ({
  useCoachBrowserSpeechInput: () => ({ speechSupported: false, listening: false, interim: '', toggleListening: vi.fn() }),
}));
vi.mock('../DashBoard/Pages/coach-assistant/VoiceRecordingOverlay', () => ({ default: () => null }));

import PainChartCoachDockMount from './PainChartCoachDockMount';
import { dispatchAIWorkoutEvent, AI_PAINCHART_SELECT_REGION } from '../../utils/aiWorkoutEvents';

describe('PainChartCoachDockMount', () => {
  it('selects a real region by label (case-insensitive) and acknowledges', () => {
    const onSelectRegion = vi.fn();
    render(<PainChartCoachDockMount contextChip="client: #84" selectedClientId={84} onSelectRegion={onSelectRegion} />);
    const handled = dispatchAIWorkoutEvent(AI_PAINCHART_SELECT_REGION, { region: 'left shoulder' });
    expect(handled).toBe(true);
    expect(onSelectRegion).toHaveBeenCalledWith('left_shoulder');
  });

  it('selects by exact region id too', () => {
    const onSelectRegion = vi.fn();
    render(<PainChartCoachDockMount contextChip="client: #84" selectedClientId={84} onSelectRegion={onSelectRegion} />);
    expect(dispatchAIWorkoutEvent(AI_PAINCHART_SELECT_REGION, { region: 'neck_front' })).toBe(true);
    expect(onSelectRegion).toHaveBeenCalledWith('neck_front');
  });

  it('rejects unknown regions — ack(false), zero selection (never guesses anatomy)', () => {
    const onSelectRegion = vi.fn();
    render(<PainChartCoachDockMount contextChip="client: #84" selectedClientId={84} onSelectRegion={onSelectRegion} />);
    expect(dispatchAIWorkoutEvent(AI_PAINCHART_SELECT_REGION, { region: 'third elbow' })).toBe(false);
    expect(onSelectRegion).not.toHaveBeenCalled();
  });

  it('renders the client-required bar when no client is targeted', () => {
    render(<PainChartCoachDockMount contextChip={null} selectedClientId={null} onSelectRegion={vi.fn()} />);
    expect(screen.getByText(/select a client to talk to swan coach/i)).toBeInTheDocument();
  });
});
