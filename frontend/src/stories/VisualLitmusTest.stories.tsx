// frontend/src/stories/VisualLitmusTest.stories.tsx

/**
 * Visual Litmus Test - WCAG 2.1 AA Contrast Verification
 *
 * This Storybook story provides a comprehensive visual QA tool for verifying
 * that all Galaxy-Swan Theme v2.0 color combinations meet WCAG 2.1 AA standards.
 *
 * **WCAG 2.1 AA Requirements:**
 * - Normal text (< 18pt): Contrast ratio ≥ 4.5:1
 * - Large text (≥ 18pt or bold ≥ 14pt): Contrast ratio ≥ 3:1
 * - Interactive elements: Contrast ratio ≥ 3:1
 *
 * **What this tests:**
 * - All theme color combinations (text on backgrounds)
 * - Primary/secondary brand colors
 * - Glass opacity levels (FrostedCard backgrounds)
 * - Interactive states (hover, active, focus)
 * - Border visibility
 *
 * **How to use:**
 * 1. Open this story in Storybook
 * 2. Visually inspect all color combinations
 * 3. Use browser DevTools to verify contrast ratios
 * 4. Red borders indicate FAILING combinations (fix required)
 * 5. Green borders indicate PASSING combinations (approved)
 *
 * **Created for:**
 * Homepage Refactor v2.0 (Week 1) - Gemini Enhancement (Visual Litmus Test)
 * Accessibility Approval Gate (#3) - WCAG 2.1 AA compliance
 *
 * @see docs/ai-workflow/HOMEPAGE-REFACTOR-FINAL-PLAN.md
 */

import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import styled, { ThemeProvider } from 'styled-components';
import { galaxySwanTheme } from '../styles/galaxy-swan-theme';
import FrostedCard from '../components/ui-kit/glass/FrostedCard';
import LivingConstellation from '../components/ui-kit/background/LivingConstellation';

/**
 * ================================
 * CONTRAST CALCULATION UTILITIES
 * ================================
 */

/**
 * Calculate relative luminance (WCAG formula)
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function getLuminance(hexColor: string): number {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio (WCAG formula)
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio passes WCAG AA
 */
function meetsWCAG_AA(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const threshold = isLargeText ? 3.0 : 4.5;
  return ratio >= threshold;
}

/**
 * ================================
 * STYLED COMPONENTS
 * ================================
 */

const TestContainer = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.background.primary};
  padding: 2rem;
  position: relative;
`;

const TestSection = styled.section`
  margin-bottom: 4rem;
  position: relative;
  z-index: 1;
`;

const SectionTitle = styled.h2`
  font-size: 2rem;
  color: ${({ theme }) => theme.swan.cyan};
  margin-bottom: 1.5rem;
  text-align: center;
`;

const SectionDescription = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text.secondary};
  text-align: center;
  margin-bottom: 2rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;

const TestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
`;

const TestCard = styled.div<{ $passes: boolean }>`
  background: ${({ theme }) => theme.background.secondary};
  border: 3px solid ${({ $passes }) => ($passes ? '#2ecc71' : '#e74c3c')};
  border-radius: 10px;
  padding: 1.5rem;
  position: relative;

  &::before {
    content: ${({ $passes }) => ($passes ? '"✓ PASS"' : '"✗ FAIL"')};
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.75rem;
    border-radius: 5px;
    font-size: 0.8rem;
    font-weight: bold;
    background: ${({ $passes }) => ($passes ? '#2ecc71' : '#e74c3c')};
    color: white;
  }
`;

const ColorSwatch = styled.div<{ $bgColor: string; $textColor: string }>`
  background: ${({ $bgColor }) => $bgColor};
  color: ${({ $textColor }) => $textColor};
  padding: 2rem 1.5rem;
  border-radius: 5px;
  margin-bottom: 1rem;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
`;

const ContrastInfo = styled.div`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.text.secondary};
  margin-top: 0.5rem;

  strong {
    color: ${({ theme }) => theme.text.primary};
  }
`;

/**
 * ================================
 * TEST DATA
 * ================================
 */

interface ColorTest {
  name: string;
  foreground: string;
  background: string;
  isLargeText?: boolean;
}

const textColorTests: ColorTest[] = [
  // Primary text on backgrounds
  {
    name: 'Primary Text on Void',
    foreground: galaxySwanTheme.text.primary, // #FFFFFF
    background: galaxySwanTheme.galaxy.void, // #0a0a1a
  },
  {
    name: 'Secondary Text on Void',
    foreground: galaxySwanTheme.text.secondary, // #E8F0FF
    background: galaxySwanTheme.galaxy.void,
  },
  {
    name: 'Accent Text (Cyan) on Void',
    foreground: galaxySwanTheme.swan.cyan, // #00FFFF
    background: galaxySwanTheme.galaxy.void,
  },

  // Text on card backgrounds
  {
    name: 'Primary Text on Card Background',
    foreground: galaxySwanTheme.text.primary,
    background: galaxySwanTheme.components.card.background, // rgba(30, 30, 60, 0.4)
  },
  {
    name: 'Secondary Text on Card Background',
    foreground: galaxySwanTheme.text.secondary,
    background: galaxySwanTheme.components.card.background,
  },

  // Cyan brand colors on dark backgrounds
  {
    name: 'Swan Cyan on Stardust',
    foreground: galaxySwanTheme.swan.cyan, // #00FFFF
    background: galaxySwanTheme.galaxy.stardust, // #1e1e3f
  },
  {
    name: 'Swan Blue on Void',
    foreground: galaxySwanTheme.swan.blue, // #00A0E3
    background: galaxySwanTheme.galaxy.void,
  },

  // Purple secondary colors
  {
    name: 'Cosmic Purple on Void',
    foreground: galaxySwanTheme.galaxy.cosmic, // #7851A9
    background: galaxySwanTheme.galaxy.void,
  },
  {
    name: 'Galaxy Pink on Void',
    foreground: galaxySwanTheme.galaxy.pink, // #c8b6ff
    background: galaxySwanTheme.galaxy.void,
  },

  // Large text (headings)
  {
    name: 'Large Heading (Cyan) on Void',
    foreground: galaxySwanTheme.swan.cyan,
    background: galaxySwanTheme.galaxy.void,
    isLargeText: true,
  },
  {
    name: 'Large Heading (Purple) on Void',
    foreground: galaxySwanTheme.galaxy.cosmic,
    background: galaxySwanTheme.galaxy.void,
    isLargeText: true,
  },
];

const interactiveTests: ColorTest[] = [
  // Button states
  {
    name: 'Button Hover (Cyan)',
    foreground: '#FFFFFF',
    background: galaxySwanTheme.interactive.active, // #00FFFF
  },

  // Focus states
  {
    name: 'Focus Ring (Cyan)',
    foreground: galaxySwanTheme.galaxy.void,
    background: galaxySwanTheme.swan.cyan,
  },

  // Border visibility
  {
    name: 'Elegant Border (Cyan)',
    foreground: galaxySwanTheme.borders.elegant, // rgba(0, 255, 255, 0.2)
    background: galaxySwanTheme.galaxy.void,
  },
];

/**
 * ================================
 * STORY DEFINITION
 * ================================
 */

const meta: Meta = {
  title: 'V2.0 Foundation/Visual Litmus Test',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Visual Litmus Test - WCAG 2.1 AA Compliance

This story verifies that all Galaxy-Swan Theme v2.0 color combinations meet WCAG 2.1 AA standards.

## How to Use
1. **Green borders** = Passing combinations (approved ✓)
2. **Red borders** = Failing combinations (fix required ✗)
3. Check contrast ratios in each card
4. All normal text must be ≥ 4.5:1
5. All large text must be ≥ 3:1
6. All interactive elements must be ≥ 3:1

## Accessibility Gates
- **AI Approval #3**: Accessibility verification required
- **WCAG 2.1 AA**: Minimum standard for public websites
- **Target**: 100% pass rate (zero failures)

## What We Test
- Text on backgrounds (primary, secondary, accent)
- Interactive states (hover, active, focus)
- Glass opacity levels (thin, mid, thick)
- Border visibility
- Large vs. normal text
        `,
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const ContrastTests: Story = {
  render: () => (
    <ThemeProvider theme={galaxySwanTheme}>
      <TestContainer>
        <LivingConstellation density="low" interactive={false} forceTier="minimal" />

        {/* TEXT COLOR TESTS */}
        <TestSection>
          <SectionTitle>Text Color Contrast Tests</SectionTitle>
          <SectionDescription>
            Verifying that all text colors meet WCAG AA standards on various backgrounds.
            Normal text requires ≥ 4.5:1, large text requires ≥ 3:1.
          </SectionDescription>

          <TestGrid>
            {textColorTests.map((test, index) => {
              const passes = meetsWCAG_AA(
                test.foreground,
                test.background,
                test.isLargeText
              );
              const ratio = getContrastRatio(test.foreground, test.background);

              return (
                <TestCard key={index} $passes={passes}>
                  <ColorSwatch
                    $bgColor={test.background}
                    $textColor={test.foreground}
                  >
                    <h3 style={{ fontSize: test.isLargeText ? '1.8rem' : '1rem' }}>
                      {test.name}
                    </h3>
                    {test.isLargeText && (
                      <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        (Large Text - ≥18pt)
                      </p>
                    )}
                  </ColorSwatch>

                  <ContrastInfo>
                    <strong>Contrast Ratio:</strong> {ratio.toFixed(2)}:1
                    <br />
                    <strong>Foreground:</strong> {test.foreground}
                    <br />
                    <strong>Background:</strong> {test.background}
                    <br />
                    <strong>Threshold:</strong>{' '}
                    {test.isLargeText ? '3.0:1 (Large)' : '4.5:1 (Normal)'}
                  </ContrastInfo>
                </TestCard>
              );
            })}
          </TestGrid>
        </TestSection>

        {/* INTERACTIVE ELEMENT TESTS */}
        <TestSection>
          <SectionTitle>Interactive Element Contrast Tests</SectionTitle>
          <SectionDescription>
            Verifying that interactive elements (buttons, focus rings, borders) meet
            WCAG AA standards (≥ 3:1).
          </SectionDescription>

          <TestGrid>
            {interactiveTests.map((test, index) => {
              const passes = meetsWCAG_AA(test.foreground, test.background, true); // Interactive = large text threshold
              const ratio = getContrastRatio(test.foreground, test.background);

              return (
                <TestCard key={index} $passes={passes}>
                  <ColorSwatch
                    $bgColor={test.background}
                    $textColor={test.foreground}
                  >
                    <h3 style={{ fontSize: '1.2rem' }}>{test.name}</h3>
                  </ColorSwatch>

                  <ContrastInfo>
                    <strong>Contrast Ratio:</strong> {ratio.toFixed(2)}:1
                    <br />
                    <strong>Foreground:</strong> {test.foreground}
                    <br />
                    <strong>Background:</strong> {test.background}
                    <br />
                    <strong>Threshold:</strong> 3.0:1 (Interactive)
                  </ContrastInfo>
                </TestCard>
              );
            })}
          </TestGrid>
        </TestSection>

        {/* GLASS OPACITY TESTS */}
        <TestSection>
          <SectionTitle>Glass Opacity Contrast Tests</SectionTitle>
          <SectionDescription>
            Verifying that FrostedCard glass opacity levels maintain readable contrast.
            All levels should pass with white text.
          </SectionDescription>

          <TestGrid>
            {(['thin', 'mid', 'thick', 'opaque'] as const).map((level, index) => {
              // FrostedCard uses rgba(25, 25, 45, opacity)
              const glassOpacity = galaxySwanTheme.glass[level];
              const r = 25;
              const g = 25;
              const b = 45;

              // Approximate background by blending with void background
              const voidLum = getLuminance(galaxySwanTheme.galaxy.void);
              const glassLum = (r / 255 + g / 255 + b / 255) / 3;
              const blendedLum = voidLum * (1 - glassOpacity) + glassLum * glassOpacity;

              // Convert back to hex (approximation)
              const blendedHex = `#${Math.round(r * glassOpacity).toString(16).padStart(2, '0')}${Math.round(g * glassOpacity).toString(16).padStart(2, '0')}${Math.round(b * glassOpacity).toString(16).padStart(2, '0')}`;

              const passes = meetsWCAG_AA('#FFFFFF', blendedHex, false);
              const ratio = getContrastRatio('#FFFFFF', blendedHex);

              return (
                <TestCard key={index} $passes={passes}>
                  <FrostedCard
                    glassLevel={level}
                    elevation={2}
                    borderVariant="subtle"
                  >
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                      <h3 style={{ color: '#FFFFFF', fontSize: '1.2rem' }}>
                        {level.charAt(0).toUpperCase() + level.slice(1)} Glass
                      </h3>
                      <p style={{ color: '#E8F0FF', marginTop: '0.5rem' }}>
                        Opacity: {(glassOpacity * 100).toFixed(0)}%
                      </p>
                    </div>
                  </FrostedCard>

                  <ContrastInfo style={{ marginTop: '1rem' }}>
                    <strong>Contrast Ratio:</strong> {ratio.toFixed(2)}:1
                    <br />
                    <strong>Glass Level:</strong> {level} ({(glassOpacity * 100).toFixed(0)}%)
                    <br />
                    <strong>Threshold:</strong> 4.5:1 (Normal Text)
                  </ContrastInfo>
                </TestCard>
              );
            })}
          </TestGrid>
        </TestSection>

        {/* SUMMARY */}
        <TestSection>
          <FrostedCard glassLevel="mid" elevation={2} borderVariant="elegant">
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h2 style={{ color: galaxySwanTheme.swan.cyan, fontSize: '2rem' }}>
                Visual Litmus Test Complete
              </h2>
              <p
                style={{
                  color: galaxySwanTheme.text.secondary,
                  fontSize: '1.1rem',
                  marginTop: '1rem',
                  lineHeight: '1.6',
                }}
              >
                All color combinations above have been tested for WCAG 2.1 AA compliance.
                <br />
                <strong style={{ color: '#2ecc71' }}>Green borders</strong> indicate
                passing combinations.
                <br />
                <strong style={{ color: '#e74c3c' }}>Red borders</strong> indicate
                failing combinations that require adjustment.
                <br />
                <br />
                Target: <strong>100% pass rate</strong> (zero red borders)
              </p>
            </div>
          </FrostedCard>
        </TestSection>
      </TestContainer>
    </ThemeProvider>
  ),
};
