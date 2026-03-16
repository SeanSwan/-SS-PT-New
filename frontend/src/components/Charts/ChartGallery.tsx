/**
 * ChartGallery — Victory Chart Showcase (50 Charts)
 * ==================================================
 * Bento Box layout with featured Core 6 at top, category tabs below.
 * Lazy-loaded per category group. AI Village 11-Brain consensus.
 * Victory library for React Native cross-platform compatibility.
 */
import React, { lazy, useState, useMemo } from 'react';
import styled from 'styled-components';
import { BarChart3, Search, TrendingUp, PieChart, Target, Flame, Layers, Activity, Filter, Crosshair, Gauge } from 'lucide-react';
import {
  DashboardGrid, CHART_COLORS, hexAlpha, BREAKPOINTS,
  IconWrap, CategoryTabsContainer, TabList, CategoryTab,
  ChartTitle as ThemeChartTitle,
} from './chartTheme';
import { SafeChart } from './SafeChart';

// ── Lazy Imports: 50 Charts ──

// Line Charts
const WeightProgressionLine = lazy(() => import('./charts/line/WeightProgressionLine'));
const StrengthProgressionLine = lazy(() => import('./charts/line/StrengthProgressionLine'));
const CardioEnduranceLine = lazy(() => import('./charts/line/CardioEnduranceLine'));
const SessionFrequencyLine = lazy(() => import('./charts/line/SessionFrequencyLine'));
const BodyFatTrendLine = lazy(() => import('./charts/line/BodyFatTrendLine'));

// Bar Charts
const WeeklyVolumeBar = lazy(() => import('./charts/bar/WeeklyVolumeBar'));
const ExerciseComparisonBar = lazy(() => import('./charts/bar/ExerciseComparisonBar'));
const MonthlyRevenueBar = lazy(() => import('./charts/bar/MonthlyRevenueBar'));
const ClientRetentionBar = lazy(() => import('./charts/bar/ClientRetentionBar'));
const TrainerWorkloadBar = lazy(() => import('./charts/bar/TrainerWorkloadBar'));

// Radar Charts
const MuscleGroupRadar = lazy(() => import('./charts/radar/MuscleGroupRadar'));
const FitnessAssessmentRadar = lazy(() => import('./charts/radar/FitnessAssessmentRadar'));
const ClientEngagementRadar = lazy(() => import('./charts/radar/ClientEngagementRadar'));
const NutritionBalanceRadar = lazy(() => import('./charts/radar/NutritionBalanceRadar'));
const TrainerSkillsRadar = lazy(() => import('./charts/radar/TrainerSkillsRadar'));

// Pie/Donut Charts
const MacroDonut = lazy(() => import('./charts/pie/MacroDonut'));
const SessionTypeDonut = lazy(() => import('./charts/pie/SessionTypeDonut'));
const RevenueSourcePie = lazy(() => import('./charts/pie/RevenueSourcePie'));
const ClientDemographicsPie = lazy(() => import('./charts/pie/ClientDemographicsPie'));
const ExerciseTypePie = lazy(() => import('./charts/pie/ExerciseTypePie'));

// Heatmap Charts
const WorkoutHeatmapCalendar = lazy(() => import('./charts/heatmap/WorkoutHeatmapCalendar'));
const HourlyActivityHeatmap = lazy(() => import('./charts/heatmap/HourlyActivityHeatmap'));
const MuscleRecoveryHeatmap = lazy(() => import('./charts/heatmap/MuscleRecoveryHeatmap'));
const ClientCheckInHeatmap = lazy(() => import('./charts/heatmap/ClientCheckInHeatmap'));
const ExerciseIntensityHeatmap = lazy(() => import('./charts/heatmap/ExerciseIntensityHeatmap'));

// Area Charts
const TrainingLoadArea = lazy(() => import('./charts/area/TrainingLoadArea'));
const BodyCompositionArea = lazy(() => import('./charts/area/BodyCompositionArea'));
const RevenueStreamArea = lazy(() => import('./charts/area/RevenueStreamArea'));
const WorkoutDurationArea = lazy(() => import('./charts/area/WorkoutDurationArea'));
const CalorieBurnArea = lazy(() => import('./charts/area/CalorieBurnArea'));

// Stream Charts
const ExerciseFrequencyStream = lazy(() => import('./charts/stream/ExerciseFrequencyStream'));
const ClientFlowStream = lazy(() => import('./charts/stream/ClientFlowStream'));
const MoodEnergyStream = lazy(() => import('./charts/stream/MoodEnergyStream'));
const TrainingPhaseStream = lazy(() => import('./charts/stream/TrainingPhaseStream'));
const NutrientIntakeStream = lazy(() => import('./charts/stream/NutrientIntakeStream'));

// Funnel Charts
const CompletionFunnel = lazy(() => import('./charts/funnel/CompletionFunnel'));
const ClientOnboardingFunnel = lazy(() => import('./charts/funnel/ClientOnboardingFunnel'));
const SessionBookingFunnel = lazy(() => import('./charts/funnel/SessionBookingFunnel'));
const GoalAchievementFunnel = lazy(() => import('./charts/funnel/GoalAchievementFunnel'));
const SalesConversionFunnel = lazy(() => import('./charts/funnel/SalesConversionFunnel'));

// Scatter Charts
const VolumeIntensityScatter = lazy(() => import('./charts/scatter/VolumeIntensityScatter'));
const AttendanceProgressScatter = lazy(() => import('./charts/scatter/AttendanceProgressScatter'));
const PriceRetentionScatter = lazy(() => import('./charts/scatter/PriceRetentionScatter'));
const AgePerformanceScatter = lazy(() => import('./charts/scatter/AgePerformanceScatter'));
const RestRecoveryScatter = lazy(() => import('./charts/scatter/RestRecoveryScatter'));

// Bullet/Gauge Charts
const GoalProgressBullet = lazy(() => import('./charts/bullet/GoalProgressBullet'));
const SessionQuotaBullet = lazy(() => import('./charts/bullet/SessionQuotaBullet'));
const RevenueTargetBullet = lazy(() => import('./charts/bullet/RevenueTargetBullet'));
const ClientCapacityBullet = lazy(() => import('./charts/bullet/ClientCapacityBullet'));
const NutritionGoalBullet = lazy(() => import('./charts/bullet/NutritionGoalBullet'));

// ── Category Config ──

const CATEGORIES = [
  { id: 'all', label: 'All Charts', icon: BarChart3 },
  { id: 'line', label: 'Line', icon: TrendingUp },
  { id: 'bar', label: 'Bar', icon: BarChart3 },
  { id: 'radar', label: 'Radar', icon: Target },
  { id: 'pie', label: 'Pie / Donut', icon: PieChart },
  { id: 'heatmap', label: 'Heatmap', icon: Flame },
  { id: 'area', label: 'Area', icon: Layers },
  { id: 'stream', label: 'Stream', icon: Activity },
  { id: 'funnel', label: 'Funnel', icon: Filter },
  { id: 'scatter', label: 'Scatter', icon: Crosshair },
  { id: 'bullet', label: 'Bullet / Gauge', icon: Gauge },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

interface ChartEntry {
  name: string;
  category: Exclude<CategoryId, 'all'>;
  component: React.LazyExoticComponent<React.FC>;
  featured?: boolean;
}

const CHART_REGISTRY: ChartEntry[] = [
  // Line
  { name: 'Weight Progression', category: 'line', component: WeightProgressionLine, featured: true },
  { name: 'Strength Progression', category: 'line', component: StrengthProgressionLine },
  { name: 'Cardio Endurance', category: 'line', component: CardioEnduranceLine },
  { name: 'Session Frequency', category: 'line', component: SessionFrequencyLine },
  { name: 'Body Fat Trend', category: 'line', component: BodyFatTrendLine },
  // Bar
  { name: 'Weekly Volume', category: 'bar', component: WeeklyVolumeBar, featured: true },
  { name: 'Exercise Comparison', category: 'bar', component: ExerciseComparisonBar },
  { name: 'Monthly Revenue', category: 'bar', component: MonthlyRevenueBar },
  { name: 'Client Retention', category: 'bar', component: ClientRetentionBar },
  { name: 'Trainer Workload', category: 'bar', component: TrainerWorkloadBar },
  // Radar
  { name: 'Muscle Group', category: 'radar', component: MuscleGroupRadar, featured: true },
  { name: 'Fitness Assessment', category: 'radar', component: FitnessAssessmentRadar },
  { name: 'Client Engagement', category: 'radar', component: ClientEngagementRadar },
  { name: 'Nutrition Balance', category: 'radar', component: NutritionBalanceRadar },
  { name: 'Trainer Skills', category: 'radar', component: TrainerSkillsRadar },
  // Pie/Donut
  { name: 'Macro Split', category: 'pie', component: MacroDonut, featured: true },
  { name: 'Session Types', category: 'pie', component: SessionTypeDonut },
  { name: 'Revenue Sources', category: 'pie', component: RevenueSourcePie },
  { name: 'Client Demographics', category: 'pie', component: ClientDemographicsPie },
  { name: 'Exercise Types', category: 'pie', component: ExerciseTypePie },
  // Heatmap
  { name: 'Workout Calendar', category: 'heatmap', component: WorkoutHeatmapCalendar, featured: true },
  { name: 'Hourly Activity', category: 'heatmap', component: HourlyActivityHeatmap },
  { name: 'Muscle Recovery', category: 'heatmap', component: MuscleRecoveryHeatmap },
  { name: 'Client Check-ins', category: 'heatmap', component: ClientCheckInHeatmap },
  { name: 'Exercise Intensity', category: 'heatmap', component: ExerciseIntensityHeatmap },
  // Area
  { name: 'Training Load', category: 'area', component: TrainingLoadArea, featured: true },
  { name: 'Body Composition', category: 'area', component: BodyCompositionArea },
  { name: 'Revenue Stream', category: 'area', component: RevenueStreamArea },
  { name: 'Workout Duration', category: 'area', component: WorkoutDurationArea },
  { name: 'Calorie Burn', category: 'area', component: CalorieBurnArea },
  // Stream
  { name: 'Exercise Frequency', category: 'stream', component: ExerciseFrequencyStream },
  { name: 'Client Flow', category: 'stream', component: ClientFlowStream },
  { name: 'Mood & Energy', category: 'stream', component: MoodEnergyStream },
  { name: 'Training Phases', category: 'stream', component: TrainingPhaseStream },
  { name: 'Nutrient Intake', category: 'stream', component: NutrientIntakeStream },
  // Funnel
  { name: 'Completion Funnel', category: 'funnel', component: CompletionFunnel },
  { name: 'Client Onboarding', category: 'funnel', component: ClientOnboardingFunnel },
  { name: 'Session Booking', category: 'funnel', component: SessionBookingFunnel },
  { name: 'Goal Achievement', category: 'funnel', component: GoalAchievementFunnel },
  { name: 'Sales Conversion', category: 'funnel', component: SalesConversionFunnel },
  // Scatter
  { name: 'Volume vs Intensity', category: 'scatter', component: VolumeIntensityScatter },
  { name: 'Attendance vs Progress', category: 'scatter', component: AttendanceProgressScatter },
  { name: 'Price vs Retention', category: 'scatter', component: PriceRetentionScatter },
  { name: 'Age vs Performance', category: 'scatter', component: AgePerformanceScatter },
  { name: 'Rest vs Recovery', category: 'scatter', component: RestRecoveryScatter },
  // Bullet/Gauge
  { name: 'Goal Progress', category: 'bullet', component: GoalProgressBullet },
  { name: 'Session Quota', category: 'bullet', component: SessionQuotaBullet },
  { name: 'Revenue Target', category: 'bullet', component: RevenueTargetBullet },
  { name: 'Client Capacity', category: 'bullet', component: ClientCapacityBullet },
  { name: 'Nutrition Goals', category: 'bullet', component: NutritionGoalBullet },
];

// ── Component ──

const ChartGallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const featuredCharts = useMemo(
    () => CHART_REGISTRY.filter(c => c.featured),
    []
  );

  const filteredCharts = useMemo(() => {
    let charts = CHART_REGISTRY;
    if (activeCategory !== 'all') {
      charts = charts.filter(c => c.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      charts = charts.filter(c =>
        c.name.toLowerCase().includes(q) || c.category.includes(q)
      );
    }
    return charts;
  }, [activeCategory, searchQuery]);

  const chartCount = activeCategory === 'all' ? 50 : filteredCharts.length;

  return (
    <GalleryRoot>
      {/* Header */}
      <Header>
        <IconWrap><BarChart3 size={28} /></IconWrap>
        <div>
          <Title>Chart Gallery</Title>
          <Subtitle>
            50 Victory charts across 10 categories — Crystalline Swan theme
          </Subtitle>
        </div>
      </Header>

      {/* Featured Core 6 — Bento Box */}
      <SectionLabel>Featured Charts</SectionLabel>
      <DashboardGrid>
        {featuredCharts.map(chart => (
          <SafeChart key={chart.name} chartName={chart.name}>
            <chart.component />
          </SafeChart>
        ))}
      </DashboardGrid>

      {/* Search + Category Tabs */}
      <Divider />
      <SectionLabel>
        Chart Library
        <ChartCount>{searchQuery ? filteredCharts.length : chartCount} charts</ChartCount>
      </SectionLabel>

      <ControlsRow>
        <SearchBox>
          <Search size={16} />
          <SearchInput
            type="text"
            placeholder="Search charts…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search charts by name or category"
          />
        </SearchBox>
      </ControlsRow>

      <CategoryTabsContainer>
        <TabList role="tablist" aria-label="Chart categories">
          {CATEGORIES.map(cat => (
            <CategoryTab
              key={cat.id}
              role="tab"
              aria-selected={activeCategory === cat.id}
              aria-controls="chart-library-grid"
              onClick={() => setActiveCategory(cat.id)}
            >
              <cat.icon size={16} />
              {cat.label}
            </CategoryTab>
          ))}
        </TabList>
      </CategoryTabsContainer>

      {/* Chart Grid */}
      <DashboardGrid id="chart-library-grid" role="tabpanel">
        {filteredCharts.length === 0 ? (
          <EmptyState>No charts match your search.</EmptyState>
        ) : (
          filteredCharts.map(chart => (
            <SafeChart key={chart.name} chartName={chart.name}>
              <chart.component />
            </SafeChart>
          ))
        )}
      </DashboardGrid>
    </GalleryRoot>
  );
};

export default ChartGallery;

// ── Styled Components ──

const GalleryRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  width: 100%;
  min-height: 100vh;

  @media (max-width: ${BREAKPOINTS.mobile}) {
    padding: 16px;
    gap: 12px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 1.5rem;
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: ${CHART_COLORS.frostWhite};
  margin: 0;
  letter-spacing: -0.02em;

  @media (max-width: ${BREAKPOINTS.mobile}) { font-size: 18px; }
`;

const Subtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: ${CHART_COLORS.textSecondary};
  margin: 4px 0 0;
`;

const SectionLabel = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: ${CHART_COLORS.frostWhite};
  margin: 8px 0 0;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ChartCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 400;
  color: ${CHART_COLORS.textSecondary};
  background: ${hexAlpha(CHART_COLORS.wingPurple, 0.15)};
  padding: 2px 10px;
  border-radius: 10px;
`;

const Divider = styled.hr`
  border: none;
  height: 1px;
  background: ${hexAlpha(CHART_COLORS.iceWing, 0.12)};
  margin: 8px 1.5rem;
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 1.5rem;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${hexAlpha(CHART_COLORS.midnightSapphire, 0.6)};
  border: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.15)};
  border-radius: 10px;
  padding: 0 14px;
  height: 44px;
  max-width: 320px;
  width: 100%;
  color: ${CHART_COLORS.textSecondary};
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: ${CHART_COLORS.wingPurple};
  }
`;

const SearchInput = styled.input`
  background: transparent;
  border: none;
  outline: none;
  color: ${CHART_COLORS.frostWhite};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  width: 100%;

  &::placeholder {
    color: ${hexAlpha(CHART_COLORS.frostWhite, 0.45)};
  }
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: ${CHART_COLORS.textSecondary};
`;
