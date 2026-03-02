/**
 * galaxy-swan-theme.ts
 * Crystalline Swan Theme — Extended token set for SwanStudios platform
 *
 * Master Palette — Preset F-Alt "Enchanted Apex: Crystalline Swan"
 * Derived from the SwanStudios swan logo:
 *
 * COLOR HIERARCHY:
 * - Midnight Sapphire #002060 — Primary foundation / logo deep navy
 * - Royal Depth #003080 — Surface / logo circle
 * - Ice Wing #60C0F0 — PRIMARY accent / wing highlight
 * - Arctic Cyan #50A0F0 — Secondary accent / feathers
 * - Gilded Fern #C6A84B — Luxury gold accent
 * - Frost White #E0ECF4 — Light background / head highlight
 * - Swan Lavender #4070C0 — Tertiary / mid-body purple-blue
 */

// Crystalline Swan Brand Colors (derived from swan logo)
const swanColors = {
  // Frost Whites & Silvers
  swanPure: '#E0ECF4',         // Frost White — primary light
  swanSilver: '#D0DCE8',       // Muted silver
  swanPearl: '#F5F8FC',        // Near-white pearl
  swanMist: 'rgba(224, 236, 244, 0.95)',

  // Swan Blues — PRIMARY BRAND COLORS
  swanBlue: '#50A0F0',         // Arctic Cyan — secondary accent
  swanCyan: '#60C0F0',         // Ice Wing — MAIN PRIMARY
  swanDeep: '#4070C0',         // Swan Lavender — tertiary
  swanIce: '#90D4F8',          // Light ice highlight

  // Swan Accent Colors
  swanGold: '#C6A84B',         // Gilded Fern
  swanRose: '#D8C478',         // Light gold
  swanSage: '#B8963A',         // Deep gold
};

// Foundation Colors (Midnight Sapphire / Royal Depth)
const galaxyColors = {
  // Deep Space Foundations
  cosmic: '#4070C0',           // Swan Lavender — tertiary
  nebula: '#60C0F0',           // Same as swanCyan — PRIMARY
  stardust: '#003080',         // Royal Depth
  void: '#002060',             // Midnight Sapphire

  // Supporting Blues
  nebulaPurple: '#003080',     // Royal Depth (was purple)
  cosmicBlue: '#50A0F0',       // Arctic Cyan
  starlight: '#90D4F8',        // Light ice
  galaxyPink: '#6090D0',       // Light lavender

  // Depth Levels
  deepSpace: 'rgba(0, 32, 96, 0.8)',
  midSpace: 'rgba(0, 48, 128, 0.6)',
  outerSpace: 'rgba(0, 48, 128, 0.4)',
};

/**
 * Crystalline Swan Unified Color Palette
 * ICE WING = PRIMARY, SWAN LAVENDER = SECONDARY, GILDED FERN = ACCENT
 */
export const galaxySwanTheme = {
  // === FOUNDATION COLORS ===
  background: {
    primary: galaxyColors.void,        // #002060 — Midnight Sapphire
    secondary: galaxyColors.stardust,  // #003080 — Royal Depth
    overlay: galaxyColors.deepSpace,
    surface: galaxyColors.midSpace,
    elevated: galaxyColors.outerSpace,
  },

  // === BRAND HIERARCHY ===
  // PRIMARY COLORS (Ice Wing / Arctic Cyan)
  primary: {
    main: swanColors.swanCyan,         // #60C0F0 — Ice Wing
    blue: swanColors.swanBlue,         // #50A0F0 — Arctic Cyan
    deep: swanColors.swanDeep,         // #4070C0 — Swan Lavender
    light: swanColors.swanIce,         // #90D4F8 — Light ice
    starlight: galaxyColors.starlight, // #90D4F8
    cosmicBlue: galaxyColors.cosmicBlue, // #50A0F0
  },

  // SECONDARY COLORS (Swan Lavender / Royal Depth)
  secondary: {
    main: galaxyColors.cosmic,          // #4070C0 — Swan Lavender
    nebula: galaxyColors.nebulaPurple,  // #003080 — Royal Depth
    pink: galaxyColors.galaxyPink,      // #6090D0 — Light lavender
  },

  // === SWAN BRAND INTEGRATION ===
  swan: {
    // Primary Swan brand colors for headers, logos, key UI elements
    pure: swanColors.swanPure,          // #E0ECF4
    silver: swanColors.swanSilver,
    pearl: swanColors.swanPearl,
    mist: swanColors.swanMist,

    // Swan blues (PRIMARY)
    blue: swanColors.swanBlue,          // #50A0F0 — Arctic Cyan
    cyan: swanColors.swanCyan,          // #60C0F0 — Ice Wing MAIN PRIMARY
    deep: swanColors.swanDeep,          // #4070C0 — Swan Lavender
    ice: swanColors.swanIce,            // #90D4F8

    // Accents
    gold: swanColors.swanGold,          // #C6A84B — Gilded Fern
    rose: swanColors.swanRose,          // #D8C478
    sage: swanColors.swanSage,          // #B8963A
  },

  // === GALAXY FOUNDATION COLORS ===
  galaxy: {
    cosmic: galaxyColors.cosmic,
    nebula: galaxyColors.nebula,
    stardust: galaxyColors.stardust,
    void: galaxyColors.void,
    purple: galaxyColors.nebulaPurple,
    blue: galaxyColors.cosmicBlue,
    starlight: galaxyColors.starlight,
    pink: galaxyColors.galaxyPink,
  },

  // === HARMONIZED GRADIENTS ===
  gradients: {
    // PRIMARY gradients (Ice Wing)
    primaryCosmic: `linear-gradient(135deg, ${swanColors.swanCyan}, ${swanColors.swanBlue})`,
    primaryNebula: `linear-gradient(45deg, ${swanColors.swanCyan}, ${galaxyColors.starlight})`,
    blueStardust: `linear-gradient(to right, ${swanColors.swanBlue}, ${galaxyColors.stardust})`,

    // SECONDARY gradients (Swan Lavender)
    secondaryCosmic: `linear-gradient(135deg, ${galaxyColors.cosmic}, ${galaxyColors.nebulaPurple})`,
    purpleNebula: `linear-gradient(45deg, ${galaxyColors.cosmic}, ${galaxyColors.galaxyPink})`,

    // PRIMARY-SECONDARY blends
    swanCosmic: `linear-gradient(135deg, ${swanColors.swanCyan}, ${galaxyColors.cosmic})`,
    pearlNebula: `linear-gradient(45deg, ${swanColors.swanPearl}, ${swanColors.swanCyan})`,
    silverStardust: `linear-gradient(to right, ${swanColors.swanSilver}, ${galaxyColors.stardust})`,

    // Enhanced Crystalline gradients
    cosmicSwan: `linear-gradient(135deg, ${galaxyColors.cosmic}, ${swanColors.swanCyan})`,
    nebulaFrost: `linear-gradient(to bottom, ${swanColors.swanCyan}, ${swanColors.swanIce})`,

    // Accent gradients (Gilded Fern)
    goldAccent: `linear-gradient(135deg, ${swanColors.swanGold}, ${swanColors.swanRose})`,

    // Premium package gradients (maintaining existing structure)
    ruby: `linear-gradient(135deg, rgba(232, 0, 70, 0.3), rgba(253, 0, 159, 0.3))`,
    emerald: `linear-gradient(135deg, rgba(0, 232, 176, 0.3), rgba(0, 253, 159, 0.3))`,
    cosmic: `linear-gradient(135deg, rgba(0, 48, 128, 0.3), rgba(96, 192, 240, 0.3))`,
    purple: `linear-gradient(135deg, rgba(64, 112, 192, 0.3), rgba(96, 144, 208, 0.3))`,
  },

  // === INTERACTIVE STATES ===
  interactive: {
    // Hover states using PRIMARY colors
    hover: `rgba(96, 192, 240, 0.1)`,
    active: swanColors.swanCyan,
    focus: `0 0 0 2px ${swanColors.swanCyan}`,

    // Button states
    buttonPrimary: `linear-gradient(135deg, ${swanColors.swanCyan}, ${swanColors.swanBlue})`,
    buttonSecondary: `linear-gradient(135deg, ${galaxyColors.cosmic}, ${galaxyColors.nebulaPurple})`,
    buttonActive: swanColors.swanCyan,
  },

  // === TEXT & CONTENT ===
  text: {
    primary: swanColors.swanPure,       // #E0ECF4
    secondary: swanColors.swanSilver,
    accent: swanColors.swanCyan,        // #60C0F0 — PRIMARY
    muted: 'rgba(224, 236, 244, 0.7)',
    inverse: galaxyColors.void,         // #002060
  },

  // === BORDERS & DIVIDERS ===
  borders: {
    subtle: 'rgba(96, 192, 240, 0.08)',
    elegant: `rgba(96, 192, 240, 0.2)`,
    prominent: `rgba(80, 160, 240, 0.4)`,
    glow: `0 0 10px rgba(96, 192, 240, 0.3)`,
  },

  // === SHADOWS & EFFECTS ===
  shadows: {
    // PRIMARY-based shadows (Ice Wing)
    primaryGlow: `0 0 20px rgba(96, 192, 240, 0.3)`,
    primaryElevated: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(96, 192, 240, 0.2)`,

    // SECONDARY-based shadows (Swan Lavender)
    secondaryGlow: `0 0 20px rgba(64, 112, 192, 0.3)`,
    secondaryElevated: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(64, 112, 192, 0.2)`,

    // Combined effects
    swanCosmic: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(96, 192, 240, 0.3)`,

    // Legacy names (for compatibility)
    swanGlow: `0 0 20px rgba(96, 192, 240, 0.3)`,
    swanElevated: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(96, 192, 240, 0.2)`,
    cosmic: `0 0 30px rgba(64, 112, 192, 0.4)`,
    nebula: `0 0 25px rgba(96, 192, 240, 0.5)`,
  },

  // === COMPONENT-SPECIFIC THEMES ===
  components: {
    // Header theming
    header: {
      background: galaxyColors.void,
      border: `1px solid rgba(96, 192, 240, 0.1)`,
      logoGlow: swanColors.swanCyan,
      navHover: swanColors.swanCyan,
    },

    // Card theming
    card: {
      background: 'rgba(0, 48, 128, 0.4)',
      border: `1px solid rgba(96, 192, 240, 0.15)`,
      hoverBorder: `rgba(96, 192, 240, 0.4)`,
      hoverBackground: 'rgba(0, 48, 128, 0.6)',
    },

    // Button theming
    button: {
      primary: `linear-gradient(135deg, ${swanColors.swanCyan}, ${swanColors.swanBlue})`,
      secondary: `linear-gradient(135deg, ${galaxyColors.cosmic}, ${galaxyColors.nebulaPurple})`,
      accent: swanColors.swanCyan,
    },
  },

  // === V2.0 THEME TOKENS ===

  /**
   * Glass Opacity Tokens (Glassmorphism)
   * Used by FrostedCard component for consistent backdrop-filter effects
   */
  glass: {
    thin: 0.06,
    mid: 0.10,
    thick: 0.14,
    opaque: 0.95,
  },

  /**
   * Parallax Timing Functions
   */
  parallax: {
    slow: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    medium: 'cubic-bezier(0.33, 0.66, 0.44, 1)',
    fast: 'cubic-bezier(0.44, 0.72, 0.52, 1)',
  },

  // === GLOW BUTTON THEME MAPPING ===
  glowButton: {
    // PRIMARY theme (Ice Wing / Arctic Cyan)
    primary: {
      background: "#001840",
      color: "#E0ECF4",
      shadow: "rgba(0, 32, 96, 0.3)",
      shineLeft: "rgba(80, 160, 240, 0.5)",
      shineRight: "rgba(96, 192, 240, 0.65)",
      glowStart: "#50A0F0",
      glowEnd: "#60C0F0",
    },

    // SECONDARY theme (Swan Lavender)
    secondary: {
      background: "#001040",
      color: "#E0ECF4",
      shadow: "rgba(0, 16, 64, 0.3)",
      shineLeft: "rgba(64, 112, 192, 0.5)",
      shineRight: "rgba(96, 144, 208, 0.65)",
      glowStart: "#4070C0",
      glowEnd: "#50A0F0",
    },

    // Keep existing themes for compatibility
    purple: {
      background: "#001040",
      color: "#E0ECF4",
      shadow: "rgba(0, 16, 64, 0.3)",
      shineLeft: "rgba(64, 112, 192, 0.5)",
      shineRight: "rgba(96, 144, 208, 0.65)",
      glowStart: "#4070C0",
      glowEnd: "#50A0F0",
    },

    emerald: {
      background: "#0c1e0e",
      color: "#E0ECF4",
      shadow: "rgba(4, 104, 49, 0.2)",
      shineLeft: "rgba(0, 245, 111, 0.5)",
      shineRight: "rgba(148, 255, 200, 0.65)",
      glowStart: "#00E8B0",
      glowEnd: "#00FD9F",
    },

    ruby: {
      background: "#1e040c",
      color: "#E0ECF4",
      shadow: "rgba(104, 4, 33, 0.2)",
      shineLeft: "rgba(245, 0, 90, 0.5)",
      shineRight: "rgba(255, 148, 180, 0.65)",
      glowStart: "#E80046",
      glowEnd: "#FD009F",
    },

    cosmic: {
      background: "#000A1A",
      color: "#E0ECF4",
      shadow: "rgba(0, 10, 26, 0.4)",
      shineLeft: "rgba(64, 112, 192, 0.5)",
      shineRight: "rgba(224, 236, 244, 0.65)",
      glowStart: "#4070C0",
      glowEnd: "#60C0F0",
    },
  },
};

/**
 * Responsive Animation Configuration
 * Provides graceful degradation for various device capabilities
 */
export const animationConfig = {
  // Performance tiers
  reduced: {
    duration: '0.2s',
    easing: 'ease',
    transform: 'none',
  },
  standard: {
    duration: '0.3s',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'translateY(-8px) scale(1.02)',
  },
  enhanced: {
    duration: '0.4s',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'translateY(-8px) scale(1.02)',
    shadows: true,
    glowEffects: true,
  },
};

/**
 * Media Queries for Responsive Design & Performance
 */
export const mediaQueries = {
  // Performance-based media queries
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  highContrast: '@media (prefers-contrast: high)',

  // Device capability detection
  lowEndDevice: '@media (max-width: 768px) and (max-height: 1024px)',
  highEndDevice: '@media (min-width: 1024px) and (min-height: 768px)',

  // Standard responsive breakpoints
  mobile: '@media (max-width: 480px)',
  tablet: '@media (min-width: 481px) and (max-width: 768px)',
  desktop: '@media (min-width: 769px)',
  ultrawide: '@media (min-width: 1400px)',
};

/**
 * Theme Utility Functions
 */
export const themeUtils = {
  // Create rgba color from hex
  rgba: (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  // Get appropriate animation tier based on user preferences
  getAnimationTier: () => {
    if (typeof window !== 'undefined') {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isLowEnd = window.matchMedia('(max-width: 768px)').matches;

      if (prefersReduced) return animationConfig.reduced;
      if (isLowEnd) return animationConfig.standard;
      return animationConfig.enhanced;
    }
    return animationConfig.standard;
  },

  // Generate theme-appropriate gradient
  generateGradient: (startColor: string, endColor: string, angle: number = 135) => {
    return `linear-gradient(${angle}deg, ${startColor}, ${endColor})`;
  },
};

export default galaxySwanTheme;

/**
 * GLOW BUTTON THEME VARIANTS
 * Maps Crystalline Swan theme to GlowButton component themes
 * ICE WING = PRIMARY, SWAN LAVENDER = SECONDARY
 */
export const getGlowButtonTheme = (variant: 'primary' | 'secondary' | 'purple' | 'emerald' | 'ruby' | 'cosmic' = 'primary') => {
  const themeMap = {
    primary: galaxySwanTheme.glowButton.primary,
    secondary: galaxySwanTheme.glowButton.purple,
    purple: galaxySwanTheme.glowButton.purple,
    emerald: galaxySwanTheme.glowButton.emerald,
    ruby: galaxySwanTheme.glowButton.ruby,
    cosmic: galaxySwanTheme.glowButton.cosmic,
  };

  return themeMap[variant] || themeMap.primary;
};
