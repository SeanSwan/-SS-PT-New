import { ApexOptions } from 'apexcharts';

/**
 * Interface for Total Order Line Chart data
 * Combines ApexCharts options with series data and height
 */
interface TotalOrderLineChartData {
  /**
   * Chart type - set to 'line' for line charts
   */
  type: 'line';
  
  /**
   * Height of the chart in pixels
   */
  height: number;
  
  /**
   * ApexCharts configuration options
   */
  options: ApexOptions;
  
  /**
   * Data series for the chart
   */
  series: {
    name: string;
    data: number[];
  }[];
}

/**
 * Chart configuration for the Yearly Total Order Line Chart
 * 
 * This chart displays yearly order data as a small sparkline chart.
 * It's designed to be compact, showing only the trend line without axes or labels,
 * making it ideal for inclusion in dashboard cards with limited space.
 * 
 * Features:
 * - Sparkline design (minimalist chart without axes or labels)
 * - Smooth curved line for better visual appeal
 * - Fixed height of 90px designed for the card format
 * - White line color optimized for dark backgrounds
 * - Custom tooltip showing only relevant order information
 * - Data represents yearly ordering pattern
 * 
 * This chart shares the same configuration as the monthly chart but with
 * different data points representing yearly trends instead of monthly patterns.
 */
const chartData: TotalOrderLineChartData = {
  type: 'line',
  height: 90,
  options: {
    chart: {
      sparkline: {
        enabled: true
      }
    },
    dataLabels: {
      enabled: false
    },
    colors: ['#fff'],
    fill: {
      type: 'solid',
      opacity: 1
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: {
        show: false
      }
    },
    tooltip: {
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: (seriesName: string) => 'Total Order'
        }
      },
      marker: {
        show: false
      }
    }
  },
  series: [
    {
      name: 'series1',
      data: [35, 44, 9, 54, 45, 66, 41, 69]
    }
  ]
};

export default chartData;