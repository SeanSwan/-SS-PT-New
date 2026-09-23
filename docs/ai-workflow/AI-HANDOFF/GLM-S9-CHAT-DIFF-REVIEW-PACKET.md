# GLM-5.3 hostile review — S9 chat beautification diff

You reviewed this file earlier and produced findings S5-1..S5-15. These are the fixes applied.
Hostile-review the DIFF. Find: regressions, contrast claims that are wrong, styled-components
pitfalls (css helper vs plain string interpolation — a plain template string containing an
interpolated keyframes/helper bakes a class name into CSS and crashes at mount with error #12),
token fallbacks that do not exist, palette-law breaches, mobile regressions, and anything I
changed that I should NOT have. Also name what I MISSED from your original findings.

Palette law: Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0 (glow/accent),
Arctic Cyan #50A0F0 (CHARTS ONLY), Gilded Fern #C6A84B (gold, restricted), Frost White #E0ECF4,
Obsidian #0A0A0F, Carbon #141419, Graphite #1A1A24, Wing Purple #8B5CF6.
Dual-Button Glow: blue bg -> purple glow; purple bg -> cyan glow. 44px targets. WCAG 4.5:1.

Verification already run this session: tsc --noEmit exit 0 (0 errors repo-wide);
vitest src/components/Social/Messaging = 15 files / 53 tests pass; npm run build exit 0.

## THE DIFF

```diff
diff --git a/frontend/src/components/Social/Messaging/MessagingStyles.ts b/frontend/src/components/Social/Messaging/MessagingStyles.ts
index 3d9eaf34f..09daed8c8 100644
--- a/frontend/src/components/Social/Messaging/MessagingStyles.ts
+++ b/frontend/src/components/Social/Messaging/MessagingStyles.ts
@@ -26,13 +26,25 @@ const slideUp = keyframes`
   to { opacity: 1; transform: translateY(0); }
 `;
 
+/**
+ * Reduced-motion guard. Every animation in this file composes this so the
+ * feature honours `prefers-reduced-motion` — entrance animations resolve to
+ * their final state rather than replaying, and infinite loops stop entirely.
+ */
+const motionSafe = css`
+  @media (prefers-reduced-motion: reduce) {
+    animation: none;
+    transition: none;
+  }
+`;
+
 // ─────────────────────────────────────────────────────────────
 // SECTION: Layout
 // ─────────────────────────────────────────────────────────────
 
 export const MessagingContainer = styled.div`
   display: flex;
-  height: clamp(560px, calc(100vh - 210px), 900px);
+  height: clamp(560px, calc(100vh - var(--messaging-chrome-offset, 210px)), 900px);
   min-height: 500px;
   border-radius: 12px;
   overflow: hidden;
@@ -41,8 +53,11 @@ export const MessagingContainer = styled.div`
 
   @media (max-width: 768px) {
     flex-direction: column;
-    height: calc(100dvh - 210px);
-    min-height: 520px;
+    /* No min-height here: on a 375x667 handset the computed height is ~457px,
+       so a 520px floor overflowed the region and pushed the composer below the
+       fold. The chrome offset is a token so the shell owns the arithmetic. */
+    height: calc(100dvh - var(--messaging-chrome-offset, 210px));
+    min-height: 0;
   }
 `;
 
@@ -126,7 +141,10 @@ export const ConversationItem = styled.button<{ $active?: boolean }>`
   width: 100%;
   padding: 0.75rem;
   min-height: 64px;
-  border: none;
+  /* Reserve the border in the base state. It used to be none and only appeared
+     when active, so selecting a row shifted its contents by 1px. */
+  border: 1px solid transparent;
+  border-left: 3px solid transparent;
   border-radius: 10px;
   background: ${({ $active }) =>
     $active
@@ -134,11 +152,13 @@ export const ConversationItem = styled.button<{ $active?: boolean }>`
       : 'transparent'};
   cursor: pointer;
   text-align: left;
-  transition: background 0.15s ease;
+  transition: background 0.15s ease, border-color 0.15s ease;
   animation: ${fadeIn} 0.3s ease;
+  ${motionSafe}
 
   ${({ $active }) => $active && css`
-    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
+    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
+    border-left-color: var(--accent-primary, #60C0F0);
   `}
 
   &:hover {
@@ -214,17 +234,20 @@ export const UnreadBadge = styled.span`
   display: flex;
   align-items: center;
   justify-content: center;
-  min-width: 20px;
-  height: 20px;
+  /* The unread count is the single signal that pulls a trainer back into the
+     app, and it was the smallest text on screen (10px) filled with a surface
+     token. Now Ice Wing on Obsidian — ~9.7:1 — at a legible size. */
+  min-width: 22px;
+  height: 22px;
   padding: 0 6px;
-  border-radius: 10px;
-  background: var(--bg-primary, #002060);
+  border-radius: 11px;
+  background: var(--accent-primary, #60C0F0);
   border: 1px solid var(--accent-primary, #60C0F0);
-  box-shadow: 0 0 8px rgba(96, 192, 240, 0.4);
+  box-shadow: 0 0 10px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
   font-family: 'Sora', sans-serif;
-  font-size: 0.625rem;
+  font-size: 0.75rem;
   font-weight: 700;
-  color: var(--text-heading, #E0ECF4);
+  color: var(--bg-base, #0A0A0F);
 `;
 
 // ─────────────────────────────────────────────────────────────
@@ -301,20 +324,24 @@ export const MessageArea = styled.div`
 `;
 
 export const MessageBubble = styled.div<{ $isMine: boolean }>`
-  max-width: 75%;
+  max-width: var(--sw-bubble-max, min(76%, 560px));
   padding: 0.625rem 0.875rem;
   border-radius: 14px;
   animation: ${slideUp} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
+  ${motionSafe}
   align-self: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};
 
+  /* Own-message fill is deepened toward the base so Frost White body text
+     clears 4.5:1. Raw #8B5CF6 under #E0ECF4 measured ~3.5:1 and failed at the
+     13px body size — on the majority of the screen. */
   background: ${({ $isMine }) =>
     $isMine
-      ? 'var(--accent-secondary, #8B5CF6)'
+      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 72%, var(--bg-base, #0A0A0F))'
       : 'var(--bg-surface, #1A1A24)'};
 
   border: ${({ $isMine }) =>
     $isMine
-      ? 'none'
+      ? '1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)'
       : '1px solid var(--border-soft, rgba(96, 192, 240, 0.1))'};
 
   ${({ $isMine }) => $isMine && css`
@@ -337,7 +364,8 @@ export const MessageText = styled.p`
 export const MessageTime = styled.span<{ $isMine?: boolean }>`
   display: block;
   font-family: 'Fira Code', monospace;
-  font-size: 0.6rem;
+  /* Raised from 0.6rem (9.6px). Below ~11px this is decorative, not readable. */
+  font-size: 0.6875rem;
   color: ${({ $isMine }) =>
     $isMine
       ? 'rgba(224, 236, 244, 0.95)'
@@ -416,9 +444,24 @@ export const SendButton = styled.button`
   cursor: pointer;
   transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
 
+  /* Dual-Button Glow law: a purple background throws a CYAN glow, never purple
+     on purple. Was rgba(139, 92, 246, 0.4) glowing its own fill. */
   &:hover:not(:disabled) {
     transform: scale(1.05);
-    box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
+    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
+  }
+
+  &:focus-visible {
+    outline: 2px solid var(--accent-primary, #60C0F0);
+    outline-offset: 2px;
+  }
+
+  @media (prefers-reduced-motion: reduce) {
+    transition: none;
+    &:hover:not(:disabled),
+    &:active:not(:disabled) {
+      transform: none;
+    }
   }
 
   &:active:not(:disabled) {
@@ -489,6 +532,7 @@ export const SkeletonLine = styled.div<{ $width?: string }>`
   );
   background-size: 200% 100%;
   animation: ${shimmer} 1.5s ease infinite;
+  ${motionSafe}
 `;
 
 // ─────────────────────────────────────────────────────────────
@@ -505,6 +549,7 @@ export const ModalOverlay = styled.div`
   justify-content: center;
   z-index: 1000;
   animation: ${fadeIn} 0.2s ease;
+  ${motionSafe}
 `;
 
 export const ModalContent = styled.div`
@@ -518,6 +563,7 @@ export const ModalContent = styled.div`
   flex-direction: column;
   overflow: hidden;
   animation: ${slideUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
+  ${motionSafe}
 `;
 
 export const ModalHeader = styled.div`
@@ -642,11 +688,18 @@ export const OnlineDot = styled.span<{ $online: boolean }>`
   width: 10px;
   height: 10px;
   border-radius: 50%;
-  background: ${({ $online }) => ($online ? '#4ECDC4' : '#4A5568')};
+  /* Was #4ECDC4 / #4A5568 — a framework-default teal and slate that exist
+     nowhere in the Crystalline Swan palette. Presence now reads Ice Wing. */
+  background: ${({ $online }) =>
+    $online
+      ? 'var(--accent-primary, #60C0F0)'
+      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 25%, transparent)'};
   border: 2px solid var(--bg-surface, #1A1A24);
   flex-shrink: 0;
   transition: background 0.3s ease;
-  ${({ $online }) => $online && `box-shadow: 0 0 6px rgba(78, 205, 196, 0.5);`}
+  ${({ $online }) => $online && css`
+    box-shadow: 0 0 6px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
+  `}
 `;
 
 export const AvatarWrap = styled.div`
@@ -661,9 +714,14 @@ export const OnlineBadge = styled.span<{ $online: boolean }>`
   width: 12px;
   height: 12px;
   border-radius: 50%;
-  background: ${({ $online }) => ($online ? '#4ECDC4' : '#4A5568')};
+  background: ${({ $online }) =>
+    $online
+      ? 'var(--accent-primary, #60C0F0)'
+      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 25%, transparent)'};
   border: 2px solid var(--bg-surface, #1A1A24);
-  ${({ $online }) => $online && `box-shadow: 0 0 8px rgba(78, 205, 196, 0.5);`}
+  ${({ $online }) => $online && css`
+    box-shadow: 0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
+  `}
 `;
 
 export const TypingIndicator = styled.div`
@@ -673,6 +731,7 @@ export const TypingIndicator = styled.div`
   padding: 0 1.25rem;
   min-height: 24px;
   animation: ${fadeIn} 0.2s ease;
+  ${motionSafe}
 `;
 
 export const TypingDots = styled.span`
@@ -686,6 +745,7 @@ export const TypingDots = styled.span`
     border-radius: 50%;
     background: var(--accent-primary, #60C0F0);
     animation: ${typingDot} 1.4s ease-in-out infinite;
+    @media (prefers-reduced-motion: reduce) { animation: none; }
 
     &:nth-child(2) { animation-delay: 0.2s; }
     &:nth-child(3) { animation-delay: 0.4s; }
@@ -704,8 +764,13 @@ export const ConnectionStatus = styled.div<{ $connected: boolean }>`
   align-items: center;
   gap: 6px;
   font-family: 'Fira Code', monospace;
-  font-size: 0.6rem;
-  color: ${({ $connected }) => ($connected ? '#4ECDC4' : '#D4A574')};
+  font-size: 0.6875rem;
+  /* Was #4ECDC4 / #D4A574 — off-palette teal and tan. Disconnected now uses the
+     same danger token every other Swan surface codes errors with. */
+  color: ${({ $connected }) =>
+    $connected
+      ? 'var(--accent-primary, #60C0F0)'
+      : 'var(--danger-text, #C92A54)'};
   margin-left: auto;
 `;
 
@@ -713,9 +778,16 @@ export const StatusDot = styled.span<{ $connected: boolean }>`
   width: 6px;
   height: 6px;
   border-radius: 50%;
-  background: ${({ $connected }) => ($connected ? '#4ECDC4' : '#D4A574')};
-  ${({ $connected }) => $connected && `box-shadow: 0 0 4px rgba(78, 205, 196, 0.5);`}
-  ${({ $connected }) => !$connected && `box-shadow: 0 0 4px rgba(212, 165, 116, 0.4);`}
+  background: ${({ $connected }) =>
+    $connected
+      ? 'var(--accent-primary, #60C0F0)'
+      : 'var(--danger-text, #C92A54)'};
+  ${({ $connected }) => $connected && css`
+    box-shadow: 0 0 4px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
+  `}
+  ${({ $connected }) => !$connected && css`
+    box-shadow: 0 0 4px color-mix(in srgb, var(--danger-text, #C92A54) 45%, transparent);
+  `}
 `;
 
 // ─────────────────────────────────────────────────────────────
@@ -728,20 +800,30 @@ const bannerSlideDown = keyframes`
 `;
 
 export const ErrorBanner = styled.div<{ $persistent?: boolean }>`
-  background: color-mix(in srgb, #D4A574 15%, var(--bg-surface, #1A1A24));
-  border-bottom: 1px solid color-mix(in srgb, #D4A574 30%, transparent);
-  color: #D4A574;
+  /* Was tinted #D4A574 (off-palette tan) while every other Swan surface codes
+     errors with the danger token. Left rail matches the Coach error-card idiom. */
+  background: color-mix(in srgb, var(--danger-text, #C92A54) 14%, var(--bg-surface, #1A1A24));
+  border-bottom: 1px solid color-mix(in srgb, var(--danger-text, #C92A54) 30%, transparent);
+  border-left: 3px solid var(--danger-text, #C92A54);
+  color: var(--danger-soft-text, #FF8FA3);
   padding: 0.75rem 1.25rem;
+  min-height: 44px;
   font-family: 'Sora', sans-serif;
   font-size: 0.8125rem;
   display: flex;
   align-items: center;
   gap: 8px;
   animation: ${bannerSlideDown} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
+  ${motionSafe}
   cursor: pointer;
 
   &:hover {
-    background: color-mix(in srgb, #D4A574 25%, var(--bg-surface, #1A1A24));
+    background: color-mix(in srgb, var(--danger-text, #C92A54) 22%, var(--bg-surface, #1A1A24));
+  }
+
+  &:focus-visible {
+    outline: 2px solid var(--accent-primary, #60C0F0);
+    outline-offset: -2px;
   }
 `;
 
@@ -755,7 +837,9 @@ export const MessageTextArea = styled.textarea`
   background: var(--bg-base, #0A0A0F);
   color: var(--text-primary, #E0ECF4);
   font-family: 'Sora', sans-serif;
-  font-size: 0.8125rem;
+  /* 16px is a hard floor on the composer: iOS Safari force-zooms any focused
+     input below it, which yanks the whole thread sideways mid-conversation. */
+  font-size: 1rem;
   line-height: 1.5;
   resize: none;
   overflow-y: auto;
```
