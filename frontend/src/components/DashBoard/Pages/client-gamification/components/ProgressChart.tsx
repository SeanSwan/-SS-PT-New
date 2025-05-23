import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';

// Define interfaces
interface ProgressSnapshot {
  date: string;
  points: number;
  level: number;
  achievements: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface ProgressChartProps {
  snapshots: ProgressSnapshot[];
}

/**
 * Enhanced Progress Chart Component with smooth animations and transitions
 * Renders a performance-optimized chart for gamification progress
 */
const ProgressChart: React.FC<ProgressChartProps> = ({ snapshots }) => {
  const theme = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate maximum points for scaling
  const maxPoints = Math.max(...snapshots.map(s => s.points));

  // Set up intersection observer for animation on view
  useEffect(() => {
    if (chartRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(chartRef.current);
      return () => observer.disconnect();
    }
  }, []);

  // Get tier color based on tier value
  const getTierColor = (tier: 'bronze' | 'silver' | 'gold' | 'platinum') => {
    switch (tier) {
      case 'bronze':
        return theme.palette.mode === 'dark' ? '#CD7F32' : '#CD7F32';
      case 'silver':
        return theme.palette.mode === 'dark' ? '#C0C0C0' : '#A0A0A0';
      case 'gold':
        return theme.palette.mode === 'dark' ? '#FFD700' : '#FFD700';
      case 'platinum':
        return theme.palette.mode === 'dark' ? '#E5E4E2' : '#E5E4E2';
      default:
        return theme.palette.primary.main;
    }
  };

  return (
    <Box
      ref={chartRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: 2,
      }}
      data-testid="points-chart"
    >
      {/* Chart grid lines */}
      <Box sx={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
        {[0, 25, 50, 75, 100].map((percent) => (
          <Box
            key={`gridline-${percent}`}
            sx={{
              position: 'absolute',
              width: '100%',
              height: '1px',
              bottom: `${percent}%`,
              left: 0,
              backgroundColor: 'rgba(128, 128, 128, 0.2)',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                left: -40,
                color: 'text.secondary',
                fontSize: '0.7rem',
              }}
            >
              {Math.round((maxPoints * percent) / 100).toLocaleString()}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Bars */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          p: 2,
          zIndex: 2,
        }}
      >
        {snapshots.map((snapshot, index) => {
          const height = `${(snapshot.points / maxPoints) * 80}%`;
          const isHovered = hoveredIndex === index;
          
          // Calculate total points gained between snapshots
          const pointsGained = index > 0 
            ? snapshot.points - snapshots[index - 1].points 
            : snapshot.points;
          
          // Show positive change indicator
          const showPositiveChange = index > 0 && snapshot.points > snapshots[index - 1].points;
          
          return (
            <Box
              key={index}
              sx={{
                height: isVisible ? height : '0%',
                width: `${80 / snapshots.length}%`,
                bgcolor: getTierColor(snapshot.tier),
                mx: 0.5,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                position: 'relative',
                boxShadow: isHovered ? '0 0 10px 2px rgba(0, 255, 255, 0.3)' : 'none',
                '&:hover': {
                  filter: 'brightness(1.2)',
                  transform: 'translateY(-5px)',
                },
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                transitionDelay: `${index * 0.1}s`,
                cursor: 'pointer',
                willChange: 'transform, height, box-shadow',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Point value label */}
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: -25,
                  left: 0,
                  width: '100%',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: isHovered ? 'primary.main' : 'text.secondary',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                }}
              >
                {snapshot.points.toLocaleString()}
              </Typography>
              
              {/* Date label */}
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: -25,
                  left: 0,
                  width: '100%',
                  textAlign: 'center',
                  color: isHovered ? 'primary.main' : 'text.secondary',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                }}
              >
                {new Date(snapshot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Typography>
              
              {/* Points gained indicator for all but first bar */}
              {showPositiveChange && (
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    top: -45,
                    left: 0,
                    width: '100%',
                    textAlign: 'center',
                    color: 'success.main',
                    fontWeight: 'bold',
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'translateY(0)' : 'translateY(5px)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  +{pointsGained.toLocaleString()}
                </Typography>
              )}
              
              {/* Show level on hover */}
              {isHovered && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    bgcolor: 'background.paper',
                    p: 1,
                    borderRadius: 1,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    zIndex: 10,
                    opacity: 0,
                    animation: 'fadeIn 0.3s forwards',
                    animationDelay: '0.1s',
                    '@keyframes fadeIn': {
                      '0%': { opacity: 0 },
                      '100%': { opacity: 1 },
                    },
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    Level {snapshot.level}
                  </Typography>
                  <Typography variant="caption" display="block">
                    {snapshot.achievements} achievements
                  </Typography>
                  <Typography variant="caption" sx={{ color: getTierColor(snapshot.tier), fontWeight: 'bold' }}>
                    {snapshot.tier.toUpperCase()}
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      
      {/* Y-axis label */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          left: -45,
          top: '50%',
          transform: 'rotate(-90deg) translateX(50%)',
          transformOrigin: 'left center',
          color: 'text.secondary',
          fontWeight: 'bold',
        }}
      >
        POINTS
      </Typography>
      
      {/* X-axis label */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          left: '50%',
          bottom: -45,
          transform: 'translateX(-50%)',
          color: 'text.secondary',
          fontWeight: 'bold',
        }}
      >
        TIME
      </Typography>
    </Box>
  );
};

export default React.memo(ProgressChart);
