import React, { useEffect } from 'react';

// Swan primitives
import { Card, Grid, Typography } from '../ui/primitives/components';

// third party
import ApexCharts from 'apexcharts';
import Chart from 'react-apexcharts';

// project imports
import chartData from './chart-data/bajaj-area-chart';

/**
 * BajajAreaChartCard Component
 *
 * This component renders a specialized area chart card displaying Bajaj Finery financial data.
 * It showcases stock performance with a custom styled area chart that adapts to the theme.
 *
 * The component uses ApexCharts for rendering the visualization and dynamically updates
 * chart colors and tooltip styles based on the current theme settings.
 *
 * The card includes:
 * - A header with the company name (Bajaj Finery)
 * - Current stock price ($1839.00)
 * - Performance indicator (10% Profit)
 * - Area chart visualization of stock performance over time
 */
const BajajAreaChartCard: React.FC = () => {
  // Galaxy-Swan theme: secondary.800
  const orangeDark = '#5e35b1';

  useEffect(() => {
    // When the component mounts or theme changes, update the chart options
    const newSupportChart = {
      ...chartData.options,
      colors: [orangeDark],
      tooltip: { theme: 'light' }
    };

    ApexCharts.exec(`support-chart`, 'updateOptions', newSupportChart);
  }, [orangeDark]);

  return (
    <Card style={{ background: 'rgba(120, 81, 169, 0.15)' }}>
      <Grid container style={{ padding: 16, paddingBottom: 0, color: '#fff' }}>
        <Grid item xs={12}>
          <Grid container style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Grid item>
              <Typography variant="subtitle1" style={{ color: '#7851A9' }}>
                Bajaj Finery
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="h4" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                $1839.00
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            10% Profit
          </Typography>
        </Grid>
      </Grid>
      {/* Render the ApexCharts component with the configuration from chartData */}
      <Chart {...chartData} />
    </Card>
  );
};

export default BajajAreaChartCard;
