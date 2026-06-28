/**
 * admin-dashboard-theme.ts - variable bridge.
 * Migrated from retired adminGalaxyTheme to Crystalline Swan CSS variables.
 */

export const adminGalaxyTheme = {
  colors: {
    deepSpace: 'var(--bg-base, #0A0A0F)',
    commandBlue: 'var(--brand-primary, #002060)',
    stellarBlue: 'var(--accent-purple, #8B5CF6)',
    cyberCyan: 'var(--accent-cyan, #60C0F0)',
    stellarWhite: 'var(--text-primary, #E0ECF4)',
    energyBlue: 'var(--accent-cyan, #60C0F0)',
    warningAmber: 'var(--warning, #f59e0b)',
    successGreen: 'var(--success, #10b981)',
    criticalRed: 'var(--danger, #ef4444)',
    voidBlack: 'var(--bg-base, #0A0A0F)',
  },
  gradients: {
    commandCenter: 'linear-gradient(135deg, var(--brand-primary, #002060) 0%, var(--accent-purple, #8B5CF6) 50%, var(--accent-cyan, #60C0F0) 100%)',
    adminGalaxy: 'radial-gradient(ellipse at center, var(--surface-primary, #002060) 0%, var(--bg-base, #0A0A0F) 70%)',
    dataFlow: 'linear-gradient(45deg, var(--accent-purple, #8B5CF6) 0%, var(--accent-cyan, #60C0F0) 100%)',
    stellarCommand: 'conic-gradient(from 0deg, var(--accent-cyan, #60C0F0), var(--accent-purple, #8B5CF6), var(--brand-primary, #002060), var(--accent-cyan, #60C0F0))',
  },
  shadows: {
    commandGlow: '0 0 30px color-mix(in srgb, var(--accent-purple, #8B5CF6) 60%, transparent)',
    adminNebula: '0 0 40px color-mix(in srgb, var(--surface-primary, #002060) 40%, transparent)',
    dataVisualization: 'var(--shadow-elevation, 0 20px 40px color-mix(in srgb, var(--bg-base, #0A0A0F) 60%, transparent))',
    stellarGlow: '0 0 20px currentColor',
  },
};
