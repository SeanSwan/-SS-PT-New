import { useGamificationRealtime } from '../../hooks/gamification/useGamificationRealtime';

/**
 * The single authenticated realtime reward subscription. It deliberately
 * renders no UI; CelebrationProvider owns the portal and the dashboard shells
 * remain consumers of the same mounted subscription.
 */
const GamificationRealtimeBridge = () => {
  useGamificationRealtime();
  return null;
};

export default GamificationRealtimeBridge;
