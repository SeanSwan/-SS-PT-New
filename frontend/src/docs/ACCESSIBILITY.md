# Accessibility Guidelines

## Menu Components and ARIA Hidden Issue

We've encountered an issue where menu components (typically from MUI) are receiving an `aria-hidden="true"` attribute, which prevents assistive technologies from accessing the menu content. This is problematic when the menu contains focusable elements.

### Problem

The error looks like this:

```
Blocked aria-hidden on an element because its descendant retained focus. The focus must not be hidden from assistive technology users. Avoid using aria-hidden on a focused element or its ancestor. Consider using the inert attribute instead, which will also prevent focus.
```

This error occurs when:
1. A menu or popover is opened
2. The menu receives `aria-hidden="true"` 
3. A focusable element inside the menu (like a button or MenuItem) is focused

### Solutions

#### 1. Use the AccessibleMenu Component (Recommended)

We've created an `AccessibleMenu` component that fixes this issue. Replace MUI's Menu with our custom component:

```tsx
// Use AccessibleMenu instead of raw menu elements
import AccessibleMenu from '../components/common/AccessibleMenu';

// Usage remains the same
<AccessibleMenu
  open={open}
  anchorEl={anchorEl}
  onClose={handleClose}
>
  {children}
</AccessibleMenu>
```

#### 2. Modify Existing Menu Components

If you can't use our custom component, modify your existing menu implementation:

```tsx
<Menu
  // ... other props
  slotProps={{
    paper: {
      // Remove aria-hidden attribute to fix accessibility
      'aria-hidden': undefined,
    },
  }}
>
  {/* Menu content */}
</Menu>
```

#### 3. Use `inert` Attribute (Future Solution)

The HTML `inert` attribute is a more appropriate solution according to the error message, but it's not yet fully supported in all browsers. For future reference:

```tsx
<Menu
  // ... other props
  slotProps={{
    paper: {
      inert: "true", // Instead of aria-hidden
    },
  }}
>
  {/* Menu content */}
</Menu>
```

### Testing

After implementing these changes, verify that:
1. Menu opens and closes correctly
2. Focus is properly managed (you can tab through menu items)
3. Screen readers announce the menu items
4. No accessibility errors appear in the console

## Related Components to Check

These issues commonly occur in the following components:
* Dropdown menus
* Context menus (right-click menus)
* Select components with dropdown options
* Autocomplete components
* Any component derived from PopperUnstyled or Menu