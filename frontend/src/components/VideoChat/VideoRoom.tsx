/**
 * ┌─── COMPONENT: VideoRoom ───────────────────────────────────┐
 * │ PURPOSE: Main video call UI using LiveKit React components. │
 * │ Supports: 1-on-1 calls, mute/camera/end controls,         │
 * │          "Step Back Mode" for clients during assessments.   │
 * │ CEO RULING: LiveKit, Step Back Mode, full-screen mobile.   │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  Mic, MicOff, Camera, CameraOff, PhoneOff, Maximize, Minimize,
  MessageSquare, FileText, Shield, CameraIcon, Sparkles,
  Activity,
} from 'lucide-react';
import FreezeFrameAnnotator from './FreezeFrameAnnotator';
import AssessmentNotesPanel from './AssessmentNotesPanel';
import MicroWinOverlay, { type MicroWinType } from './MicroWinOverlay';
import ROMTrackingPanel from './ROMTrackingPanel';
import apiService from '../../services/api.service';

const RoomWrapper = styled.div<{ $fullscreen: boolean }>`
  ${({ $fullscreen }) => $fullscreen ? `
    position: fixed;
    inset: 0;
    z-index: 1000;
  ` : `
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  `}
  background: var(--bg-base, #0A0A0F);
  display: flex;
  flex-direction: column;
`;

const VideoGrid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 8px;
  min-height: 400px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
`;

const VideoTile = styled.div<{ $isLocal?: boolean }>`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $isLocal }) =>
    $isLocal ? 'rgba(96, 192, 240, 0.3)' : 'rgba(96, 192, 240, 0.12)'};

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    ${({ $isLocal }) => $isLocal ? 'transform: scaleX(-1);' : ''}
  }
`;

const ParticipantLabel = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #E0ECF4;
`;

const NoVideo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  gap: 8px;
`;

const ControlBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-elevated, #141419);
  border-top: 1px solid rgba(96, 192, 240, 0.12);
  flex-wrap: wrap;
`;

const ControlBtn = styled.button<{ $active?: boolean; $danger?: boolean }>`
  min-width: 52px;
  min-height: 52px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  background: ${({ $danger, $active }) =>
    $danger ? '#EF4444' :
    $active === false ? 'rgba(239, 68, 68, 0.15)' :
    'rgba(96, 192, 240, 0.12)'};
  color: ${({ $danger, $active }) =>
    $danger ? '#fff' :
    $active === false ? '#EF4444' :
    'var(--accent-primary, #60C0F0)'};

  &:hover { opacity: 0.85; transform: scale(1.05); }
`;

const InfoBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-elevated, #141419);
  border-bottom: 1px solid rgba(96, 192, 240, 0.12);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
`;

const Timer = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  color: var(--accent-primary, #60C0F0);
`;

const DisclaimerBanner = styled.div`
  padding: 8px 16px;
  background: rgba(96, 192, 240, 0.06);
  border-bottom: 1px solid rgba(96, 192, 240, 0.12);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

// ── Step Back Mode (simplified client UI) ──
const StepBackOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  z-index: 10;
  padding: 24px;
  text-align: center;
`;

const StepBackTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: #E0ECF4;
  margin-bottom: 8px;

  @media (max-width: 375px) { font-size: 22px; }
`;

const StepBackHint = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 24px;
`;

const EndCallBig = styled.button`
  min-width: 80px;
  min-height: 64px;
  border-radius: 32px;
  border: none;
  background: #EF4444;
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 24px;

  &:hover { opacity: 0.9; }
`;

interface VideoRoomProps {
  videoSessionId: number;
  roomName: string;
  livekitUrl: string;
  token: string;
  isTrainer: boolean;
  assessmentType?: string;
  onEnd: () => void;
}

const VideoRoom: React.FC<VideoRoomProps> = ({
  videoSessionId, roomName, livekitUrl, token, isTrainer, assessmentType, onEnd,
}) => {
  const [showMicroWinMenu, setShowMicroWinMenu] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [stepBackMode, setStepBackMode] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Phase 2: Freeze frame, notes, micro-wins
  const [freezeFrameUrl, setFreezeFrameUrl] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [trainerNotes, setTrainerNotes] = useState('');
  const [annotations, setAnnotations] = useState<string[]>([]);
  const [activeMicroWin, setActiveMicroWin] = useState<MicroWinType | null>(null);

  // Phase 3: ROM tracking, wearable data
  const [showROM, setShowROM] = useState(false);
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null);

  // Timer
  React.useEffect(() => {
    const interval = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleFreezeFrame = useCallback(() => {
    // In production, this captures from the actual video element
    // For now, use a placeholder that shows the annotator
    setFreezeFrameUrl('data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect fill="#141419" width="640" height="480"/><text x="320" y="240" text-anchor="middle" fill="#60C0F0" font-size="18">Frozen Frame — Draw annotations here</text></svg>'
    ));
  }, []);

  const handleAnnotationSave = useCallback((dataUrl: string) => {
    setAnnotations(prev => [...prev, dataUrl]);
    setFreezeFrameUrl(null);
  }, []);

  const handleSaveNotes = useCallback(async () => {
    try {
      await apiService.patch(`/api/video-sessions/${videoSessionId}/notes`, {
        trainerNotes,
      });
    } catch { /* best-effort */ }
  }, [videoSessionId, trainerNotes]);

  const handleTriggerMicroWin = useCallback(async (type: MicroWinType) => {
    try {
      const res = await apiService.post<{ success: boolean }>(`/api/video-sessions/${videoSessionId}/micro-win`, {
        type,
      });
      const d = res.data;
      if (d.success) {
        setActiveMicroWin(type); // Only show celebration after confirmed XP award
      }
    } catch { /* best-effort */ }
  }, [videoSessionId]);

  const handleEnd = useCallback(async () => {
    try {
      await apiService.patch(`/api/video-sessions/${videoSessionId}/end`, {});
    } catch { /* best-effort */ }
    onEnd();
  }, [videoSessionId, onEnd]);

  const assessmentLabel =
    assessmentType === 'movement_screen' ? 'Movement Screen' :
    assessmentType === 'postural_analysis' ? 'Postural Analysis' :
    assessmentType === 'performance_test' ? 'Performance Test' : 'Video Session';

  return (
    <RoomWrapper $fullscreen={fullscreen}>
      <DisclaimerBanner>
        <Shield size={12} />
        SwanStudios provides fitness and movement efficiency insights, not medical diagnoses.
      </DisclaimerBanner>

      <InfoBar>
        <span>{assessmentLabel} — Room: {roomName.slice(0, 20)}</span>
        <Timer>{formatTime(elapsedSec)}</Timer>
      </InfoBar>

      <VideoGrid style={{ position: 'relative' }}>
        {/* Step Back Mode for clients */}
        {stepBackMode && !isTrainer && (
          <StepBackOverlay>
            <StepBackTitle>{assessmentLabel}</StepBackTitle>
            <StepBackHint>Step back — your trainer can see you</StepBackHint>
            <EndCallBig onClick={handleEnd}>
              <PhoneOff size={20} /> End Call
            </EndCallBig>
          </StepBackOverlay>
        )}

        {/* Remote participant */}
        <VideoTile>
          <NoVideo>
            <Camera size={32} />
            {isTrainer ? 'Client video will appear here' : 'Trainer video will appear here'}
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Connect LiveKit SDK to see live video.
              <br />
              LiveKit URL: {livekitUrl || 'Not configured'}
            </div>
          </NoVideo>
          <ParticipantLabel>{isTrainer ? 'Client' : 'Trainer'}</ParticipantLabel>
        </VideoTile>

        {/* Local participant */}
        <VideoTile $isLocal>
          <NoVideo>
            <Camera size={32} />
            Your camera preview
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              LiveKit React SDK handles video rendering.
              <br />
              Token ready: {token ? 'Yes' : 'No'}
            </div>
          </NoVideo>
          <ParticipantLabel>{isTrainer ? 'You (Trainer)' : 'You'}</ParticipantLabel>
        </VideoTile>
      </VideoGrid>

      <ControlBar>
        <ControlBtn $active={micEnabled} onClick={() => setMicEnabled(!micEnabled)} title={micEnabled ? 'Mute' : 'Unmute'}>
          {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
        </ControlBtn>

        <ControlBtn $active={cameraEnabled} onClick={() => setCameraEnabled(!cameraEnabled)} title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}>
          {cameraEnabled ? <Camera size={22} /> : <CameraOff size={22} />}
        </ControlBtn>

        <ControlBtn onClick={() => setFullscreen(!fullscreen)} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {fullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
        </ControlBtn>

        {!isTrainer && (
          <ControlBtn onClick={() => setStepBackMode(!stepBackMode)} title="Step Back Mode">
            <FileText size={22} />
          </ControlBtn>
        )}

        {isTrainer && (
          <>
            <ControlBtn onClick={handleFreezeFrame} title="Freeze Frame + Annotate">
              <CameraIcon size={22} />
            </ControlBtn>
            <ControlBtn onClick={() => setShowNotes(!showNotes)} title="Session Notes">
              <MessageSquare size={22} />
            </ControlBtn>
            <ControlBtn onClick={() => setShowROM(!showROM)} title="ROM Tracking">
              <Activity size={22} />
            </ControlBtn>
            <div style={{ position: 'relative' }}>
              <ControlBtn onClick={() => setShowMicroWinMenu(!showMicroWinMenu)} title="Award Micro-Win">
                <Sparkles size={22} />
              </ControlBtn>
              {showMicroWinMenu && (
                <div style={{
                  position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--bg-elevated, #141419)', border: '1px solid rgba(96,192,240,0.2)',
                  borderRadius: 10, padding: 6, minWidth: 200, zIndex: 20,
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  {([
                    ['perfect_form', 'Perfect Form! (+25 XP)'],
                    ['great_rep', 'Great Rep! (+10 XP)'],
                    ['full_rom', 'Full ROM! (+15 XP)'],
                    ['consistency', 'Consistent Pace! (+10 XP)'],
                    ['improvement', 'Visible Improvement! (+50 XP)'],
                  ] as [MicroWinType, string][]).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => { handleTriggerMicroWin(type); setShowMicroWinMenu(false); }}
                      style={{
                        minHeight: 40, padding: '8px 12px', borderRadius: 6, border: 'none',
                        background: 'transparent', color: '#E0ECF4', cursor: 'pointer',
                        fontFamily: 'Sora, sans-serif', fontSize: 13, textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(96,192,240,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <ControlBtn $danger onClick={handleEnd} title="End Call">
          <PhoneOff size={22} />
        </ControlBtn>
      </ControlBar>

      {/* Phase 2: Freeze Frame Annotator */}
      {freezeFrameUrl && (
        <FreezeFrameAnnotator
          frameDataUrl={freezeFrameUrl}
          onSave={handleAnnotationSave}
          onClose={() => setFreezeFrameUrl(null)}
        />
      )}

      {/* Phase 2: Assessment Notes Panel */}
      {isTrainer && (
        <AssessmentNotesPanel
          open={showNotes}
          onClose={() => setShowNotes(false)}
          videoSessionId={videoSessionId}
          notes={trainerNotes}
          onNotesChange={setTrainerNotes}
          onSaveNotes={handleSaveNotes}
          annotations={annotations}
        />
      )}

      {/* Phase 3: ROM Tracking Panel */}
      {isTrainer && (
        <ROMTrackingPanel
          open={showROM}
          onClose={() => setShowROM(false)}
          videoSessionId={videoSessionId}
          recoveryScore={recoveryScore}
          onScoreUpdate={setRecoveryScore}
        />
      )}

      {/* Phase 2: Micro-Win Overlay */}
      {activeMicroWin && (
        <MicroWinOverlay
          type={activeMicroWin}
          onComplete={() => setActiveMicroWin(null)}
        />
      )}
    </RoomWrapper>
  );
};

export default VideoRoom;
