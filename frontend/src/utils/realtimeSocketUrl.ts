const LOCAL_SOCKET_ORIGIN = 'http://localhost:10000';
const RENDER_SOCKET_ORIGIN = 'https://ss-pt-new.onrender.com';
const CUSTOM_DOMAIN_SOCKET_HOSTS = new Set([
  'sswanstudios.com',
  'www.sswanstudios.com',
]);
const RENDER_SOCKET_HOSTS = new Set(['ss-pt-new.onrender.com']);

type RealtimeSocketTransport = 'polling' | 'websocket';

export interface RealtimeSocketTransportOptions {
  transports: RealtimeSocketTransport[];
  upgrade: boolean;
}

interface ResolveRealtimeSocketUrlOptions {
  socketUrl?: string;
  backendUrl?: string;
  apiBaseUrl?: string;
  isDev?: boolean | string;
  windowOrigin?: string;
}

const normalizeOrigin = (value?: string) => {
  if (!value) return '';
  return value.trim().replace(/\/api\/?$/, '').replace(/\/$/, '');
};

const pointsToStaticCustomDomain = (value?: string) => {
  const normalized = normalizeOrigin(value);
  if (!normalized) return false;

  try {
    return CUSTOM_DOMAIN_SOCKET_HOSTS.has(new URL(normalized).hostname);
  } catch {
    return false;
  }
};

const pointsToRenderSocketOrigin = (value?: string) => {
  const normalized = normalizeOrigin(value);
  if (!normalized) return false;

  try {
    return RENDER_SOCKET_HOSTS.has(new URL(normalized).hostname);
  } catch {
    return false;
  }
};

export const resolveRealtimeSocketUrl = (options: ResolveRealtimeSocketUrlOptions = {}) => {
  const socketUrl = normalizeOrigin(options.socketUrl ?? import.meta.env.VITE_SOCKET_URL);
  if (socketUrl) return socketUrl;

  const backendUrl = normalizeOrigin(options.backendUrl ?? import.meta.env.VITE_BACKEND_URL);
  if (backendUrl && !pointsToStaticCustomDomain(backendUrl)) return backendUrl;

  const apiBaseUrl = normalizeOrigin(options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  if (apiBaseUrl && !pointsToStaticCustomDomain(apiBaseUrl)) return apiBaseUrl;

  const isDev = options.isDev ?? import.meta.env.DEV;
  if (isDev) return LOCAL_SOCKET_ORIGIN;

  const windowOrigin = normalizeOrigin(
    options.windowOrigin ?? (typeof window !== 'undefined' ? window.location.origin : ''),
  );

  if (
    pointsToStaticCustomDomain(windowOrigin)
    || pointsToStaticCustomDomain(backendUrl)
    || pointsToStaticCustomDomain(apiBaseUrl)
  ) {
    return RENDER_SOCKET_ORIGIN;
  }

  return windowOrigin || LOCAL_SOCKET_ORIGIN;
};

export const resolveRealtimeSocketTransportOptions = (
  socketOrigin?: string,
): RealtimeSocketTransportOptions => {
  if (pointsToRenderSocketOrigin(socketOrigin)) {
    return {
      transports: ['websocket'],
      upgrade: false,
    };
  }

  return {
    transports: ['polling', 'websocket'],
    upgrade: true,
  };
};
