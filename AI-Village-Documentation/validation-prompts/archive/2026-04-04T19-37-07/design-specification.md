# Design Specification Consensus

> Phase 2C: Gemini 3.1 Pro (CTO) ↔ MiniMax M2.7
> Consensus: YES

---

CONSENSUS REACHED

As Creative Director, I fully approve your mathematical deduction for the mobile wrapper dimensions. Scaling the `.voice-recording-wrapper` proportionally to `126px` on mobile viewports perfectly accommodates the `70px` base orb and prevents any layout shifting or clipping. This is exactly the kind of rigorous technical foresight this project requires.

With all disputes resolved, we have forged a flawless, implementation-ready specification that balances the premium aesthetics of the Crystalline Swan design system with robust, accessible DOM architecture.

Here is the **Final Merged Specification** for the engineering team.

***

# FINAL VISUAL SPECIFICATION: Coach Assistant UI

### 🎨 1. Crystalline Swan Base Tokens
```css
:root {
  /* Core Palette */
  --swan-midnight: #002060;
  --swan-royal: #003080;
  --swan-ice: #60C0F0;
  --swan-arctic: #50A0F0;
  --swan-fern: #C6A84B;
  --swan-frost: #E0ECF4;
  --swan-lavender: #4070C0;
  --swan-wing: #8B5CF6;
  --swan-obsidian: #0A0A0F;
  --swan-carbon: #141419;
  --swan-graphite: #1A1A24;
  
  /* Animation Variables */
  --shimmer-dark: var(--swan-carbon);
  --shimmer-bright: var(--swan-midnight);

  /* Dual-Glow Tokens */
  --glow-blue-purple: 0 0 15px rgba(96, 192, 240, 0.4), 0 0 30px rgba(139, 92, 246, 0.4);
  --glow-purple-cyan: 0 0 15px rgba(139, 92, 246, 0.4), 0 0 30px rgba(80, 160, 240, 0.4);
}
```

### 💬 2. Conversation Sidebar & Message Bubbles
**Sidebar Container:**
*   **Width:** `380px` fixed (desktop), `100vw` (mobile).
*   **Background:** `--swan-carbon` with `1px solid --swan-graphite` left border.
*   **History Item Hover:** Background `--swan-graphite`, left border `2px solid --swan-ice`.
*   **Active Session:** Background `rgba(0, 32, 96, 0.2)`, left border `3px solid --swan-arctic`.
*   **Mobile Drawer:** `transform: translateX(100%); opacity: 0;` to `transform: translateX(0); opacity: 1;` via `transition: all 350ms cubic-bezier(0.2, 0.8, 0.2, 1)`.

**Message Bubbles:**
```css
.message-bubble {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
  margin-bottom: 8px;
}

.message-bubble.ai {
  background: var(--swan-graphite);
  border: 1px solid var(--swan-carbon);
  border-bottom-left-radius: 4px; 
  margin-right: auto;
}

.message-bubble.trainer {
  background: rgba(0, 32, 96, 0.3); /* Solid midnight wash */
  border: 1px solid var(--swan-royal);
  border-bottom-right-radius: 4px;
  margin-left: auto;
  color: var(--swan-frost); 
}
```

### 🏷️ 3. Provider Badges
*   **Specs:** Height `22px`, Padding `0 10px`, `border-radius: 6px`, Font `11px/700` uppercase (`letter-spacing: 0.06em`).
*   **Placement:** `position: absolute; top: -11px; left: 16px;` (Breaks bubble border).
*   **AI Badge:** Text `--swan-frost`, Background `--swan-royal`, Border `1px solid --swan-ice`.
*   **Trainer Badge:** Text `--swan-obsidian`, Background `--swan-fern`, Border `none`.

### 📝 4. Markdown Renderer (Complex Formats)
*   **Code Blocks:** Background `--swan-obsidian`, Border `1px solid --swan-graphite`, Radius `8px`, Padding `16px`.
*   **Syntax:** Keywords `--swan-wing`, Strings `--swan-ice`, Numbers/Booleans `--swan-fern`, Comments `--swan-arctic` (60% opacity).
*   **Tables (Mobile-Safe):** Wrapper gets `overflow-x: auto; -webkit-overflow-scrolling: touch;`. TH gets `--swan-midnight` background / `--swan-frost` text. TD gets `--swan-carbon` background / `1px solid --swan-graphite` bottom border.
*   **Horizontal Rule:**
```css
.markdown-renderer hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--swan-ice) 20%, var(--swan-wing) 50%, var(--swan-ice) 80%, transparent);
  margin: 24px 0;
}
```

### 🧠 5. Thinking Indicator
```css
.thinking-indicator {
  border-radius: 20px;
  padding: 10px 18px;
  width: fit-content;
  border: 1px solid var(--swan-graphite);
  background: linear-gradient(90deg, var(--shimmer-dark) 0%, var(--shimmer-bright) 50%, var(--shimmer-dark) 100%);
  background-size: 200% 100%;
  animation: shimmerSweep 2s infinite linear;
}

.dot {
  width: 6px; height: 6px; border-radius: 50%;
  background-color: var(--swan-arctic);
  animation: dotPulse 1.4s infinite ease-in-out both;
}
.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes shimmerSweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes dotPulse {
  0%, 80%, 100% { 
    opacity: 0.2; 
    transform: scale(0.8); 
    box-shadow: 0 0 0 rgba(80, 160, 240, 0);
  }
  40% { 
    opacity: 1.0; 
    transform: scale(1.0); 
    box-shadow: 0 0 8px rgba(80, 160, 240, 0.6); /* Luminescent glow */
  }
}
```

### 🎙️ 6. Voice Recording Overlay (Z-Index Architecture)
```css
.voice-recording-wrapper {
  position: relative;
  width: 144px; 
  height: 144px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-recording-orb-base {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--swan-midnight);
  z-index: 10; 
  position: relative;
  transition: background-color 300ms ease, box-shadow 300ms ease;
}

/* Active Speech State applied to orb-base */
.voice-recording-orb-base.active {
  background: var(--swan-wing);
  box-shadow: var(--glow-purple-cyan);
}

.amplitude-ring {
  position: absolute;
  border-radius: 50%;
  top: 0; left: 0; right: 0; bottom: 0;
  margin: auto;
  z-index: 1; 
  pointer-events: none;
  transition: transform 100ms ease-out;
}

/* Ring Specifics */
.ring-1 { border: 2px solid var(--swan-arctic); opacity: 0.8; /* Max scale 1.2 */ }
.ring-2 { border: 2px solid var(--swan-wing); opacity: 0.4; /* Max scale 1.5 */ }
.ring-3 { background: rgba(96, 192, 240, 0.1); opacity: 0.2; /* Max scale 1.8 */ }

/* Mobile Scaling */
@media (max-width: 480px) {
  .voice-recording-wrapper {
    width: 126px;
    height: 126px;
  }
  .voice-recording-orb-base {
    width: 70px;
    height: 70px;
  }
  .ring-3 {
    transform: scale(1.5); /* Capped to prevent viewport bleed */
  }
}
```

### 📎 7. Attachment Preview
*   **Thumbnail:** `64px` × `64px`, `object-fit: cover`, `border-radius: 8px`, `border: 1px solid --swan-graphite`.
*   **Hover:** Border transitions to `--swan-arctic`, image opacity `0.8`.
*   **Remove Button:** `20px` circle, `position: absolute; top: -8px; right: -8px;`. Background `--swan-obsidian`, Icon `--swan-frost`, Border `1px solid --swan-graphite`. Hover turns icon `--swan-wing`.

***
*Engineering Team: You are cleared for immediate implementation based on this specification.*
