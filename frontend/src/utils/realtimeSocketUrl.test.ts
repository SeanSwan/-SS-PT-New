import { describe, expect, it } from 'vitest';
import { resolveRealtimeSocketUrl } from './realtimeSocketUrl';

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
});
