/**
 * ┌─── PAGE: VideoCallPage ────────────────────────────────────┐
 * │ PURPOSE: Full video call flow: PreCallCheck → VideoRoom.   │
 * │ Used by trainers to initiate and by clients to join calls. │
 * │ Lazy-loaded in UniversalDashboardLayout.                   │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Video, ArrowLeft } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PreCallCheck from './PreCallCheck';
import VideoRoom from './VideoRoom';
import AccessibleVideoPlayer from './AccessibleVideoPlayer';
import apiService from '../../services/api.service';

const PageWrapper = styled.div`
  min-height: 100vh;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.12);
`;

const BackBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.12);
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { background: rgba(96, 192, 240, 0.08); }
`;

const HeaderTitle = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  gap: 16px;
`;

const EmptyTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const EmptyDesc = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin: 0;
  max-width: 400px;
`;

const CreateBtn = styled.button`
  min-height: 52px;
  padding: 14px 32px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

type Phase = 'idle' | 'precall' | 'incall' | 'ended';

interface SessionData {
  videoSessionId: number;
  roomName: string;
  livekitUrl: string;
  token: string;
  isTrainer: boolean;
  assessmentType: string;
  recordingUrl?: string;
  transcription?: string;
}

interface VideoCallPageProps {
  /** If provided, auto-joins an existing session */
  sessionIdToJoin?: number;
  /** Client ID for creating a new session (trainer flow) */
  clientId?: number;
  onBack?: () => void;
}

const VideoCallPage: React.FC<VideoCallPageProps> = (props) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read from URL params if not provided as props
  const sessionIdToJoin = props.sessionIdToJoin ?? (searchParams.get('join') ? Number(searchParams.get('join')) : undefined);
  const clientId = props.clientId ?? (searchParams.get('clientId') ? Number(searchParams.get('clientId')) : undefined);
  const onBack = props.onBack ?? (() => navigate(-1));

  const [phase, setPhase] = useState<Phase>(sessionIdToJoin ? 'precall' : 'idle');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // If joining an existing session, fetch its data
  useEffect(() => {
    if (!sessionIdToJoin) return;
    apiService.get<{ success: boolean; data?: SessionData; message?: string }>(`/api/video-sessions/${sessionIdToJoin}/join`, {
      validateStatus: status => status < 500,
    })
      .then(res => {
        const d = res.data;
        if (d.success && d.data?.videoSessionId && d.data.roomName && d.data.livekitUrl && d.data.token) {
          setSessionData({
            videoSessionId: d.data.videoSessionId,
            roomName: d.data.roomName,
            livekitUrl: d.data.livekitUrl,
            token: d.data.token,
            isTrainer: Boolean(d.data?.isTrainer),
            assessmentType: d.data?.assessmentType || 'general',
          });
        } else {
          setError(d.message || 'Failed to join session');
        }
      })
      .catch(() => setError('Network error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdToJoin]);

  const handleCreate = useCallback(async (assessmentType = 'general') => {
    if (!clientId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await apiService.post<{
        success: boolean;
        data?: SessionData & { trainerToken?: string };
        message?: string;
      }>('/api/video-sessions', {
        clientId,
        assessmentType,
      }, {
        validateStatus: status => status < 500,
      });
      const d = res.data;
      if (d.success && d.data?.videoSessionId && d.data.roomName && d.data.livekitUrl && (d.data.trainerToken || d.data.token)) {
        setSessionData({
          videoSessionId: d.data.videoSessionId,
          roomName: d.data.roomName,
          livekitUrl: d.data.livekitUrl,
          token: d.data.trainerToken || d.data.token,
          isTrainer: true,
          assessmentType: d.data?.assessmentType || assessmentType,
        });
        setPhase('precall');
      } else {
        setError(d.message || 'Failed to create session');
      }
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handlePreCallReady = () => setPhase('incall');
  const handleEnd = useCallback(async () => {
    setPhase('ended');
    // Fetch completed session to get recordingUrl + transcription for playback
    if (sessionData?.videoSessionId) {
      try {
        const [sessionRes, transcriptRes] = await Promise.all([
          apiService.get(`/api/video-sessions/${sessionData.videoSessionId}`, {
            validateStatus: status => status < 500,
          }),
          apiService.get(`/api/video-sessions/${sessionData.videoSessionId}/transcription`, {
            validateStatus: status => status < 500,
          }),
        ]);
        const sessionD = sessionRes.data;
        const transcriptD = transcriptRes.data;
        if (sessionD.success || transcriptD.success) {
          setSessionData(prev => prev ? {
            ...prev,
            recordingUrl: sessionD.data?.recordingUrl || undefined,
            transcription: transcriptD.data?.transcription || undefined,
          } : prev);
        }
      } catch { /* best-effort — player just won't show if no recording */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.videoSessionId]);

  return (
    <PageWrapper>
      {phase !== 'incall' && (
        <Header>
          {onBack && (
            <BackBtn onClick={onBack} title="Back">
              <ArrowLeft size={18} />
            </BackBtn>
          )}
          <HeaderTitle>
            <Video size={20} />
            Remote Assessment
          </HeaderTitle>
        </Header>
      )}

      {error && (
        <div style={{ padding: '16px 24px', color: '#EF4444', fontFamily: 'Sora, sans-serif', fontSize: 14 }}>
          {error}
        </div>
      )}

      {phase === 'idle' && (
        <EmptyState>
          <Video size={48} style={{ color: 'var(--accent-primary, #60C0F0)', opacity: 0.6 }} />
          <EmptyTitle>Start a Remote Assessment</EmptyTitle>
          <EmptyDesc>
            Video call with your client for movement screens, postural analysis, or performance tests.
            {!clientId && ' Select a client from the client workspace first.'}
          </EmptyDesc>
          {clientId && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <CreateBtn onClick={() => handleCreate('movement_screen')} disabled={creating}>
                Movement Screen
              </CreateBtn>
              <CreateBtn onClick={() => handleCreate('postural_analysis')} disabled={creating}>
                Postural Analysis
              </CreateBtn>
              <CreateBtn onClick={() => handleCreate('performance_test')} disabled={creating}>
                Performance Test
              </CreateBtn>
              <CreateBtn onClick={() => handleCreate('general')} disabled={creating}>
                General Session
              </CreateBtn>
            </div>
          )}
        </EmptyState>
      )}

      {phase === 'precall' && sessionData && (
        <PreCallCheck
          onReady={handlePreCallReady}
          assessmentType={sessionData.assessmentType}
        />
      )}

      {phase === 'incall' && sessionData && (
        <VideoRoom
          videoSessionId={sessionData.videoSessionId}
          roomName={sessionData.roomName}
          livekitUrl={sessionData.livekitUrl}
          token={sessionData.token}
          isTrainer={sessionData.isTrainer}
          assessmentType={sessionData.assessmentType}
          onEnd={handleEnd}
        />
      )}

      {phase === 'ended' && (
        <EmptyState>
          <Video size={48} style={{ color: '#10B981', opacity: 0.6 }} />
          <EmptyTitle>Session Complete</EmptyTitle>
          <EmptyDesc>
            {sessionData?.isTrainer
              ? 'Assessment recorded. You can add notes from the client workspace.'
              : 'Thank you! Your trainer will review the assessment.'}
          </EmptyDesc>

          {/* Phase 3: Accessible recording player (when recording exists) */}
          {sessionData?.recordingUrl && (
            <div style={{ width: '100%', maxWidth: 900, margin: '16px auto' }}>
              <AccessibleVideoPlayer
                src={sessionData.recordingUrl}
                title={`Session Recording — ${sessionData.assessmentType || 'General'}`}
                transcription={sessionData.transcription}
              />
            </div>
          )}

          {onBack && (
            <CreateBtn onClick={onBack}>
              <ArrowLeft size={16} /> Back to Dashboard
            </CreateBtn>
          )}
        </EmptyState>
      )}
    </PageWrapper>
  );
};

export default VideoCallPage;
