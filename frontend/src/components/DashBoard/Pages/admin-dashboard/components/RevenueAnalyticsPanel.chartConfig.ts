export const pieChartColors = [
  'var(--accent-primary, #60C0F0)',
  'var(--swan-lavender, #4070C0)',
  'var(--success, #10b981)',
  'var(--warning, #f59e0b)',
  'var(--danger, #ef4444)',
  'var(--accent-secondary, #8B5CF6)',
];

export const victoryTooltipProps = {
  flyoutStyle: {
    fill: 'var(--bg-elevated, #141419)',
    stroke: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)',
  },
  style: {
    fill: 'var(--text-primary, #E0ECF4)',
    fontFamily: "'Fira Code', monospace",
    fontSize: 10,
  },
};

export const revenueAxisProps = {
  style: {
    axis: { stroke: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)' },
    tickLabels: {
      fill: 'var(--text-primary, #E0ECF4)',
      fontSize: 12,
      fontFamily: "'Fira Code', monospace",
    },
    grid: {
      stroke: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)',
      strokeDasharray: '4,4',
    },
  },
};

export const revenueAreaProps = {
  style: {
    data: {
      fill: 'color-mix(in srgb, var(--accent-data, #50A0F0) 15%, transparent)',
      stroke: 'var(--accent-data, #50A0F0)',
      strokeWidth: 3,
    },
  },
};

export const transactionLineProps = {
  style: {
    data: { stroke: 'var(--accent-gold, #C6A84B)', strokeWidth: 2 },
  },
};

export const packagePieProps = {
  style: {
    labels: {
      fill: 'var(--text-primary, #E0ECF4)',
      fontSize: 10,
      fontFamily: "'Sora', sans-serif",
    },
  },
};

export const packageLegendProps = {
  style: {
    labels: {
      fill: 'var(--text-primary, #E0ECF4)',
      fontSize: 11,
      fontFamily: "'Sora', sans-serif",
    },
  },
};
