/**
 * galaxy-swan-theme.ts
 * Enhanced Galaxy-Swan Theme - Blending elegant Swan brand identity with cosmic Galaxy aesthetics
 * Designed for SwanStudios platform with sophisticated color harmonies and visual continuity
 * 
 * COLOR HIERARCHY:
 * - BLUE (Cyan/Neon Blue) = PRIMARY
 * - PURPLE = SECONDARY  
 * - Other colors follow in supporting roles
 */

// Swan Brand Colors (inspired by logo and elegant Swan imagery)
const swanColors = {
  // Primary Swan Whites & Silvers
  swanPure: '#FFFFFF',
  swanSilver: '#E8F0FF', 
  swanPearl: '#F0F8FF',
  swanMist: 'rgba(255, 255, 255, 0.95)',
  
  // Swan Blues (PRIMARY BRAND COLORS)
  swanBlue: '#00A0E3', // Primary brand blue
  swanCyan: '#00FFFF', // Primary neon blue/cyan - MAIN PRIMARY
  swanDeep: '#0085C7',
  swanIce: '#B8E6FF',
  
  // Swan Accent Colors (subtle elegance)
  swanGold: '#FFD700',
  swanRose: '#FFE4E1',
  swanSage: '#E8F5E8',
};

// Existing Galaxy Colors (Purple as SECONDARY)
const galaxyColors = {
  // Deep Space Foundations
  cosmic: '#7851A9', // SECONDARY - Purple cosmic
  nebula: '#00FFFF', // Same as swanCyan - PRIMARY
  stardust: '#1e1e3f',
  void: '#0a0a1a',
  
  // Galaxy Gradients (Purple as secondary)
  nebulaPurple: '#7b2cbf', // SECONDARY
  cosmicBlue: '#46cdcf', // PRIMARY supporting
  starlight: '#a9f8fb', // PRIMARY supporting
  galaxyPink: '#c8b6ff', // Tertiary
  
  // Depth Levels
  deepSpace: 'rgba(10, 10, 30, 0.8)',
  midSpace: 'rgba(30, 30, 60, 0.6)',
  outerSpace: 'rgba(50, 50, 80, 0.4)',
};

/**
 * Galaxy-Swan Unified Color Palette
 * BLUE = PRIMARY, PURPLE = SECONDARY
 */
export const galaxySwanTheme = {
  // === FOUNDATION COLORS ===
  background: {
    primary: galaxyColors.void,
    secondary: galaxyColors.stardust,
    overlay: galaxyColors.deepSpace,
    surface: galaxyColors.midSpace,
    elevated: galaxyColors.outerSpace,
  },
  
  // === BRAND HIERARCHY ===
  // PRIMARY COLORS (Blue/Cyan)
  primary: {
    main: swanColors.swanCyan, // #00FFFF - Main primary
    blue: swanColors.swanBlue, // #00A0E3 - Brand blue
    deep: swanColors.swanDeep, // #0085C7 - Deep blue
    light: swanColors.swanIce, // #B8E6FF - Light blue
    starlight: galaxyColors.starlight, // #a9f8fb - Supporting
    cosmicBlue: galaxyColors.cosmicBlue, // #46cdcf - Supporting
  },
  
  // SECONDARY COLORS (Purple)
  secondary: {
    main: galaxyColors.cosmic, // #7851A9 - Main secondary
    nebula: galaxyColors.nebulaPurple, // #7b2cbf - Vibrant purple
    pink: galaxyColors.galaxyPink, // #c8b6ff - Light purple
  },
  
  // === SWAN BRAND INTEGRATION ===
  swan: {
    // Primary Swan brand colors for headers, logos, key UI elements
    pure: swanColors.swanPure,
    silver: swanColors.swanSilver,
    pearl: swanColors.swanPearl,
    mist: swanColors.swanMist,
    
    // Swan blues harmonizing with Galaxy (PRIMARY)
    blue: swanColors.swanBlue,
    cyan: swanColors.swanCyan, // MAIN PRIMARY
    deep: swanColors.swanDeep,
    ice: swanColors.swanIce,
    
    // Subtle accents
    gold: swanColors.swanGold,
    rose: swanColors.swanRose,
    sage: swanColors.swanSage,
  },
  
  // === GALAXY COSMIC COLORS ===
  galaxy: {
    cosmic: galaxyColors.cosmic, // SECONDARY
    nebula: galaxyColors.nebula, // Same as primary cyan
    stardust: galaxyColors.stardust,
    void: galaxyColors.void,
    purple: galaxyColors.nebulaPurple, // SECONDARY
    blue: galaxyColors.cosmicBlue, // PRIMARY supporting
    starlight: galaxyColors.starlight, // PRIMARY supporting
    pink: galaxyColors.galaxyPink, // Tertiary
  },
  
  // === HARMONIZED COLOR FUNCTIONS ===
  gradients: {
    // PRIMARY gradients (Blue-based)
    primaryCosmic: `linear-gradient(135deg, ${swanColors.swanCyan}, ${swanColors.swanBlue})`,
    primaryNebula: `linear-gradient(45deg, ${swanColors.swanCyan}, ${galaxyColors.starlight})`,
    blueStardust: `linear-gradient(to right, ${swanColors.swanBlue}, ${galaxyColors.stardust})`,
    
    // SECONDARY gradients (Purple-based)
    secondaryCosmic: `linear-gradient(135deg, ${galaxyColors.cosmic}, ${galaxyColors.nebulaPurple})`,
    purpleNebula: `linear-gradient(45deg, ${galaxyColors.cosmic}, ${galaxyColors.galaxyPink})`,
    
    // PRIMARY-SECONDARY blends
    swanCosmic: `linear-gradient(135deg, ${swanColors.swanCyan}, ${galaxyColors.cosmic})`,
    pearlNebula: `linear-gradient(45deg, ${swanColors.swanPearl}, ${swanColors.swanCyan})`,
    silverStardust: `linear-gradient(to right, ${swanColors.swanSilver}, ${galaxyColors.stardust})`,
    
    // Enhanced Galaxy gradients with Swan touches
    cosmicSwan: `linear-gradient(135deg, ${galaxyColors.cosmic}, ${swanColors.swanCyan})`,
    nebulaFrost: `linear-gradient(to bottom, ${swanColors.swanCyan}, ${swanColors.swanIce})`,
    
    // Premium package gradients (maintaining existing structure)
    ruby: `linear-gradient(135deg, rgba(232, 0, 70, 0.3), rgba(253, 0, 159, 0.3))`,
    emerald: `linear-gradient(135deg, rgba(0, 232, 176, 0.3), rgba(0, 253, 159, 0.3))`,
    cosmic: `linear-gradient(135deg, rgba(93, 63, 211, 0.3), rgba(255, 46, 99, 0.3))`,
    purple: `linear-gradient(135deg, rgba(120, 0, 245, 0.3), rgba(200, 148, 255, 0.3))`,
  },
  
  // === INTERACTIVE STATES ===
  interactive: {
    // Hover states using PRIMARY colors
    hover: `rgba(0, 255, 255, 0.1)`, // Primary cyan
    active: swanColors.swanCyan, // Primary
    focus: `0 0 0 2px ${swanColors.swanCyan}`, // Primary
    
    // Button states (PRIMARY first, SECONDARY second)
    buttonPrimary: `linear-gradient(135deg, ${swanColors.swanCyan}, ${swanColors.swanBlue})`,
    buttonSecondary: `linear-gradient(135deg, ${galaxyColors.cosmic}, ${galaxyColors.nebulaPurple})`,
    buttonActive: swanColors.swanCyan, // Primary
  },
  
  // === TEXT & CONTENT ===
  text: {
    primary: swanColors.swanPure,
    secondary: swanColors.swanSilver,
    accent: swanColors.swanCyan, // PRIMARY
    muted: 'rgba(255, 255, 255, 0.7)',
    inverse: galaxyColors.void,
  },
  
  // === BORDERS & DIVIDERS ===
  borders: {
    subtle: 'rgba(255, 255, 255, 0.05)',
    elegant: `rgba(0, 255, 255, 0.2)`, // PRIMARY
    prominent: `rgba(0, 160, 227, 0.4)`, // PRIMARY
    glow: `0 0 10px rgba(0, 255, 255, 0.3)`, // PRIMARY
  },
  
  // === SHADOWS & EFFECTS ===
  shadows: {
    // PRIMARY-based shadows
    primaryGlow: `0 0 20px rgba(0, 255, 255, 0.3)`,
    primaryElevated: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 255, 255, 0.2)`,
    
    // SECONDARY-based shadows  
    secondaryGlow: `0 0 20px rgba(120, 81, 169, 0.3)`,
    secondaryElevated: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(120, 81, 169, 0.2)`,
    
    // Combined effects (PRIMARY + SECONDARY)
    swanCosmic: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 255, 255, 0.3)`,
    
    // Legacy names (for compatibility)
    swanGlow: `0 0 20px rgba(0, 255, 255, 0.3)`, // PRIMARY
    swanElevated: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 255, 255, 0.2)`, // PRIMARY
    cosmic: `0 0 30px rgba(120, 81, 169, 0.4)`, // SECONDARY
    nebula: `0 0 25px rgba(0, 255, 255, 0.5)`, // PRIMARY
  },
  
  // === COMPONENT-SPECIFIC THEMES ===
  components: {
    // Header theming (PRIMARY focus)
    header: {
      background: galaxyColors.void,
      border: `1px solid rgba(0, 255, 255, 0.1)`, // PRIMARY
      logoGlow: swanColors.swanCyan, // PRIMARY
      navHover: swanColors.swanCyan, // PRIMARY
    },
    
    // Card theming (PRIMARY accents)
    card: {
      background: 'rgba(30, 30, 60, 0.4)',
      border: `1px solid rgba(0, 255, 255, 0.2)`, // PRIMARY
      hoverBorder: `rgba(0, 255, 255, 0.6)`, // PRIMARY
      hoverBackground: 'rgba(30, 30, 60, 0.6)',
    },
    
    // Button theming (PRIMARY first)
    button: {
      primary: `linear-gradient(135deg, ${swanColors.swanCyan}, ${swanColors.swanBlue})`, // PRIMARY
      secondary: `linear-gradient(135deg, ${galaxyColors.cosmic}, ${galaxyColors.nebulaPurple})`, // SECONDARY
      accent: swanColors.swanCyan, // PRIMARY
    },
  },
  
  // === GLOW BUTTON THEME MAPPING ===
  // Maps to existing GlowButton themes with PRIMARY/SECONDARY hierarchy
  glowButton: {
    // PRIMARY theme (blue/cyan) - Default
    primary: {
      background: "#041e2e", // Dark blue base
      color: "#fff",
      shadow: "rgba(4, 64, 104, 0.2)",
      shineLeft: "rgba(0, 160, 227, 0.5)", // swanBlue
      shineRight: "rgba(0, 255, 255, 0.65)", // swanCyan
      glowStart: "#00A0E3", // swanBlue
      glowEnd: "#00FFFF", // swanCyan
    },
    
    // SECONDARY theme (purple) - Galaxy-Swan secondary
    secondary: {
      background: "#09041e",
      color: "#fff",
      shadow: "rgba(33, 4, 104, 0.2)",
      shineLeft: "rgba(120, 0, 245, 0.5)",
      shineRight: "rgba(200, 148, 255, 0.65)",
      glowStart: "#B000E8",
      glowEnd: "#009FFD",
    },
    
    // Keep existing themes for compatibility
    purple: {
      background: "#09041e",
      color: "#fff",
      shadow: "rgba(33, 4, 104, 0.2)",
      shineLeft: "rgba(120, 0, 245, 0.5)",
      shineRight: "rgba(200, 148, 255, 0.65)",
      glowStart: "#B000E8",
      glowEnd: "#009FFD",
    },
    
    emerald: {
      background: "#0c1e0e",
      color: "#fff",
      shadow: "rgba(4, 104, 49, 0.2)",
      shineLeft: "rgba(0, 245, 111, 0.5)",
      shineRight: "rgba(148, 255, 200, 0.65)",
      glowStart: "#00E8B0",
      glowEnd: "#00FD9F",
    },
    
    ruby: {
      background: "#1e040c",
      color: "#fff",
      shadow: "rgba(104, 4, 33, 0.2)",
      shineLeft: "rgba(245, 0, 90, 0.5)",
      shineRight: "rgba(255, 148, 180, 0.65)",
      glowStart: "#E80046",
      glowEnd: "#FD009F",
    },
    
    cosmic: {
      background: "#0a0a18",
      color: "#fff",
      shadow: "rgba(10, 10, 40, 0.3)",
      shineLeft: "rgba(86, 11, 173, 0.5)",
      shineRight: "rgba(255, 255, 255, 0.65)",
      glowStart: "#5D3FD3",
      glowEnd: "#FF2E63",
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
 * Maps Galaxy-Swan theme to GlowButton component themes
 * PRIMARY = Blue/Cyan, SECONDARY = Purple
 */
export const getGlowButtonTheme = (variant: 'primary' | 'secondary' | 'purple' | 'emerald' | 'ruby' | 'cosmic' = 'primary') => {
  // Map the Galaxy-Swan theme to GlowButton format
  // BLUE = PRIMARY, PURPLE = SECONDARY
  const themeMap = {
    // PRIMARY (Blue/Cyan) - Default for most buttons
    primary: galaxySwanTheme.glowButton.primary,
    
    // SECONDARY (Purple) - For secondary actions
    secondary: galaxySwanTheme.glowButton.purple, // Use purple theme for secondary
    
    // Legacy compatibility - keep existing names working
    purple: galaxySwanTheme.glowButton.purple,
    emerald: galaxySwanTheme.glowButton.emerald,
    ruby: galaxySwanTheme.glowButton.ruby,
    cosmic: galaxySwanTheme.glowButton.cosmic,
  };
  
  return themeMap[variant] || themeMap.primary; // Always default to PRIMARY (blue)
};