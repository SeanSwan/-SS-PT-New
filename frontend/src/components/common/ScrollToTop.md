# ScrollToTop Component

A beautiful, accessible scroll-to-top button component that uses the GlowButton component for consistent styling across the SwanStudios platform.

## Features

- 🎨 **Multiple themes**: purple, emerald, ruby, cosmic
- 📱 **Responsive design**: Adapts to mobile screens
- ♿ **Accessible**: ARIA labels and focus management
- 🎯 **Customizable**: Threshold, behavior, icons, and callbacks
- ✨ **Smooth animations**: Fade in/out with scroll detection
- 🚀 **Performance optimized**: Passive scroll listeners and debouncing

## Usage

### Basic Implementation

```tsx
import { ScrollToTop } from '../common';

// Basic usage with default settings
<ScrollToTop />
```

### Advanced Implementation

```tsx
import { ScrollToTop } from '../common';
import { FaRocket } from 'react-icons/fa';

<ScrollToTop 
  theme="cosmic"
  size="large"
  scrollThreshold={600}
  scrollBehavior="smooth"
  icon={<FaRocket size={20} />}
  ariaLabel="Scroll to the top of the page"
  onScrollToTop={() => {
    // Custom callback - useful for analytics
    console.log('User scrolled to top');
    // Track with analytics service
    // analytics.track('scroll_to_top_clicked');
  }}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scrollThreshold` | `number` | `400` | Pixels scrolled before button appears |
| `theme` | `'purple' \| 'emerald' \| 'ruby' \| 'cosmic'` | `'cosmic'` | Button color theme |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size |
| `scrollBehavior` | `'smooth' \| 'auto'` | `'smooth'` | Scroll behavior |
| `icon` | `React.ReactNode` | `<FaArrowUp />` | Custom icon |
| `ariaLabel` | `string` | `'Scroll to top of page'` | Accessibility label |
| `onScrollToTop` | `() => void` | `undefined` | Callback function |

## Theme Options

### Cosmic (Default)
- Perfect for the SwanStudios dark theme
- Purple to pink gradient with cosmic feel

### Purple
- Classic purple gradient
- Professional and elegant

### Emerald
- Green gradient
- Fresh and vibrant

### Ruby
- Red gradient
- Bold and energetic

## Responsive Behavior

The component automatically adjusts for different screen sizes:

- **Desktop**: Bottom right corner with 30px margins
- **Tablet**: 20px margins
- **Mobile**: 15px margins
- **Mobile with Nav**: Automatically raises above navigation if present

## Integration with SwanStudios

The component is already integrated into the main Layout component:

```tsx
// In Layout/layout.tsx
<ScrollToTop 
  theme="cosmic"
  size="medium"
  scrollThreshold={400}
  onScrollToTop={() => {
    console.log('Scroll to top clicked');
  }}
/>
```

## Accessibility Features

- **ARIA Labels**: Proper labeling for screen readers
- **Focus Management**: Keyboard accessible with focus indicators
- **Role Attributes**: Semantic HTML structure
- **High Contrast**: Good color contrast ratios

## Performance Considerations

- Uses passive scroll listeners for better performance
- Implements debouncing to prevent excessive re-renders
- Only renders when needed (visibility-based)
- CSS transforms for smooth animations

## Customization Examples

### Different Icons

```tsx
import { FaChevronUp, FaRocket, FaArrowCircleUp } from 'react-icons/fa';

// Minimal arrow
<ScrollToTop icon={<FaChevronUp size={16} />} />

// Rocket ship
<ScrollToTop icon={<FaRocket size={18} />} />

// Circle arrow
<ScrollToTop icon={<FaArrowCircleUp size={20} />} />
```

### Page-Specific Configurations

```tsx
// Blog/article pages - higher threshold
<ScrollToTop 
  theme="emerald"
  scrollThreshold={800}
  size="large"
/>

// Landing pages - cosmic theme
<ScrollToTop 
  theme="cosmic"
  scrollThreshold={300}
  size="medium"
/>

// Admin dashboard - purple theme
<ScrollToTop 
  theme="purple"
  scrollThreshold={500}
  size="small"
/>
```

## Technical Implementation

The component uses:

- **React Hooks**: `useState` and `useEffect` for scroll detection
- **Styled Components**: For responsive styling and animations
- **GlowButton**: SwanStudios' signature button component
- **React Icons**: For default arrow icon
- **CSS Transforms**: For smooth animations

## Browser Support

- Modern browsers with ES6+ support
- Responsive design for all screen sizes
- Smooth scroll behavior where supported (fallback to auto)

## Future Enhancements

Potential additions:
- Progress indicator showing scroll position
- Multiple scroll positions (e.g., scroll to sections)
- Auto-hide after reaching top
- Custom animation easing functions
- Integration with page analytics