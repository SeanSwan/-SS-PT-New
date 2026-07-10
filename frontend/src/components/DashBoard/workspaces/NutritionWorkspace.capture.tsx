import type { ReactNode } from 'react';
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  Mic,
  ScanBarcode,
  Search,
  ShieldCheck,
  Utensils,
} from 'lucide-react';
import { VictoryPie } from 'victory';
import type { MacroSummary } from '../../../hooks/useMacroSummary';
import type { Tab } from './NutritionWorkspace.tabs';
import {
  CaptureCopy,
  CaptureGrid,
  CaptureIcon,
  CaptureRail,
  CaptureShell,
  CaptureTile,
  LiveStatusGrid,
  LiveStatusRow,
  MacroPulseCenter,
  MacroPulseChart,
  MacroPulseLegend,
  MacroPulseLegendItem,
  MacroPulsePanel,
  MacroPulseSwatch,
  RibbonAction,
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
  { tab: 'log', icon: <Utensils size={20} />, title: 'Manual Meal', meta: 'Typed foods and servings', badge: 'Manual', ariaLabel: 'Manual Meal' },
  { tab: 'search', icon: <Search size={20} />, title: 'Food Search', meta: 'USDA and packaged matches', badge: 'Lookup', ariaLabel: 'Food Search' },
  { tab: 'barcode', icon: <ScanBarcode size={20} />, title: 'Barcode', meta: 'Product label and serving', badge: 'Scan', ariaLabel: 'Barcode' },
  { tab: 'voice', icon: <Mic size={20} />, title: 'Speak a Meal', meta: 'Spoken meal estimate', badge: 'Voice', ariaLabel: 'Speak a Meal' },
  { tab: 'restaurant', icon: <Building2 size={20} />, title: 'Restaurant', meta: 'Brand and menu item', badge: 'Menu', ariaLabel: 'Restaurant' },
];

const MACRO_RING_SIZE = 160;
const MACRO_RING_INNER_RATIO = 0.32;

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

  const diaryCount = summary?.mealCount || 0;
  const diaryStatus = macroLoading
    ? 'Syncing diary'
    : diaryCount > 0
      ? [diaryCount, diaryCount === 1 ? 'meal' : 'meals', 'saved'].join(' ')
      : 'No meals saved';
  const reviewStatus = diaryCount > 0 ? 'Diary ready' : 'Queue clear';
  return (
    <CaptureShell aria-label="Nutrition decision logger overview">
      <TodayRibbon>
        <RibbonCard $primary>
          <div>
            <RibbonEyebrow>Today</RibbonEyebrow>
            <RibbonValue>{calorieValue}</RibbonValue>
            <RibbonLabel>Calories logged</RibbonLabel>
          </div>
          <RibbonAction
            type="button"
            aria-pressed={activeTab === 'today'}
            onClick={() => onSelectTab('today')}
          >
            <ClipboardCheck size={16} /> Open Today
          </RibbonAction>
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
        <CaptureRail role="navigation" aria-label="Nutrition capture modes">
          {CAPTURE_ACTIONS.map((action) => {
            const active = activeTab === action.tab;
            return (
              <CaptureTile
                key={action.tab}
                type="button"
                $active={active}
                onClick={() => onSelectTab(action.tab)}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                aria-label={action.ariaLabel}
                aria-pressed={active}
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
          <SourcePill><CheckCircle2 size={16} /> Reviewed saves: Atomic</SourcePill>
          <SourcePill><CheckCircle2 size={16} /> Source tags: Preserved</SourcePill>
          <SourcePill><HeartPulse size={16} /> Pressure setting: {gentleMode ? 'Gentle' : 'Standard'}</SourcePill>
          <MacroPulsePanel role="group" aria-label={gentleMode ? 'Macro composition hidden by Gentle Mode' : 'Macro composition from saved diary entries'}>
            <MacroPulseChart aria-hidden="true">
              <VictoryPie
                data={macroPulse.data}
                x="x"
                y="y"
                width={MACRO_RING_SIZE}
                height={MACRO_RING_SIZE}
                innerRadius={MACRO_RING_SIZE * MACRO_RING_INNER_RATIO}
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
          <LiveStatusGrid aria-label="Current nutrition status">
            <LiveStatusRow><span>Diary</span><strong>{diaryStatus}</strong></LiveStatusRow>
            <LiveStatusRow><span>Day context</span><strong>{dayStatus}</strong></LiveStatusRow>
            <LiveStatusRow><span>Review state</span><strong>{reviewStatus}</strong></LiveStatusRow>
          </LiveStatusGrid>
        </SourceTruthRail>
      </CaptureGrid>
    </CaptureShell>
  );
};

export default NutritionWorkspaceCapture;
