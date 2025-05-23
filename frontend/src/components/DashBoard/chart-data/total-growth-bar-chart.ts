import { ApexOptions } from 'apexcharts';

/**
 * Interface for Total Growth Bar Chart data
 * Combines ApexCharts options with series data and height
 */
interface TotalGrowthBarChartData {
  /**
   * Height of the chart in pixels
   */
  height: number;
  
  /**
   * Chart type - set to 'bar' for bar charts
   */
  type: 'bar';
  
  /**
   * ApexCharts configuration options
   */
  options: ApexOptions;
  
  /**
   * Data series for the chart
   * Each series represents a category (Investment, Loss, Profit, Maintenance)
   */
  series: {
    name: string;
    data: number[];
  }[];
}

/**
 * Chart configuration for the Total Growth Bar Chart
 * 
 * This chart displays financial metrics across multiple categories by month.
 * It uses a stacked bar chart to visualize the relative contribution of each category
 * to the overall financial performance.
 * 
 * Features:
 * - Stacked bar design showing cumulative values
 * - Monthly data across a full year (Jan-Dec)
 * - Four data series: Investment, Loss, Profit, and Maintenance
 * - Responsive design that adapts to different screen sizes
 * - Customizable column width (50%)
 * - Interactive legend with custom styling
 * - Zoom capability for detailed analysis
 */
const chartData: TotalGrowthBarChartData = {
  height: 480,
  type: 'bar',
  options: {
    chart: {
      id: 'bar-chart',
      stacked: true,
      toolbar: {
        show: true
      },
      zoom: {
        enabled: true
      }
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          legend: {
            position: 'bottom',
            offsetX: -10,
            offsetY: 0
          }
        }
      }
    ],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%'
      }
    },
    xaxis: {
      type: 'category',
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    },
    legend: {
      show: true,
      fontFamily: `'Roboto', sans-serif`,
      position: 'bottom',
      offsetX: 20,
      labels: {
        useSeriesColors: false
      },
      markers: {
        width: 16,
        height: 16,
        radius: 5
      },
      itemMargin: {
        horizontal: 15,
        vertical: 8
      }
    },
    fill: {
      type: 'solid'
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      show: true
    }
  },
  series: [
    {
      name: 'Investment',
      data: [35, 125, 35, 35, 35, 80, 35, 20, 35, 45, 15, 75]
    },
    {
      name: 'Loss',
      data: [35, 15, 15, 35, 65, 40, 80, 25, 15, 85, 25, 75]
    },
    {
      name: 'Profit',
      data: [35, 145, 35, 35, 20, 105, 100, 10, 65, 45, 30, 10]
    },
    {
      name: 'Maintenance',
      data: [0, 0, 75, 0, 0, 115, 0, 0, 0, 0, 150, 0]
    }
  ]
};

export default chartData;