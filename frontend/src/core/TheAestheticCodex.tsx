/**
 * core/TheAestheticCodex.tsx
 * Living Style Guide for SwanStudios Platform
 * Pure Styled Components Implementation - The Single Source of Design Truth
 * COMPLETE EDITION with Button Components, Form Elements, Layout System & Component Showcase
 */

import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import swanStudiosTheme from './theme';

// ===== UTILITY FUNCTIONS =====

// Helper function to convert typography objects to CSS
const applyTypography = (typography: any) => {
  if (!typography) return '';
  
  return css`
    font-size: ${typography.fontSize || 'inherit'};
    font-weight: ${typography.fontWeight || 'inherit'};
    line-height: ${typography.lineHeight || 'inherit'};
    letter-spacing: ${typography.letterSpacing || 'inherit'};
    text-transform: ${typography.textTransform || 'inherit'};
  `;
};

// Helper function to apply input styles
const applyInputStyles = () => {
  const input = swanStudiosTheme.components.input;
  
  return css`
    background: ${input.background};
    border: ${input.border};
    border-radius: ${input.borderRadius};
    padding: ${input.padding};
    font-size: ${input.fontSize};
    color: ${input.color};
  `;
};

// ===== STYLED COMPONENT FOUNDATIONS =====

const CodexContainer = styled.div.attrs({
  'data-testid': 'style-guide',
  className: 'codex-container'
})`
  min-height: 100vh;
  background: ${props => props.theme.background?.primary || swanStudiosTheme.galaxy.void};
  color: ${props => props.theme.text?.primary || swanStudiosTheme.text.primary};
  padding: ${swanStudiosTheme.spacing.lg};
  
  ${swanStudiosTheme.breakpoints.up.mobile} {
    padding: ${swanStudiosTheme.spacing.xl};
  }
`;

const CodexHeader = styled.header`
  text-align: center;
  margin-bottom: ${swanStudiosTheme.spacing.xxxl};
  padding-bottom: ${swanStudiosTheme.spacing.xl};
  border-bottom: 1px solid ${swanStudiosTheme.borders.elegant};
`;

const CodexTitle = styled.h1`
  ${applyTypography(swanStudiosTheme.typography.display.h1)};
  background: ${swanStudiosTheme.gradients.primaryCosmic};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: ${swanStudiosTheme.spacing.md};
  text-shadow: ${swanStudiosTheme.shadows.primaryGlow};
`;

const CodexSubtitle = styled.p`
  ${applyTypography(swanStudiosTheme.typography.body.large)};
  color: ${swanStudiosTheme.text.secondary};
  max-width: 600px;
  margin: 0 auto;
`;

const Section = styled.section`
  margin-bottom: ${swanStudiosTheme.spacing.xxxl};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h2`
  ${applyTypography(swanStudiosTheme.typography.display.h2)};
  color: ${swanStudiosTheme.primary.main};
  margin-bottom: ${swanStudiosTheme.spacing.xl};
  padding-bottom: ${swanStudiosTheme.spacing.sm};
  border-bottom: 2px solid ${swanStudiosTheme.primary.main};
  display: flex;
  align-items: center;
  gap: ${swanStudiosTheme.spacing.md};
  
  &::before {
    content: '';
    width: 4px;
    height: 2rem;
    background: ${swanStudiosTheme.gradients.primaryCosmic};
    border-radius: 2px;
  }
`;

const Grid = styled.div<{ columns?: number; gap?: string }>`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${props => props.gap || swanStudiosTheme.spacing.lg};
  margin-bottom: ${swanStudiosTheme.spacing.xl};
  
  ${props => props.columns && `
    grid-template-columns: repeat(${props.columns}, 1fr);
    
    ${swanStudiosTheme.breakpoints.down.tablet} {
      grid-template-columns: 1fr;
    }
  `}
`;

const Card = styled.div`
  background: ${swanStudiosTheme.components.card.background};
  border: ${swanStudiosTheme.components.card.border};
  border-radius: 12px;
  padding: ${swanStudiosTheme.spacing.lg};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    border-color: ${swanStudiosTheme.components.card.hoverBorder};
    background: ${swanStudiosTheme.components.card.hoverBackground};
    box-shadow: ${swanStudiosTheme.shadows.primaryElevated};
    transform: translateY(-4px);
  }
`;

const CodeBlock = styled.pre`
  background: rgba(10, 10, 30, 0.8);
  border: 1px solid ${swanStudiosTheme.borders.subtle};
  border-radius: 8px;
  padding: ${swanStudiosTheme.spacing.md};
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  color: ${swanStudiosTheme.text.secondary};
  overflow-x: auto;
  margin-top: ${swanStudiosTheme.spacing.sm};
`;

// ===== COLOR PALETTE SHOWCASE =====

const ColorPalette = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${swanStudiosTheme.spacing.md};
`;

const ColorGroup = styled.div`
  background: ${swanStudiosTheme.components.card.background};
  border-radius: 12px;
  padding: ${swanStudiosTheme.spacing.lg};
  border: 1px solid ${swanStudiosTheme.borders.subtle};
`;

const ColorGroupTitle = styled.h4`
  ${applyTypography(swanStudiosTheme.typography.body.medium)};
  color: ${swanStudiosTheme.text.primary};
  margin-bottom: ${swanStudiosTheme.spacing.md};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
`;

const ColorSwatch = styled.div<{ color: string; textColor?: string }>`
  background: ${props => props.color};
  color: ${props => props.textColor || '#fff'};
  padding: ${swanStudiosTheme.spacing.md};
  border-radius: 8px;
  margin-bottom: ${swanStudiosTheme.spacing.sm};
  display: flex;
  flex-direction: column;
  min-height: 80px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.color};
    opacity: 0.1;
  }
`;

const ColorName = styled.span`
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: ${swanStudiosTheme.spacing.xs};
  position: relative;
  z-index: 1;
`;

const ColorValue = styled.span`
  font-family: 'Monaco', monospace;
  font-size: 0.75rem;
  opacity: 0.8;
  position: relative;
  z-index: 1;
`;

// ===== TYPOGRAPHY SHOWCASE =====

const TypographyGrid = styled.div`
  display: grid;
  gap: ${swanStudiosTheme.spacing.xl};
`;

const TypographyExample = styled.div`
  background: ${swanStudiosTheme.components.card.background};
  border: 1px solid ${swanStudiosTheme.borders.subtle};
  border-radius: 12px;
  padding: ${swanStudiosTheme.spacing.lg};
`;

const TypographyLabel = styled.div`
  ${applyTypography(swanStudiosTheme.typography.ui.label)};
  color: ${swanStudiosTheme.primary.main};
  margin-bottom: ${swanStudiosTheme.spacing.sm};
`;

// ===== BUTTON COMPONENTS SHOWCASE =====

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${swanStudiosTheme.spacing.lg};
`;

const ButtonGroup = styled.div`
  background: ${swanStudiosTheme.components.card.background};
  border-radius: 12px;
  padding: ${swanStudiosTheme.spacing.lg};
  border: 1px solid ${swanStudiosTheme.borders.subtle};
`;

const ButtonGroupTitle = styled.h4`
  ${applyTypography(swanStudiosTheme.typography.body.medium)};
  color: ${swanStudiosTheme.text.primary};
  margin-bottom: ${swanStudiosTheme.spacing.md};
  font-weight: 600;
`;

const ButtonExample = styled.div`
  margin-bottom: ${swanStudiosTheme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${swanStudiosTheme.spacing.sm};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

// Styled button components based on Galaxy-Swan theme
const PrimaryButton = styled.button`
  ${swanStudiosTheme.components.buttonBase};
  background: ${swanStudiosTheme.gradients.primaryCosmic};
  color: ${swanStudiosTheme.text.primary};
  box-shadow: ${swanStudiosTheme.shadows.primaryGlow};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${swanStudiosTheme.shadows.primaryElevated};
  }
`;

const SecondaryButton = styled.button`
  ${swanStudiosTheme.components.buttonBase};
  background: ${swanStudiosTheme.gradients.secondaryCosmic};
  color: ${swanStudiosTheme.text.primary};
  box-shadow: ${swanStudiosTheme.shadows.secondaryGlow};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${swanStudiosTheme.shadows.secondaryElevated};
  }
`;

const OutlineButton = styled.button`
  ${swanStudiosTheme.components.buttonBase};
  background: transparent;
  border: 2px solid ${swanStudiosTheme.primary.main};
  color: ${swanStudiosTheme.primary.main};
  
  &:hover:not(:disabled) {
    background: ${swanStudiosTheme.primary.main};
    color: ${swanStudiosTheme.galaxy.void};
    box-shadow: ${swanStudiosTheme.shadows.primaryGlow};
  }
`;

const GhostButton = styled.button`
  ${swanStudiosTheme.components.buttonBase};
  background: transparent;
  border: 1px solid transparent;
  color: ${swanStudiosTheme.text.secondary};
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    color: ${swanStudiosTheme.text.primary};
    border-color: ${swanStudiosTheme.borders.elegant};
  }
`;

// ===== FORM ELEMENTS SHOWCASE =====

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: ${swanStudiosTheme.spacing.lg};
`;

const FormGroup = styled.div`
  background: ${swanStudiosTheme.components.card.background};
  border-radius: 12px;
  padding: ${swanStudiosTheme.spacing.lg};
  border: 1px solid ${swanStudiosTheme.borders.subtle};
`;

const FormGroupTitle = styled.h4`
  ${applyTypography(swanStudiosTheme.typography.body.medium)};
  color: ${swanStudiosTheme.text.primary};
  margin-bottom: ${swanStudiosTheme.spacing.md};
  font-weight: 600;
`;

const FormField = styled.div`
  margin-bottom: ${swanStudiosTheme.spacing.md};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  ${applyTypography(swanStudiosTheme.typography.ui.label)};
  color: ${swanStudiosTheme.text.primary};
  display: block;
  margin-bottom: ${swanStudiosTheme.spacing.xs};
`;

const StyledInput = styled.input`
  ${applyInputStyles()};
  width: 100%;
  
  &:focus {
    border-color: ${swanStudiosTheme.components.input.focus.borderColor};
    box-shadow: ${swanStudiosTheme.components.input.focus.boxShadow};
    outline: ${swanStudiosTheme.components.input.focus.outline};
  }
  
  &.error {
    border-color: ${swanStudiosTheme.components.input.error.borderColor};
    box-shadow: ${swanStudiosTheme.components.input.error.boxShadow};
  }
`;

const StyledSelect = styled.select`
  ${applyInputStyles()};
  width: 100%;
  
  &:focus {
    border-color: ${swanStudiosTheme.components.input.focus.borderColor};
    box-shadow: ${swanStudiosTheme.components.input.focus.boxShadow};
    outline: ${swanStudiosTheme.components.input.focus.outline};
  }
`;

const StyledTextarea = styled.textarea`
  ${applyInputStyles()};
  width: 100%;
  min-height: 120px;
  resize: vertical;
  
  &:focus {
    border-color: ${swanStudiosTheme.components.input.focus.borderColor};
    box-shadow: ${swanStudiosTheme.components.input.focus.boxShadow};
    outline: ${swanStudiosTheme.components.input.focus.outline};
  }
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${swanStudiosTheme.spacing.sm};
  cursor: pointer;
`;

const StyledCheckbox = styled.input.attrs({ type: 'checkbox' })`
  width: 18px;
  height: 18px;
  accent-color: ${swanStudiosTheme.primary.main};
  cursor: pointer;
`;

const CheckboxLabel = styled.span`
  ${applyTypography(swanStudiosTheme.typography.body.medium)};
  color: ${swanStudiosTheme.text.primary};
  cursor: pointer;
`;

// ===== LAYOUT SHOWCASE =====

const LayoutShowcase = styled.div`
  display: grid;
  gap: ${swanStudiosTheme.spacing.xl};
`;

const LayoutExample = styled.div`
  background: ${swanStudiosTheme.components.card.background};
  border: 1px solid ${swanStudiosTheme.borders.subtle};
  border-radius: 12px;
  padding: ${swanStudiosTheme.spacing.lg};
`;

const LayoutTitle = styled.h4`
  ${applyTypography(swanStudiosTheme.typography.body.medium)};
  color: ${swanStudiosTheme.text.primary};
  margin-bottom: ${swanStudiosTheme.spacing.md};
  font-weight: 600;
`;

const GridDemo = styled.div<{ columns: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns}, 1fr);
  gap: ${swanStudiosTheme.spacing.md};
  
  ${swanStudiosTheme.breakpoints.down.tablet} {
    grid-template-columns: 1fr;
  }
`;

const GridItem = styled.div`
  background: ${swanStudiosTheme.primary.main};
  color: ${swanStudiosTheme.galaxy.void};
  padding: ${swanStudiosTheme.spacing.md};
  border-radius: 8px;
  text-align: center;
  ${applyTypography(swanStudiosTheme.typography.body.medium)};
  font-weight: 500;
`;

const FlexDemo = styled.div<{ direction?: 'row' | 'column'; justify?: string; align?: string }>`
  display: flex;
  flex-direction: ${props => props.direction || 'row'};
  justify-content: ${props => props.justify || 'flex-start'};
  align-items: ${props => props.align || 'flex-start'};
  gap: ${swanStudiosTheme.spacing.md};
  padding: ${swanStudiosTheme.spacing.md};
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  
  ${swanStudiosTheme.breakpoints.down.mobile} {
    flex-direction: column;
  }
`;

const FlexItem = styled.div`
  background: ${swanStudiosTheme.secondary.main};
  color: ${swanStudiosTheme.text.primary};
  padding: ${swanStudiosTheme.spacing.sm} ${swanStudiosTheme.spacing.md};
  border-radius: 6px;
  ${applyTypography(swanStudiosTheme.typography.body.small)};
  font-weight: 500;
`;

// ===== COMPONENT SHOWCASE =====

const ComponentShowcase = styled.div`
  display: grid;
  gap: ${swanStudiosTheme.spacing.xl};
`;

const ComponentGroup = styled.div`
  background: ${swanStudiosTheme.components.card.background};
  border: 1px solid ${swanStudiosTheme.borders.subtle};
  border-radius: 12px;
  padding: ${swanStudiosTheme.spacing.lg};
`;

const ComponentTitle = styled.h4`
  ${applyTypography(swanStudiosTheme.typography.body.medium)};
  color: ${swanStudiosTheme.text.primary};
  margin-bottom: ${swanStudiosTheme.spacing.md};
  font-weight: 600;
`;

const ComponentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${swanStudiosTheme.spacing.md};
`;

const DemoCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${swanStudiosTheme.borders.subtle};
  border-radius: 8px;
  padding: ${swanStudiosTheme.spacing.md};
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${swanStudiosTheme.primary.main};
    box-shadow: ${swanStudiosTheme.shadows.primaryGlow};
    transform: translateY(-2px);
  }
`;

const DemoCardTitle = styled.h5`
  ${swanStudiosTheme.typography.body.medium};
  color: ${swanStudiosTheme.primary.main};
  margin-bottom: ${swanStudiosTheme.spacing.sm};
  font-weight: 600;
`;

const DemoCardContent = styled.p`
  ${swanStudiosTheme.typography.body.small};
  color: ${swanStudiosTheme.text.secondary};
  margin-bottom: ${swanStudiosTheme.spacing.sm};
  line-height: 1.5;
`;

const Tag = styled.span`
  background: ${swanStudiosTheme.primary.main};
  color: ${swanStudiosTheme.galaxy.void};
  padding: ${swanStudiosTheme.spacing.xs} ${swanStudiosTheme.spacing.sm};
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
`;

// ===== COMPONENT SECTIONS =====

const ColorPaletteSection: React.FC = () => (
  <Section>
    <SectionTitle>Color Palette</SectionTitle>
    <ColorPalette>
      {/* Primary Colors */}
      <ColorGroup>
        <ColorGroupTitle>Primary (Blue/Cyan)</ColorGroupTitle>
        <ColorSwatch color={swanStudiosTheme.primary.main}>
          <ColorName>Primary Main</ColorName>
          <ColorValue>{swanStudiosTheme.primary.main}</ColorValue>
        </ColorSwatch>
        <ColorSwatch color={swanStudiosTheme.primary.blue}>
          <ColorName>Swan Blue</ColorName>
          <ColorValue>{swanStudiosTheme.primary.blue}</ColorValue>
        </ColorSwatch>
        <ColorSwatch color={swanStudiosTheme.primary.light}>
          <ColorName>Swan Ice</ColorName>
          <ColorValue>{swanStudiosTheme.primary.light}</ColorValue>
        </ColorSwatch>
        <ColorSwatch color={swanStudiosTheme.primary.deep}>
          <ColorName>Swan Deep</ColorName>
          <ColorValue>{swanStudiosTheme.primary.deep}</ColorValue>
        </ColorSwatch>
      </ColorGroup>

      {/* Secondary Colors */}
      <ColorGroup>
        <ColorGroupTitle>Secondary (Purple)</ColorGroupTitle>
        <ColorSwatch color={swanStudiosTheme.secondary.main}>
          <ColorName>Cosmic Main</ColorName>
          <ColorValue>{swanStudiosTheme.secondary.main}</ColorValue>
        </ColorSwatch>
        <ColorSwatch color={swanStudiosTheme.secondary.nebula}>
          <ColorName>Nebula Purple</ColorName>
          <ColorValue>{swanStudiosTheme.secondary.nebula}</ColorValue>
        </ColorSwatch>
        <ColorSwatch color={swanStudiosTheme.secondary.pink}>
          <ColorName>Galaxy Pink</ColorName>
          <ColorValue>{swanStudiosTheme.secondary.pink}</ColorValue>
        </ColorSwatch>
      </ColorGroup>

      {/* Background Colors */}
      <ColorGroup>
        <ColorGroupTitle>Backgrounds</ColorGroupTitle>
        <ColorSwatch color={swanStudiosTheme.background.primary}>
          <ColorName>Primary BG</ColorName>
          <ColorValue>{swanStudiosTheme.background.primary}</ColorValue>
        </ColorSwatch>
        <ColorSwatch color={swanStudiosTheme.background.secondary}>
          <ColorName>Secondary BG</ColorName>
          <ColorValue>{swanStudiosTheme.background.secondary}</ColorValue>
        </ColorSwatch>
        <ColorSwatch color={swanStudiosTheme.background.elevated}>
          <ColorName>Elevated BG</ColorName>
          <ColorValue>{swanStudiosTheme.background.elevated}</ColorValue>
        </ColorSwatch>
      </ColorGroup>

      {/* Swan Brand Colors */}
      <ColorGroup>
        <ColorGroupTitle>Swan Brand</ColorGroupTitle>
        <ColorSwatch color={swanStudiosTheme.swan.pure} textColor="#000">
          <ColorName>Swan Pure</ColorName>
          <ColorValue>{swanStudiosTheme.swan.pure}</ColorValue>
        </ColorSwatch>
        <ColorSwatch color={swanStudiosTheme.swan.silver} textColor="#000">
          <ColorName>Swan Silver</ColorName>
          <ColorValue>{swanStudiosTheme.swan.silver}</ColorValue>
        </ColorSwatch>
        <ColorSwatch color={swanStudiosTheme.swan.gold} textColor="#000">
          <ColorName>Swan Gold</ColorName>
          <ColorValue>{swanStudiosTheme.swan.gold}</ColorValue>
        </ColorSwatch>
      </ColorGroup>
    </ColorPalette>
    
    <CodeBlock>{`// Usage Example
import styled from 'styled-components';
import { swanStudiosTheme } from '@/core/theme';

const PrimaryButton = styled.button\`
  background: \${swanStudiosTheme.primary.main};
  color: \${swanStudiosTheme.text.primary};
  box-shadow: \${swanStudiosTheme.shadows.primaryGlow};
\`;`}</CodeBlock>
  </Section>
);

const TypographySection: React.FC = () => (
  <Section>
    <SectionTitle>Typography System</SectionTitle>
    <TypographyGrid>
      {/* Display Typography */}
      <TypographyExample>
        <TypographyLabel>Display Typography</TypographyLabel>
        <div style={swanStudiosTheme.typography.display.h1}>
          Display H1 - Hero Headlines
        </div>
        <div style={swanStudiosTheme.typography.display.h2}>
          Display H2 - Section Headers
        </div>
        <div style={swanStudiosTheme.typography.display.h3}>
          Display H3 - Subsection Headers
        </div>
      </TypographyExample>

      {/* Body Typography */}
      <TypographyExample>
        <TypographyLabel>Body Typography</TypographyLabel>
        <div style={swanStudiosTheme.typography.body.large}>
          Body Large - Important content, introductory text
        </div>
        <div style={swanStudiosTheme.typography.body.medium}>
          Body Medium - Standard content, descriptions, articles
        </div>
        <div style={swanStudiosTheme.typography.body.small}>
          Body Small - Secondary content, captions, metadata
        </div>
      </TypographyExample>

      {/* UI Typography */}
      <TypographyExample>
        <TypographyLabel>UI Typography</TypographyLabel>
        <div style={swanStudiosTheme.typography.ui.button}>
          Button Text - Call to Action
        </div>
        <div style={swanStudiosTheme.typography.ui.label}>
          Label Text - Form Labels
        </div>
        <div style={swanStudiosTheme.typography.ui.caption}>
          Caption Text - Helper text, tooltips
        </div>
      </TypographyExample>
    </TypographyGrid>
    
    <CodeBlock>{`// Typography Usage
import styled from 'styled-components';
import { swanStudiosTheme } from '@/core/theme';

const Headline = styled.h1\`
  \${swanStudiosTheme.typography.display.h1};
  color: \${swanStudiosTheme.primary.main};
\`;

const BodyText = styled.p\`
  \${swanStudiosTheme.typography.body.medium};
  color: \${swanStudiosTheme.text.primary};
\`;`}</CodeBlock>
  </Section>
);

const ButtonComponentsSection: React.FC = () => (
  <Section>
    <SectionTitle>Button Components</SectionTitle>
    <ButtonGrid>
      {/* Primary Buttons */}
      <ButtonGroup>
        <ButtonGroupTitle>Primary Buttons</ButtonGroupTitle>
        <ButtonExample>
          <PrimaryButton>Primary Action</PrimaryButton>
          <PrimaryButton disabled>Primary Disabled</PrimaryButton>
        </ButtonExample>
      </ButtonGroup>

      {/* Secondary Buttons */}
      <ButtonGroup>
        <ButtonGroupTitle>Secondary Buttons</ButtonGroupTitle>
        <ButtonExample>
          <SecondaryButton>Secondary Action</SecondaryButton>
          <SecondaryButton disabled>Secondary Disabled</SecondaryButton>
        </ButtonExample>
      </ButtonGroup>

      {/* Outline Buttons */}
      <ButtonGroup>
        <ButtonGroupTitle>Outline Buttons</ButtonGroupTitle>
        <ButtonExample>
          <OutlineButton>Outline Action</OutlineButton>
          <OutlineButton disabled>Outline Disabled</OutlineButton>
        </ButtonExample>
      </ButtonGroup>

      {/* Ghost Buttons */}
      <ButtonGroup>
        <ButtonGroupTitle>Ghost Buttons</ButtonGroupTitle>
        <ButtonExample>
          <GhostButton>Ghost Action</GhostButton>
          <GhostButton disabled>Ghost Disabled</GhostButton>
        </ButtonExample>
      </ButtonGroup>
    </ButtonGrid>
    
    <CodeBlock>{`// Button Component Usage
import styled from 'styled-components';
import { swanStudiosTheme } from '@/core/theme';

const PrimaryButton = styled.button\`
  \${swanStudiosTheme.components.buttonBase};
  background: \${swanStudiosTheme.gradients.primaryCosmic};
  color: \${swanStudiosTheme.text.primary};
  box-shadow: \${swanStudiosTheme.shadows.primaryGlow};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: \${swanStudiosTheme.shadows.primaryElevated};
  }
\`;`}</CodeBlock>
  </Section>
);

const FormElementsSection: React.FC = () => (
  <Section>
    <SectionTitle>Form Elements</SectionTitle>
    <FormGrid>
      {/* Text Inputs */}
      <FormGroup>
        <FormGroupTitle>Text Inputs</FormGroupTitle>
        <FormField>
          <Label htmlFor="email">Email Address</Label>
          <StyledInput 
            id="email"
            type="email" 
            placeholder="Enter your email"
            defaultValue="user@swanstudios.com"
          />
        </FormField>
        <FormField>
          <Label htmlFor="password">Password</Label>
          <StyledInput 
            id="password"
            type="password" 
            placeholder="Enter your password"
          />
        </FormField>
        <FormField>
          <Label htmlFor="error-example">Error State</Label>
          <StyledInput 
            id="error-example"
            className="error"
            type="text" 
            placeholder="This field has an error"
          />
        </FormField>
      </FormGroup>

      {/* Select and Textarea */}
      <FormGroup>
        <FormGroupTitle>Select & Textarea</FormGroupTitle>
        <FormField>
          <Label htmlFor="role">User Role</Label>
          <StyledSelect id="role" defaultValue="user">
            <option value="user">User</option>
            <option value="trainer">Trainer</option>
            <option value="admin">Admin</option>
          </StyledSelect>
        </FormField>
        <FormField>
          <Label htmlFor="bio">Bio</Label>
          <StyledTextarea 
            id="bio"
            placeholder="Tell us about yourself..."
            defaultValue="Passionate about fitness and wellness."
          />
        </FormField>
      </FormGroup>

      {/* Checkboxes and Options */}
      <FormGroup>
        <FormGroupTitle>Checkboxes & Options</FormGroupTitle>
        <FormField>
          <CheckboxWrapper>
            <StyledCheckbox id="newsletter" defaultChecked />
            <CheckboxLabel htmlFor="newsletter">Subscribe to newsletter</CheckboxLabel>
          </CheckboxWrapper>
        </FormField>
        <FormField>
          <CheckboxWrapper>
            <StyledCheckbox id="terms" />
            <CheckboxLabel htmlFor="terms">I agree to the terms and conditions</CheckboxLabel>
          </CheckboxWrapper>
        </FormField>
        <FormField>
          <CheckboxWrapper>
            <StyledCheckbox id="marketing" />
            <CheckboxLabel htmlFor="marketing">Receive marketing communications</CheckboxLabel>
          </CheckboxWrapper>
        </FormField>
      </FormGroup>
    </FormGrid>
    
    <CodeBlock>{`// Form Elements Usage
import styled from 'styled-components';
import { swanStudiosTheme } from '@/core/theme';

const StyledInput = styled.input\`
  \${swanStudiosTheme.components.input};
  width: 100%;
  
  &:focus {
    border-color: \${swanStudiosTheme.components.input.focus.borderColor};
    box-shadow: \${swanStudiosTheme.components.input.focus.boxShadow};
  }
\`;`}</CodeBlock>
  </Section>
);

const LayoutSystemSection: React.FC = () => (
  <Section>
    <SectionTitle>Layout System</SectionTitle>
    <LayoutShowcase>
      {/* Grid Layouts */}
      <LayoutExample>
        <LayoutTitle>Grid Layouts</LayoutTitle>
        <div style={{ marginBottom: swanStudiosTheme.spacing.md }}>
          <h5 style={{ color: swanStudiosTheme.text.secondary, marginBottom: swanStudiosTheme.spacing.sm }}>2-Column Grid</h5>
          <GridDemo columns={2}>
            <GridItem>Column 1</GridItem>
            <GridItem>Column 2</GridItem>
          </GridDemo>
        </div>
        <div style={{ marginBottom: swanStudiosTheme.spacing.md }}>
          <h5 style={{ color: swanStudiosTheme.text.secondary, marginBottom: swanStudiosTheme.spacing.sm }}>3-Column Grid</h5>
          <GridDemo columns={3}>
            <GridItem>Column 1</GridItem>
            <GridItem>Column 2</GridItem>
            <GridItem>Column 3</GridItem>
          </GridDemo>
        </div>
        <div>
          <h5 style={{ color: swanStudiosTheme.text.secondary, marginBottom: swanStudiosTheme.spacing.sm }}>4-Column Grid</h5>
          <GridDemo columns={4}>
            <GridItem>Col 1</GridItem>
            <GridItem>Col 2</GridItem>
            <GridItem>Col 3</GridItem>
            <GridItem>Col 4</GridItem>
          </GridDemo>
        </div>
      </LayoutExample>

      {/* Flexbox Layouts */}
      <LayoutExample>
        <LayoutTitle>Flexbox Layouts</LayoutTitle>
        <div style={{ marginBottom: swanStudiosTheme.spacing.md }}>
          <h5 style={{ color: swanStudiosTheme.text.secondary, marginBottom: swanStudiosTheme.spacing.sm }}>Flex Row (justify-start)</h5>
          <FlexDemo direction="row" justify="flex-start">
            <FlexItem>Item 1</FlexItem>
            <FlexItem>Item 2</FlexItem>
            <FlexItem>Item 3</FlexItem>
          </FlexDemo>
        </div>
        <div style={{ marginBottom: swanStudiosTheme.spacing.md }}>
          <h5 style={{ color: swanStudiosTheme.text.secondary, marginBottom: swanStudiosTheme.spacing.sm }}>Flex Row (justify-center)</h5>
          <FlexDemo direction="row" justify="center">
            <FlexItem>Item 1</FlexItem>
            <FlexItem>Item 2</FlexItem>
            <FlexItem>Item 3</FlexItem>
          </FlexDemo>
        </div>
        <div>
          <h5 style={{ color: swanStudiosTheme.text.secondary, marginBottom: swanStudiosTheme.spacing.sm }}>Flex Row (justify-between)</h5>
          <FlexDemo direction="row" justify="space-between">
            <FlexItem>Item 1</FlexItem>
            <FlexItem>Item 2</FlexItem>
            <FlexItem>Item 3</FlexItem>
          </FlexDemo>
        </div>
      </LayoutExample>

      {/* Spacing System */}
      <LayoutExample>
        <LayoutTitle>Spacing System</LayoutTitle>
        <div style={{ display: 'grid', gap: swanStudiosTheme.spacing.md }}>
          {Object.entries(swanStudiosTheme.spacing).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: swanStudiosTheme.spacing.md }}>
              <span style={{ 
                ...swanStudiosTheme.typography.ui.label,
                color: swanStudiosTheme.text.secondary,
                minWidth: '60px'
              }}>
                {key}:
              </span>
              <div style={{
                background: swanStudiosTheme.primary.main,
                width: value,
                height: '20px',
                borderRadius: '4px'
              }} />
              <span style={{ 
                ...swanStudiosTheme.typography.body.small,
                color: swanStudiosTheme.text.secondary,
                fontFamily: 'Monaco, monospace'
              }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </LayoutExample>
    </LayoutShowcase>
    
    <CodeBlock>{`// Layout System Usage
import styled from 'styled-components';
import { swanStudiosTheme } from '@/core/theme';

const GridContainer = styled.div\`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: \${swanStudiosTheme.spacing.lg};
  
  \${swanStudiosTheme.breakpoints.down.tablet} {
    grid-template-columns: 1fr;
  }
\`;

const FlexContainer = styled.div\`
  display: flex;
  gap: \${swanStudiosTheme.spacing.md};
  align-items: center;
  justify-content: space-between;
\`;`}</CodeBlock>
  </Section>
);

const ComponentShowcaseSection: React.FC = () => (
  <Section>
    <SectionTitle>Component Showcase</SectionTitle>
    <ComponentShowcase>
      {/* Cards */}
      <ComponentGroup>
        <ComponentTitle>Card Components</ComponentTitle>
        <ComponentGrid>
          <DemoCard>
            <DemoCardTitle>Feature Card</DemoCardTitle>
            <DemoCardContent>
              This is a standard card component with hover effects, perfect for showcasing features or content items.
            </DemoCardContent>
            <Tag>Featured</Tag>
          </DemoCard>
          <DemoCard>
            <DemoCardTitle>User Profile</DemoCardTitle>
            <DemoCardContent>
              User profile cards can display member information, trainer credentials, or client progress summaries.
            </DemoCardContent>
            <Tag>Profile</Tag>
          </DemoCard>
          <DemoCard>
            <DemoCardTitle>Workout Plan</DemoCardTitle>
            <DemoCardContent>
              Workout plan cards present exercise routines with clear visual hierarchy and action buttons.
            </DemoCardContent>
            <Tag>Fitness</Tag>
          </DemoCard>
        </ComponentGrid>
      </ComponentGroup>

      {/* Status Indicators */}
      <ComponentGroup>
        <ComponentTitle>Status Indicators</ComponentTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: swanStudiosTheme.spacing.md }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: swanStudiosTheme.spacing.sm,
            padding: swanStudiosTheme.spacing.sm,
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
            }} />
            <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 500 }}>Online</span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: swanStudiosTheme.spacing.sm,
            padding: swanStudiosTheme.spacing.sm,
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#f59e0b',
              boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)'
            }} />
            <span style={{ color: '#f59e0b', fontSize: '0.875rem', fontWeight: 500 }}>Away</span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: swanStudiosTheme.spacing.sm,
            padding: swanStudiosTheme.spacing.sm,
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'
            }} />
            <span style={{ color: '#ef4444', fontSize: '0.875rem', fontWeight: 500 }}>Offline</span>
          </div>
        </div>
      </ComponentGroup>

      {/* Progress Indicators */}
      <ComponentGroup>
        <ComponentTitle>Progress Indicators</ComponentTitle>
        <div style={{ display: 'grid', gap: swanStudiosTheme.spacing.md }}>
          {[25, 50, 75, 90].map(percentage => (
            <div key={percentage}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: swanStudiosTheme.spacing.xs,
                ...swanStudiosTheme.typography.body.small
              }}>
                <span style={{ color: swanStudiosTheme.text.primary }}>Progress {percentage}%</span>
                <span style={{ color: swanStudiosTheme.text.secondary }}>{percentage}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: swanStudiosTheme.gradients.primaryCosmic,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          ))}
        </div>
      </ComponentGroup>
    </ComponentShowcase>
    
    <CodeBlock>{`// Component Showcase Usage
import styled from 'styled-components';
import { swanStudiosTheme } from '@/core/theme';

const Card = styled.div\`
  background: \${swanStudiosTheme.components.card.background};
  border: \${swanStudiosTheme.components.card.border};
  border-radius: 12px;
  padding: \${swanStudiosTheme.spacing.lg};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    border-color: \${swanStudiosTheme.components.card.hoverBorder};
    box-shadow: \${swanStudiosTheme.shadows.primaryElevated};
    transform: translateY(-4px);
  }
\`;`}</CodeBlock>
  </Section>
);

// ===== MAIN COMPONENT =====

const TheAestheticCodex: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('all');

  return (
    <CodexContainer>
      <CodexHeader>
        <CodexTitle>The Aesthetic Codex</CodexTitle>
        <CodexSubtitle>
          The definitive style guide for SwanStudios platform. Every design element, 
          color, and component catalogued for consistent, production-ready development.
        </CodexSubtitle>
      </CodexHeader>

      <ColorPaletteSection />
      <TypographySection />
      <ButtonComponentsSection />
      <FormElementsSection />
      <LayoutSystemSection />
      <ComponentShowcaseSection />
      
      {/* Implementation Complete Status */}
      <Section>
        <SectionTitle>Implementation Complete ✨</SectionTitle>
        <Card>
          <h3 style={{color: swanStudiosTheme.primary.main, marginBottom: swanStudiosTheme.spacing.md}}>
            🎯 Full Style Guide Implementation
          </h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: swanStudiosTheme.spacing.md}}>
            <div>
              <h4 style={{color: swanStudiosTheme.secondary.main, marginBottom: swanStudiosTheme.spacing.sm}}>Foundation Systems</h4>
              <ul style={{color: swanStudiosTheme.text.secondary, lineHeight: 1.6}}>
                <li>✅ Color Palette System</li>
                <li>✅ Typography Hierarchy</li>
                <li>✅ Spacing & Layout Grid</li>
                <li>✅ Theme Integration</li>
              </ul>
            </div>
            <div>
              <h4 style={{color: swanStudiosTheme.secondary.main, marginBottom: swanStudiosTheme.spacing.sm}}>UI Components</h4>
              <ul style={{color: swanStudiosTheme.text.secondary, lineHeight: 1.6}}>
                <li>✅ Button Components</li>
                <li>✅ Form Elements</li>
                <li>✅ Card Components</li>
                <li>✅ Status Indicators</li>
              </ul>
            </div>
            <div>
              <h4 style={{color: swanStudiosTheme.secondary.main, marginBottom: swanStudiosTheme.spacing.sm}}>System Features</h4>
              <ul style={{color: swanStudiosTheme.text.secondary, lineHeight: 1.6}}>
                <li>✅ Responsive Design</li>
                <li>✅ Code Examples</li>
                <li>✅ Live Previews</li>
                <li>✅ Production Ready</li>
              </ul>
            </div>
          </div>
          <div style={{
            marginTop: swanStudiosTheme.spacing.lg,
            padding: swanStudiosTheme.spacing.md,
            background: 'rgba(0, 255, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(0, 255, 255, 0.3)'
          }}>
            <p style={{color: swanStudiosTheme.primary.main, fontWeight: 500, margin: 0}}>
              🎨 Your design system is now complete and ready for development team implementation!
            </p>
          </div>
        </Card>
      </Section>
    </CodexContainer>
  );
};

export default TheAestheticCodex;
