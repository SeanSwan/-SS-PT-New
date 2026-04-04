---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when building web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics while strictly adhering to accessibility, responsiveness, and performance standards.
license: Complete terms in LICENSE.txt
---

This skill guides the creation of distinctive, production-grade frontend interfaces. Implement working code with exceptional attention to aesthetic details and technical rigor.

## Design Thinking
Before coding, commit to a BOLD aesthetic direction:
- **Purpose & Tone**: Pick a clear direction (e.g., brutally minimal, retro-futuristic, editorial/magazine). 
- **Differentiation**: Avoid generic 3-column card grids. Use asymmetrical layouts, overlapping elements, or grid-breaking compositions.
- **Hierarchy**: Establish clear visual hierarchy using scale, weight, and spacing. Do not use uniform font sizing across the interface.

## Technical & Accessibility Requirements (MANDATORY)
- **Responsiveness**: Implement mobile, tablet, and desktop breakpoints using CSS media queries.
- **Accessibility (WCAG)**: 
    - Ensure minimum 4.5:1 contrast ratios.
    - Implement ARIA labels on all interactive elements.
    - Define clear `:focus-visible` states for keyboard navigation.
- **Interaction**: All interactive elements (buttons, inputs, links) must have a minimum 44px x 44px touch target.
- **States**: Include explicit visual states for `loading`, `empty`, and `error` scenarios for all data-driven components.
- **Dark Mode**: Design "Dark-First." Use deep backgrounds with high-contrast foregrounds, ensuring semantic color tokens are used for readability.

## Frontend Aesthetics & Motion
- **Typography**: Pair a distinctive display font with a refined body font. Avoid generic system stacks (Inter/Roboto).
- **Motion**: Use `transform` and `opacity` properties exclusively for GPU-accelerated performance. Apply non-linear, spring-based easing (e.g., `cubic-bezier(0.34, 1.56, 0.64, 1)`) for all transitions. Avoid linear animations.
- **Visual Depth**: Use gradient meshes, noise textures, or layered transparencies to create atmosphere. Avoid "purple gradient on white" tropes.

## Implementation Standards
- **Production-Grade**: Use CSS variables for design tokens. 
- **Intentionality**: Match complexity to the vision. If the design is minimalist, focus on micro-spacing and precision. If maximalist, focus on elaborate, performant animations.
- **Avoid "AI Slop"**: Never default to cookie-cutter layouts or overused AI-favored font choices. Every design must be context-specific.

**CRITICAL**: Every generated interface must demonstrate a unique, purposeful design language. If the component is interactive, it must be fully accessible and responsive by default.