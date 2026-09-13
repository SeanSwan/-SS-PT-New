import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../../hooks/use-toast';
import { useGamificationRealtime } from '../../hooks/gamification/useGamificationRealtime';
import { AuthContext } from '../../context/authContextState';
import type { AuthContextType } from '../../context/AuthContextProvider';
const state = vi.hoisted(() => ({ sockets: [] as Array<{ receive: (name: string, data: unknown) => void }>, query: { invalidateQueries: vi.fn() } }));
vi.mock('../../context/AuthContext', () => import('../../context/authContextState'));
vi.mock('../../context/CelebrationContext', () => ({ useCelebrationOptional: () => null }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => state.query }));
vi.mock('../../services/api.service', () => ({ ProductionTokenManager: { getToken: () => 'synthetic-token', subscribe: () => () => {} } }));
vi.mock('../../utils/realtimeSocketUrl', () => ({ resolveRealtimeSocketUrl: () => 'http://realtime.test', resolveRealtimeSocketTransportOptions: () => ({}) }));
vi.mock('socket.io-client', () => ({ io: () => {
  const handlers = new Map<string, (data: unknown) => void>();
  const socket = { on: (name: string, fn: (data: unknown) => void) => handlers.set(name, fn), off: (name: string) => handlers.delete(name), emit: vi.fn(), disconnect: vi.fn(), receive: (name: string, data: unknown) => handlers.get(name)?.(data) };
  state.sockets.push(socket); return socket;
} }));
const Bridge = () => { useGamificationRealtime(); const { toast } = useToast(); return <button onClick={() => toast({ description: 'General status', duration: 0 })}>General notice</button>; };
const Surface = ({ owner }: { owner: number | null }) => <AuthContext.Provider value={{ user: owner ? { id: String(owner) } : null } as AuthContextType}><ToastProvider><Bridge /></ToastProvider></AuthContext.Provider>;
beforeEach(() => { state.sockets.length = 0; });
it.each([42, null])('immediately removes visible owner-A rewards for next owner %s, including exit animation', async nextOwner => {
  const view = render(<Surface owner={41} />);
  fireEvent.click(screen.getByRole('button', { name: 'General notice' }));
  act(() => state.sockets[0].receive('gamification:achievement_unlocked', { userId: 41, transactionId: 901, points: 10, achievementName: 'Fixture accomplishment' }));
  await screen.findByText('Fixture accomplishment unlocked with 10 XP.');
  view.rerender(<Surface owner={nextOwner} />);
  expect(screen.queryByText('Fixture accomplishment unlocked with 10 XP.')).not.toBeInTheDocument();
  expect(screen.getByText('General status')).toBeInTheDocument();
  if (nextOwner) {
    act(() => state.sockets.at(-1)!.receive('gamification:streak_milestone', { userId: nextOwner, transactionId: 902, points: 5, streakDays: 7 }));
    await screen.findByText('7-day streak reached with 5 XP.');
  }
});
