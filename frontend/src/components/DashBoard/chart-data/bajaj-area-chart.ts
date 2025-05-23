import { ApexOptions } from 'apexcharts';

/**
 * Interface for the Bajaj Area Chart configuration
 * Combines ApexCharts options with series data and height
 */
interface BajajAreaChartData {
  /**
   * Chart type - set to 'area' for area charts
   */
  type: 'area';
  
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
    data: number[];
  }[];
}

/**
 * Chart configuration for the Bajaj Area Chart
 * 
 * This chart displays Bajaj Finery stock performance as a minimalist area chart.
 * It's designed as a sparkline (small, inline chart without axes) for compact 
 * display within the dashboard card.
 * 
 * Features:
 * - Smooth curved lines for better visual appeal
 * - Simplified tooltip showing only relevant information
 * - No data labels to maintain clean appearance
 * - Fixed height of 95px designed for the card format
 */
const chartData: BajajAreaChartData = {
  type: 'area',
  height: 95,
  options: {
    chart: {
      id: 'support-chart',
      sparkline: {
        enabled: true
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 1
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
          formatter: (seriesName: string) => 'Ticket '
        }
      },
      marker: {
        show: false
      }
    }
  },
  series: [
    {
      data: [0, 15, 10, 50, 30, 40, 25]
    }
  ]
};

export default chartData;