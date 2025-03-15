import React, { useEffect } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';

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
  // Access the current theme settings to adapt the chart's appearance
  const theme = useTheme();

  // Extract the orange dark color from the theme palette for consistent styling
  // Assumes the theme has a secondary color with shade 800 defined
  const orangeDark = theme.palette.secondary[800];

  useEffect(() => {
    // When the component mounts or theme changes, update the chart options
    // This ensures the chart's appearance is consistent with the current theme
    const newSupportChart = {
      ...chartData.options,
      colors: [orangeDark], // Set chart color to match theme
      tooltip: { theme: 'light' } // Set tooltip theme
    };

    // Use ApexCharts exec method to update the chart options without re-rendering
    // 'support-chart' is the ID of the chart defined in chartData
    ApexCharts.exec(`support-chart`, 'updateOptions', newSupportChart);
  }, [orangeDark]); // Dependency on orangeDark ensures the chart updates if theme changes

  return (
    <Card sx={{ bgcolor: 'secondary.light' }}>
      <Grid container sx={{ p: 2, pb: 0, color: '#fff' }}>
        <Grid size={12}>
          <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Grid>
              <Typography variant="subtitle1" sx={{ color: 'secondary.dark' }}>
                Bajaj Finery
              </Typography>
            </Grid>
            <Grid>
              <Typography variant="h4" sx={{ color: 'grey.800' }}>
                $1839.00
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid size={12}>
          <Typography variant="subtitle2" sx={{ color: 'grey.800' }}>
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