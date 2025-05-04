import React from 'react';
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ClientProgressChartProps {
  isLoading?: boolean;
}

/**
 * Client Progress Chart Component
 * 
 * Displays a line chart visualizing client fitness progress over time.
 * Charts multiple metrics like weight training, cardio performance, and attendance.
 */
const ClientProgressChart: React.FC<ClientProgressChartProps> = ({ isLoading = false }) => {
  // Sample data - in a real application, this would come from an API
  const progressData = [
    { month: 'Jan', strength: 65, cardio: 72, flexibility: 58 },
    { month: 'Feb', strength: 68, cardio: 74, flexibility: 61 },
    { month: 'Mar', strength: 72, cardio: 76, flexibility: 65 },
    { month: 'Apr', strength: 75, cardio: 78, flexibility: 68 },
    { month: 'May', strength: 79, cardio: 80, flexibility: 71 },
    { month: 'Jun', strength: 82, cardio: 83, flexibility: 74 }
  ];

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
            <Skeleton variant="rectangular" height={220} sx={{ mt: 3, borderRadius: 1 }} />
          </Box>
        ) : (
          <>
            <Typography variant="h5" fontWeight="600" mb={0.5}>
              Client Progress
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              6-month fitness metrics
            </Typography>
            
            <Box sx={{ height: 300, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={progressData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#E0E0E0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={{ stroke: '#E0E0E0' }}
                    domain={[50, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="strength"
                    name="Strength"
                    stroke="#1976d2"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cardio"
                    name="Cardio"
                    stroke="#2e7d32"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="flexibility"
                    name="Flexibility"
                    stroke="#ed6c02"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientProgressChart;