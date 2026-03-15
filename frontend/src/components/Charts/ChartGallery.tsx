/**
 * ChartGallery — Admin Demo Tab
 * ==============================
 * Showcases all 10 Nivo chart types in the Crystalline Swan theme.
 * Admin can preview each chart style before wiring to live data.
 */
import React, { lazy, Suspense } from 'react';
import styled from 'styled-components';
import { BarChart3 } from 'lucide-react';
import { DashboardGrid, CHART_COLORS } from './chartTheme';
import CosmicSuspenseLoader from '../Shared/CosmicSuspenseLoader';

const WeightProgressionLine     = lazy(() => import('./demos/WeightProgressionLine'));
const WeeklyVolumeBar           = lazy(() => import('./demos/WeeklyVolumeBar'));
const MuscleGroupRadar          = lazy(() => import('./demos/MuscleGroupRadar'));
const MacroDonut                = lazy(() => import('./demos/MacroDonut'));
const WorkoutHeatmap            = lazy(() => import('./demos/WorkoutHeatmap'));
const TrainingLoadArea          = lazy(() => import('./demos/TrainingLoadArea'));
const ExerciseFrequencyStream   = lazy(() => import('./demos/ExerciseFrequencyStream'));
const CompletionFunnel          = lazy(() => import('./demos/CompletionFunnel'));
const VolumeIntensityScatter    = lazy(() => import('./demos/VolumeIntensityScatter'));
const GoalProgressBullet        = lazy(() => import('./demos/GoalProgressBullet'));

const ChartGallery: React.FC = () => (
  <GalleryRoot>
    <Header>
      <IconWrap><BarChart3 size={28} /></IconWrap>
      <div>
        <Title>Chart Gallery — Nivo Demo</Title>
        <Subtitle>
          10 chart types in the Crystalline Swan theme. Choose which to wire to live client data.
        </Subtitle>
      </div>
    </Header>

    <Suspense fallback={<CosmicSuspenseLoader />}>
      <DashboardGrid>
        <WeightProgressionLine />
        <WeeklyVolumeBar />
        <MuscleGroupRadar />
        <MacroDonut />
        <WorkoutHeatmap />
        <TrainingLoadArea />
        <ExerciseFrequencyStream />
        <CompletionFunnel />
        <VolumeIntensityScatter />
        <GoalProgressBullet />
      </DashboardGrid>
    </Suspense>
  </GalleryRoot>
);

export default ChartGallery;

// ── Styled Components ──

const GalleryRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  width: 100%;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 16px;
    gap: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 1.5rem;
`;

const IconWrap = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(96, 192, 240, 0.2), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(96, 192, 240, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${CHART_COLORS.iceWing};
  flex-shrink: 0;
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: ${CHART_COLORS.frostWhite};
  margin: 0;
  letter-spacing: -0.02em;

  @media (max-width: 768px) { font-size: 18px; }
`;

const Subtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: ${CHART_COLORS.textSecondary};
  margin: 4px 0 0;
`;
