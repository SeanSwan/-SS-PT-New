import type { ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  HeartPulse,
  PieChart,
  ScanBarcode,
  Search,
  ShieldCheck,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { VictoryPie } from 'victory';
import type { MacroSummary } from '../../../hooks/useMacroSummary';
import { nutritionPanelId, nutritionTabId, type Tab } from './NutritionWorkspace.tabs';
import {
  CaptureCopy,
  CaptureGrid,
  CaptureIcon,
  CaptureRail,
  CaptureShell,
  CaptureTile,
  DecisionConnector,
  DecisionDot,
  DecisionRail,
  DecisionStep,
  DecisionStepCopy,
  MacroPulseCenter,
  MacroPulseChart,
  MacroPulseLegend,
  MacroPulseLegendItem,
  MacroPulsePanel,
  MacroPulseSwatch,
  RibbonCard,
  RibbonEyebrow,
  RibbonLabel,
  RibbonValue,
  SourcePill,
  SourceTruthRail,
  SourceTruthTitle,
  TileBadge,
  TileMeta,
  TileTitle,
  TodayRibbon,
} from './NutritionWorkspace.capture.styles';

interface CaptureAction {
  tab: Tab;
  icon: ReactNode;
  title: string;
  meta: string;
  badge: string;
  ariaLabel: string;
}

interface NutritionWorkspaceCaptureProps {
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
  summary: MacroSummary | null;
  macroLoading: boolean;
  gentleMode: boolean;
  trainingDay: boolean;
  reduceMotion: boolean;
}

const CAPTURE_ACTIONS: CaptureAction[] = [
  { tab: 'today', icon: <ClipboardCheck size={20} />, title: 'Today Board', meta: 'Diary, targets, and next best action', badge: 'Live', ariaLabel: 'Today' },
  { tab: 'log', icon: <Utensils size={20} />, title: 'Manual Meal', meta: 'Controlled entry for trusted logs', badge: 'Save', ariaLabel: 'Log Meal' },
  { tab: 'search', icon: <ScanBarcode size={20} />, title: 'Search + Barcode', meta: 'USDA and packaged-food lookup via Swan proxy', badge: 'Source', ariaLabel: 'Food Search' },
  { tab: 'voice', icon: <Sparkles size={20} />, title: 'Speak a Meal', meta: 'Draft first, review before the diary', badge: 'Review', ariaLabel: 'Speak a Meal' },
  { tab: 'hydration', icon: <Droplets size={20} />, title: 'Hydration', meta: 'Daily rhythm without macro pressure', badge: 'Rhythm', ariaLabel: 'Hydration' },
  { tab: 'macros', icon: <PieChart size={20} />, title: 'Macro Lens', meta: 'Charts from saved diary entries', badge: 'Proof', ariaLabel: 'My Macros' },
  { tab: 'meal-plan', icon: <Brain size={20} />, title: 'Meal Plan', meta: 'Coach plan drafts with an approval step', badge: 'Plan', ariaLabel: 'Swan Coach Meal Plan' },
  { tab: 'intelligence', icon: <Search size={20} />, title: 'Food Intelligence', meta: 'Nutrition analysis behind the Guardian gate', badge: 'Coach', ariaLabel: 'Intelligence' },
  { tab: 'learn', icon: <BookOpen size={20} />, title: 'Learn', meta: 'NASM-aligned education for better choices', badge: 'Study', ariaLabel: 'Learn' },
];

const DECISION_STEPS = [
  { title: 'Capture', copy: 'Manual, search, barcode, voice, and hydration entries stay distinct.' },
  { title: 'Verify', copy: 'External food data is source-tagged before it reaches the log.' },
  { title: 'Commit', copy: 'Diary writes refresh the same totals used by charts and coaching.' },
  { title: 'Review', copy: 'Trainer review remains separate from client self-logging.' },
];

const MACRO_PULSE_META = [
  { key: 'totalProtein', label: 'Protein', color: 'var(--accent-secondary, #8B5CF6)' },
  { key: 'totalCarbs', label: 'Carbs', color: 'var(--accent-primary, #60C0F0)' },
  { key: 'totalFat', label: 'Fat', color: 'var(--accent-luxury, #C6A84B)' },
] as const;

const metricValue = (value: number | null | undefined, suffix = '') => {
  if (value === null || value === undefined) return '--';
  return `${Math.round(value)}${suffix ? ` ${suffix}` : ''}`;
};

const macroPulseValue = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

const buildMacroPulse = (summary: MacroSummary | null) => {
  const grams = MACRO_PULSE_META.map((item) => macroPulseValue(summary?.[item.key]));
  const total = grams.reduce((sum, value) => sum + value, 0);
  const fallback = total <= 0;
  return {
    total,
    data: MACRO_PULSE_META.map((item, index) => {
      const value = fallback ? 1 : grams[index];
      return {
        x: item.label,
        y: value,
        grams: grams[index],
        percent: fallback ? 0 : Math.round((grams[index] / total) * 100),
        color: item.color,
      };
    }),
  };
};

const NutritionWorkspaceCapture: React.FC<NutritionWorkspaceCaptureProps> = ({
  activeTab,
  onSelectTab,
  summary,
  macroLoading,
  gentleMode,
  trainingDay,
  reduceMotion,
}) => {
  const calorieValue = gentleMode ? 'Hidden' : metricValue(summary?.totalCalories, 'kcal');
  const proteinValue = gentleMode ? 'Hidden' : metricValue(summary?.totalProtein, 'g');
  const fiberValue = gentleMode ? 'Hidden' : metricValue(summary?.totalFiber, 'g');
  const dayStatus = macroLoading ? 'Loading' : trainingDay ? 'Training' : 'Recovery';
  const macroPulse = buildMacroPulse(summary);
  const macroPulseCenter = gentleMode
    ? 'Gentle'
    : macroLoading
      ? 'Sync'
      : macroPulse.total > 0
        ? `${Math.round(macroPulse.total)}g`
        : 'No log';
  const macroPulseCopy = gentleMode
    ? 'Macro numbers hidden'
    : macroPulse.total > 0
      ? 'Saved protein, carbs, and fat'
      : 'Awaiting today\'s diary';

  return (
    <CaptureShell aria-label="Nutrition decision logger overview">
      <TodayRibbon>
        <RibbonCard>
          <RibbonEyebrow>Today</RibbonEyebrow>
          <RibbonValue>{calorieValue}</RibbonValue>
          <RibbonLabel>Calories logged</RibbonLabel>
        </RibbonCard>
        <RibbonCard>
          <RibbonEyebrow>Protein</RibbonEyebrow>
          <RibbonValue>{proteinValue}</RibbonValue>
          <RibbonLabel>From saved diary</RibbonLabel>
        </RibbonCard>
        <RibbonCard>
          <RibbonEyebrow>Fiber</RibbonEyebrow>
          <RibbonValue>{fiberValue}</RibbonValue>
          <RibbonLabel>Food quality signal</RibbonLabel>
        </RibbonCard>
        <RibbonCard>
          <RibbonEyebrow>Mode</RibbonEyebrow>
          <RibbonValue>{gentleMode ? 'Gentle' : dayStatus}</RibbonValue>
          <RibbonLabel>{gentleMode ? 'Numbers softened' : 'Training context'}</RibbonLabel>
        </RibbonCard>
      </TodayRibbon>

      <CaptureGrid>
        <CaptureRail role="tablist" aria-label="Nutrition capture modes">
          {CAPTURE_ACTIONS.map((action) => {
            const active = activeTab === action.tab;
            return (
              <CaptureTile
                key={action.tab}
                id={nutritionTabId(action.tab)}
                type="button"
                $active={active}
                onClick={() => onSelectTab(action.tab)}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                role="tab"
                aria-label={action.ariaLabel}
                aria-selected={active}
                aria-controls={nutritionPanelId(action.tab)}
              >
                <CaptureIcon $active={active}>{action.icon}</CaptureIcon>
                <CaptureCopy>
                  <TileTitle>{action.title}</TileTitle>
                  <TileMeta>{action.meta}</TileMeta>
                </CaptureCopy>
                <TileBadge $active={active}>{action.badge}</TileBadge>
              </CaptureTile>
            );
          })}
        </CaptureRail>

        <SourceTruthRail aria-label="Nutrition source truth">
          <SourceTruthTitle>
            <ShieldCheck size={18} /> Source Truth
          </SourceTruthTitle>
          <SourcePill><CheckCircle2 size={16} /> USDA lookup stays behind Swan API</SourcePill>
          <SourcePill><CheckCircle2 size={16} /> Open Food Facts is proxied and source-tagged</SourcePill>
          <SourcePill><HeartPulse size={16} /> Gentle Mode keeps macro pressure optional</SourcePill>
          <MacroPulsePanel role="group" aria-label={gentleMode ? 'Macro composition hidden by Gentle Mode' : 'Macro composition from saved diary entries'}>
            <MacroPulseChart aria-hidden="true">
              <VictoryPie
                data={macroPulse.data}
                x="x"
                y="y"
                width={150}
                height={150}
                innerRadius={48}
                padAngle={3}
                padding={10}
                labels={() => ''}
                style={{
                  data: {
                    fill: ({ datum }) => String(datum?.color || 'var(--accent-primary, #60C0F0)'),
                    opacity: gentleMode || macroPulse.total <= 0 ? 0.46 : 0.95,
                    stroke: 'var(--primary, #002060)',
                    strokeWidth: 2,
                  },
                }}
              />
              <MacroPulseCenter>
                <strong>{macroPulseCenter}</strong>
                <span>Macro Pulse</span>
              </MacroPulseCenter>
            </MacroPulseChart>
            <MacroPulseLegend>
              <strong>Macro Composition</strong>
              <span>{macroPulseCopy}</span>
              {!gentleMode && macroPulse.total > 0 && macroPulse.data.map((slice) => (
                <MacroPulseLegendItem key={slice.x}>
                  <MacroPulseSwatch $color={slice.color} />
                  {slice.x} {slice.percent}%
                </MacroPulseLegendItem>
              ))}
            </MacroPulseLegend>
          </MacroPulsePanel>
          <DecisionRail>
            {DECISION_STEPS.map((step, index) => (
              <DecisionStep key={step.title}>
                <DecisionDot>{index + 1}</DecisionDot>
                <DecisionStepCopy>
                  <strong>{step.title}</strong>
                  <span>{step.copy}</span>
                </DecisionStepCopy>
                {index < DECISION_STEPS.length - 1 && <DecisionConnector><ArrowRight size={14} /></DecisionConnector>}
              </DecisionStep>
            ))}
          </DecisionRail>
        </SourceTruthRail>
      </CaptureGrid>
    </CaptureShell>
  );
};

export default NutritionWorkspaceCapture;
