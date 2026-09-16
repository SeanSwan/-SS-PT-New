import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock, socketMock } = vi.hoisted(() => ({
  apiMock: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
  socketMock: { on: vi.fn(), off: vi.fn() },
}));
vi.mock('../../services/api', () => ({ default: apiMock }));
vi.mock('../../context/SocketContext', () => ({ useSocket: () => ({ socket: socketMock }) }));

import reducer, { addNotification, setNotificationOwner } from '../../store/slices/notificationSlice';
import authReducer, { setUser } from '../../store/slices/authSlice';
import EnhancedNotificationSection from './EnhancedNotificationSection';

const account = { id: 'account-a', firstName: 'A', lastName: 'User', email: 'a@example.com', role: 'client' as const };
const notification = { id: 'delete-me', title: 'Keep until confirmed', message: 'Retryable', type: 'system' as const, read: false, createdAt: '2026-06-29T00:00:00.000Z', userId: 'account-a' };

const makeStore = () => {
  let notifications = reducer(undefined, setNotificationOwner('account-a'));
  notifications = reducer(notifications, addNotification(notification));
  const store = configureStore({ reducer: { notifications: reducer, auth: authReducer }, preloadedState: { notifications, auth: authReducer(undefined, setUser(account)) } });
  return store;
};

describe('EnhancedNotificationSection mutation truth', () => {
  beforeEach(() => {
    apiMock.get.mockResolvedValue({ data: { notifications: [notification], unreadCount: 1 } });
    apiMock.put.mockResolvedValue({ data: {} });
    apiMock.delete.mockReset();
    socketMock.on.mockClear();
    socketMock.off.mockClear();
  });

  it('retains a row and exposes retry when deletion is rejected', async () => {
    apiMock.delete.mockRejectedValueOnce(new Error('offline'));
    const store = makeStore();
    render(<Provider store={store}><MemoryRouter><EnhancedNotificationSection /></MemoryRouter></Provider>);

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect((await screen.findAllByText('Keep until confirmed')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete notification' })[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent('offline');
    expect(screen.getAllByText('Keep until confirmed').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Retry delete' }).length).toBeGreaterThan(0);
  });

  it('removes a row only after the server confirms deletion', async () => {
    apiMock.delete.mockResolvedValueOnce({ data: { success: true } });
    const store = makeStore();
    render(<Provider store={store}><MemoryRouter><EnhancedNotificationSection /></MemoryRouter></Provider>);

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect((await screen.findAllByText('Keep until confirmed')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete notification' })[0]);

    await waitFor(() => expect(screen.queryByText('Keep until confirmed')).not.toBeInTheDocument());
    expect(apiMock.delete).toHaveBeenCalledWith('/api/notifications/delete-me');
  });

  it('routes realtime rows through the current recipient guard', () => {
    const store = makeStore();
    render(<Provider store={store}><MemoryRouter><EnhancedNotificationSection /></MemoryRouter></Provider>);
    const newHandler = socketMock.on.mock.calls.find(([event]) => event === 'notification:new')?.[1];
    const countHandler = socketMock.on.mock.calls.find(([event]) => event === 'notification:count')?.[1];
    expect(newHandler).toBeTypeOf('function');
    expect(countHandler).toBeTypeOf('function');

    act(() => {
      newHandler({ ...notification, id: 'socket-owned', userId: 'account-a' });
      newHandler({ ...notification, id: 'socket-foreign', userId: 'account-b' });
      countHandler({ unreadCount: 7 });
      countHandler({ unreadCount: 2, userId: 'account-a' });
    });

    expect(store.getState().notifications.notifications.map((item) => item.id)).toContain('socket-owned');
    expect(store.getState().notifications.notifications.map((item) => item.id)).not.toContain('socket-foreign');
    expect(store.getState().notifications.unreadCount).toBe(2);
  });
});
