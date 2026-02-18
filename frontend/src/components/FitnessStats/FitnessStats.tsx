// ==========================================================
// FitnessStats V2 - "Our Results in Numbers"
// ==========================================================
// Glass-morphism cards matching ProgramsOverview.V3
// Smoke video background (desktop only)
// Cormorant Garamond + Source Sans 3 typography
// ==========================================================

import React, { useState, useEffect, useRef } from "react";
import styled, { css } from "styled-components";
import { motion, useInView, Variants } from "framer-motion";
import {
  FaUsers,
  FaWeight,
  FaFireAlt,
  FaHeartbeat,
  FaClock,
  FaSwimmer,
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
  Cell,
} from "recharts";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import ParallaxImageBackground from "../ui/backgrounds/ParallaxImageBackground";
import paintAbImage from "../../assets/paint-ab.png";

// --- Design Tokens (Ethereal Wilderness, matches ProgramsOverview.V3) ---
const T = {
  bg: "#0a0a1a",
  surface: "rgba(15, 25, 35, 0.92)",
  primary: "#00D4AA",
  secondary: "#7851A9",
  accent: "#48E8C8",
  text: "#F0F8FF",
  textSecondary: "#8AA8B8",
  // Derived chart palette (tinted variants for multi-series)
  primaryDark: "#00B894",
  secondaryLight: "#9B7AC7",
} as const;

// --- Helpers ---

const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

function hexToRgb(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

// --- TypeScript Interfaces ---

interface StatItem {
  id: number;
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
  prefix?: string;
  animation: { duration: number; delay: number };
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
  type: "line" | "bar" | "pie";
  data: ChartDataPoint[];
  colors: string[];
}

interface IconWrapperProps {
  $color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; unit?: string; name?: string }>;
  label?: string;
}

// --- Styled Components ---

const StatsSection = styled.section`
  position: relative;
  overflow: hidden;
  padding: 6rem 2rem;
  font-family: "Source Sans 3", "Source Sans Pro", sans-serif;
  background: ${T.bg};
  /* Override global content-visibility: auto that breaks Recharts offscreen */
  content-visibility: visible;

  @media (max-width: 1024px) {
    padding: 4rem 1.5rem;
  }

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }

  @media (max-width: 430px) {
    padding: 3rem 0.75rem;
  }
`;

const SectionVideoBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.25;
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      180deg,
      rgba(10, 10, 26, 0.7) 0%,
      rgba(10, 10, 26, 0.5) 40%,
      rgba(10, 10, 26, 0.6) 70%,
      rgba(10, 10, 26, 0.85) 100%
    );
    z-index: 1;
  }
`;

const GradientFallback = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  background: radial-gradient(
      ellipse at 30% 20%,
      rgba(0, 212, 170, 0.1),
      transparent 50%
    ),
    radial-gradient(
      ellipse at 70% 80%,
      rgba(120, 81, 169, 0.06),
      transparent 50%
    ),
    linear-gradient(180deg, ${T.bg} 0%, #0d1a1a 100%);
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 4rem;

  @media (max-width: 768px) {
    margin-bottom: 2.5rem;
  }
`;

const SectionTitle = styled(motion.h2)`
  font-family: "Cormorant Garamond", "Georgia", serif;
  font-size: 3rem;
  font-weight: 600;
  font-style: italic;
  margin-bottom: 1.25rem;
  background: linear-gradient(135deg, ${T.text} 0%, ${T.primary} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 2px;
    background: linear-gradient(90deg, ${T.primary}, ${T.secondary});
    border-radius: 2px;
  }

  @media (max-width: 768px) {
    font-size: clamp(1.8rem, 5vw, 2.4rem);
  }
`;

const SectionSubtitle = styled(motion.p)`
  font-size: 1.1rem;
  color: ${T.textSecondary};
  max-width: 600px;
  margin: 1.5rem auto 0;
  line-height: 1.7;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
    max-width: 450px;
    margin: 0 auto;
    gap: 1.25rem;
  }
`;

const StatCard = styled.div`
  position: relative;
  height: 280px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 212, 170, 0.12);
  background: ${T.surface};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  ${noMotion}

  @media (hover: hover) {
    &:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 50px -10px rgba(0, 212, 170, 0.15),
        0 0 30px rgba(0, 212, 170, 0.05);
      border-color: rgba(0, 212, 170, 0.3);
    }
  }

  @media (max-width: 767px) {
    height: auto;
    min-height: 220px;
    padding: 1.5rem;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
`;

const StatIconWrapper = styled.div<IconWrapperProps>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
  background: ${(props) => `rgba(${hexToRgb(props.$color)}, 0.12)`};
  box-shadow: 0 0 20px ${(props) => `rgba(${hexToRgb(props.$color)}, 0.2)`};
  font-size: 1.6rem;
  color: ${(props) => props.$color};
  border: 1px solid ${(props) => `rgba(${hexToRgb(props.$color)}, 0.25)`};
`;

const StatValueDisplay = styled.div`
  font-family: "Source Sans 3", "Source Sans Pro", sans-serif;
  font-size: clamp(2rem, 5vw, 2.8rem);
  font-weight: 700;
  color: ${T.text};
  line-height: 1;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
`;

const StatLabel = styled.div`
  font-family: "Cormorant Garamond", "Georgia", serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${T.text};
  margin-bottom: 0.25rem;
`;

const StatUnit = styled.div`
  font-family: "Source Sans 3", "Source Sans Pro", sans-serif;
  font-size: 0.85rem;
  color: ${T.textSecondary};
  font-style: italic;
`;

const ChartsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 4rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    gap: 1.5rem;
    margin-top: 3rem;
  }
`;

const ChartCard = styled.div`
  position: relative;
  height: 380px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 212, 170, 0.12);
  background: ${T.surface};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  ${noMotion}

  @media (hover: hover) {
    &:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 50px -10px rgba(0, 212, 170, 0.15),
        0 0 30px rgba(0, 212, 170, 0.05);
      border-color: rgba(0, 212, 170, 0.3);
    }
  }

  @media (max-width: 767px) {
    height: 320px;
    padding: 1rem;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
`;

const ChartHeader = styled.div`
  margin-bottom: 1rem;
`;

const ChartTitle = styled.h3`
  font-family: "Cormorant Garamond", "Georgia", serif;
  font-size: 1.3rem;
  font-weight: 600;
  color: ${T.text};
  margin-bottom: 0.5rem;
`;

const ChartDescription = styled.p`
  font-family: "Source Sans 3", "Source Sans Pro", sans-serif;
  font-size: 0.9rem;
  color: ${T.textSecondary};
  line-height: 1.5;
`;

const ChartBody = styled.div`
  flex: 1;
  width: 100%;
  min-height: 240px;
`;

const TooltipContainer = styled.div`
  background: rgba(15, 25, 35, 0.95);
  border: 1px solid rgba(0, 212, 170, 0.2);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
`;

const TooltipLabel = styled.p`
  color: ${T.text};
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
`;

const TooltipValue = styled.p`
  color: ${T.primary};
  font-size: 0.9rem;
`;

// --- Custom Tooltip ---

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length > 0) {
    return (
      <TooltipContainer>
        <TooltipLabel>{label}</TooltipLabel>
        <TooltipValue>
          {payload[0].value} {payload[0].unit || ""}
        </TooltipValue>
      </TooltipContainer>
    );
  }
  return null;
};

// --- Animation Variants ---

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const titleVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

// --- Data ---

const statItems: StatItem[] = [
  {
    id: 1,
    title: "Client Transformations",
    value: 847,
    unit: "successful journeys",
    icon: <FaUsers />,
    color: T.primary,
    animation: { duration: 3.0, delay: 0 },
  },
  {
    id: 2,
    title: "Weight Lost",
    value: 12450,
    unit: "pounds collectively",
    icon: <FaWeight />,
    color: T.primary,
    animation: { duration: 3.0, delay: 0.2 },
  },
  {
    id: 3,
    title: "Training Sessions",
    value: 42810,
    unit: "hours of coaching",
    icon: <FaClock />,
    color: T.secondary,
    animation: { duration: 3.0, delay: 0.4 },
  },
  {
    id: 4,
    title: "Calories Burned",
    value: 76,
    unit: "million total",
    prefix: "",
    icon: <FaFireAlt />,
    color: T.secondary,
    animation: { duration: 3.0, delay: 0.6 },
  },
  {
    id: 5,
    title: "Average BMI Reduction",
    value: 6.3,
    unit: "points",
    icon: <FaHeartbeat />,
    color: T.accent,
    animation: { duration: 3.0, delay: 0.8 },
  },
  {
    id: 6,
    title: "New Swimmers Taught",
    value: 312,
    unit: "confident in the water",
    icon: <FaSwimmer />,
    color: T.accent,
    animation: { duration: 3.0, delay: 1 },
  },
];

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
      { name: "Week 12", value: 19.2 },
    ],
    colors: [T.primary, T.secondary],
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
      { name: "Shoulder Press", value: 39 },
    ],
    colors: [T.primary, T.secondary],
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
      { name: "Rehabilitation", value: 5 },
    ],
    colors: [T.primary, T.secondary, T.accent, T.primaryDark, T.secondaryLight],
  },
];

// --- Component ---

const FitnessStats: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const isDesktop = useIsDesktop();
  const prefersReducedMotion = useReducedMotion();

  const [animatedValues, setAnimatedValues] = useState<
    Record<number, number>
  >(statItems.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {}));

  // Counter animation
  useEffect(() => {
    if (!isInView) return;

    // Reduced motion: immediately show final values
    if (prefersReducedMotion) {
      setAnimatedValues(
        statItems.reduce((acc, item) => ({ ...acc, [item.id]: item.value }), {})
      );
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    statItems.forEach((stat) => {
      const { id, value, animation } = stat;
      const { duration, delay } = animation;

      setAnimatedValues((prev) => ({ ...prev, [id]: 0 }));

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
  }, [isInView, prefersReducedMotion]);

  // Reduced-motion-aware animation variants
  const activeContainerVariants: Variants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : containerVariants;

  const activeItemVariants: Variants = prefersReducedMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : itemVariants;

  const activeTitleVariants: Variants = prefersReducedMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : titleVariants;

  // Chart rendering
  const renderChart = (config: ChartConfig): React.ReactNode => {
    const { type, data, colors, id } = config;

    switch (type) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={240} debounce={100}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: T.textSecondary }}
                axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              />
              <YAxis
                tick={{ fill: T.textSecondary }}
                axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient
                  id={`lineGradient-${id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={colors[1]} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <Line
                type="monotone"
                dataKey="value"
                stroke={`url(#lineGradient-${id})`}
                strokeWidth={3}
                dot={{
                  stroke: colors[0],
                  strokeWidth: 2,
                  r: 4,
                  fill: T.bg,
                }}
                activeDot={{ r: 6, fill: colors[0] }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={240} debounce={100}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: T.textSecondary }}
                axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              />
              <YAxis
                tick={{ fill: T.textSecondary }}
                axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient
                  id={`barGradient-${id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={colors[1]} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <Bar
                dataKey="value"
                fill={`url(#barGradient-${id})`}
                radius={[5, 5, 0, 0]}
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={240} debounce={100}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={70}
                innerRadius={35}
                fill={T.secondary}
                dataKey="value"
                animationDuration={1500}
              >
                {data.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip />}
                formatter={(value: any) => [`${value}%`, "Value"]}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <StatsSection id="stats" ref={sectionRef}>
      {/* Background: paint-ab.png with 3D parallax scroll effect */}
      <ParallaxImageBackground src={paintAbImage} overlayOpacity={0.55} />

      <ContentWrapper>
        <Header>
          <SectionTitle
            variants={activeTitleVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            Our Results in Numbers
          </SectionTitle>
          <SectionSubtitle
            variants={activeTitleVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            Proven success metrics from years of transforming lives through
            elite fitness coaching
          </SectionSubtitle>
        </Header>

        <StatsGrid
          variants={activeContainerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {statItems.map((stat) => (
            <motion.div key={stat.id} variants={activeItemVariants}>
              <StatCard>
                <StatIconWrapper $color={stat.color}>
                  {stat.icon}
                </StatIconWrapper>
                <StatValueDisplay>
                  {stat.prefix !== undefined && stat.prefix}
                  {animatedValues[stat.id]?.toLocaleString()}
                </StatValueDisplay>
                <StatLabel>{stat.title}</StatLabel>
                <StatUnit>{stat.unit}</StatUnit>
              </StatCard>
            </motion.div>
          ))}
        </StatsGrid>

        <ChartsGrid
          variants={activeContainerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {chartConfigs.map((chart) => (
            <motion.div key={chart.id} variants={activeItemVariants}>
              <ChartCard>
                <ChartHeader>
                  <ChartTitle>{chart.title}</ChartTitle>
                  <ChartDescription>{chart.description}</ChartDescription>
                </ChartHeader>
                <ChartBody>{renderChart(chart)}</ChartBody>
              </ChartCard>
            </motion.div>
          ))}
        </ChartsGrid>
      </ContentWrapper>
    </StatsSection>
  );
};

export default FitnessStats;
