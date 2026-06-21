const READY_PLAYER_ME_ROOT = 'readyplayer.me';

export const normalizeReadyPlayerMeUrl = (value: unknown): string | null => {
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
};

export const toReadyPlayerMeViewerUrl = (value: unknown): string | null => {
  const safeUrl = normalizeReadyPlayerMeUrl(value);
  if (!safeUrl) return null;

  const modelName = new URL(safeUrl).pathname.split('/').filter(Boolean).pop();
  if (!modelName) return null;

  return `https://models.readyplayer.me/${encodeURIComponent(modelName)}?morphTargets=ARKit&textureAtlas=1024`;
};
