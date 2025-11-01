// frontend/src/stories/FoundationComponents.stories.tsx

/**
 * Storybook Stories for Homepage Refactor v2.0 Foundation Components
 *
 * This file contains comprehensive stories for all Week 1 foundation components:
 * - LivingConstellation (background orchestrator)
 * - FrostedCard (glassmorphism cards)
 * - ParallaxSectionWrapper (scroll depth effects)
 * - V1ThemeBridge (visual cohesion wrapper)
 *
 * **Purpose:**
 * - Visual QA for all performance tiers (enhanced/standard/minimal)
 * - Interactive playground for theme token testing
 * - Accessibility verification (reduced motion/transparency)
 * - Component documentation for AI Village and developers
 *
 * **Created for:**
 * Homepage Refactor v2.0 (Week 1) - Gemini Enhancement (Storybook-driven development)
 *
 * @see docs/ai-workflow/HOMEPAGE-REFACTOR-FINAL-PLAN.md
 */

import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import styled, { ThemeProvider } from 'styled-components';
import { galaxySwanTheme } from '../styles/galaxy-swan-theme';

// Import foundation components
import LivingConstellation from '../components/ui-kit/background/LivingConstellation';
import FrostedCard from '../components/ui-kit/glass/FrostedCard';
import ParallaxSectionWrapper from '../components/ui-kit/parallax/ParallaxSectionWrapper';
import V1ThemeBridge from '../components/ui/ThemeBridge/V1ThemeBridge';
import { PerformanceTierProvider } from '../core/perf/PerformanceTierProvider';

/**
 * ================================
 * STORY DECORATORS & CONTAINERS
 * ================================
 */

const StoryContainer = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.text.primary};
  padding: 2rem;
`;

const SectionSpacer = styled.div`
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const CardContent = styled.div`
  h2 {
    font-size: 1.8rem;
    margin-bottom: 1rem;
    color: ${({ theme }) => theme.swan.cyan};
  }

  p {
    font-size: 1rem;
    line-height: 1.6;
    color: ${({ theme }) => theme.text.secondary};
    margin-bottom: 0.5rem;
  }

  ul {
    list-style: none;
    padding: 0;

    li {
      padding: 0.5rem 0;
      color: ${({ theme }) => theme.text.secondary};

      &::before {
        content: '✓ ';
        color: ${({ theme }) => theme.swan.cyan};
        font-weight: bold;
        margin-right: 0.5rem;
      }
    }
  }
`;

/**
 * ================================
 * LIVING CONSTELLATION STORIES
 * ================================
 */

const livingConstellationMeta: Meta<typeof LivingConstellation> = {
  title: 'V2.0 Foundation/LivingConstellation',
  component: LivingConstellation,
  decorators: [
    (Story) => (
      <ThemeProvider theme={galaxySwanTheme}>
        <PerformanceTierProvider>
          <StoryContainer>
            <Story />
          </StoryContainer>
        </PerformanceTierProvider>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**LivingConstellation** is the signature v2.0 background component that replaces 8MB video backgrounds.

**Performance Tiers:**
- **Enhanced**: WebGL particle system (500+ particles, 60 FPS, ≤10% CPU)
- **Standard**: Canvas 2D particles (200 particles, 30 FPS, ≤5% CPU)
- **Minimal**: Static gradient (0% CPU, accessibility fallback)

**Auto-detects based on:**
- Device CPU cores & memory
- Network speed (saveData, effectiveType)
- User preferences (prefers-reduced-motion)
        `,
      },
    },
  },
  argTypes: {
    density: {
      control: { type: 'select' },
      options: ['low', 'medium', 'high'],
      description: 'Particle density (low: 100, medium: 200, high: 500)',
    },
    interactive: {
      control: { type: 'boolean' },
      description: 'Enable mouse interaction (particles follow cursor)',
    },
    paused: {
      control: { type: 'boolean' },
      description: 'Pause animation (useful for tab visibility detection)',
    },
    colorFrom: {
      control: { type: 'color' },
      description: 'Start color (gradient)',
    },
    colorTo: {
      control: { type: 'color' },
      description: 'End color (gradient)',
    },
    forceTier: {
      control: { type: 'select' },
      options: ['enhanced', 'standard', 'minimal', undefined],
      description: 'Force specific performance tier (overrides auto-detection)',
    },
  },
};

export default livingConstellationMeta;

type LivingConstellationStory = StoryObj<typeof LivingConstellation>;

export const AutoDetect: LivingConstellationStory = {
  args: {
    density: 'medium',
    interactive: true,
    paused: false,
    colorFrom: '#00ffff',
    colorTo: '#7851a9',
  },
  parameters: {
    docs: {
      description: {
        story: 'Auto-detects performance tier based on device capabilities and user preferences.',
      },
    },
  },
};

export const EnhancedTier: LivingConstellationStory = {
  args: {
    density: 'high',
    interactive: true,
    paused: false,
    colorFrom: '#00ffff',
    colorTo: '#7851a9',
    forceTier: 'enhanced',
  },
  parameters: {
    docs: {
      description: {
        story: 'WebGL tier - 500+ particles at 60 FPS (high-end devices only).',
      },
    },
  },
};

export const StandardTier: LivingConstellationStory = {
  args: {
    density: 'medium',
    interactive: true,
    paused: false,
    colorFrom: '#00ffff',
    colorTo: '#7851a9',
    forceTier: 'standard',
  },
  parameters: {
    docs: {
      description: {
        story: 'Canvas 2D tier - 200 particles at 30 FPS (mid-range devices).',
      },
    },
  },
};

export const MinimalTier: LivingConstellationStory = {
  args: {
    density: 'low',
    interactive: false,
    paused: false,
    colorFrom: '#00ffff',
    colorTo: '#7851a9',
    forceTier: 'minimal',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Static gradient tier - 0% CPU (low-end devices, reduced-motion users).',
      },
    },
  },
};

/**
 * ================================
 * FROSTED CARD STORIES
 * ================================
 */

const frostedCardMeta: Meta<typeof FrostedCard> = {
  title: 'V2.0 Foundation/FrostedCard',
  component: FrostedCard,
  decorators: [
    (Story) => (
      <ThemeProvider theme={galaxySwanTheme}>
        <StoryContainer>
          <LivingConstellation density="medium" interactive={false} />
          <div style={{ position: 'relative', zIndex: 1, padding: '4rem' }}>
            <Story />
          </div>
        </StoryContainer>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**FrostedCard** provides standardized glassmorphism effects with theme-controlled opacity.

**Glass Levels:**
- **thin**: 6% opacity, 5px blur (tooltips, overlays)
- **mid**: 10% opacity, 10px blur (standard cards)
- **thick**: 14% opacity, 15px blur (prominent cards, modals)
- **opaque**: 95% opacity, no blur (accessibility fallback)

**Accessibility:**
- Respects \`prefers-reduced-transparency\` (falls back to opaque)
- \`@supports\` fallback for browsers without \`backdrop-filter\`
- WCAG 2.1 AA contrast compliance
        `,
      },
    },
  },
  argTypes: {
    glassLevel: {
      control: { type: 'select' },
      options: ['thin', 'mid', 'thick', 'opaque'],
      description: 'Glass opacity level (from theme.glass tokens)',
    },
    elevation: {
      control: { type: 'select' },
      options: [1, 2, 3],
      description: 'Shadow elevation (1: subtle, 2: standard, 3: prominent)',
    },
    interactive: {
      control: { type: 'boolean' },
      description: 'Enable hover effects (lift + glow)',
    },
    borderVariant: {
      control: { type: 'select' },
      options: ['subtle', 'elegant', 'none'],
      description: 'Border style (subtle: 5% white, elegant: cyan glow)',
    },
  },
};

export { frostedCardMeta as FrostedCardMeta };

type FrostedCardStory = StoryObj<typeof FrostedCard>;

export const ThinGlass: FrostedCardStory = {
  args: {
    glassLevel: 'thin',
    elevation: 1,
    interactive: false,
    borderVariant: 'subtle',
    children: (
      <CardContent>
        <h2>Thin Glass (6% opacity)</h2>
        <p>Subtle transparency for tooltips and overlays.</p>
        <p>Backdrop blur: 5px</p>
      </CardContent>
    ),
  },
};

export const MidGlass: FrostedCardStory = {
  args: {
    glassLevel: 'mid',
    elevation: 2,
    interactive: true,
    borderVariant: 'elegant',
    children: (
      <CardContent>
        <h2>Mid Glass (10% opacity)</h2>
        <p>Standard transparency for features and package cards.</p>
        <p>Backdrop blur: 10px</p>
        <ul>
          <li>Hover for interactive effect</li>
          <li>Elegant cyan border glow</li>
          <li>Mid elevation shadow</li>
        </ul>
      </CardContent>
    ),
  },
};

export const ThickGlass: FrostedCardStory = {
  args: {
    glassLevel: 'thick',
    elevation: 3,
    interactive: true,
    borderVariant: 'elegant',
    children: (
      <CardContent>
        <h2>Thick Glass (14% opacity)</h2>
        <p>Prominent transparency for hero CTAs and modals.</p>
        <p>Backdrop blur: 15px</p>
        <ul>
          <li>Maximum glass effect</li>
          <li>High elevation shadow</li>
          <li>Interactive hover lift</li>
        </ul>
      </CardContent>
    ),
  },
};

export const OpaqueGlass: FrostedCardStory = {
  args: {
    glassLevel: 'opaque',
    elevation: 2,
    interactive: false,
    borderVariant: 'subtle',
    children: (
      <CardContent>
        <h2>Opaque Fallback (95% opacity)</h2>
        <p>Accessibility fallback for prefers-reduced-transparency users.</p>
        <p>No backdrop blur (solid background)</p>
        <ul>
          <li>WCAG 2.1 AA compliant</li>
          <li>Screen reader friendly</li>
          <li>High contrast mode safe</li>
        </ul>
      </CardContent>
    ),
  },
};

/**
 * ================================
 * PARALLAX SECTION WRAPPER STORIES
 * ================================
 */

const parallaxMeta: Meta<typeof ParallaxSectionWrapper> = {
  title: 'V2.0 Foundation/ParallaxSectionWrapper',
  component: ParallaxSectionWrapper,
  decorators: [
    (Story) => (
      <ThemeProvider theme={galaxySwanTheme}>
        <StoryContainer>
          <LivingConstellation density="low" interactive={false} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Story />
          </div>
        </StoryContainer>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**ParallaxSectionWrapper** adds scroll-triggered depth effects using framer-motion.

**Speed Tiers:**
- **slow**: Background elements (200px offset, gentle easing)
- **medium**: Mid-ground elements (150px offset, standard easing)
- **fast**: Foreground elements (100px offset, snappy easing)

**Accessibility:**
- Respects \`prefers-reduced-motion\` (static fallback)
- Disabled on mobile by default (\`disabledOnMobile\` prop)
- Uses GPU-accelerated \`transform\` (no layout thrashing)
        `,
      },
    },
  },
  argTypes: {
    speed: {
      control: { type: 'select' },
      options: ['slow', 'medium', 'fast'],
      description: 'Parallax speed (from theme.parallax timing functions)',
    },
    sticky: {
      control: { type: 'boolean' },
      description: 'Enable sticky positioning (for layered sections)',
    },
    disabledOnMobile: {
      control: { type: 'boolean' },
      description: 'Disable parallax on mobile (performance optimization)',
    },
    reduceMotionFallback: {
      control: { type: 'boolean' },
      description: 'Force reduced-motion fallback (testing)',
    },
  },
};

export { parallaxMeta as ParallaxMeta };

type ParallaxStory = StoryObj<typeof ParallaxSectionWrapper>;

export const SlowParallax: ParallaxStory = {
  args: {
    speed: 'slow',
    sticky: false,
    disabledOnMobile: true,
    reduceMotionFallback: false,
    children: (
      <>
        <SectionSpacer>
          <FrostedCard glassLevel="mid" elevation={2} borderVariant="elegant">
            <CardContent>
              <h2>Slow Parallax (200px offset)</h2>
              <p>Background layer - gentle easing</p>
              <p>Scroll down to see effect</p>
            </CardContent>
          </FrostedCard>
        </SectionSpacer>
        <SectionSpacer>
          <FrostedCard glassLevel="mid" elevation={2} borderVariant="elegant">
            <CardContent>
              <h2>Section 2</h2>
              <p>Keep scrolling...</p>
            </CardContent>
          </FrostedCard>
        </SectionSpacer>
        <SectionSpacer>
          <FrostedCard glassLevel="mid" elevation={2} borderVariant="elegant">
            <CardContent>
              <h2>Section 3</h2>
              <p>Notice the slow parallax effect</p>
            </CardContent>
          </FrostedCard>
        </SectionSpacer>
      </>
    ),
  },
};

export const MediumParallax: ParallaxStory = {
  args: {
    speed: 'medium',
    sticky: false,
    disabledOnMobile: true,
    reduceMotionFallback: false,
    children: (
      <>
        <SectionSpacer>
          <FrostedCard glassLevel="thick" elevation={2} borderVariant="elegant">
            <CardContent>
              <h2>Medium Parallax (150px offset)</h2>
              <p>Mid-ground layer - standard easing</p>
              <p>Most common parallax speed</p>
            </CardContent>
          </FrostedCard>
        </SectionSpacer>
        <SectionSpacer>
          <FrostedCard glassLevel="thick" elevation={2} borderVariant="elegant">
            <CardContent>
              <h2>Section 2</h2>
              <p>Medium speed feels natural</p>
            </CardContent>
          </FrostedCard>
        </SectionSpacer>
      </>
    ),
  },
};

export const FastParallax: ParallaxStory = {
  args: {
    speed: 'fast',
    sticky: false,
    disabledOnMobile: true,
    reduceMotionFallback: false,
    children: (
      <>
        <SectionSpacer>
          <FrostedCard glassLevel="thick" elevation={3} interactive borderVariant="elegant">
            <CardContent>
              <h2>Fast Parallax (100px offset)</h2>
              <p>Foreground layer - snappy easing</p>
              <p>Great for hero sections</p>
            </CardContent>
          </FrostedCard>
        </SectionSpacer>
        <SectionSpacer>
          <FrostedCard glassLevel="thick" elevation={3} interactive borderVariant="elegant">
            <CardContent>
              <h2>Section 2</h2>
              <p>Fast parallax adds dynamism</p>
            </CardContent>
          </FrostedCard>
        </SectionSpacer>
      </>
    ),
  },
};

/**
 * ================================
 * V1 THEME BRIDGE STORIES
 * ================================
 */

// Mock V1.0 Section (hardcoded old styles)
const MockV1Section = styled.div`
  background: linear-gradient(to right, #1a1a2e, #16213e);
  padding: 4rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  margin: 2rem 0;

  h2 {
    color: #ffffff;
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  p {
    color: #d0d0d0;
    font-size: 1.1rem;
    line-height: 1.6;
  }
`;

const v1BridgeMeta: Meta<typeof V1ThemeBridge> = {
  title: 'V2.0 Foundation/V1ThemeBridge',
  component: V1ThemeBridge,
  decorators: [
    (Story) => (
      <ThemeProvider theme={galaxySwanTheme}>
        <StoryContainer>
          <LivingConstellation density="low" interactive={false} />
          <div style={{ position: 'relative', zIndex: 1, padding: '2rem' }}>
            <Story />
          </div>
        </StoryContainer>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**V1ThemeBridge** is a temporary wrapper for v1.0 sections during the hybrid refactor.

**Purpose:**
During the 2-week hybrid refactor, some sections remain v1.0 while others upgrade to v2.0.
This bridge applies minimal v2.0 styling to v1.0 sections for visual cohesion.

**What it does:**
- Applies v2.0 dark background (galaxy.void)
- Updates text colors to v2.0 standards (swan.silver)
- Softens old borders to match v2.0 subtle borders
- Shows dev mode indicator (orange badge)

**Temporary:**
This component will be removed once all sections are v2.0.
        `,
      },
    },
  },
};

export { v1BridgeMeta as V1ThemeBridgeMeta };

type V1BridgeStory = StoryObj<typeof V1ThemeBridge>;

export const WithoutBridge: V1BridgeStory = {
  args: {
    children: (
      <MockV1Section>
        <h2>Old V1.0 Section (Without Bridge)</h2>
        <p>
          This section uses hardcoded v1.0 styles. Notice the old background gradient,
          bright borders, and slightly mismatched colors.
        </p>
        <p>
          It doesn't blend well with the new v2.0 LivingConstellation background.
        </p>
      </MockV1Section>
    ),
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={galaxySwanTheme}>
        <StoryContainer>
          <LivingConstellation density="low" interactive={false} />
          <div style={{ position: 'relative', zIndex: 1, padding: '2rem' }}>
            {/* Render WITHOUT V1ThemeBridge */}
            <Story />
          </div>
        </StoryContainer>
      </ThemeProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'V1.0 section without the bridge - notice the visual mismatch with v2.0 background.',
      },
    },
  },
};

export const WithBridge: V1BridgeStory = {
  args: {
    children: (
      <MockV1Section>
        <h2>Old V1.0 Section (With Bridge)</h2>
        <p>
          This section uses the SAME hardcoded v1.0 styles, but is wrapped in V1ThemeBridge.
        </p>
        <p>
          Notice how the bridge automatically adjusts the background, text colors, and borders
          to match v2.0 aesthetics without changing the original component code.
        </p>
        <p>
          The orange "V1 Theme Bridge Active" badge appears in dev mode to help developers
          identify bridged sections.
        </p>
      </MockV1Section>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'V1.0 section WITH the bridge - seamlessly blends with v2.0 background.',
      },
    },
  },
};
