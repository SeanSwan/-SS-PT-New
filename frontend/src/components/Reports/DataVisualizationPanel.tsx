// File: frontend/src/components/Reports/DataVisualizationPanel.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { ThemeSettings, MetricsData } from '../../types/reports';

// Import the background texture
import marbleTexture from '../../assets/marble-texture.png'; // Adjust path if needed

// Import recharts components directly
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  AreaChart,
  Area,
  // Import types for custom label props if available, otherwise use 'any' or define manually
  // LabelProps (example name, check recharts actual type)
} from 'recharts';

// --- Type definitions ---
type ChartLabelValue = string | number | null | undefined;
type ActiveTabType = 'overview' | 'intrusions' | 'trends' | 'comparison';
type TimeframeType = 'daily' | 'weekly';
type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'heatmap' | 'calendar';
type ComparisonType = 'humanVsVehicle' | 'weekdayVsWeekend';

// Define Prop Types for Custom Charts
interface HeatMapProps {
  data: HeatmapData[];
  title: string;
  description: string;
  xAxis: string;
  dataKeys: string[];
  colors: string[];
}

interface CalendarHeatMapProps {
  data: CalendarData[];
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  colorScale: string[];
}

// Component Prop Types
interface DataVisualizationPanelProps {
  chartRef: React.RefObject<HTMLDivElement>;
  metrics: MetricsData;
  themeSettings: ThemeSettings;
  setChartDataURL: (dataURL: string | null) => void;
  dateRange: { start: Date; end: Date };
}

// Data Structure Types (Keep existing types)
interface DailyData { day: string; humanIntrusions: number; vehicleIntrusions: number; total: number; }
interface SummaryData { name: string; value: number; }
interface WeekdayWeekendData { name: string; human: number; vehicle: number; total: number; }
interface CalendarData { date: string; value: number; day: string; }
interface TimeSeriesData { day: string; hour: string; human: number; vehicle: number; total: number; }
interface HourlyAggregate { hour: string; human: number; vehicle: number; total: number; }
interface HeatmapData { name: string; morning: number; day: number; evening: number; [key: string]: number | string; }
interface TransformedData { dailyData: DailyData[]; weeklySummary: SummaryData[]; weekdayVsWeekendData: WeekdayWeekendData[]; calendarData: CalendarData[]; timeSeriesData: TimeSeriesData[]; hourlyAggregates: HourlyAggregate[]; heatmapData: HeatmapData[]; }
interface ChartColors { human: string; vehicle: string; weekday: string; weekend: string; morning: string; day: string; evening: string; }
interface ChartButtonProps { active?: boolean; }
interface InsightsData { totalIntrusions: number; peakDay: string; peakHour: string; humanPercentage: number; vehiclePercentage: number; dailyAverage: number; weekdayPercentage: number; weekendPercentage: number; weekdayDailyAvg: number; weekendDailyAvg: number; weekdayTotal: number; weekendTotal: number; }

// --- Custom Label Component for Bar Charts ---
// Explicitly type the props received from LabelList content prop
interface CustomLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number | string | null;
  offset?: number;
  index?: number;
  // Add other potential props if needed based on recharts docs/behavior
}

const CustomBarLabel: React.FC<CustomLabelProps> = (props) => {
  const { x, y, width, height, value } = props;

  // Only render the label if value is a positive number
  if (value === undefined || value === null || typeof value !== 'number' || value <= 0) {
    return null;
  }

  // Basic positioning logic (adjust as needed)
  const labelX = (x ?? 0) + (width ?? 0) / 2;
  const labelY = (y ?? 0) - 5; // Position slightly above the bar top

  return (
    <text
      x={labelX}
      y={labelY}
      fill="#fff" // Direct fill attribute on SVG text element
      fontSize="12px" // Direct fontSize attribute
      textAnchor="middle" // Center text horizontally
      dominantBaseline="bottom" // Align bottom of text with labelY
    >
      {value}
    </text>
  );
};

// --- Custom Components (HeatMap, CalendarHeatMap - unchanged) ---
const HeatMap: React.FC<HeatMapProps> = ({ title, description, data, xAxis, dataKeys }) => (
    <div>
      <h4>{title}</h4>
      <p>{description}</p>
      <p>X-Axis: {xAxis}, Keys: {dataKeys.join(', ')}</p>
      <pre style={{ maxHeight: '150px', overflow: 'auto', background: '#222', color: '#d4af37', padding: '5px' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );

const CalendarHeatMap: React.FC<CalendarHeatMapProps> = ({ title, description, data, startDate, endDate }) => (
    <div>
      <h4>{title}</h4>
      <p>{description}</p>
      <p>Date Range: {format(startDate, 'yyyy-MM-dd')} to {format(endDate, 'yyyy-MM-dd')}</p>
      <pre style={{ maxHeight: '150px', overflow: 'auto', background: '#222', color: '#d4af37', padding: '5px' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );

// --- Styled Components ---
const Section = styled.div`
  margin-bottom: 2rem;
  background-color: #111111; /* Fallback color */
  background-image: url(${marbleTexture}); /* Apply imported texture */
  background-size: cover; /* Cover the entire area */
  background-position: center center; /* Center the image */
  background-repeat: no-repeat; /* Prevent tiling */
  background-blend-mode: overlay; /* Keep existing blend mode */
  color: #d4af37;
  padding: 1.5rem;
  border-radius: 12px;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #d4af37;
  font-weight: 600;
  border-bottom: 2px solid #2a2a2a;
  padding-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const ChartContainer = styled.div`
  margin-top: 1.5rem;
  background-color: #222222; /* Fallback color */
  background-image: url(${marbleTexture}); /* Apply imported texture */
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  background-blend-mode: multiply; /* Example blend mode, adjust as needed */
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
    transform: translateY(-3px);
  }

  @media (max-width: 480px) {
    padding: 1rem;
    margin-top: 1rem;
  }
`;

// ... (ChartOptionsContainer, ChartOptionGroup, ChartOptionLabel, ChartButton remain the same)
const ChartOptionsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const ChartOptionGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const ChartOptionLabel = styled.span`
  font-weight: 500;
  font-size: 0.9rem;
  color: #d4af37;
  white-space: nowrap;

  @media (max-width: 480px) {
    width: 100%;
    margin-bottom: 0.25rem;
  }
`;

const ChartButton = styled.button<ChartButtonProps>`
  padding: 0.5rem 1rem;
  background: ${props => props.active ? '#d4af37' : '#2a2a2a'};
  color: ${props => props.active ? '#222' : '#d4af37'};
  border: 1px solid ${props => props.active ? '#d4af37' : '#444'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#c19b30' : '#333'};
    transform: translateY(-2px);
  }

  @media (max-width: 480px) {
    flex: 1;
    padding: 0.5rem;
    font-size: 0.75rem;
  }
`;

const DataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
`;

const MetricCard = styled.div`
  background-color: #222222; /* Fallback color */
  background-image: url(${marbleTexture}); /* Apply imported texture */
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  background-blend-mode: screen; /* Example blend mode, adjust */
  border-radius: 8px;
  border: 1px solid #333;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  text-align: center;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    border-color: #d4af37;
  }

  @media (max-width: 480px) {
    padding: 1rem;
  }
`;

// ... (MetricValue, MetricLabel, InsightBox, LoadingOverlay, LoadingSpinner remain the same)
const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #d4af37;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.7); /* Add shadow for readability */


  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const MetricLabel = styled.div`
  font-size: 1rem;
  color: #ccc; /* Lighten for better contrast */
  text-shadow: 1px 1px 1px rgba(0,0,0,0.5); /* Add shadow */

  @media (max-width: 480px) {
    font-size: 0.75rem;
  }
`;

const InsightBox = styled.div`
  margin-top: 1.5rem;
  padding: 1.5rem;
  background-color: rgba(17, 17, 17, 0.85); /* Slightly darker semi-transparent */
  border-radius: 8px;
  border-left: 4px solid #d4af37;
  backdrop-filter: blur(2px); /* Optional: blur background behind */

  h4 {
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #d4af37;
  }

  p {
    margin-bottom: 0.75rem;
    font-size: 0.95rem;
    line-height: 1.6;
    color: #ddd; /* Lighten text */
  }

  strong {
    color: #d4af37;
    font-weight: 600;
  }

  @media (max-width: 480px) {
    padding: 1rem;

    h4 {
      font-size: 1rem;
    }

    p {
      font-size: 0.85rem;
    }
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
  border-radius: 12px;
`;

const LoadingSpinner = styled.div`
  border: 4px solid #333;
  border-top: 4px solid #d4af37;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 2s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;


// ... (ChartTab, TabButton, ExportButton, TimeframeTab, TimeframeButton remain the same)
const ChartTab = styled.div`
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #333;
  overflow-x: auto;

  @media (max-width: 640px) {
    -webkit-overflow-scrolling: touch;
    padding-bottom: 1px;

    &::-webkit-scrollbar {
      height: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(212, 175, 55, 0.3);
      border-radius: 4px;
    }
  }
`;

const TabButton = styled.button<{ active: boolean }>`
  padding: 0.75rem 1.25rem;
  background: transparent;
  color: ${props => props.active ? '#d4af37' : '#888'};
  border: none;
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? '#d4af37' : 'transparent'};
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: ${props => props.active ? '#d4af37' : '#aaa'};
  }

  @media (max-width: 480px) {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
`;

const ExportButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #d4af37;
  color: #222;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: #c19b30;
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: #666;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
    margin-top: 0.5rem;
  }
`;

const TimeframeTab = styled.div`
  display: flex;
  margin-bottom: 1rem;
  gap: 0.5rem;
  overflow-x: auto;

  @media (max-width: 640px) {
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;

    &::-webkit-scrollbar {
      height: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(212, 175, 55, 0.3);
      border-radius: 4px;
    }
  }
`;

const TimeframeButton = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  background: ${props => props.active ? '#d4af37' : '#2a2a2a'};
  color: ${props => props.active ? '#222' : '#d4af37'};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${props => props.active ? '#c19b30' : '#333'};
  }

  @media (max-width: 480px) {
    padding: 0.4rem 0.75rem;
    font-size: 0.75rem;
  }
`;


// --- Main Component ---
const DataVisualizationPanel: React.FC<DataVisualizationPanelProps> = ({
  chartRef,
  metrics,
  themeSettings,
  setChartDataURL,
  dateRange,
}) => {
  // --- State --- (unchanged)
  const [activeTab, setActiveTab] = useState<ActiveTabType>('overview');
  const [timeframe, setTimeframe] = useState<TimeframeType>('daily');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [comparisonType, setComparisonType] = useState<ComparisonType>('humanVsVehicle');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChartGenerationRequested, setIsChartGenerationRequested] = useState<boolean>(false);

  // --- Event Handlers --- (unchanged)
   const handleTabChange = useCallback((tab: ActiveTabType) => {
    setActiveTab(tab);
    // Reset chart type to default for the new tab if needed
    const defaultChartTypes: Record<ActiveTabType, ChartType> = {
      overview: 'bar',
      intrusions: 'bar',
      trends: 'line',
      comparison: 'bar',
    };
    setChartType(defaultChartTypes[tab]);
  }, []);

  const handleTimeframeChange = useCallback((tf: TimeframeType) => {
    setTimeframe(tf);
    // Optionally reset chart type if changing timeframe invalidates current one
    if (activeTab === 'trends') setChartType('line');
  }, [activeTab]);

  const handleComparisonTypeChange = useCallback((ct: ComparisonType) => {
    setComparisonType(ct);
     // Optionally reset chart type
     setChartType('bar');
  }, []);

  const handleChartTypeChange = useCallback((ct: ChartType) => {
    setChartType(ct);
  }, []);

  const handleRefreshChart = useCallback(() => {
    setIsChartGenerationRequested(true);
  }, []);

  // --- Helper Functions --- (unchanged)
  const getMetric = useCallback((metricObj: { [key: string]: number } | undefined, key: string): number => {
    return (metricObj && typeof metricObj[key] === 'number' && !isNaN(metricObj[key])) ? metricObj[key] : 0;
  }, []);

  // --- Format Label Value (no longer needed for LabelList style, but kept for Pie charts etc.) ---
  const formatPieLabel = useCallback((props: any): string => {
      const { name, percent, value } = props;
      if (value > 0 && percent > 0.03) { // Only show label if value > 0 and percent > 3%
          return `${name}: ${(percent * 100).toFixed(0)}%`;
      }
      return '';
  }, []);

   const formatPieLabelWithValue = useCallback((props: any): string => {
    const { name, value, percent } = props;
    if (value > 0 && percent > 0.03) {
      return `${name}: ${value} (${(percent * 100).toFixed(1)}%)`;
    }
    return '';
  }, []);


  // --- Effects --- (unchanged, uses chartRef on ChartContainer now)
  useEffect(() => {
    const captureChartAsImage = async () => {
      if (!chartRef.current || !isChartGenerationRequested) return;

      setIsLoading(true);
      try {
        // Add a small delay to ensure rendering completes
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay slightly

        const canvas = await html2canvas(chartRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: null, // Use null to capture with transparent background if needed, or '#1a1a1a' for dark
          logging: true, // Enable logging for debugging html2canvas
          onclone: (document) => {
            // Potentially modify cloned document here if needed for canvas accuracy
             console.log("Cloned document for canvas generation.");
          }
        });

        const dataURL = canvas.toDataURL('image/png');
        setChartDataURL(dataURL);
      } catch (error) {
        console.error('Failed to capture chart as image:', error);
        setChartDataURL(null);
      } finally {
        setIsLoading(false);
        setIsChartGenerationRequested(false);
      }
    };

    if (isChartGenerationRequested) {
        captureChartAsImage();
    }
  }, [chartRef, isChartGenerationRequested, setChartDataURL]);


  // --- Memoized Values --- (CHART_COLORS unchanged)
  const CHART_COLORS = useMemo<ChartColors>(() => ({
    human: themeSettings.primaryColor || '#d4af37',
    vehicle: themeSettings.accentColor || '#ffffff',
    weekday: '#d4af37',
    weekend: '#ffffff',
    morning: '#d4af37',
    day: '#ffffff',
    evening: '#aaaaaa'
  }), [themeSettings]);

  // --- Memoized Data Transformations --- (unchanged)
  const transformedData = useMemo<TransformedData>(() => {
    const safeHumanIntrusions = metrics.humanIntrusions || {};
    const safeVehicleIntrusions = metrics.vehicleIntrusions || {};
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Calculate daily data
    const dailyData: DailyData[] = daysOfWeek.map(day => {
      const human = getMetric(safeHumanIntrusions, day);
      const vehicle = getMetric(safeVehicleIntrusions, day);
      return { day, humanIntrusions: human, vehicleIntrusions: vehicle, total: human + vehicle };
    });

    // Calculate weekly summary
    const totalHuman = Object.values(safeHumanIntrusions).reduce((sum, val) => sum + (val || 0), 0);
    const totalVehicle = Object.values(safeVehicleIntrusions).reduce((sum, val) => sum + (val || 0), 0);
    const weeklySummary: SummaryData[] = [
      { name: 'Human', value: totalHuman },
      { name: 'Vehicle', value: totalVehicle },
    ].filter(item => item.value > 0); // Filter out zero values for pie charts

    // Calculate weekday vs weekend data
    const weekdayDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const weekendDays = ['Saturday', 'Sunday'];
    const weekdayData = {
      human: weekdayDays.reduce((sum, day) => sum + getMetric(safeHumanIntrusions, day), 0),
      vehicle: weekdayDays.reduce((sum, day) => sum + getMetric(safeVehicleIntrusions, day), 0),
    };
    const weekendData = {
      human: weekendDays.reduce((sum, day) => sum + getMetric(safeHumanIntrusions, day), 0),
      vehicle: weekendDays.reduce((sum, day) => sum + getMetric(safeVehicleIntrusions, day), 0),
    };
    const weekdayVsWeekendData: WeekdayWeekendData[] = [
      { name: 'Weekday', human: weekdayData.human, vehicle: weekdayData.vehicle, total: weekdayData.human + weekdayData.vehicle },
      { name: 'Weekend', human: weekendData.human, vehicle: weekendData.vehicle, total: weekendData.human + weekendData.vehicle },
    ];

    // Generate calendar data
    const calendarData: CalendarData[] = [];
    if (dateRange && dateRange.start && dateRange.end) {
        const allDatesInRange: Date[] = [];
        const currentDate = new Date(dateRange.start);
        const finalDate = new Date(dateRange.end);
        while (currentDate <= finalDate) {
            allDatesInRange.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const dayOfWeekCounts: { [key: string]: number } = {};
        allDatesInRange.forEach(date => {
            const dayOfWeek = format(date, 'EEEE');
            dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
        });

        allDatesInRange.forEach(date => {
            const dayOfWeek = format(date, 'EEEE');
            const formattedDate = format(date, 'yyyy-MM-dd');
            const numOccurrences = dayOfWeekCounts[dayOfWeek] || 1;
            const humanDailyTotal = getMetric(safeHumanIntrusions, dayOfWeek);
            const vehicleDailyTotal = getMetric(safeVehicleIntrusions, dayOfWeek);
            const avgValue = (humanDailyTotal + vehicleDailyTotal) / numOccurrences;
            calendarData.push({ date: formattedDate, value: Math.round(avgValue), day: dayOfWeek });
        });
    }

    // Generate time series data
    const generateTimeSeriesData = (): TimeSeriesData[] => {
        const hoursData: TimeSeriesData[] = [];
        daysOfWeek.forEach(day => {
            const baseHuman = getMetric(safeHumanIntrusions, day);
            const baseVehicle = getMetric(safeVehicleIntrusions, day);
            for (let hour = 0; hour < 24; hour++) {
                let activityFactor = 0.5; // Base factor
                // Example: Higher activity during typical commute/late night hours
                if ((hour >= 6 && hour < 9) || (hour >= 17 && hour < 20) || hour >= 23 || hour < 5) {
                    activityFactor = 0.8 + Math.random() * 0.4; // Higher chance
                } else if (hour >= 11 && hour < 14) {
                    activityFactor = 0.4 + Math.random() * 0.3; // Lower chance during midday
                } else {
                    activityFactor = 0.5 + Math.random() * 0.4; // Moderate chance otherwise
                }

                // Ensure distribution respects the daily total more closely (simple scaling)
                const dailyTotal = baseHuman + baseVehicle;
                const hourlyHuman = Math.max(0, Math.round((baseHuman * activityFactor / 24) * (4 + Math.random() * 4) )); // Adjust scaling factor
                const hourlyVehicle = Math.max(0, Math.round((baseVehicle * activityFactor / 24) * (4 + Math.random() * 4) ));

                hoursData.push({ day, hour: `${hour.toString().padStart(2, '0')}:00`, human: hourlyHuman, vehicle: hourlyVehicle, total: hourlyHuman + hourlyVehicle });
            }
        });

        // Normalize hourly data to roughly match daily totals (optional, can be complex)
        // This is a simplified example and might not perfectly match
        daysOfWeek.forEach(day => {
            const dayHourlyData = hoursData.filter(d => d.day === day);
            const currentHourlyTotal = dayHourlyData.reduce((sum, item) => sum + item.total, 0);
            const targetDailyTotal = dailyData.find(d => d.day === day)?.total || 0;
            if (currentHourlyTotal > 0 && targetDailyTotal > 0) {
                const ratio = targetDailyTotal / currentHourlyTotal;
                 dayHourlyData.forEach(item => {
                    item.human = Math.round(item.human * ratio);
                    item.vehicle = Math.round(item.vehicle * ratio);
                    item.total = item.human + item.vehicle;
                 });
            }
        });

        return hoursData;
    };
    const timeSeriesData = generateTimeSeriesData();

    // Aggregate hourly data
    const hourlyAggregates: HourlyAggregate[] = Array.from({ length: 24 }, (_, hour) => {
      const hourStr = `${hour.toString().padStart(2, '0')}:00`;
      const hourData = timeSeriesData.filter(d => d.hour === hourStr);
      return {
        hour: hourStr,
        human: hourData.reduce((sum, item) => sum + item.human, 0),
        vehicle: hourData.reduce((sum, item) => sum + item.vehicle, 0),
        total: hourData.reduce((sum, item) => sum + item.total, 0)
      };
    });

    // Generate heatmap data
    const heatmapData: HeatmapData[] = daysOfWeek.map(day => {
      const dayTimeSeries = timeSeriesData.filter(d => d.day === day);
      return {
        name: day,
        morning: dayTimeSeries.filter(d => parseInt(d.hour) < 8).reduce((sum, item) => sum + item.total, 0),
        day: dayTimeSeries.filter(d => parseInt(d.hour) >= 8 && parseInt(d.hour) < 16).reduce((sum, item) => sum + item.total, 0),
        evening: dayTimeSeries.filter(d => parseInt(d.hour) >= 16).reduce((sum, item) => sum + item.total, 0)
      };
    });

    return { dailyData, weeklySummary, weekdayVsWeekendData, calendarData, timeSeriesData, hourlyAggregates, heatmapData };
  }, [metrics, dateRange, getMetric]); // Removed formatLabelValue dependency here


  // --- Memoized Insights Calculation --- (unchanged)
  const insights = useMemo<InsightsData>(() => {
    // Ensure weeklySummary exists and has entries before accessing
    const humanEntry = transformedData.weeklySummary.find(d => d.name === 'Human');
    const vehicleEntry = transformedData.weeklySummary.find(d => d.name === 'Vehicle');
    const totalHuman = humanEntry?.value || 0;
    const totalVehicle = vehicleEntry?.value || 0;
    const totalIntrusions = totalHuman + totalVehicle;

    const peakDayEntry = transformedData.dailyData.reduce(
      (max, item) => (item.total > max.total ? item : max),
      { day: 'N/A', total: -1, humanIntrusions: 0, vehicleIntrusions: 0 }
    );
    const peakDay = peakDayEntry.total > 0 ? peakDayEntry.day : 'N/A';

    const peakHourEntry = transformedData.hourlyAggregates.reduce(
      (max, item) => (item.total > max.total ? item : max),
      { hour: 'N/A', total: -1, human: 0, vehicle: 0 }
    );
    const peakHour = peakHourEntry.total > 0 ? peakHourEntry.hour : 'N/A';

    const humanPercentage = totalIntrusions > 0 ? (totalHuman / totalIntrusions) * 100 : 0;
    const vehiclePercentage = totalIntrusions > 0 ? (totalVehicle / totalIntrusions) * 100 : 0;

    let numberOfDays = 7;
     if (dateRange && dateRange.start && dateRange.end && dateRange.end >= dateRange.start) {
      // Calculate difference in days correctly
      const start = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate());
      const end = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate());
      const diffTime = Math.abs(end.getTime() - start.getTime());
      numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    }
    const dailyAverage = numberOfDays > 0 ? totalIntrusions / numberOfDays : 0;

    const weekdayEntry = transformedData.weekdayVsWeekendData.find(d => d.name === 'Weekday');
    const weekendEntry = transformedData.weekdayVsWeekendData.find(d => d.name === 'Weekend');
    const weekdayTotal = weekdayEntry?.total || 0;
    const weekendTotal = weekendEntry?.total || 0;

    const totalWeekData = weekdayTotal + weekendTotal; // Use calculated totals
    const weekdayPercentage = totalWeekData > 0 ? (weekdayTotal / totalWeekData) * 100 : 0;
    const weekendPercentage = totalWeekData > 0 ? (weekendTotal / totalWeekData) * 100 : 0;

    let actualWeekdays = 0;
    let actualWeekendDays = 0;
    if (dateRange && dateRange.start && dateRange.end && dateRange.end >= dateRange.start) {
      const current = new Date(dateRange.start);
      const final = new Date(dateRange.end);
      while (current <= final) {
        const dayIndex = current.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayIndex >= 1 && dayIndex <= 5) { // Monday to Friday
          actualWeekdays++;
        } else {
          actualWeekendDays++;
        }
        current.setDate(current.getDate() + 1);
      }
    } else {
        // Default if no range, assume standard week
       actualWeekdays = 5;
       actualWeekendDays = 2;
    }

    // Ensure we don't divide by zero if range is invalid or results in 0 days
    const weekdayDailyAvg = actualWeekdays > 0 ? weekdayTotal / actualWeekdays : 0;
    const weekendDailyAvg = actualWeekendDays > 0 ? weekendTotal / actualWeekendDays : 0;

    return {
      totalIntrusions,
      peakDay,
      peakHour,
      humanPercentage,
      vehiclePercentage,
      dailyAverage: isNaN(dailyAverage) ? 0 : dailyAverage,
      weekdayPercentage: isNaN(weekdayPercentage) ? 0 : weekdayPercentage,
      weekendPercentage: isNaN(weekendPercentage) ? 0 : weekendPercentage,
      weekdayDailyAvg: isNaN(weekdayDailyAvg) ? 0 : weekdayDailyAvg,
      weekendDailyAvg: isNaN(weekendDailyAvg) ? 0 : weekendDailyAvg,
      weekdayTotal,
      weekendTotal
    };
  }, [transformedData, dateRange]);


  // --- Chart Rendering Logic ---
  const renderChart = useCallback(() => {
    const commonProps = { width: "100%" as const, height: 400 }; // Use "as const" for type stability

    const tooltipStyle: any = { // Use 'any' for simplicity or define a specific Tooltip style type
      contentStyle: { backgroundColor: '#333', border: '1px solid #555', color: '#d4af37', borderRadius: '4px', padding: '8px 12px' },
      labelStyle: { color: '#fff', marginBottom: '5px' },
      itemStyle: { color: '#eee' },
      cursor: { fill: 'rgba(212, 175, 55, 0.15)' } // Slightly less opaque cursor
    };

    const legendStyle = { color: '#aaa', marginTop: '10px' }; // Add margin

    try {
      // --- Overview Tab ---
      if (activeTab === 'overview') {
        switch (chartType) {
          case 'bar':
            return (
              <ResponsiveContainer {...commonProps}>
                <BarChart data={transformedData.dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="day" stroke="#aaa" />
                  <YAxis stroke="#aaa" />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="humanIntrusions" name="Human Intrusions" fill={CHART_COLORS.human}>
                    {/* USE CUSTOM LABEL */}
                    <LabelList dataKey="humanIntrusions" content={<CustomBarLabel />} />
                  </Bar>
                  <Bar dataKey="vehicleIntrusions" name="Vehicle Intrusions" fill={CHART_COLORS.vehicle}>
                     {/* USE CUSTOM LABEL */}
                    <LabelList dataKey="vehicleIntrusions" content={<CustomBarLabel />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
          case 'line':
             return (
              <ResponsiveContainer {...commonProps}>
                <LineChart data={transformedData.dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="day" stroke="#aaa" />
                  <YAxis stroke="#aaa" />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />
                  <Line type="monotone" dataKey="humanIntrusions" name="Human Intrusions" stroke={CHART_COLORS.human} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="vehicleIntrusions" name="Vehicle Intrusions" stroke={CHART_COLORS.vehicle} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            );
          case 'pie':
            if (!transformedData.weeklySummary?.length) { // Check length after filtering zero values
              return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>No data for Pie chart.</div>;
            }
            return (
              <ResponsiveContainer {...commonProps}>
                <PieChart>
                  <Pie
                    data={transformedData.weeklySummary}
                    cx="50%" cy="50%"
                    labelLine={true}
                    outerRadius={150}
                    dataKey="value" nameKey="name"
                    label={formatPieLabelWithValue} // Use formatter
                  >
                    {transformedData.weeklySummary.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.name === 'Human' ? CHART_COLORS.human : CHART_COLORS.vehicle} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle.contentStyle} />
                  <Legend wrapperStyle={legendStyle} />
                </PieChart>
              </ResponsiveContainer>
            );
          case 'area':
              return (
                <ResponsiveContainer {...commonProps}>
                  <AreaChart data={transformedData.dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="day" stroke="#aaa" />
                    <YAxis stroke="#aaa" />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={legendStyle} />
                    <Area type="monotone" dataKey="humanIntrusions" name="Human Intrusions" stackId="1" stroke={CHART_COLORS.human} fill={`${CHART_COLORS.human}B3`} />
                    <Area type="monotone" dataKey="vehicleIntrusions" name="Vehicle Intrusions" stackId="1" stroke={CHART_COLORS.vehicle} fill={`${CHART_COLORS.vehicle}80`} />
                  </AreaChart>
                </ResponsiveContainer>
              );
          // ... (heatmap and calendar cases remain the same)
          case 'heatmap':
            return <HeatMap data={transformedData.heatmapData} title="Activity Heatmap by Day and Time" description="Intrusion activity breakdown by day of week and time of day" xAxis="name" dataKeys={['morning', 'day', 'evening']} colors={['#2a2a2a', '#403214', '#624b1d', '#856627', '#a88030', '#cab03a', '#d4af37']} />;
          case 'calendar':
            if (!transformedData.calendarData?.length) return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>No data for Calendar Heatmap.</div>;
            return <CalendarHeatMap data={transformedData.calendarData} title="Activity Calendar" description="Average intrusions by date" startDate={dateRange.start} endDate={dateRange.end} colorScale={['#2a2a2a', '#403214', '#624b1d', '#856627', '#a88030', '#cab03a', '#d4af37']} />;

          default:
            return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>Select a chart type for Overview.</div>;
        }
      }

      // --- Intrusions Tab ---
      else if (activeTab === 'intrusions') {
         switch (chartType) {
          case 'bar':
            return (
              <ResponsiveContainer {...commonProps}>
                <BarChart data={transformedData.dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="day" stroke="#aaa" />
                  <YAxis stroke="#aaa" />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="humanIntrusions" name="Human Intrusions" fill={CHART_COLORS.human} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="humanIntrusions" content={<CustomBarLabel />} />
                  </Bar>
                  <Bar dataKey="vehicleIntrusions" name="Vehicle Intrusions" fill={CHART_COLORS.vehicle} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="vehicleIntrusions" content={<CustomBarLabel />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
           case 'pie': {
            // Filter data with positive values for individual pies
            const humanPieData = transformedData.dailyData.filter(d => d.humanIntrusions > 0);
            const vehiclePieData = transformedData.dailyData.filter(d => d.vehicleIntrusions > 0);
            const weeklyPieData = transformedData.weeklySummary; // Already filtered

            const hasHumanData = humanPieData.length > 0;
            const hasVehicleData = vehiclePieData.length > 0;
            const hasWeeklyData = weeklyPieData.length > 0;

             if (!hasHumanData && !hasVehicleData && !hasWeeklyData) {
               return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>No data available for Pie charts.</div>;
             }

            // Define colors dynamically based on filtered data
            const humanColors = humanPieData.map((_, index) => `hsl(45, 75%, ${30 + index * (60 / Math.max(1, humanPieData.length))}%)`);
            const vehicleColors = vehiclePieData.map((_, index) => `hsl(0, 0%, ${50 + index * (40 / Math.max(1, vehiclePieData.length))}%)`);


            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px' }}>
                  {hasHumanData ? (
                    <div style={{ width: '45%', minWidth: '280px' }}>
                      <h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#d4af37' }}>Human Intrusions by Day</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={humanPieData} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="humanIntrusions" nameKey="day" label={formatPieLabel}>
                            {humanPieData.map((_entry, index) => ( <Cell key={`cell-human-${index}`} fill={humanColors[index % humanColors.length]} /> ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle.contentStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div style={{ color: '#aaa', width: '45%', minWidth: '280px', textAlign: 'center', alignSelf: 'center' }}>No Human data.</div>}

                  {hasVehicleData ? (
                    <div style={{ width: '45%', minWidth: '280px' }}>
                      <h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#d4af37' }}>Vehicle Intrusions by Day</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={vehiclePieData} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="vehicleIntrusions" nameKey="day" label={formatPieLabel}>
                             {vehiclePieData.map((_entry, index) => ( <Cell key={`cell-vehicle-${index}`} fill={vehicleColors[index % vehicleColors.length]} /> ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle.contentStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div style={{ color: '#aaa', width: '45%', minWidth: '280px', textAlign: 'center', alignSelf: 'center' }}>No Vehicle data.</div>}
                </div>

                {hasWeeklyData ? (
                  <div style={{ width: '60%', minWidth: '280px' }}>
                    <h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#d4af37' }}>Total Intrusion Distribution</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={weeklyPieData} cx="50%" cy="50%" labelLine={true} outerRadius={100} dataKey="value" nameKey="name" label={formatPieLabelWithValue}>
                           {weeklyPieData.map((entry) => ( <Cell key={`dist-${entry.name}`} fill={entry.name === 'Human' ? CHART_COLORS.human : CHART_COLORS.vehicle} /> ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle.contentStyle} />
                        <Legend wrapperStyle={legendStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div style={{ color: '#aaa', width: '60%', minWidth: '280px', textAlign: 'center', marginTop: '20px' }}>No Total data.</div>}
              </div>
            );
          }
           case 'heatmap':
             return <HeatMap data={transformedData.heatmapData} title="Intrusion Heatmap by Day and Time" description="Activity breakdown across day/time" xAxis="name" dataKeys={['morning', 'day', 'evening']} colors={['#2a2a2a', '#403214', '#624b1d', '#856627', '#a88030', '#cab03a', '#d4af37']} />;
          default:
            return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>Select Bar, Pie, or Heatmap for Intrusions.</div>;
        }
      }

      // --- Trends Tab ---
      else if (activeTab === 'trends') {
         if (timeframe === 'daily') { // Hourly
            if (!transformedData.hourlyAggregates?.length || transformedData.hourlyAggregates.every(d => d.total === 0)) return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>No data for Hourly Trends.</div>;
            switch (chartType) {
                case 'line': return <ResponsiveContainer {...commonProps}><LineChart data={transformedData.hourlyAggregates} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#444" /><XAxis dataKey="hour" stroke="#aaa" /><YAxis stroke="#aaa" /><Tooltip {...tooltipStyle} /><Legend wrapperStyle={legendStyle} /><Line type="monotone" dataKey="human" name="Human" stroke={CHART_COLORS.human} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} /><Line type="monotone" dataKey="vehicle" name="Vehicle" stroke={CHART_COLORS.vehicle} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer>;
                case 'bar': return <ResponsiveContainer {...commonProps}><BarChart data={transformedData.hourlyAggregates} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#444" /><XAxis dataKey="hour" stroke="#aaa" /><YAxis stroke="#aaa" /><Tooltip {...tooltipStyle} /><Legend wrapperStyle={legendStyle} /><Bar dataKey="human" name="Human" fill={CHART_COLORS.human}><LabelList dataKey="human" content={<CustomBarLabel />} /></Bar><Bar dataKey="vehicle" name="Vehicle" fill={CHART_COLORS.vehicle}><LabelList dataKey="vehicle" content={<CustomBarLabel />} /></Bar></BarChart></ResponsiveContainer>;
                case 'area': return <ResponsiveContainer {...commonProps}><AreaChart data={transformedData.hourlyAggregates} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#444" /><XAxis dataKey="hour" stroke="#aaa" /><YAxis stroke="#aaa" /><Tooltip {...tooltipStyle} /><Legend wrapperStyle={legendStyle} /><Area type="monotone" dataKey="human" name="Human" stackId="1" stroke={CHART_COLORS.human} fill={`${CHART_COLORS.human}B3`} /><Area type="monotone" dataKey="vehicle" name="Vehicle" stackId="1" stroke={CHART_COLORS.vehicle} fill={`${CHART_COLORS.vehicle}80`} /></AreaChart></ResponsiveContainer>;
                default: return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>Select Line, Bar, or Area for Hourly Trends.</div>;
            }
        } else { // Weekly
            if (!transformedData.dailyData?.length || transformedData.dailyData.every(d => d.total === 0)) return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>No data for Weekly Trends.</div>;
             switch (chartType) {
                case 'line': return <ResponsiveContainer {...commonProps}><LineChart data={transformedData.dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#444" /><XAxis dataKey="day" stroke="#aaa" /><YAxis stroke="#aaa" /><Tooltip {...tooltipStyle} /><Legend wrapperStyle={legendStyle} /><Line type="monotone" dataKey="total" name="Total Activity" stroke="#d4af37" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer>;
                case 'area': return <ResponsiveContainer {...commonProps}><AreaChart data={transformedData.dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#444" /><XAxis dataKey="day" stroke="#aaa" /><YAxis stroke="#aaa" /><Tooltip {...tooltipStyle} /><Legend wrapperStyle={legendStyle} /><Area type="monotone" dataKey="total" name="Total Activity" stroke="#d4af37" fill="#d4af3780" /></AreaChart></ResponsiveContainer>;
                case 'bar': return <ResponsiveContainer {...commonProps}><BarChart data={transformedData.dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#444" /><XAxis dataKey="day" stroke="#aaa" /><YAxis stroke="#aaa" /><Tooltip {...tooltipStyle} /><Legend wrapperStyle={legendStyle} /><Bar dataKey="total" name="Total Activity" fill="#d4af37"><LabelList dataKey="total" content={<CustomBarLabel />} /></Bar></BarChart></ResponsiveContainer>;
                default: return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>Select Line, Area, or Bar for Weekly Trends.</div>;
            }
        }
      }

      // --- Comparison Tab ---
      else if (activeTab === 'comparison') {
         if (comparisonType === 'humanVsVehicle') {
            if (!transformedData.weeklySummary?.length) return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>No data for Human vs Vehicle comparison.</div>;
             switch (chartType) {
                case 'pie': return <ResponsiveContainer {...commonProps}><PieChart><Pie data={transformedData.weeklySummary} cx="50%" cy="50%" labelLine={true} outerRadius={150} dataKey="value" nameKey="name" label={formatPieLabelWithValue}>{transformedData.weeklySummary.map((entry) => (<Cell key={`compare-${entry.name}`} fill={entry.name === 'Human' ? CHART_COLORS.human : CHART_COLORS.vehicle} />))}</Pie><Tooltip contentStyle={tooltipStyle.contentStyle} /><Legend wrapperStyle={legendStyle} /></PieChart></ResponsiveContainer>;
                case 'bar': return <ResponsiveContainer {...commonProps}><BarChart data={transformedData.weeklySummary} layout="vertical" margin={{ top: 5, right: 50, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} /><XAxis type="number" stroke="#aaa" /><YAxis type="category" dataKey="name" width={80} stroke="#aaa" /><Tooltip {...tooltipStyle} /><Bar dataKey="value" name="Count">{transformedData.weeklySummary.map((entry) => (<Cell key={`cell-${entry.name}`} fill={entry.name === 'Human' ? CHART_COLORS.human : CHART_COLORS.vehicle} />))}<LabelList dataKey="value" position="right" content={<CustomBarLabel />} /></Bar></BarChart></ResponsiveContainer>; // Note: CustomBarLabel might need adjustment for vertical bars
                default: return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>Select Pie or Bar for Human vs Vehicle.</div>;
            }
        } else { // weekdayVsWeekend
             const weekdayWeekendCompData = [{ name: 'Weekday', value: insights.weekdayTotal }, { name: 'Weekend', value: insights.weekendTotal }].filter(d => d.value > 0);
             const dailyAvgCompData = [{ name: 'Weekday', value: insights.weekdayDailyAvg }, { name: 'Weekend', value: insights.weekendDailyAvg }].filter(d => d.value > 0);

             if (weekdayWeekendCompData.length === 0 && dailyAvgCompData.length === 0) return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>No data for Weekday vs Weekend comparison.</div>;

             switch (chartType) {
                case 'bar':
                     if (!transformedData.weekdayVsWeekendData?.length || transformedData.weekdayVsWeekendData.every(d => d.total === 0)) return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>No data for Weekday vs Weekend comparison bars.</div>;
                     return <ResponsiveContainer {...commonProps}><BarChart data={transformedData.weekdayVsWeekendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#444" /><XAxis dataKey="name" stroke="#aaa" /><YAxis stroke="#aaa" /><Tooltip {...tooltipStyle} /><Legend wrapperStyle={legendStyle} /><Bar dataKey="human" name="Human" stackId="a" fill={CHART_COLORS.human}><LabelList dataKey="human" content={<CustomBarLabel />} /></Bar><Bar dataKey="vehicle" name="Vehicle" stackId="a" fill={CHART_COLORS.vehicle}><LabelList dataKey="vehicle" content={<CustomBarLabel />} /></Bar></BarChart></ResponsiveContainer>;
                case 'pie':
                     return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                            <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px' }}>
                                {weekdayWeekendCompData.length > 0 ? (<div style={{ width: '45%', minWidth: '280px' }}><h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#d4af37' }}>Total: Weekday vs Weekend</h4><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={weekdayWeekendCompData} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value" nameKey="name" label={formatPieLabel}>{weekdayWeekendCompData.map((entry) => (<Cell key={`weekday-${entry.name}`} fill={entry.name === 'Weekday' ? CHART_COLORS.weekday : CHART_COLORS.weekend} />))}</Pie><Tooltip contentStyle={tooltipStyle.contentStyle} /></PieChart></ResponsiveContainer></div>) : (<div style={{ color: '#aaa', width: '45%', minWidth: '280px', textAlign: 'center', alignSelf: 'center' }}>No total data.</div>)}
                                {dailyAvgCompData.length > 0 ? (<div style={{ width: '45%', minWidth: '280px' }}><h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#d4af37' }}>Daily Average Comparison</h4><ResponsiveContainer width="100%" height={250}><BarChart data={dailyAvgCompData} layout="vertical" margin={{ top: 5, right: 50, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} /><XAxis type="number" stroke="#aaa" /><YAxis type="category" dataKey="name" width={80} stroke="#aaa" /><Tooltip {...tooltipStyle} /><Bar dataKey="value" name="Daily Average">{dailyAvgCompData.map((entry) => (<Cell key={`cell-avg-${entry.name}`} fill={entry.name === 'Weekday' ? CHART_COLORS.weekday : CHART_COLORS.weekend} />))}<LabelList dataKey="value" position="right" content={<CustomBarLabel />} /></Bar></BarChart></ResponsiveContainer></div>) : (<div style={{ color: '#aaa', width: '45%', minWidth: '280px', textAlign: 'center', alignSelf: 'center' }}>No daily avg data.</div>)}
                            </div>
                        </div>
                    );
                default: return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>Select Bar or Pie for Weekday vs Weekend.</div>;
            }
        }
      }

      return <div style={{ color: '#d4af37', textAlign: 'center', paddingTop: '20px' }}>Please select a tab and chart type.</div>; // Fallback

    } catch (error) {
      console.error("Error rendering chart:", error);
      // Consider using a more user-friendly error display, perhaps with an error boundary
      return (
        <div style={{ color: 'red', padding: '20px', border: '1px solid red', backgroundColor: '#331111', borderRadius: '8px' }}>
          An error occurred while rendering the chart. Details logged to console.
        </div>
      );
    }
  }, [
    activeTab,
    chartType,
    comparisonType,
    timeframe,
    transformedData,
    CHART_COLORS,
    // formatLabelValue is no longer needed here for LabelList, but keep for formatPieLabel dependencies
    formatPieLabel,
    formatPieLabelWithValue,
    insights,
    dateRange
  ]);

  // --- Insights Component --- (unchanged)
  const renderInsights = useCallback(() => {
    if (insights.totalIntrusions === 0) {
      return <p>No intrusion data available for the selected period to generate insights.</p>;
    }

    if (activeTab === 'overview') {
      return (
        <>
          <p><strong>Overview:</strong> Total intrusions: <strong>{insights.totalIntrusions}</strong> ({dateRange.start && format(dateRange.start, 'MMM d')} - {dateRange.end && format(dateRange.end, 'MMM d')}). {insights.peakDay !== 'N/A' && `Peak day: <strong>${insights.peakDay}</strong>.`} Daily average: <strong>{insights.dailyAverage.toFixed(1)}</strong> intrusions.</p>
          <p><strong>Distribution:</strong> Human: <strong>{insights.humanPercentage.toFixed(1)}%</strong>, Vehicle: <strong>{insights.vehiclePercentage.toFixed(1)}%</strong>. {insights.humanPercentage > insights.vehiclePercentage ? 'Human events were more frequent.' : insights.vehiclePercentage > insights.humanPercentage ? 'Vehicle events were more frequent.' : 'Human and Vehicle events were balanced.'} {insights.peakHour !== 'N/A' && `Peak hour: ${insights.peakHour}.`}</p>
        </>
      );
    } else if (activeTab === 'intrusions') {
        return (
            <>
            <p><strong>Intrusion Types:</strong> The most common type was <strong>{insights.humanPercentage > insights.vehiclePercentage ? 'Human' : (insights.vehiclePercentage > 0 ? 'Vehicle' : 'N/A')}</strong> ({Math.max(insights.humanPercentage, insights.vehiclePercentage).toFixed(1)}%).</p>
            <p><strong>Weekly Pattern:</strong> {insights.weekdayPercentage.toFixed(1)}% of intrusions occurred on weekdays vs {insights.weekendPercentage.toFixed(1)}% on weekends. {insights.peakDay !== 'N/A' && ` ${insights.peakDay} had the highest activity with ${transformedData.dailyData.find(d => d.day === insights.peakDay)?.total || 0} intrusions.`}</p>
            </>
        );
    } else if (activeTab === 'trends') {
      if (timeframe === 'daily') {
          return (
            <>
            <p><strong>Hourly Trend:</strong> {insights.peakHour !== 'N/A' ? `Peak activity occurs around <strong>${insights.peakHour}</strong>.` : 'Hourly activity pattern observed.'} Activity levels suggest vigilance needed particularly during {parseInt(insights.peakHour || '-1') < 6 || parseInt(insights.peakHour || '-1') >= 22 ? ' night/early morning' : ' day/evening'} hours.</p>
            <p><strong>Actionable:</strong> Consider adjusting patrol schedules or sensor sensitivity based on these hourly patterns.</p>
            </>
        );
      } else {
          return (
            <>
            <p><strong>Weekly Trend:</strong> {insights.peakDay !== 'N/A' ? `Activity peaked on <strong>${insights.peakDay}</strong>.` : 'Weekly activity pattern observed.'} The general trend across the week shows {transformedData.dailyData[0]?.total > transformedData.dailyData[transformedData.dailyData.length - 1]?.total ? ' a decrease' : ' an increase'} towards the end of the week.</p>
            <p><strong>Actionable:</strong> {insights.peakDay !== 'N/A' ? `Focus resources on higher activity days like ${insights.peakDay}.` : 'Analyze weekly trends for resource allocation.'}</p>
            </>
          );
      }
    } else if (activeTab === 'comparison') {
        if (comparisonType === 'humanVsVehicle') {
            return (
                <>
                <p><strong>Human vs Vehicle:</strong> The ratio is <strong>{insights.humanPercentage.toFixed(1)}% Human</strong> to <strong>{insights.vehiclePercentage.toFixed(1)}% Vehicle</strong> intrusions.</p>
                <p><strong>Recommendation:</strong> {Math.abs(insights.humanPercentage - insights.vehiclePercentage) < 10 ? ' Maintain balanced monitoring for both.' : ` Prioritize monitoring for ${insights.humanPercentage > insights.vehiclePercentage ? 'pedestrian' : 'vehicle'} activity.`}</p>
                </>
            );
        } else {
            return (
                <>
                <p><strong>Weekday vs Weekend:</strong> Weekdays account for <strong>{insights.weekdayPercentage.toFixed(1)}%</strong> of intrusions, weekends for <strong>{insights.weekendPercentage.toFixed(1)}%</strong>.</p>
                <p><strong>Daily Average:</strong> Weekdays average <strong>{insights.weekdayDailyAvg.toFixed(1)}</strong> intrusions/day, weekends average <strong>{insights.weekendDailyAvg.toFixed(1)}</strong>/day. Focus efforts where the daily average is higher ({insights.weekdayDailyAvg > insights.weekendDailyAvg ? 'weekdays' : 'weekends'}).</p>
                </>
            );
        }
    }
    return null;
  }, [activeTab, timeframe, comparisonType, insights, dateRange, transformedData.dailyData]);

  // --- Chart Type Options Component --- (unchanged)
  const renderChartTypeOptions = useMemo(() => {
    const allowedTypes: Record<ActiveTabType, ChartType[]> = {
      overview: ['bar', 'line', 'pie', 'area', 'heatmap', 'calendar'],
      intrusions: ['bar', 'pie', 'heatmap'],
      trends: ['line', 'bar', 'area'],
      comparison: ['bar', 'pie'],
    };

    return allowedTypes[activeTab].map(type => (
      <ChartButton
        key={type}
        active={chartType === type}
        onClick={() => handleChartTypeChange(type)}
      >
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </ChartButton>
    ));
  }, [activeTab, chartType, handleChartTypeChange]);

  // --- Component Rendering ---
  return (
    <Section>
      <SectionTitle>
        Data Visualization & Analytics
        <ExportButton
          onClick={handleRefreshChart}
          disabled={isLoading || isChartGenerationRequested}
          title="Generate a new image capture of the current chart"
        >
          <span>{isLoading ? '⏳' : '📷'}</span> {/* Changed icon */}
          {isLoading || isChartGenerationRequested ? 'Generating...' : 'Capture Chart Image'}
        </ExportButton>
      </SectionTitle>

      {/* Key metrics summary */}
      <DataGrid>
        <MetricCard>
          <MetricValue>{insights.totalIntrusions}</MetricValue>
          <MetricLabel>Total Intrusions</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{insights.peakDay !== 'N/A' ? insights.peakDay : '--'}</MetricValue>
          <MetricLabel>Peak Activity Day</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{insights.humanPercentage.toFixed(1)}%</MetricValue>
          <MetricLabel>Human Intrusions</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{insights.vehiclePercentage.toFixed(1)}%</MetricValue>
          <MetricLabel>Vehicle Intrusions</MetricLabel>
        </MetricCard>
      </DataGrid>

      {/* Chart Tabs */}
      <ChartTab>
        <TabButton active={activeTab === 'overview'} onClick={() => handleTabChange('overview')}>Overview</TabButton>
        <TabButton active={activeTab === 'intrusions'} onClick={() => handleTabChange('intrusions')}>Intrusion Analysis</TabButton>
        <TabButton active={activeTab === 'trends'} onClick={() => handleTabChange('trends')}>Trends & Patterns</TabButton>
        <TabButton active={activeTab === 'comparison'} onClick={() => handleTabChange('comparison')}>Comparisons</TabButton>
      </ChartTab>

      {/* Conditional Options */}
      {activeTab === 'trends' && (
        <TimeframeTab>
          <TimeframeButton active={timeframe === 'daily'} onClick={() => handleTimeframeChange('daily')}>Hourly Breakdown</TimeframeButton>
          <TimeframeButton active={timeframe === 'weekly'} onClick={() => handleTimeframeChange('weekly')}>Weekly Trends</TimeframeButton>
        </TimeframeTab>
      )}

      {activeTab === 'comparison' && (
        <TimeframeTab>
          <TimeframeButton active={comparisonType === 'humanVsVehicle'} onClick={() => handleComparisonTypeChange('humanVsVehicle')}>Human vs Vehicle</TimeframeButton>
          <TimeframeButton active={comparisonType === 'weekdayVsWeekend'} onClick={() => handleComparisonTypeChange('weekdayVsWeekend')}>Weekday vs Weekend</TimeframeButton>
        </TimeframeTab>
      )}

      {/* Chart Type Options */}
      <ChartOptionsContainer>
        <ChartOptionGroup>
          <ChartOptionLabel>Chart Type:</ChartOptionLabel>
          {renderChartTypeOptions}
        </ChartOptionGroup>
      </ChartOptionsContainer>

      {/* Chart container - Attach ref here */}
      <ChartContainer ref={chartRef}>
        <div style={{ position: 'relative', minHeight: '410px' }}> {/* Ensure div has height */}
          {renderChart()}
          {(isLoading || isChartGenerationRequested) && ( // Show loading overlay during generation
            <LoadingOverlay>
              <LoadingSpinner />
            </LoadingOverlay>
          )}
        </div>
      </ChartContainer>

      {/* Insight box */}
      <InsightBox>
        <h4>🔍 AI-Generated Insights</h4>
        {renderInsights()}
      </InsightBox>
    </Section>
  );
};

export default DataVisualizationPanel;