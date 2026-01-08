import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useInView, Variants } from "framer-motion";
import { 
  FaTrophy, 
  FaUsers, 
  FaWeight, 
  FaFireAlt, 
  FaHeartbeat, 
  FaClock 
} from "react-icons/fa";

import {
  LineChart, 
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// TypeScript interfaces
interface StatItem {
  id: number;
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
  prefix?: string;
  animation: {
    duration: number;
    delay: number;
  };
}

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

interface ChartConfig {
  id: string;
  title: string;
  description: string;
  type: 'line' | 'bar' | 'pie';
  data: ChartDataPoint[];
  colors: string[];
}

interface IconWrapperProps {
  color: string;
}

// Fixed custom tooltip props
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    unit?: string;
    name?: string;
  }>;
  label?: string;
}

// Animation keyframes - Single subtle diagonal glimmer animation every 5 seconds
const diagonalGlimmer = keyframes`
  0%, 85% {
    background-position: -200% 200%;
    opacity: 0;
  }
  90%, 95% {
    background-position: 0% 0%;
    opacity: 0.8;
  }
  100% {
    background-position: 200% -200%;
    opacity: 0;
  }
`;

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
  100% {
    transform: scale(1);
  }
`;

const glow = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  }
  100% {
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
  }
`;

// Styled components
const StatsSection = styled.section`
  padding: 6rem 2rem;
  background: linear-gradient(135deg, #09041e, #1a1a3c); // Adjusted to match theme 
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
`;

const BackgroundGlow = styled.div`
  position: absolute;
  width: 80vh;
  height: 80vh;
  background: radial-gradient(
    ellipse at center,
    rgba(0, 255, 255, 0.1) 0%,
    rgba(120, 81, 169, 0.05) 50%,
    transparent 70%
  );
  border-radius: 50%;
  top: 30%;
  left: 20%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.6;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const TitleContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
`;

const SectionTitle = styled(motion.h2)`
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: white;
  background: linear-gradient(
    to right,
    #a9f8fb,
    #46cdcf,
    #7b2cbf,
    #c8b6ff,
    #a9f8fb
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  animation: ${diagonalGlimmer} 8s ease-in-out infinite;
  position: relative;
  
  &::after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 150px;
    height: 3px;
    background: linear-gradient(90deg, #46cdcf, #7851a9);
    border-radius: 3px;
  }
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
  }
`;

const SectionSubtitle = styled(motion.p)`
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #c0c0c0;
  max-width: 800px;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

// Enhanced 3D StatCard with improved diagonal glimmer
const StatCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(25, 25, 45, 0.95), rgba(10, 10, 25, 0.95));
  border-radius: 15px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  /* Enhanced 3D effect with stronger shadow and depth */
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.5),
    0 2px 5px rgba(255, 255, 255, 0.05) inset,
    0 -2px 5px rgba(0, 0, 0, 0.3) inset;
  
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.5s ease, box-shadow 0.5s ease;
  
  /* Natural diagonal glimmer effect (top-right to bottom-left) */
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      transparent 0%,
      rgba(255, 255, 255, 0.03) 25%,
      rgba(255, 255, 255, 0.05) 50%,
      rgba(255, 255, 255, 0.03) 75%,
      transparent 100%
    );
    background-size: 400% 400%;
    animation: ${diagonalGlimmer} 12s ease-in-out infinite;
    pointer-events: none;
    border-radius: 15px;
    opacity: 0.6;
  }
  
  &:hover {
    transform: translateY(-10px) scale(1.02);
    box-shadow: 
      0 15px 35px rgba(0, 0, 0, 0.5),
      0 2px 10px rgba(255, 255, 255, 0.1) inset,
      0 -2px 10px rgba(0, 0, 0, 0.4) inset,
      0 0 20px rgba(70, 205, 207, 0.2);
    animation: ${pulse} 4s ease infinite;
    
    &:after {
      opacity: 1;
    }
  }
`;

// Enhanced IconWrapper with theme-aligned colors
const IconWrapper = styled.div<IconWrapperProps>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  background: ${props => `rgba(${hexToRgb(props.color)}, 0.15)`};
  color: ${props => props.color};
  position: relative;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  
  &:before {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    border-radius: 50%;
    border: 1px solid ${props => props.color};
    opacity: 0.5;
    animation: ${glow} 6s ease-in-out infinite;
  }
`;

const StatValue = styled(motion.div)`
  font-size: 2.5rem;
  font-weight: 600;
  color: white;
  margin-bottom: 0.5rem;
  line-height: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); // Added shadow for depth
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const StatTitle = styled.div`
  font-size: 1rem;
  color: #c0c0c0;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const StatUnit = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
`;

// Enhanced 3D ChartCard with improved diagonal glimmer
const ChartsContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 4rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(25, 25, 45, 0.95), rgba(10, 10, 25, 0.95));
  border-radius: 15px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  height: 350px;
  
  /* Enhanced 3D effect with stronger shadow and depth */
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.5),
    0 2px 5px rgba(255, 255, 255, 0.05) inset,
    0 -2px 5px rgba(0, 0, 0, 0.3) inset;
    
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  transition: transform 0.5s ease, box-shadow 0.5s ease;
  
  /* Single subtle diagonal glimmer effect (top-right to bottom-left) */
  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      transparent 0%,
      rgba(255, 255, 255, 0.05) 25%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 75%,
      transparent 100%
    );
    background-size: 200% 200%;
    animation: ${diagonalGlimmer} 5s linear infinite;
    pointer-events: none;
    border-radius: 15px;
    opacity: 0;
    z-index: 0;
  }
  
  &:hover {
    transform: translateY(-10px) scale(1.02);
    box-shadow: 
      0 15px 35px rgba(0, 0, 0, 0.5),
      0 2px 10px rgba(255, 255, 255, 0.1) inset,
      0 -2px 10px rgba(0, 0, 0, 0.4) inset,
      0 0 20px rgba(70, 205, 207, 0.2);
      
    &:after {
      opacity: 1;
    }
  }
`;

const ChartTitle = styled.h3`
  font-size: 1.3rem;
  color: white;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); // Added shadow for depth
  position: relative;
  z-index: 1;
  
  &:after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -5px;
    width: 40px;
    height: 2px;
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ChartDescription = styled.p`
  font-size: 0.9rem;
  color: #c0c0c0;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
`;

const ChartContent = styled.div`
  flex: 1;
  width: 100%;
  height: 250px;
  position: relative;
  z-index: 1;
`;

// Enhanced tooltip styles
const TooltipContainer = styled.div`
  background: rgba(20, 20, 30, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  padding: 0.75rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
`;

const TooltipLabel = styled.p`
  color: white;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const TooltipValue = styled.p`
  color: #46cdcf; // Updated to theme color
`;

// Helper function to convert hex to rgb
function hexToRgb(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `${r}, ${g}, ${b}`;
}

// Custom tooltip component
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0) {
    return (
      <TooltipContainer>
        <TooltipLabel>{label}</TooltipLabel>
        <TooltipValue>
          {payload[0].value} {payload[0].unit || ''}
        </TooltipValue>
      </TooltipContainer>
    );
  }
  
  return null;
};

// Animation variants
const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.8, // Slowed down
      staggerChildren: 0.15
    }
  }
};

const titleVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8 } // Slowed down
  }
};

const subtitleVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, delay: 0.3 } // Slowed down
  }
};

const cardVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      type: "spring",
      stiffness: 100, // Reduced for slower animation
      damping: 15,
      duration: 0.8 // Slowed down
    }
  }
};

const chartVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.8, // Slowed down
      ease: "easeOut"
    } 
  }
};

// Updated sample data for stats - removed hot pink colors
const statItems: StatItem[] = [
  {
    id: 1,
    title: "Client Transformations",
    value: 847,
    unit: "successful journeys",
    icon: <FaUsers />,
    color: "#00ffff", // Kept teal
    animation: { duration: 3.0, delay: 0 } // Slowed down
  },
  {
    id: 2,
    title: "Weight Lost",
    value: 12450,
    unit: "pounds collectively",
    icon: <FaWeight />,
    color: "#46cdcf", // Changed from pink to teal
    animation: { duration: 3.0, delay: 0.2 } // Slowed down
  },
  {
    id: 3,
    title: "Training Sessions",
    value: 42810,
    unit: "hours of coaching",
    icon: <FaClock />,
    color: "#c894ff", // Kept purple
    animation: { duration: 3.0, delay: 0.4 } // Slowed down
  },
  {
    id: 4,
    title: "Calories Burned",
    value: 76,
    unit: "million total",
    prefix: "",
    icon: <FaFireAlt />,
    color: "#7851a9", // Changed from pink to purple
    animation: { duration: 3.0, delay: 0.6 } // Slowed down
  },
  {
    id: 5,
    title: "Average BMI Reduction",
    value: 6.3,
    unit: "points",
    icon: <FaHeartbeat />,
    color: "#00fd9f", // Kept emerald
    animation: { duration: 3.0, delay: 0.8 } // Slowed down
  },
  {
    id: 6,
    title: "Fitness Competitions Won",
    value: 214,
    unit: "championships",
    icon: <FaTrophy />,
    color: "#c8b6ff", // Changed from gold to lavender
    animation: { duration: 3.0, delay: 1 } // Slowed down
  }
];

// Updated chart data - replaced hot pink with purple/teal
const chartConfigs: ChartConfig[] = [
  {
    id: "weight-loss",
    title: "Average Weight Loss Progress",
    description: "Client transformation timeline over 12 weeks",
    type: "line",
    data: [
      { name: "Week 1", value: 0 },
      { name: "Week 2", value: 2.1 },
      { name: "Week 3", value: 4.3 },
      { name: "Week 4", value: 6.7 },
      { name: "Week 5", value: 8.5 },
      { name: "Week 6", value: 10.2 },
      { name: "Week 7", value: 11.8 },
      { name: "Week 8", value: 13.4 },
      { name: "Week 9", value: 14.9 },
      { name: "Week 10", value: 16.1 },
      { name: "Week 11", value: 17.5 },
      { name: "Week 12", value: 19.2 }
    ],
    colors: ["#00ffff", "#7851a9"] // Kept teal/purple
  },
  {
    id: "strength-gains",
    title: "Strength Improvement Metrics",
    description: "Average increase in major lifts (in pounds)",
    type: "bar",
    data: [
      { name: "Bench Press", value: 53 },
      { name: "Squat", value: 87 },
      { name: "Deadlift", value: 91 },
      { name: "Shoulder Press", value: 39 }
    ],
    colors: ["#46cdcf", "#7851a9"] // Changed from pink to teal/purple
  },
  {
    id: "client-goals",
    title: "Client Goal Distribution",
    description: "Primary objectives of our client base",
    type: "pie",
    data: [
      { name: "Weight Loss", value: 42 },
      { name: "Muscle Gain", value: 28 },
      { name: "Athletic Performance", value: 15 },
      { name: "Overall Health", value: 10 },
      { name: "Rehabilitation", value: 5 }
    ],
    colors: ["#00ffff", "#7851a9", "#46cdcf", "#00fd9f", "#c8b6ff"] // Updated colors to theme
  }
];

const FitnessStats: React.FC = () => {
  const [animatedValues, setAnimatedValues] = useState<Record<number, number>>(
    statItems.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {})
  );
  
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 });
  
  // Counter animation effect
  useEffect(() => {
    if (!isInView) return;
    
    const timers: NodeJS.Timeout[] = [];
    
    statItems.forEach((stat) => {
      const { id, value, animation } = stat;
      const { duration, delay } = animation;
      
      // Reset animated value
      setAnimatedValues((prev) => ({ ...prev, [id]: 0 }));
      
      // Delay start of animation
      const timer = setTimeout(() => {
        let startTime: number;
        const animateCount = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          
          const progress = (timestamp - startTime) / (duration * 1000);
          const percentage = Math.min(progress, 1);
          
          const currentValue = Math.floor(percentage * value);
          
          setAnimatedValues((prev) => {
            if (prev[id] === currentValue) return prev;
            return { ...prev, [id]: currentValue };
          });
          
          if (percentage < 1) {
            requestAnimationFrame(animateCount);
          }
        };
        
        requestAnimationFrame(animateCount);
      }, delay * 1000);
      
      timers.push(timer);
    });
    
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isInView]);
  
  // Render the charts - FIXED to handle TypeScript properly
  const renderChart = (config: ChartConfig): React.ReactNode => {
    const { type, data, colors, id } = config;
    
    switch(type) {
      case 'line':
        return (
          <div style={{ width: '100%', height: '100%' }}>
            {/* Fixed ResponsiveContainer by adding width and height props */}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#c0c0c0' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                />
                <YAxis 
                  tick={{ fill: '#c0c0c0' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <defs>
                  <linearGradient id={`lineColorGradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={colors[1]} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={`url(#lineColorGradient-${id})`}
                  strokeWidth={3}
                  dot={{ stroke: colors[0], strokeWidth: 2, r: 4, fill: '#181830' }}
                  activeDot={{ r: 6, fill: colors[0] }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
        
      case 'bar':
        return (
          <div style={{ width: '100%', height: '100%' }}>
            {/* Fixed ResponsiveContainer by adding width and height props */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#c0c0c0' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                />
                <YAxis 
                  tick={{ fill: '#c0c0c0' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <defs>
                  <linearGradient id={`barColorGradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={colors[1]} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <Bar 
                  dataKey="value" 
                  fill={`url(#barColorGradient-${id})`}
                  radius={[5, 5, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
        
      case 'pie':
        return (
          <div style={{ width: '100%', height: '100%' }}>
            {/* Fixed ResponsiveContainer by adding width and height props */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  animationDuration={1500}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={colors[index % colors.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  content={<CustomTooltip />} 
                  formatter={(value: any) => [`${value}%`, 'Value']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <StatsSection id="stats" ref={sectionRef}>
      <BackgroundGlow />
      <ContentWrapper>
        <TitleContainer>
          <SectionTitle
            variants={titleVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            Our Results in Numbers
          </SectionTitle>
          
          <SectionSubtitle
            variants={subtitleVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            Proven success metrics from years of transforming lives through elite fitness coaching
          </SectionSubtitle>
        </TitleContainer>
        
        <StatsGrid
          variants={sectionVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {statItems.map((stat) => (
            <StatCard key={stat.id} variants={cardVariants}>
              <IconWrapper color={stat.color}>
                {stat.icon}
              </IconWrapper>
              <StatValue>
                {stat.prefix && stat.prefix}{animatedValues[stat.id].toLocaleString()}
              </StatValue>
              <StatTitle>{stat.title}</StatTitle>
              <StatUnit>{stat.unit}</StatUnit>
            </StatCard>
          ))}
        </StatsGrid>
        
        <ChartsContainer
          variants={sectionVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {chartConfigs.map((chart) => (
            <ChartCard key={chart.id} variants={chartVariants}>
              <ChartTitle>{chart.title}</ChartTitle>
              <ChartDescription>{chart.description}</ChartDescription>
              <ChartContent>
                {renderChart(chart)}
              </ChartContent>
            </ChartCard>
          ))}
        </ChartsContainer>
      </ContentWrapper>
    </StatsSection>
  );
};

export default FitnessStats;