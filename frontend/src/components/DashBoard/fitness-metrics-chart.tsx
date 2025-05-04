import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  Skeleton,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface FitnessMetricsChartProps {
  isLoading?: boolean;
}

/**
 * Fitness Metrics Chart Component
 * 
 * Displays a bar chart showing various fitness metrics across different program types.
 * Allows filtering by time period and metric focus.
 */
const FitnessMetricsChart: React.FC<FitnessMetricsChartProps> = ({ isLoading = false }) => {
  const [timeRange, setTimeRange] = useState<string>('month');
  const [metricTab, setMetricTab] = useState<number>(0);
  
  // Sample data - in a real application, this would come from API calls
  const monthlyData = [
    { program: 'HIIT', performance: 84, satisfaction: 92, attendance: 88 },
    { program: 'Strength', performance: 91, satisfaction: 85, attendance: 82 },
    { program: 'Cardio', performance: 78, satisfaction: 81, attendance: 75 },
    { program: 'Yoga', performance: 72, satisfaction: 94, attendance: 68 },
    { program: 'CrossFit', performance: 89, satisfaction: 78, attendance: 85 },
  ];
  
  const weeklyData = [
    { program: 'HIIT', performance: 86, satisfaction: 94, attendance: 90 },
    { program: 'Strength', performance: 93, satisfaction: 88, attendance: 84 },
    { program: 'Cardio', performance: 81, satisfaction: 83, attendance: 79 },
    { program: 'Yoga', performance: 75, satisfaction: 96, attendance: 72 },
    { program: 'CrossFit', performance: 92, satisfaction: 82, attendance: 88 },
  ];
  
  const yearlyData = [
    { program: 'HIIT', performance: 81, satisfaction: 89, attendance: 85 },
    { program: 'Strength', performance: 89, satisfaction: 83, attendance: 80 },
    { program: 'Cardio', performance: 75, satisfaction: 78, attendance: 72 },
    { program: 'Yoga', performance: 69, satisfaction: 92, attendance: 65 },
    { program: 'CrossFit', performance: 86, satisfaction: 75, attendance: 82 },
  ];
  
  // Select which dataset to use based on time range
  const getChartData = () => {
    switch(timeRange) {
      case 'week':
        return weeklyData;
      case 'year':
        return yearlyData;
      default:
        return monthlyData;
    }
  };
  
  // Define which data keys to display based on the selected tab
  const getDataKeys = () => {
    switch(metricTab) {
      case 0: // All metrics
        return [
          { key: 'performance', color: '#1976d2' },
          { key: 'satisfaction', color: '#2e7d32' },
          { key: 'attendance', color: '#ed6c02' }
        ];
      case 1: // Performance
        return [{ key: 'performance', color: '#1976d2' }];
      case 2: // Satisfaction
        return [{ key: 'satisfaction', color: '#2e7d32' }];
      case 3: // Attendance
        return [{ key: 'attendance', color: '#ed6c02' }];
      default:
        return [
          { key: 'performance', color: '#1976d2' },
          { key: 'satisfaction', color: '#2e7d32' },
          { key: 'attendance', color: '#ed6c02' }
        ];
    }
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold" mb={0.5}>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography
              key={`item-${index}`}
              variant="body2"
              display="block"
              sx={{ 
                color: entry.color,
                display: 'flex',
                alignItems: 'center',
                mt: 0.5
              }}
            >
              <Box 
                component="span" 
                sx={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  bgcolor: entry.color,
                  mr: 1
                }} 
              />
              {entry.name}: {entry.value}%
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };
  
  // Handle time range change
  const handleTimeRangeChange = (
    event: React.MouseEvent<HTMLElement>,
    newTimeRange: string | null,
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setMetricTab(newValue);
  };
  
  // Helper to capitalize first letter for display
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
  
  return (
    <Card
      sx={{
        borderRadius: 3,
        height: '100%',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 6px 25px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <CardContent>
        {isLoading ? (
          <Box>
            <Skeleton variant="text" height={40} width="70%" />
            <Skeleton variant="text" height={25} width="40%" sx={{ mt: 1 }} />
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton variant="rectangular" width={120} height={35} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={200} height={35} sx={{ borderRadius: 1 }} />
            </Box>
            <Skeleton variant="rectangular" height={320} sx={{ mt: 3, borderRadius: 1 }} />
          </Box>
        ) : (
          <>
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                mb: 2
              }}
            >
              <Box>
                <Typography variant="h5" fontWeight="600">
                  Fitness Metrics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Program effectiveness metrics
                </Typography>
              </Box>
              
              <ToggleButtonGroup
                color="primary"
                value={timeRange}
                exclusive
                onChange={handleTimeRangeChange}
                size="small"
                sx={{ mt: { xs: 2, sm: 0 }, ml: 'auto' }}
              >
                <ToggleButton value="week">Week</ToggleButton>
                <ToggleButton value="month">Month</ToggleButton>
                <ToggleButton value="year">Year</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Tabs
              value={metricTab}
              onChange={handleTabChange}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="All Metrics" />
              <Tab label="Performance" />
              <Tab label="Satisfaction" />
              <Tab label="Attendance" />
            </Tabs>
            
            <Box sx={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getChartData()}
                  margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="program" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#E0E0E0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#E0E0E0' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {getDataKeys().map(item => (
                    <Bar 
                      key={item.key}
                      dataKey={item.key}
                      name={capitalize(item.key)}
                      fill={item.color}
                      barSize={30}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FitnessMetricsChart;