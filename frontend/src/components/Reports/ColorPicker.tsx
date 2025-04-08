// File: frontend/src/components/Reports/ColorPicker.tsx

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Paintbrush, RotateCw, Check } from 'lucide-react';

// Create a custom Slider component
const SliderContainer = styled.div`
  width: 100%;
  height: 20px;
  position: relative;
`;

const SliderTrack = styled.div`
  width: 100%;
  height: 4px;
  background-color: #e0e0e0;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 2px;
`;

interface SliderRangeProps {
  width: string;
}

const SliderRange = styled.div<SliderRangeProps>`
  height: 100%;
  background-color: #0070f3;
  border-radius: 2px;
  width: ${props => props.width};
`;

const SliderThumb = styled.div`
  width: 16px;
  height: 16px;
  background-color: white;
  border: 2px solid #0070f3;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 1;
`;

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number[];
  onValueChange: (values: number[]) => void;
  className?: string;
  id?: string;
}

const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step,
  value,
  onValueChange,
  className,
  id
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseInt(e.target.value, 10)]);
  };

  const percentage = ((value[0] - min) / (max - min)) * 100;

  return (
    <SliderContainer className={className}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        style={{
          width: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0,
          height: '100%',
          cursor: 'pointer',
          zIndex: 2
        }}
      />
      <SliderTrack>
        <SliderRange width={`${percentage}%`} />
      </SliderTrack>
      <SliderThumb style={{ left: `${percentage}%` }} />
    </SliderContainer>
  );
};

// Container for the entire color picker
const PickerContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 300px;
`;

interface ColorSwatchProps {
  color: string;
}

// Color swatch that displays the selected color
const ColorSwatch = styled.div<ColorSwatchProps>`
  width: 100%;
  height: 40px;
  background-color: ${props => props.color};
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.02);
  }
`;

// Grid of predefined color options
const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 16px;
`;

interface ColorOptionProps {
  color: string;
  active: boolean;
}

// Individual color option in the grid
const ColorOption = styled.button<ColorOptionProps>`
  width: 100%;
  aspect-ratio: 1;
  background-color: ${props => props.color};
  border-radius: 4px;
  border: 2px solid ${props => props.active ? '#000' : 'transparent'};
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
  position: relative;
  
  &:hover {
    transform: scale(1.1);
    z-index: 1;
  }
  
  ${props => props.active && `
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${props.color === '#000000' || props.color === '#333333' ? 'white' : 'black'};
    }
  `}
`;

// Container for the RGB sliders
const SliderContainerWrapper = styled.div`
  margin-bottom: 16px;
`;

// Individual slider row with its label
const SliderRow = styled.div`
  margin-bottom: 12px;
`;

// Color input fields container
const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

// Recent colors section
const RecentColors = styled.div`
  margin-top: 16px;
`;

const RecentColorGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

interface RecentColorSwatchProps {
  color: string;
}

const RecentColorSwatch = styled.button<RecentColorSwatchProps>`
  width: 24px;
  height: 24px;
  background-color: ${props => props.color};
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.2);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
`;

// Color palettes type
type ColorPalettes = {
  [key: string]: string[];
};

// Common color palettes for easy selection
const COLOR_PALETTES: ColorPalettes = {
  basic: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00'],
  grayscale: ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff'],
  blue: ['#0070f3', '#1e3a8a', '#3b82f6', '#93c5fd', '#dbeafe', '#eff6ff'],
  green: ['#16a34a', '#166534', '#4ade80', '#86efac', '#dcfce7', '#f0fdf4'],
  red: ['#dc2626', '#991b1b', '#f87171', '#fca5a5', '#fee2e2', '#fef2f2'],
  yellow: ['#eab308', '#854d0e', '#facc15', '#fde047', '#fef9c3', '#fefce8'],
  purple: ['#8b5cf6', '#5b21b6', '#a78bfa', '#c4b5fd', '#ede9fe', '#f5f3ff'],
  brand: ['#0070f3', '#f5a623', '#32cd32', '#e53935', '#2196f3', '#9c27b0']
};

// Define props for the component
interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  presetColors?: string[];
  showRecentColors?: boolean;
  maxRecentColors?: number;
}

// RGB color interface
interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * ColorPicker Component
 * Advanced color picker with RGB sliders, hex input, and presets
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  presetColors,
  showRecentColors = true,
  maxRecentColors = 10
}) => {
  // State for the currently selected color
  const [localColor, setLocalColor] = useState(color);
  // Parse the color into its RGB components
  const [rgb, setRgb] = useState<RGBColor>(() => hexToRgb(color));
  // Store recent colors
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentColors');
    return saved ? JSON.parse(saved) : [];
  });
  // Current color palette to show
  const [activePalette, setActivePalette] = useState<keyof typeof COLOR_PALETTES>('basic');
  
  // Parse a hex color into its RGB components
  function hexToRgb(hex: string): RGBColor {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle shorthand hex
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    
    return { r, g, b };
  }
  
  // Convert RGB to hex
  function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
      .map(x => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('');
  }
  
  // Update RGB values when color changes
  useEffect(() => {
    setRgb(hexToRgb(color));
    setLocalColor(color);
  }, [color]);
  
  // Update local color state when RGB changes
  useEffect(() => {
    const newColor = rgbToHex(rgb.r, rgb.g, rgb.b);
    setLocalColor(newColor);
  }, [rgb]);
  
  // Handle color selection from presets
  const handleSelectColor = (newColor: string) => {
    setLocalColor(newColor);
    setRgb(hexToRgb(newColor));
    onChange(newColor);
    addRecentColor(newColor);
  };
  
  // Handle changes to the RGB sliders
  const handleRgbChange = (component: keyof RGBColor, value: number) => {
    const newRgb = { ...rgb, [component]: value };
    setRgb(newRgb);
    const newColor = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setLocalColor(newColor);
  };
  
  // Handle direct hex input
  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newColor = e.target.value;
    
    // Ensure the # is present
    if (!newColor.startsWith('#')) {
      newColor = '#' + newColor;
    }
    
    // Validate hex color format
    if (/^#[0-9A-Fa-f]{6}$/.test(newColor) || /^#[0-9A-Fa-f]{3}$/.test(newColor)) {
      setLocalColor(newColor);
      setRgb(hexToRgb(newColor));
    } else {
      // Just update the input field without changing the RGB values
      setLocalColor(newColor);
    }
  };
  
  // Apply the selected color
  const applyColor = () => {
    // Convert 3-digit hex to 6-digit if needed
    if (/^#[0-9A-Fa-f]{3}$/.test(localColor)) {
      const hex = localColor.substring(1);
      const newColor = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
      onChange(newColor);
      addRecentColor(newColor);
    } else if (/^#[0-9A-Fa-f]{6}$/.test(localColor)) {
      onChange(localColor);
      addRecentColor(localColor);
    } else {
      // If invalid hex, generate from RGB values
      const newColor = rgbToHex(rgb.r, rgb.g, rgb.b);
      onChange(newColor);
      addRecentColor(newColor);
    }
  };
  
  // Reset to the original color
  const resetColor = () => {
    setLocalColor(color);
    setRgb(hexToRgb(color));
  };
  
  // Add a color to the recent colors list
  const addRecentColor = (newColor: string) => {
    if (showRecentColors) {
      setRecentColors(prev => {
        // Remove duplicate if it exists
        const filtered = prev.filter(c => c !== newColor);
        // Add new color at the beginning and limit the array size
        const updated = [newColor, ...filtered].slice(0, maxRecentColors);
        // Save to localStorage
        localStorage.setItem('recentColors', JSON.stringify(updated));
        return updated;
      });
    }
  };
  
  // Get standard web colors as presets
  const paletteColors = presetColors || COLOR_PALETTES[activePalette] || COLOR_PALETTES.basic;
  
  return (
    <PickerContainer>
      <ColorSwatch color={localColor} onClick={applyColor} />
      
      <InputRow>
        <Label htmlFor="hex-color">Hex</Label>
        <Input
          id="hex-color"
          value={localColor}
          onChange={handleHexInput}
          className="font-mono"
        />
        <Button 
          variant="outline" 
          size="icon" 
          onClick={resetColor}
          title="Reset color"
        >
          <RotateCw size={15} />
        </Button>
      </InputRow>
      
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <Label>Palette</Label>
          <select 
            className="text-xs bg-gray-100 rounded px-1 border border-gray-200"
            value={activePalette}
            onChange={(e) => setActivePalette(e.target.value as keyof typeof COLOR_PALETTES)}
          >
            <option value="basic">Basic</option>
            <option value="grayscale">Grayscale</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="red">Red</option>
            <option value="yellow">Yellow</option>
            <option value="purple">Purple</option>
            <option value="brand">Brand</option>
          </select>
        </div>
        <ColorGrid>
          {paletteColors.map((paletteColor, index) => (
            <ColorOption
              key={index}
              color={paletteColor}
              active={localColor.toLowerCase() === paletteColor.toLowerCase()}
              onClick={() => handleSelectColor(paletteColor)}
              aria-label={`Select color ${paletteColor}`}
            />
          ))}
        </ColorGrid>
      </div>
      
      <SliderContainerWrapper>
        <SliderRow>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="red-slider" className="text-red-600">R</Label>
            <span className="text-xs font-mono">{rgb.r}</span>
          </div>
          <Slider
            id="red-slider"
            min={0}
            max={255}
            step={1}
            value={[rgb.r]}
            onValueChange={(values: number[]) => handleRgbChange('r', values[0])}
            className="red-slider"
          />
        </SliderRow>
        
        <SliderRow>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="green-slider" className="text-green-600">G</Label>
            <span className="text-xs font-mono">{rgb.g}</span>
          </div>
          <Slider
            id="green-slider"
            min={0}
            max={255}
            step={1}
            value={[rgb.g]}
            onValueChange={(values: number[]) => handleRgbChange('g', values[0])}
            className="green-slider"
          />
        </SliderRow>
        
        <SliderRow>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="blue-slider" className="text-blue-600">B</Label>
            <span className="text-xs font-mono">{rgb.b}</span>
          </div>
          <Slider
            id="blue-slider"
            min={0}
            max={255}
            step={1}
            value={[rgb.b]}
            onValueChange={(values: number[]) => handleRgbChange('b', values[0])}
            className="blue-slider"
          />
        </SliderRow>
      </SliderContainerWrapper>
      
      {showRecentColors && recentColors.length > 0 && (
        <RecentColors>
          <Label className="text-sm mb-2 block">Recent Colors</Label>
          <RecentColorGrid>
            {recentColors.map((recentColor, index) => (
              <RecentColorSwatch
                key={index}
                color={recentColor}
                onClick={() => handleSelectColor(recentColor)}
                aria-label={`Select recent color ${recentColor}`}
              />
            ))}
          </RecentColorGrid>
        </RecentColors>
      )}
      
      <ButtonContainer>
        <Button variant="outline" size="sm" onClick={resetColor}>
          <RotateCw size={14} className="mr-1" />
          Reset
        </Button>
        <Button size="sm" onClick={applyColor}>
          <Check size={14} className="mr-1" />
          Apply
        </Button>
      </ButtonContainer>
    </PickerContainer>
  );
};

/**
 * ColorPickerTrigger Component
 * A wrapper that creates a dropdown color picker
 */
interface ColorPickerTriggerProps extends ColorPickerProps {
  triggerContent?: React.ReactNode;
}

export const ColorPickerTrigger: React.FC<ColorPickerTriggerProps> = ({
  color,
  onChange,
  presetColors,
  showRecentColors,
  maxRecentColors,
  triggerContent
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {triggerContent || (
          <Button 
            variant="outline" 
            size="sm"
            className="w-10 p-0 flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Paintbrush size={15} color={isLightColor(color) ? '#000' : '#fff'} />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4">
        <ColorPicker
          color={color}
          onChange={onChange}
          presetColors={presetColors}
          showRecentColors={showRecentColors}
          maxRecentColors={maxRecentColors}
        />
      </PopoverContent>
    </Popover>
  );
};

// Helper to determine if a color is light or dark
function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  let r, g, b;
  
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  
  // Calculate perceived brightness using the formula
  // (r * 0.299 + g * 0.587 + b * 0.114) > 186
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
}