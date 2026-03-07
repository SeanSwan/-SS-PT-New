# Frontend UI/UX Expert — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-pro-preview | **Duration:** 45.0s
> **Files:** docs/ai-workflow/blueprints/AI-FORM-ANALYSIS-BLUEPRINT.md
> **Generated:** 3/6/2026, 10:46:46 AM

---

As the Lead UI/UX Architect and Co-Orchestrator for SwanStudios, I have reviewed the `AI-FORM-ANALYSIS-BLUEPRINT.md`. 

The backend and architectural planning here is solid, but the frontend vision is entirely absent. If we implement standard MediaPipe stick-figures and basic loading spinners, this will look like a college hackathon project, not a premium fitness SaaS that justifies high-ticket pricing. 

We are building a **high-performance biomechanics HUD**. The aesthetic must be "Iron Man targeting system meets high-end fitness lab." We will maximize the Galaxy-Swan tokens (`#0a0a1a` base, `#00FFFF` active/good, `#7851A9` processing/AI, `#FF3366` critical form correction). 

Here are my authoritative design directives. Claude will implement exactly to these specifications.

---

### DIRECTIVE 1: The Biomechanics HUD (Video Overlay)
- **Severity:** CRITICAL
- **File & Location:** `frontend/src/components/FormAnalysis/VideoOverlay.tsx`
- **Design Problem:** Default MediaPipe canvas drawing uses flat, ugly red/green lines. It lacks depth, premium feel, and visual hierarchy.
- **Design Solution:** We will intercept the raw landmark data and draw a custom, glowing, neon-wireframe skeleton. The skeleton lines must have a `shadowBlur` to create a neon effect. The color of the joints must dynamically shift based on the `useBiomechanics` angle data (Cyan for perfect form, transitioning to Neon Pink/Red for dangerous compensations).
- **Implementation Notes for Claude:**
  1. Do NOT use the default `drawConnectors` from `@mediapipe/drawing_utils` without overriding the styles.
  2. Implement a custom canvas drawing loop.
  3. **Canvas Context Specs:**
     ```typescript
     // Inside the canvas drawing loop
     ctx.shadowBlur = 12;
     ctx.lineWidth = 4;
     // Dynamic color based on joint health (0-100 score)
     const getJointColor = (score: number) => {
       if (score > 85) return '#00FFFF'; // Galaxy Cyan
       if (score > 60) return '#7851A9'; // Swan Purple
       return '#FF3366'; // Critical Red
     };
     ctx.strokeStyle = getJointColor(jointScore);
     ctx.shadowColor = getJointColor(jointScore);
     ```
  4. Wrap the `<canvas>` and `<video>` in a container with a subtle inner vignette to ensure the neon lines pop regardless of the user's background lighting: `box-shadow: inset 0 0 100px rgba(10, 10, 26, 0.8);`

### DIRECTIVE 2: Real-Time Rep Counter & Feedback Choreography
- **Severity:** HIGH
- **File & Location:** `frontend/src/components/FormAnalysis/RepCounter.tsx` & `FeedbackPanel.tsx`
- **Design Problem:** Standard text overlays are hard to read while working out and lack the visceral impact needed to motivate a user.
- **Design Solution:** The Rep Counter must be a massive, glassmorphic, floating element that physically *pulses* on every successful rep. The Feedback Panel must use staggered, typewriter-style reveals for AI cues to feel like a live intelligence analyzing the user.
- **Implementation Notes for Claude:**
  1. **Rep Counter Styled Component:**
     ```typescript
     const RepHUD = styled(motion.div)`
       position: absolute;
       top: 24px;
       right: 24px;
       background: rgba(10, 10, 26, 0.6);
       backdrop-filter: blur(16px);
       -webkit-backdrop-filter: blur(16px);
       border: 1px solid rgba(0, 255, 255, 0.2);
       border-radius: 24px;
       padding: 16px 32px;
       display: flex;
       flex-direction: column;
       align-items: center;
       box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
     `;
     
     const RepNumber = styled(motion.span)`
       font-family: 'Space Mono', monospace; /* Monospace for data */
       font-size: 64px;
       font-weight: 700;
       color: #00FFFF;
       text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
       line-height: 1;
     `;
     ```
  2. **Animation Specs:** Use Framer Motion for the rep increment.
     `<RepNumber key={repCount} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} />`
  3. **Feedback Panel:** Position at `bottom: 40px; left: 50%; transform: translateX(-50%);`. Use `AnimatePresence` to slide cues up (`y: 20` to `y: 0`) and fade them out after 3 seconds.

### DIRECTIVE 3: The "Deep Scan" Async Loading State
- **Severity:** HIGH
- **File & Location:** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` (Upload Flow)
- **Design Problem:** The blueprint notes a 10-60s wait time for server-side video processing. A standard spinner will result in user abandonment.
- **Design Solution:** We will build a "Deep Scan" choreography. While the BullMQ worker processes the video, the UI will display a wireframe human silhouette with a sweeping laser scanner, accompanied by staggered, highly technical status updates.
- **Implementation Notes for Claude:**
  1. Create a `<DeepScanLoader />` component.
  2. **Visuals:** A dark SVG silhouette of a human body.
  3. **The Scanner:** An absolute positioned `div` that animates top-to-bottom infinitely.
     ```css
     const ScannerLine = styled(motion.div)`
       width: 100%;
       height: 2px;
       background: #7851A9;
       box-shadow: 0 0 15px 5px rgba(120, 81, 169, 0.6);
       position: absolute;
       left: 0;
     `;
     // Framer motion: animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 3, ease: "linear", repeat: Infinity }}
     ```
  4. **Status Text:** Rotate through an array of strings every 4 seconds to show progress: `["Extracting biomechanical frames...", "Mapping 33-point spatial landmarks...", "Calculating joint velocity...", "Detecting compensatory patterns..."]`. Use a monospace font, size `14px`, color `rgba(255,255,255,0.7)`.

### DIRECTIVE 4: Mobile-First Camera Controls (Thumb Zone)
- **Severity:** CRITICAL
- **File & Location:** `frontend/src/components/FormAnalysis/FormAnalyzer.tsx` (Mobile Layout)
- **Design Problem:** Users will be propping their phones against water bottles or walls. The UI must be operable with one hand, specifically the thumb, without obscuring the camera feed.
- **Design Solution:** A floating, pill-shaped action bar anchored to the bottom safe area. No controls should exist in the top 30% of the screen on mobile.
- **Implementation Notes for Claude:**
  1. Implement a `BottomActionBar` component.
  2. **Specs:**
     ```typescript
     const ActionBar = styled.div`
       position: absolute;
       bottom: calc(24px + env(safe-area-inset-bottom));
       left: 50%;
       transform: translateX(-50%);
       background: rgba(10, 10, 26, 0.8);
       backdrop-filter: blur(20px);
       border: 1px solid rgba(255, 255, 255, 0.1);
       border-radius: 64px;
       padding: 8px;
       display: flex;
       gap: 16px;
       align-items: center;
       z-index: 100;
     `;
     
     const RecordButton = styled(motion.button)`
       width: 64px;
       height: 64px;
       border-radius: 50%;
       background: transparent;
       border: 4px solid #00FFFF;
       display: flex;
       align-items: center;
       justify-content: center;
       
       &::after {
         content: '';
         width: ${props => props.$isRecording ? '24px' : '48px'};
         height: ${props => props.$isRecording ? '24px' : '48px'};
         border-radius: ${props => props.$isRecording ? '8px' : '50%'};
         background: ${props => props.$isRecording ? '#FF3366' : '#00FFFF'};
         transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
       }
     `;
     ```
  3. Ensure the `<ExerciseSelector />` opens as a Bottom Sheet (`drag="y"` in Framer Motion) rather than a standard dropdown, allowing easy thumb selection.

### DIRECTIVE 5: Movement Profile Data Visualization
- **Severity:** MEDIUM
- **File & Location:** `frontend/src/components/FormAnalysis/MovementProfile.tsx`
- **Design Problem:** Standard Recharts/Chart.js implementations look like corporate dashboards. We need a cybernetic, athletic aesthetic.
- **Design Solution:** The Mobility Radar Chart and Balance Visualizations must use dark-mode specific SVG styling. Grid lines must be barely visible, while data polygons glow.
- **Implementation Notes for Claude:**
  1. If using Recharts, strip all default styling.
  2. **Radar Chart Specs:**
     - `polarGrid` stroke: `rgba(255, 255, 255, 0.05)`
     - `polarAngleAxis` tick fill: `rgba(255, 255, 255, 0.5)`, font-family: `'Inter', sans-serif`, font-size: `12px`.
     - `radar` stroke: `#00FFFF`, strokeWidth: `2`.
     - `radar` fill: `url(#cyanGradient)` (Create an SVG linear gradient from `rgba(0, 255, 255, 0.4)` to `rgba(0, 255, 255, 0.0)`).
     - Add a CSS filter to the chart container: `filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.2));`
  3. **Symmetry Score:** Display this not as a chart, but as a large typographic element with a glowing horizontal balance bar. Left side Cyan, Right side Purple. The indicator pill slides based on the imbalance percentage.

---

### Claude, proceed with these architectural rules:
1. **Strict Token Usage:** Never hardcode a color outside of the Galaxy-Swan palette. If you need a gray, use an alpha channel over the `#0a0a1a` base (e.g., `rgba(255, 255, 255, 0.1)`).
2. **Z-Index Management:** Establish a strict z-index scale in the theme file for the HUD. `video: 0`, `canvas: 10`, `vignette: 20`, `hud-elements: 30`, `modals: 100`.
3. **Performance:** The `<VideoOverlay />` canvas must NOT trigger React state updates on every frame (30fps). Use a `useRef` for the canvas and draw directly to the context in the MediaPipe `onResults` callback to prevent React render cycle thrashing. Only update React state for the `RepCounter` when the rep actually increments.

---

*Part of SwanStudios 7-Brain Validation System*
