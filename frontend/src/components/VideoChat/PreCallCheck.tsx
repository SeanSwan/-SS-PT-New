/**
 * ┌─── COMPONENT: PreCallCheck ────────────────────────────────┐
 * │ PURPOSE: Camera/mic/speed test before joining video call.   │
 * │ CEO RULING: Mandatory pre-call check for every session.    │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Camera, Mic, Wifi, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

const Wrapper = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 24px;
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 8px;
`;

const Subtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin: 0 0 24px;
`;

const VideoPreview = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  margin-bottom: 20px;
  position: relative;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
  }
`;

const NoCamera = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  gap: 8px;
`;

const CheckList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const CheckItem = styled.div<{ $status: 'pass' | 'fail' | 'checking' }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  min-height: 44px;
  background: ${({ $status }) =>
    $status === 'pass' ? 'rgba(16, 185, 129, 0.08)' :
    $status === 'fail' ? 'rgba(239, 68, 68, 0.08)' :
    'var(--bg-elevated, #141419)'};
  border: 1px solid ${({ $status }) =>
    $status === 'pass' ? 'rgba(16, 185, 129, 0.25)' :
    $status === 'fail' ? 'rgba(239, 68, 68, 0.25)' :
    'rgba(96, 192, 240, 0.12)'};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-primary, #E0ECF4);
`;

const StatusIcon = styled.div<{ $status: 'pass' | 'fail' | 'checking' }>`
  color: ${({ $status }) =>
    $status === 'pass' ? '#10B981' :
    $status === 'fail' ? '#EF4444' :
    'var(--accent-primary, #60C0F0)'};
  flex-shrink: 0;
`;

const JoinButton = styled.button`
  width: 100%;
  min-height: 52px;
  padding: 14px 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.9; }
`;

const Disclaimer = styled.div`
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(96, 192, 240, 0.06);
  border: 1px solid rgba(96, 192, 240, 0.12);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  text-align: center;
`;

interface PreCallCheckProps {
  onReady: () => void;
  assessmentType?: string;
}

const PreCallCheck: React.FC<PreCallCheckProps> = ({ onReady, assessmentType }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [speedOk, setSpeedOk] = useState<boolean | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Test camera + mic
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraOk(true);
        // Check mic by looking at audio tracks
        const audioTracks = stream.getAudioTracks();
        setMicOk(audioTracks.length > 0 && audioTracks[0].enabled);
      })
      .catch(() => {
        setCameraOk(false);
        setMicOk(false);
      });

    // Simple speed test (download small resource)
    const start = performance.now();
    fetch('/favicon.ico', { cache: 'no-store' })
      .then(() => {
        const elapsed = performance.now() - start;
        setSpeedOk(elapsed < 3000); // Under 3s = acceptable
      })
      .catch(() => setSpeedOk(false));

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const allPassed = cameraOk && micOk && speedOk;
  const getStatus = (val: boolean | null): 'pass' | 'fail' | 'checking' =>
    val === null ? 'checking' : val ? 'pass' : 'fail';

  return (
    <Wrapper>
      <Title>Pre-Call Check</Title>
      <Subtitle>
        Let's make sure everything is working before your{' '}
        {assessmentType === 'movement_screen' ? 'movement screen' :
         assessmentType === 'postural_analysis' ? 'postural analysis' :
         assessmentType === 'performance_test' ? 'performance test' : 'session'}.
      </Subtitle>

      <VideoPreview>
        {cameraOk === false ? (
          <NoCamera>
            <Camera size={32} />
            Camera not available. Check permissions.
          </NoCamera>
        ) : (
          <video ref={videoRef} autoPlay muted playsInline />
        )}
      </VideoPreview>

      <CheckList>
        <CheckItem $status={getStatus(cameraOk)}>
          <StatusIcon $status={getStatus(cameraOk)}>
            {cameraOk ? <CheckCircle size={20} /> : cameraOk === false ? <AlertTriangle size={20} /> : <Camera size={20} />}
          </StatusIcon>
          Camera {cameraOk === null ? '— checking...' : cameraOk ? '— ready' : '— not available'}
        </CheckItem>

        <CheckItem $status={getStatus(micOk)}>
          <StatusIcon $status={getStatus(micOk)}>
            {micOk ? <CheckCircle size={20} /> : micOk === false ? <AlertTriangle size={20} /> : <Mic size={20} />}
          </StatusIcon>
          Microphone {micOk === null ? '— checking...' : micOk ? '— ready' : '— not available'}
        </CheckItem>

        <CheckItem $status={getStatus(speedOk)}>
          <StatusIcon $status={getStatus(speedOk)}>
            {speedOk ? <CheckCircle size={20} /> : speedOk === false ? <AlertTriangle size={20} /> : <Wifi size={20} />}
          </StatusIcon>
          Connection {speedOk === null ? '— testing...' : speedOk ? '— good' : '— slow (video may lag)'}
        </CheckItem>
      </CheckList>

      <JoinButton onClick={onReady} disabled={cameraOk === null}>
        {allPassed ? 'Join Call' : 'Join Anyway'}
        <ArrowRight size={18} />
      </JoinButton>

      <Disclaimer>
        SwanStudios provides fitness and movement efficiency insights, not medical diagnoses.
        Consult a healthcare provider for medical concerns.
      </Disclaimer>
    </Wrapper>
  );
};

export default PreCallCheck;
