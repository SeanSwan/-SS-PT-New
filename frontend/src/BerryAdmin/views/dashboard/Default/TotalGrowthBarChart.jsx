import PropTypes from 'prop-types';
import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// third party
import ApexCharts from 'apexcharts';
import Chart from 'react-apexcharts';

// project imports
import useConfig from '../../../hooks/useConfig';
import SkeletonTotalGrowthBarChart from '../../../ui-component/cards/Skeleton/TotalGrowthBarChart';
import MainCard from '../../../ui-component/cards/MainCard';
import { gridSpacing } from '../../../store/constant';

// chart data
import chartData from './chart-data/total-growth-bar-chart';

const status = [
  {
    value: 'today',
    label: 'Today'
  },
  {
    value: 'month',
    label: 'This Month'
  },
  {
    value: 'year',
    label: 'This Year'
  }
];

export default function TotalGrowthBarChart({ isLoading }) {
  const [value, setValue] = React.useState('today');
  const theme = useTheme();
  const { mode } = useConfig() || { mode: 'light' }; // Provide default value

  // Safe access to theme properties
  const primary = theme?.palette?.text?.primary || '#333333';
  const darkLight = theme?.palette?.dark?.light || '#E0E0E0';
  const divider = theme?.palette?.divider || 'rgba(0, 0, 0, 0.12)';
  const grey500 = theme?.palette?.grey?.[500] || '#9E9E9E';

  const primary200 = theme?.palette?.primary?.[200] || '#90CAF9';
  const primaryDark = theme?.palette?.primary?.dark || '#1565C0';
  const secondaryMain = theme?.palette?.secondary?.main || '#9C27B0';
  const secondaryLight = theme?.palette?.secondary?.light || '#BA68C8';

  React.useEffect(() => {
    // do not load chart when loading
    if (isLoading) return;

    try {
      const newChartData = {
        ...chartData.options,
        colors: [primary200, primaryDark, secondaryMain, secondaryLight],
        xaxis: {
          labels: {
            style: {
              colors: primary
            }
          }
        },
        yaxis: {
          labels: {
            style: {
              colors: primary
            }
          }
        },
        grid: { borderColor: divider },
        tooltip: { theme: mode },
        legend: { labels: { colors: grey500 } }
      };

      ApexCharts.exec(`bar-chart`, 'updateOptions', newChartData);
    } catch (err) {
      console.error('Error updating chart options:', err);
    }
  }, [mode, primary200, primaryDark, secondaryMain, secondaryLight, primary, darkLight, divider, isLoading, grey500]);

  return (
    <>
      {isLoading ? (
        <SkeletonTotalGrowthBarChart />
      ) : (
        <MainCard>
          <Grid container spacing={gridSpacing}>
            <Grid item xs={12}>
              <Grid container alignItems="center" justifyContent="space-between">
                <Grid item>
                  <Grid container direction="column" spacing={1}>
                    <Grid item>
                      <Typography variant="subtitle2">Total Growth</Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant="h3">$2,324.00</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
                  <TextField id="standard-select-currency" select value={value} onChange={(e) => setValue(e.target.value)}>
                    {status.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Grid>
            <Grid
              item
              xs={12}
              sx={{
                // Use a simpler styling approach to avoid issues
                '& .apexcharts-menu': {
                  bgcolor: 'background.paper'
                },
                '& .apexcharts-menu-item:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <Chart {...chartData} />
            </Grid>
          </Grid>
        </MainCard>
      )}
    </>
  );
}

TotalGrowthBarChart.propTypes = { isLoading: PropTypes.bool };