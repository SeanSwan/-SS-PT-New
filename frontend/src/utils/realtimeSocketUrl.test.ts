import { describe, expect, it } from 'vitest';
import {
  resolveRealtimeSocketTransportOptions,
  resolveRealtimeSocketUrl,
} from './realtimeSocketUrl';

describe('resolveRealtimeSocketUrl', () => {
  it('uses the explicit socket origin first', () => {
    expect(resolveRealtimeSocketUrl({
      socketUrl: 'https://sockets.example.com/',
      backendUrl: 'https://sswanstudios.com',
      apiBaseUrl: 'https://sswanstudios.com/api',
      isDev: false,
      windowOrigin: 'https://sswanstudios.com',
    })).toBe('https://sockets.example.com');
  });

  it('falls back to the backend Render origin when the custom domain cannot serve Socket.IO', () => {
    expect(resolveRealtimeSocketUrl({
      socketUrl: '',
      backendUrl: 'https://sswanstudios.com',
      apiBaseUrl: 'https://sswanstudios.com/api',
      isDev: false,
      windowOrigin: 'https://sswanstudios.com',
    })).toBe('https://ss-pt-new.onrender.com');
  });

  it('keeps localhost as the development fallback', () => {
    expect(resolveRealtimeSocketUrl({
      socketUrl: '',
      backendUrl: '',
      apiBaseUrl: '',
      isDev: true,
      windowOrigin: 'http://localhost:5173',
    })).toBe('http://localhost:10000');
  });

  it('keeps Render fallback sockets on WebSocket to avoid polling transport churn', () => {
    expect(resolveRealtimeSocketTransportOptions('https://ss-pt-new.onrender.com')).toEqual({
      transports: ['websocket'],
      upgrade: false,
    });
  });

  it('allows websocket upgrades for local and explicit non-Render socket origins', () => {
    expect(resolveRealtimeSocketTransportOptions('http://localhost:10000')).toEqual({
      transports: ['polling', 'websocket'],
      upgrade: true,
    });
    expect(resolveRealtimeSocketTransportOptions('https://sockets.example.com')).toEqual({
      transports: ['polling', 'websocket'],
      upgrade: true,
    });
  });
});
