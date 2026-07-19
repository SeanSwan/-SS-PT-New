/**
 * Video V-next — feature flag. Mirrors the shipped Home/Store/About/Dashboards pattern. Resolution:
 * runtime `/api/config/public-flags.videoVNext` (wins → instant revert) → build-time `VITE_VIDEO_VNEXT` →
 * **false** (renders VideoLibraryV3). Explicit runtime `false` = ABSOLUTE kill switch over QA `ff_videoVNext`.
 */
import { useEffect, useState } from 'react';

const envBool = (value: unknown): boolean => value === 'true' || value === true;
const ENV_FALLBACK = envBool((import.meta as { env?: Record<string, unknown> }).env?.VITE_VIDEO_VNEXT);

function qaOverride(): boolean | null {
  try {
    const v = window.localStorage.getItem('ff_videoVNext');
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  } catch {
    /* SSR / privacy mode → ignore */
  }
  return null;
}

export function useVideoVNextFlag(): { videoVNext: boolean; resolved: boolean } {
  const [videoVNext, setVideoVNext] = useState<boolean>(ENV_FALLBACK);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/config/public-flags', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { videoVNext?: unknown } | null) => {
        if (!alive) return;
        const runtime = json && typeof json.videoVNext === 'boolean' ? Boolean(json.videoVNext) : null;
        const override = qaOverride();
        let effective: boolean;
        if (runtime === false) effective = false;
        else if (override !== null) effective = override;
        else effective = runtime ?? ENV_FALLBACK;
        setVideoVNext(effective);
        setResolved(true);
      })
      .catch(() => {
        if (alive) {
          setVideoVNext(qaOverride() ?? ENV_FALLBACK);
          setResolved(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { videoVNext, resolved };
}
