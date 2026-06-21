const READY_PLAYER_ME_ROOT = 'readyplayer.me';

export function normalizeReadyPlayerMeUrl(value) {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const isReadyPlayerMeHost = host === READY_PLAYER_ME_ROOT || host.endsWith(`.${READY_PLAYER_ME_ROOT}`);
    const isGlbModel = url.pathname.toLowerCase().endsWith('.glb');

    if (url.protocol !== 'https:' || !isReadyPlayerMeHost || !isGlbModel) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
