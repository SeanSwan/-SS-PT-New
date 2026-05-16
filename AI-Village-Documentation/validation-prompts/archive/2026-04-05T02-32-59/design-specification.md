# Design Specification Consensus

> Phase 2C: Gemini 3.1 Pro (CTO) ↔ MiniMax M2.7
> Consensus: YES

---

CONSENSUS REACHED

**FROM:** Creative Director, SwanStudios (Sean Swan)
**TO:** Engineering & UI/UX Teams
**SUBJECT:** FINAL MERGED SPECIFICATION — Coach Assistant UI (Crystalline Swan)

Excellent work, Engineering. This is how we build a world-class product. By stress-testing the aesthetic vision against structural and accessible realities, we have forged a specification that is both beautiful and bulletproof.

Below is the final, merged, and locked specification for the Coach Assistant UI. All teams are cleared to begin implementation immediately based on these exact parameters.

---

### 0. Core CSS Custom Properties (`theme.css`)
*Injected into the styled-components theme. Note the updated variable for our dusk-blue.*

```css
:root {
  --color-midnight-sapphire: #002060;
  --color-royal-depth: #003080;
  --color-ice-wing: #60C0F0;
  --color-arctic-cyan: #50A0F0;
  --color-wing-purple: #8B5CF6;
  --color-gilded-fern: #C6A84B;
  --color-frost-white: #E0ECF4;
  --color-swan-dusk: #4070C0; /* Renamed for semantic clarity */
  --color-obsidian-black: #0A0A0F;
  --color-carbon: #141419;
  --color-graphite: #1A1A24;

  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --shadow-spatial: 0 8px 32px rgba(0, 32, 96, 0.15);
}
```

### 1. Conversation Sidebar (`conversation-sidebar.css`)
*Fixed width desktop, fluid mobile. Incorporates box-shadow for layout stability and focus states for accessibility.*

```css
.sidebar-container {
  width: 320px; /* 100vw on mobile via media query */
  background-color: var(--color-carbon);
  /* Bottom gradient anchoring */
  background-image: linear-gradient(to top, rgba(0, 32, 96, 0.2) 0%, transparent 100px);
}

.sidebar-item {
  height: 72px;
  border-left: 4px solid transparent; /* Prevents layout shift */
  transition: background-color 0.25s var(--ease-out-expo), box-shadow 0.25s var(--ease-out-expo), color 0.25s var(--ease-out-expo);
}

.sidebar-item:hover {
  background-color: var(--color-graphite);
  box-shadow: inset 4px 0 0 var(--color-ice-wing);
}

.sidebar-item.active {
  background-color: var(--color-royal-depth);
  box-shadow: inset 4px 0 0 var(--color-wing-purple);
  color: var(--color-frost-white);
}

.sidebar-item:focus-visible {
  outline: 2px solid var(--color-ice-wing);
  outline-offset: 2px;
}

/* Mobile Drawer Animation */
.sidebar-drawer {
  transform: translateX(-100%);
  opacity: 0;
  transition: transform 0.4s var(--ease-out-expo), opacity 0.4s var(--ease-out-expo);
}
.sidebar-drawer.open {
  transform: translateX(0);
  opacity: 1;
}
.sidebar-backdrop {
  background-color: var(--color-obsidian-black);
  opacity: 0.6;
}
```

### 2. Markdown Renderer (`markdown-renderer.css`)
*High contrast, clear hierarchy. H3 updated for WCAG compliance on dark backgrounds.*

```css
.message-content,
.markdown-renderer {
  background-color: var(--color-obsidian-black); /* Guaranteed contrast context */
}

.markdown-code-block {
  background-color: var(--color-obsidian-black);
  border: 1px solid var(--color-graphite);
  border-radius: 8px;
}

/* Syntax Highlighting */
.token.keyword { color: var(--color-wing-purple); }
.token.string { color: var(--color-ice-wing); }
.token.comment { color: var(--color-arctic-cyan); opacity: 0.7; }
.token.variable { color: var(--color-frost-white); }

/* Tables & Blockquotes */
.markdown-table {
  width: 100%;
  border-collapse: collapse;
}
.markdown-table th {
  background-color: var(--color-graphite);
  padding: 12px 16px;
}
.markdown-table td {
  border-bottom: 1px solid var(--color-carbon);
  padding: 12px 16px;
}

.markdown-blockquote {
  border-left: 4px solid var(--color-gilded-fern);
  background-color: rgba(198, 168, 75, 0.05);
  padding: 16px;
  color: var(--color-frost-white);
  font-style: italic;
}

/* Headings */
.markdown-content h1 {
  font-size: 24px; font-weight: 700; color: var(--color-frost-white); margin-bottom: 16px;
}
.markdown-content h2 {
  font-size: 20px; font-weight: 600; color: var(--color-ice-wing); margin-bottom: 12px;
}
.markdown-content h3 {
  font-size: 16px;
  font-weight: 800; /* Bumped for contrast */
  color: var(--color-swan-dusk);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}
```

### 3. Thinking Indicator (`thinking-indicator.css` & `.jsx`)
*Crystalline cognition effect with full accessibility support.*

```css
.thinking-indicator {
  border-radius: 24px;
  padding: 12px 20px;
  background-color: var(--color-carbon);
  border: 1px solid rgba(96, 192, 240, 0.2);
}

.thinking-node {
  width: 8px; height: 8px; border-radius: 50%;
  background-color: var(--color-midnight-sapphire);
  animation: shimmerRipple 1.2s infinite cubic-bezier(0.4, 0, 0.2, 1);
}
.thinking-node:nth-child(1) { animation-delay: 0s; }
.thinking-node:nth-child(2) { animation-delay: 0.15s; }
.thinking-node:nth-child(3) { animation-delay: 0.3s; }

@keyframes shimmerRipple {
  0%, 100% { background-color: var(--color-midnight-sapphire); }
  50% { background-color: var(--color-ice-wing); }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .thinking-node {
    animation: none;
    background-color: var(--color-ice-wing);
    opacity: 0.7;
  }
}

.sr-only-live {
  position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0);
}
```
*(JSX Note: Ensure `<span className="sr-only-live" aria-live="polite">AI is thinking...</span>` is rendered when active).*

### 4. Voice Recording Overlay (`voice-overlay.css`)
*Visceral, multimodal feedback with keyboard fallback.*

```css
.voice-orb {
  width: 80px; height: 80px; border-radius: 50%;
  background-color: var(--color-arctic-cyan);
  transition: background-color 0.3s linear;
}
.voice-orb.recording {
  background-color: var(--color-wing-purple);
  box-shadow: inset 0 0 20px rgba(224, 236, 244, 0.5);
}
.voice-orb.processing {
  animation: pulseProcessing 1s infinite alternate;
}

.duration-label {
  margin-top: 24px;
  font-family: 'Roboto Mono', monospace;
  font-size: 14px; font-weight: 500; color: var(--color-frost-white);
}

/* Keyboard Fallback */
.keyboard-trigger {
  display: flex; /* Visible to screen readers / keyboard nav */
}
.keyboard-trigger:focus {
  outline: 2px solid var(--color-gilded-fern);
}
```

### 5. Provider Badge (`message-bubble.css`)
*True Spatial UI implementation breaking the bounding box safely.*

```css
.message-container {
  position: relative;
  overflow: visible; /* Required to prevent clipping */
  isolation: isolate; /* Creates stacking context */
}

.provider-badge {
  position: absolute;
  top: 0; left: 0;
  transform: translateY(-50%) translateX(16px);
  z-index: 10;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 800;
  filter: drop-shadow(0 4px 8px rgba(0, 10, 15, 0.4));
}

.provider-badge.ai {
  background-color: var(--color-wing-purple); color: var(--color-frost-white);
}
.provider-badge.human {
  background-color: var(--color-gilded-fern); color: var(--color-obsidian-black);
}
```

### 6. Attachment Preview (`attachment-preview.css`)
*Clean, dismissible media handling.*

```css
.attachment-thumbnail {
  width: 80px; height: 80px;
  object-fit: cover;
  border-radius: 12px;
  border: 2px solid var(--color-graphite);
}

.attachment-remove-btn {
  position: absolute;
  top: -8px; right: -8px;
  width: 24px; height: 24px; border-radius: 50%;
  background-color: var(--color-obsidian-black);
  color: var(--color-frost-white);
  border: 1px solid var(--color-graphite);
  transition: all 0.2s ease;
}

.attachment-remove-btn:hover {
  background-color: var(--color-wing-purple);
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.6);
}
```

---

Lock the repository. Let's build.

**Sean Swan**
*Creative Director, SwanStudios*
*Health First. Community Always.*
