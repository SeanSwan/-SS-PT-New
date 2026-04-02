# Anatomical Body Map Images

Place AI-generated anatomical images here with these exact filenames:

- `male-front.webp` — Male body, front view (standing, anatomical position)
- `male-back.webp` — Male body, back view (standing, anatomical position)
- `female-front.webp` — Female body, front view (standing, anatomical position)
- `female-back.webp` — Female body, back view (standing, anatomical position)

## Image Requirements

- **Format:** WebP (preferred) or PNG
- **Dimensions:** ~400x620px (2:3.1 aspect ratio to match the SVG viewBox 200x310)
- **Background:** Transparent or very dark (#0A0A0F) to blend with dark theme
- **Style:** Ultra-realistic anatomical illustration showing muscle definition
- **Pose:** Standing, arms slightly away from body, palms forward (anatomical position)
- **Lighting:** Soft directional light to show muscle contour without harsh shadows

## Generation Prompt (for Nano Banana 2 or similar)

```
Ultra-realistic anatomical illustration of a [male/female] human body,
[front/back] view, standing in anatomical position (arms slightly out,
palms forward), showing visible muscle definition and body contour,
clinical medical illustration style, dark transparent background,
professional fitness anatomy chart, no text or labels, high detail
muscle striation visible under skin, neutral lighting from front-left
```

The BodyMapSVG component will:
1. Attempt to load these images as the base layer
2. If found: show image at 85% opacity with SVG outline at 30% on top
3. If not found: show the detailed SVG outline at full opacity (current default)
4. Interactive hotspots always render on top of both layers
