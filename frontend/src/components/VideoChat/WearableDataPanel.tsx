/** Legacy video-session wearable containment. Certified ingestion is not connected. */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Watch, Heart, Activity, RefreshCw, X } from 'lucide-react';
import apiService from '../../services/api.service';

interface Props {
  open: boolean;
  onClose: () => void;
  videoSessionId: number;
}

const Panel = styled.aside`
  position: fixed; inset: 0 0 0 auto; width: 340px; max-width: 90vw;
  height: 100dvh; overflow-y: auto; z-index: 1100;
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #e0ecf4);
  border-left: 1px solid var(--border-color, #407098);
  padding: 20px; box-sizing: border-box; font-family: 'Sora', sans-serif;
`;
const Header = styled.header`
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  h3 { margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px; }
`;
const Button = styled.button`
  min-height: 44px; min-width: 44px; padding: 10px; border-radius: 8px;
  border: 1px solid var(--border-color, #407098);
  background: var(--bg-elevated, #141419); color: inherit; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60c0f0); outline-offset: 3px; }
  &:disabled { cursor: not-allowed; color: var(--text-secondary, #b1bdcd); }
`;
const ProviderButton = styled(Button)`width: 100%; margin-top: 12px;`;
const Notice = styled.div`
  margin: 20px 0; line-height: 1.5; font-size: 14px;
  p { margin: 10px 0; }
`;

type AvailabilityReply = { success: boolean; data?: unknown };

const WearableDataPanel: React.FC<Props> = ({ open, onClose, videoSessionId }) => {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ sessionId: number; loading: boolean; failed: boolean }>({ sessionId: videoSessionId, loading: true, failed: false });
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => { if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let active = true;
    setState({ sessionId: videoSessionId, loading: true, failed: false });
    apiService.get<AvailabilityReply>(`/api/video-sessions/${videoSessionId}/wearable`, { signal: controller.signal })
      .then(response => {
        if (!response.data?.success) throw new Error('Availability check failed');
        // Legacy records lack certified provenance. Never display their numbers as measurements.
        if (active) setState({ sessionId: videoSessionId, loading: false, failed: false });
      })
      .catch(() => { if (active) setState({ sessionId: videoSessionId, loading: false, failed: true }); });
    return () => { active = false; controller.abort(); };
  }, [open, videoSessionId, retry]);

  if (!open) return null;
  const current = state.sessionId === videoSessionId;
  const loading = !current || state.loading;
  const failed = current && state.failed;
  return (
    <Panel aria-label="Wearable data" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
      <Header>
        <h3><Watch size={18} aria-hidden="true" />Wearable Data</h3>
        <Button ref={closeButton} onClick={onClose} aria-label="Close wearable data"><X size={18} aria-hidden="true" /></Button>
      </Header>
      <Notice>
        <strong>Wearable sync unavailable</strong>
        <p>Device connections are not available in video sessions yet. No measurements can be synced here.</p>
        <p>Previous session readings are unverified and are hidden. This screen does not delete stored records.</p>
      </Notice>
      {failed && <p role="alert">Could not check wearable availability. Please retry.</p>}
      <Button disabled={loading} onClick={() => setRetry(value => value + 1)}>
        <RefreshCw size={16} aria-hidden="true" />{loading ? 'Checking availability…' : failed ? 'Retry' : 'Check availability'}
      </Button>
      <ProviderButton disabled aria-describedby="wearable-unavailable"><Heart size={16} aria-hidden="true" />Sync Apple HealthKit</ProviderButton>
      <ProviderButton disabled aria-describedby="wearable-unavailable"><Activity size={16} aria-hidden="true" />Sync Google Fit</ProviderButton>
      <p id="wearable-unavailable">A verified device connection is required before sync can be enabled.</p>
    </Panel>
  );
};

export default WearableDataPanel;
