/**
 * ClientAIWorkoutCreator.tsx
 * ==========================
 * Client-facing AI workout generation panel.
 * Clients can generate personalized workout plans based on their
 * goals, fitness level, and previous workouts via the AI Village.
 *
 * RBAC: Clients can only generate plans for themselves.
 * Requires AI consent to be granted.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, Shield, ShieldCheck, ChevronDown, ChevronUp,
  Dumbbell, Clock, Target, AlertTriangle, Loader, CheckCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import {
  createAiWorkoutService,
  isDegraded,
  isDraftSuccess,
  type WorkoutPlan,
  type WorkoutDay,
  type Exercise as AIExercise,
  type DraftSuccessResponse,
  type DegradedResponse
} from '../../../services/aiWorkoutService';
import apiService from '../../../services/api.service';

const SWAN_CYAN = '#8B5CF6';
const COSMIC_PURPLE = '#8B5CF6';

// ── Animations ────────────────────────────────────────────────────────────

const cosmicPulse = keyframes`
  0%, 100% { box-shadow: 0 0 12px rgba(139, 92, 246, 0.15); }
  50% { box-shadow: 0 0 28px rgba(139, 92, 246, 0.35), 0 0 40px rgba(139, 92, 246, 0.15); }
`;

const nebulaSpin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const fadeInText = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

// ── Styled Components ─────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(12px);
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Subtitle = styled.p`
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
`;

const GenerateButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 2rem;
  min-height: 56px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  color: ${SWAN_CYAN};
  font-size: 1.0625rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(139, 92, 246, 0.3));
    border-color: rgba(139, 92, 246, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConsentCard = styled(SectionCard)`
  border-color: rgba(245, 158, 11, 0.2);
  background: rgba(245, 158, 11, 0.04);
`;

const ConsentButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  color: ${SWAN_CYAN};
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  margin-top: 1rem;
`;

// ── Loading State (Cosmic Synthesis) ──────────────────────────────────────

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  gap: 1.25rem;
`;

const CosmicSpinner = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.2), transparent);
  animation: ${cosmicPulse} 2s ease-in-out infinite, ${nebulaSpin} 3s linear infinite;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoadingText = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9375rem;
  font-style: italic;
  animation: ${fadeInText} 2.5s ease-in-out infinite;
`;

// ── Plan Display ──────────────────────────────────────────────────────────

const PlanHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const PlanName = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${SWAN_CYAN};
  margin: 0;
`;

const PlanBadge = styled.span`
  padding: 0.25rem 0.75rem;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 20px;
  color: ${SWAN_CYAN};
  font-size: 0.75rem;
  font-weight: 600;
`;

const DayCard = styled.div<{ $expanded?: boolean }>`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  margin-bottom: 0.75rem;
  overflow: hidden;
`;

const DayHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1rem 1.25rem;
  min-height: 44px;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 600;
  text-align: left;

  &:hover {
    background: rgba(139, 92, 246, 0.03);
  }
`;

const DayMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
`;

const ExerciseList = styled.div`
  padding: 0 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ExerciseRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: rgba(139, 92, 246, 0.06);
  border-radius: 8px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.85);
`;

const ExerciseDetail = styled.span`
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.8125rem;
`;

const WarningCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 10px;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
`;

const DegradedCard = styled(SectionCard)`
  text-align: center;
  border-color: rgba(139, 92, 246, 0.2);
  background: rgba(139, 92, 246, 0.04);
`;

// ── Component ─────────────────────────────────────────────────────────────

type ViewState = 'idle' | 'checking_consent' | 'no_consent' | 'generating' | 'plan_ready' | 'degraded' | 'error';

const ClientAIWorkoutCreator: React.FC = () => {
  const { user } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [degradedSuggestions, setDegradedSuggestions] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const aiService = useMemo(
    () => createAiWorkoutService(apiService.authAxios || apiService),
    []
  );

  const checkConsentAndGenerate = useCallback(async () => {
    if (!user?.id) return;

    setViewState('checking_consent');

    try {
      // Check consent status
      const { data: consentData } = await (apiService.authAxios || apiService).get('/api/ai/consent/status');

      if (!consentData?.consentGranted) {
        setViewState('no_consent');
        return;
      }

      // Consent granted — generate
      setViewState('generating');

      const response = await aiService.generateDraft(user.id);

      if (isDegraded(response)) {
        setDegradedSuggestions(response.fallback?.templateSuggestions || []);
        setViewState('degraded');
        return;
      }

      if (isDraftSuccess(response)) {
        setPlan(response.plan);
        setWarnings(response.warnings || []);
        setExpandedDays(new Set([0])); // Expand first day
        setViewState('plan_ready');
        toast.success('Your personalized workout plan is ready!');
        return;
      }

      throw new Error('Unexpected response from AI service');
    } catch (err: any) {
      console.error('AI workout generation failed:', err);
      const msg = err?.response?.data?.message || err.message || 'Failed to generate workout plan';

      if (msg.includes('consent') || err?.response?.data?.code === 'AI_CONSENT_MISSING') {
        setViewState('no_consent');
        return;
      }

      setErrorMessage(msg);
      setViewState('error');
    }
  }, [user?.id]);

  const grantConsent = useCallback(async () => {
    try {
      await (apiService.authAxios || apiService).post('/api/ai/consent/grant', {
        consentVersion: '1.0'
      });
      toast.success('Swan Coach features enabled! Generating your workout...');
      // Now generate
      setViewState('generating');
      if (!user?.id) return;
      const response = await aiService.generateDraft(user.id);

      if (isDegraded(response)) {
        setDegradedSuggestions(response.fallback?.templateSuggestions || []);
        setViewState('degraded');
        return;
      }

      if (isDraftSuccess(response)) {
        setPlan(response.plan);
        setWarnings(response.warnings || []);
        setExpandedDays(new Set([0]));
        setViewState('plan_ready');
        toast.success('Your personalized workout plan is ready!');
      }
    } catch (err: any) {
      console.error('Consent grant failed:', err);
      setErrorMessage(err?.response?.data?.message || 'Failed to enable AI features');
      setViewState('error');
    }
  }, [user?.id]);

  const toggleDay = (idx: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  if (!user?.id) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Container>
        <SectionCard>
          <SectionTitle>
            <Brain size={28} color={SWAN_CYAN} />
            Workout Intelligence
          </SectionTitle>
          <Subtitle>
            Generate a personalized workout plan powered by AI, based on your goals,
            fitness level, and training history. Your data stays de-identified and private.
          </Subtitle>

          <AnimatePresence mode="wait">
            {/* Idle state */}
            {viewState === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <GenerateButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={checkConsentAndGenerate}
                >
                  <Sparkles size={20} />
                  Generate My Workout Plan
                </GenerateButton>
              </motion.div>
            )}

            {/* Checking consent */}
            {viewState === 'checking_consent' && (
              <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LoadingContainer>
                  <Loader size={28} color={SWAN_CYAN} style={{ animation: 'spin 1s linear infinite' }} />
                  <LoadingText>Checking permissions...</LoadingText>
                </LoadingContainer>
              </motion.div>
            )}

            {/* Generating (Cosmic Synthesis) */}
            {viewState === 'generating' && (
              <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LoadingContainer>
                  <CosmicSpinner>
                    <Brain size={28} color={SWAN_CYAN} />
                  </CosmicSpinner>
                  <LoadingText>Synthesizing your cosmic blueprint...</LoadingText>
                </LoadingContainer>
              </motion.div>
            )}

            {/* Error state */}
            {viewState === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <WarningCard>
                  <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Generation failed.</strong> {errorMessage}
                  </div>
                </WarningCard>
                <GenerateButton
                  style={{ marginTop: '1rem' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={checkConsentAndGenerate}
                >
                  Try Again
                </GenerateButton>
              </motion.div>
            )}
          </AnimatePresence>
        </SectionCard>

        {/* No consent card */}
        {viewState === 'no_consent' && (
          <ConsentCard>
            <SectionTitle style={{ fontSize: '1.125rem' }}>
              <Shield size={22} color="#f59e0b" />
              AI Consent Required
            </SectionTitle>
            <Subtitle style={{ marginBottom: '0.5rem' }}>
              To generate personalized workout plans, we need your consent to process your
              de-identified fitness profile through our AI system. Your personal identifiers
              are never shared.
            </Subtitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              <ShieldCheck size={14} color="#10b981" /> De-identified data only
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem' }}>
              <ShieldCheck size={14} color="#10b981" /> Withdraw anytime from settings
            </div>
            <ConsentButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={grantConsent}
            >
              <ShieldCheck size={18} />
              Enable AI Features & Generate
            </ConsentButton>
          </ConsentCard>
        )}

        {/* Degraded state */}
        {viewState === 'degraded' && (
          <DegradedCard>
            <Brain size={36} color={COSMIC_PURPLE} style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ color: COSMIC_PURPLE, margin: '0 0 0.5rem 0' }}>
              AI Temporarily Unavailable
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
              Our AI providers are busy. Here are some template suggestions based on your profile:
            </p>
            {degradedSuggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                {degradedSuggestions.map((t: any, i: number) => (
                  <div key={i} style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    borderRadius: '8px',
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.875rem'
                  }}>
                    <strong>{t.label}</strong>
                    {t.category && <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: '0.5rem' }}>({t.category})</span>}
                  </div>
                ))}
              </div>
            )}
            <GenerateButton
              style={{ marginTop: '1.25rem' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={checkConsentAndGenerate}
            >
              Retry Generation
            </GenerateButton>
          </DegradedCard>
        )}

        {/* Plan Ready */}
        {viewState === 'plan_ready' && plan && (
          <SectionCard style={{ animation: `${cosmicPulse} 3s ease-in-out 1` }}>
            <PlanHeader>
              <PlanName>{plan.planName}</PlanName>
              <PlanBadge>{plan.durationWeeks}w</PlanBadge>
            </PlanHeader>

            {plan.summary && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                {plan.summary}
              </p>
            )}

            {warnings.length > 0 && (
              <WarningCard style={{ marginBottom: '1rem' }}>
                <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  {warnings.map((w, i) => <div key={i}>{w}</div>)}
                </div>
              </WarningCard>
            )}

            {plan.days.map((day, idx) => (
              <DayCard key={idx}>
                <DayHeader onClick={() => toggleDay(idx)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Dumbbell size={16} color={SWAN_CYAN} />
                    Day {day.dayNumber}: {day.name}
                  </div>
                  <DayMeta>
                    {day.exercises.length} exercises
                    {expandedDays.has(idx) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </DayMeta>
                </DayHeader>

                {expandedDays.has(idx) && (
                  <ExerciseList>
                    {day.exercises.map((ex, exIdx) => (
                      <ExerciseRow key={exIdx}>
                        <Target size={14} color={COSMIC_PURPLE} style={{ flexShrink: 0 }} />
                        <div>
                          <div>{ex.name}</div>
                          <ExerciseDetail>
                            {[
                              ex.setScheme,
                              ex.restPeriod ? `${ex.restPeriod}s rest` : null,
                              ex.tempo ? `Tempo: ${ex.tempo}` : null,
                              ex.intensityGuideline
                            ].filter(Boolean).join(' · ')}
                          </ExerciseDetail>
                        </div>
                      </ExerciseRow>
                    ))}
                  </ExerciseList>
                )}
              </DayCard>
            ))}

            <GenerateButton
              style={{ marginTop: '0.75rem' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={checkConsentAndGenerate}
            >
              <Sparkles size={18} />
              Generate New Plan
            </GenerateButton>
          </SectionCard>
        )}
      </Container>
    </motion.div>
  );
};

export default ClientAIWorkoutCreator;
