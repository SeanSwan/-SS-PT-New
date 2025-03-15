import React, { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Select,
  SelectChangeEvent,
  Skeleton,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import MainCard from '../ui/MainCard';
import useConfig from '../../hooks/useConfig';
// Fix: Changed ArrowUpward to TrendingUp from lucide-react
import { Heart, TrendingUp } from 'lucide-react';

// Import your charting library components
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// Types - explicitly define the props interface
interface FitnessMetricsChartProps {
  isLoading: boolean;
}

/**
 * Fitness Metrics Bar Chart (formerly TotalGrowthBarChart)
 * 
 * Displays key fitness metrics across different training categories including:
 * - Strength Progress
 * - Cardiovascular Fitness
 * - Flexibility
 * - Nutrition Adherence
 * - Client Retention
 * 
 * The chart allows filtering by time period to track trends and improvements
 * in client fitness outcomes.
 */
const FitnessMetricsChart: React.FC<FitnessMetricsChartProps> = ({ isLoading }) => {
  const theme = useTheme();
  const { getChartColorScheme } = useConfig();
  const [timeValue, setTimeValue] = useState('month');

  const chartColors = getChartColorScheme ? getChartColorScheme() : 
    [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main];

  // Chart configuration
  const chartOptions: ApexOptions = {
    chart: {
      height: 480,
      type: 'bar',
      background: 'transparent',
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        columnWidth: '45%',
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: ['Strength', 'Cardio', 'Flexibility', 'Nutrition', 'Retention'],
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        formatter: (value) => `${value}%`
      }
    },
    grid: {
      borderColor: theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)'
    },
    tooltip: {
      theme: theme.palette.mode
    },
    legend: {
      show: true,
      position: 'bottom',
      fontFamily: 'inherit',
      fontSize: '14px',
      offsetY: 10
    },
    fill: {
      opacity: 1
    },
    colors: chartColors
  };

  // Chart data - represents client improvement percentages by category
  const chartData = [
    {
      name: 'Current Period',
      data: [18, 15, 12, 14, 22]
    },
    {
      name: 'Previous Period',
      data: [13, 10, 8, 9, 17]
    }
  ];

  // Fixed handler with correct MUI Select event type
  const handleTimeChange = (event: SelectChangeEvent) => {
    setTimeValue(event.target.value);
  };

  return (
    <MainCard>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Grid container direction="column" spacing={1}>
                <Grid item>
                  <Typography variant="h5">Client Progress Metrics</Typography>
                </Grid>
                <Grid item>
                  <Typography variant="subtitle2">Average improvement across all fitness categories</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item>
              <Select
                value={timeValue}
                onChange={handleTimeChange}
                size="small"
                sx={{ ml: 2, height: '30px' }}
              >
                <MenuItem value="month">Monthly</MenuItem>
                <MenuItem value="quarter">Quarterly</MenuItem>
                <MenuItem value="year">Yearly</MenuItem>
              </Select>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              {isLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <Chart options={chartOptions} series={chartData} type="bar" height={300} />
              )}
            </Grid>
            <Grid item xs={12} md={5}>
              <Grid container direction="column" spacing={2}>
                <Grid item>
                  <Card sx={{ bgcolor: theme.palette.mode === 'dark' ? 'dark.800' : 'grey.100' }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Grid container alignItems="center" justifyContent="space-between">
                            <Grid item>
                              <Typography variant="subtitle1">Overall Client Improvement</Typography>
                            </Grid>
                            <Grid item>
                              <Heart size={20} color={theme.palette.error.main} />
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid item xs={12}>
                          <Grid container alignItems="center" spacing={1}>
                            <Grid item>
                              {isLoading ? (
                                <Skeleton variant="rounded" width={45} height={45} />
                              ) : (
                                <Typography variant="h3">16.2%</Typography>
                              )}
                            </Grid>
                            <Grid item>
                              {isLoading ? (
                                <Skeleton variant="rounded" width={38} height={20} />
                              ) : (
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  {/* Fix: Changed ArrowUpward to TrendingUp */}
                                  <TrendingUp color={theme.palette.success.main} size={16} />
                                  <Typography variant="body2" sx={{ color: theme.palette.success.main }}>
                                    4.6%
                                  </Typography>
                                </Stack>
                              )}
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid item xs={12}>
                          {isLoading ? (
                            <Skeleton variant="rounded" width="100%" height={20} />
                          ) : (
                            <Typography variant="subtitle2" color="textSecondary">
                              Average client fitness improvement compared to previous {timeValue}
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item>
                  <Card sx={{ bgcolor: theme.palette.mode === 'dark' ? 'dark.800' : 'grey.100' }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Grid container alignItems="center" justifyContent="space-between">
                            <Grid item>
                              <Typography variant="subtitle1">Top Performing Area</Typography>
                            </Grid>
                            <Grid item />
                          </Grid>
                        </Grid>
                        <Grid item xs={12}>
                          <Grid container alignItems="center" spacing={1}>
                            <Grid item>
                              {isLoading ? (
                                <Skeleton variant="rounded" width={45} height={45} />
                              ) : (
                                <Typography variant="h3">Retention</Typography>
                              )}
                            </Grid>
                            <Grid item>
                              {isLoading ? (
                                <Skeleton variant="rounded" width={60} height={30} />
                              ) : (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="secondary"
                                >
                                  22% growth
                                </Button>
                              )}
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid item xs={12}>
                          {isLoading ? (
                            <Skeleton variant="rounded" width="100%" height={35} />
                          ) : (
                            <Typography variant="subtitle2" color="textSecondary">
                              Client retention shows the strongest improvement, indicating high satisfaction with training programs.
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default FitnessMetricsChart;