import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Grid,
  Skeleton,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import MainCard from '../ui/MainCard';
// Fix: Changed ArrowUpward to TrendingUp from lucide-react
import { TrendingUp } from 'lucide-react';

// Import chart components
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// Types
interface ClientProgressChartProps {
  isLoading: boolean;
}

/**
 * Client Progress Chart (formerly TotalOrderLineChartCard)
 * 
 * Displays client fitness progress over time with options to view different
 * time periods (weekly, monthly, yearly). The chart visualizes key metrics
 * like weight loss, strength gains, or cardiovascular improvements.
 */
const ClientProgressChart: React.FC<ClientProgressChartProps> = ({ isLoading }) => {
  const theme = useTheme();
  const [timeValue, setTimeValue] = useState('month');

  // Chart data for different time periods
  const chartData = {
    week: [
      {
        name: 'Client Progress',
        data: [10, 12, 14, 15, 16, 18, 20]
      }
    ],
    month: [
      {
        name: 'Client Progress',
        data: [8, 10, 12, 14, 16, 18, 20, 22, 24, 25, 26, 28]
      }
    ],
    year: [
      {
        name: 'Client Progress',
        data: [5, 8, 12, 15, 18, 22, 26, 30, 34, 38, 40, 42]
      }
    ]
  };

  // Chart options
  const chartOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 90,
      sparkline: {
        enabled: true
      }
    },
    dataLabels: {
      enabled: false
    },
    colors: [theme.palette.primary.main],
    stroke: {
      curve: 'smooth',
      width: 3
    },
    yaxis: {
      min: 0,
      max: timeValue === 'week' ? 30 : timeValue === 'month' ? 40 : 50
    },
    tooltip: {
      theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: () => 'Progress'
        }
      },
      marker: {
        show: false
      }
    }
  };

  // Sample data based on time period
  const getTimeSeriesData = () => {
    switch (timeValue) {
      case 'week':
        return {
          value: '20%',
          diff: 2.5,
          label: 'Weekly Progress Rate'
        };
      case 'month':
        return {
          value: '28%',
          diff: 4.6,
          label: 'Monthly Progress Rate'
        };
      case 'year':
        return {
          value: '42%',
          diff: 8.4,
          label: 'Yearly Progress Rate'
        };
      default:
        return {
          value: '28%',
          diff: 4.6,
          label: 'Monthly Progress Rate'
        };
    }
  };

  const timeSeriesData = getTimeSeriesData();

  return (
    <MainCard>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Grid container direction="column" spacing={1}>
                <Grid item>
                  <Typography variant="subtitle2">Client Progress</Typography>
                </Grid>
                <Grid item>
                  {isLoading ? (
                    <Skeleton variant="rounded" width={60} height={30} />
                  ) : (
                    <Typography variant="h3">{timeSeriesData.value}</Typography>
                  )}
                </Grid>
              </Grid>
            </Grid>
            <Grid item>
              <ButtonGroup size="small" aria-label="time period button group">
                <Button
                  variant={timeValue === 'week' ? 'contained' : 'outlined'}
                  onClick={() => setTimeValue('week')}
                >
                  Week
                </Button>
                <Button
                  variant={timeValue === 'month' ? 'contained' : 'outlined'}
                  onClick={() => setTimeValue('month')}
                >
                  Month
                </Button>
                <Button
                  variant={timeValue === 'year' ? 'contained' : 'outlined'}
                  onClick={() => setTimeValue('year')}
                >
                  Year
                </Button>
              </ButtonGroup>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={90} />
          ) : (
            <Chart
              options={chartOptions}
              series={chartData[timeValue as keyof typeof chartData]}
              type="line"
              height={90}
            />
          )}
        </Grid>
        <Grid item xs={12}>
          <Grid container alignItems="center">
            <Grid item>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                {/* Fix: Changed ArrowUpward to TrendingUp */}
                <TrendingUp color={theme.palette.success.main} size={16} />
                <Typography variant="body2" color="success.main">
                  {timeSeriesData.diff}%
                </Typography>
              </Stack>
            </Grid>
            <Grid item sx={{ ml: 1 }}>
              <Typography variant="body2" color="textSecondary">
                {timeSeriesData.label}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default ClientProgressChart;