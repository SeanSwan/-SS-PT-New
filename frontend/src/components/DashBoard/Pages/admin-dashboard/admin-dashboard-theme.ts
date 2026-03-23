/**
 * admin-dashboard-theme.ts — Variable Bridge
 * ============================================
 * Migrated from retired "adminGalaxyTheme" to Crystalline Swan CSS variables.
 * AI Village consensus 2026-03-22.
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
    voidBlack: '#000000',
  },
  gradients: {
    commandCenter: 'linear-gradient(135deg, var(--brand-primary, #002060) 0%, var(--accent-purple, #8B5CF6) 50%, var(--accent-cyan, #60C0F0) 100%)',
    adminGalaxy: 'radial-gradient(ellipse at center, var(--brand-primary, #002060) 0%, var(--bg-base, #0A0A0F) 70%)',
    dataFlow: 'linear-gradient(45deg, var(--accent-purple, #8B5CF6) 0%, var(--accent-cyan, #60C0F0) 100%)',
    stellarCommand: 'conic-gradient(from 0deg, var(--accent-cyan, #60C0F0), var(--accent-purple, #8B5CF6), var(--brand-primary, #002060), var(--accent-cyan, #60C0F0))',
  },
  shadows: {
    commandGlow: '0 0 30px rgba(139, 92, 246, 0.6)',
    adminNebula: '0 0 40px rgba(0, 32, 96, 0.4)',
    dataVisualization: '0 20px 40px rgba(0, 0, 0, 0.6)',
    stellarGlow: '0 0 20px currentColor',
  },
};
