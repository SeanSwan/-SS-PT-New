# Frontend UI/UX Expert — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-pro-preview | **Duration:** 39.9s
> **Files:** frontend/src/components/Checkout/methods/ZellePayment.tsx, frontend/src/pages/gallery/DonationModal.tsx, frontend/src/components/Checkout/PaymentMethodSelector.tsx
> **Generated:** 3/13/2026, 4:12:15 PM

---

As the Lead UI/UX Architect and CO-ORCHESTRATOR for SwanStudios, I have reviewed the implementation of the checkout and donation flows. 

My design philosophy for this platform is **"Crystalline Luxury meets High-Performance Arena."** Every interaction must feel like unlocking a deep-ocean vault or stepping into a frozen enchanted forest. The current implementation has structural merit but suffers from **critical design debt**—specifically, the lingering presence of the retired Galaxy-Swan theme—and lacks the premium micro-choreography required for a high-ticket SaaS platform.

Here are my authoritative design directives. Claude, you are to implement these exactly as specified.

---

### 1. ERADICATE RETIRED GALAXY-SWAN TOKENS (CRITICAL)

**Severity:** CRITICAL
**File & Location:** `frontend/src/pages/gallery/DonationModal.tsx` (`ModalOverlay`, `ModalContent`, `SubmitButton`, `SectionLabel`)
**Design Problem:** The retired Galaxy-Swan background (`#0a0a1a`) is hardcoded in multiple places. This destroys the Crystalline Swan aesthetic and creates a muddy, inconsistent UI. `SectionLabel` also uses an off-palette gray (`#A0AABF`).
**Design Solution:** We must submerge the modal into the "deep-ocean luxury vault" aesthetic using Midnight Sapphire and Royal Depth, accented by Frost White and Arctic Cyan.

**Implementation Notes for Claude:**
*   **`ModalOverlay`:** Change background to `rgba(0, 32, 96, 0.75)` (Midnight Sapphire rgb) with `backdrop-filter: blur(12px)`.
*   **`ModalContent`:** 
    ```css
    background: linear-gradient(165deg, #002060 0%, #003080 100%);
    border: 1px solid rgba(96, 192, 240, 0.2); /* Ice Wing */
    box-shadow: 0 24px 48px rgba(0, 32, 96, 0.6), inset 0 1px 0 rgba(224, 236, 244, 0.1);
    ```
*   **`SectionLabel`:** Change color to `#50A0F0` (Arctic Cyan).
*   **`SubmitButton`:** The text color is currently `#0a0a1a`. Change it to `#002060` (Midnight Sapphire) so it contrasts beautifully against the Gilded Fern gradient without using the retired dark token.

---

### 2. CRYSTALLINE QR VAULT ELEVATION

**Severity:** HIGH
**File & Location:** `frontend/src/components/Checkout/methods/ZellePayment.tsx` (`QRSection`, `QRCard`) AND `frontend/src/pages/gallery/DonationModal.tsx` (`ZelleQRSection`, `ZelleQRCard`)
**Design Problem:** The QR code containers look like cheap, flat stickers (`background: #ffffff`). They need to feel like precious artifacts encased in frosted ice.
**Design Solution:** Apply a glassmorphic "frozen" treatment to the outer section and use Frost White for the QR backing to soften the harsh pure white.

**Implementation Notes for Claude:**
*   **`QRSection` / `ZelleQRSection`:**
    ```css
    background: rgba(0, 48, 128, 0.3); /* Royal Depth variant */
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(96, 192, 240, 0.25); /* Ice Wing */
    box-shadow: inset 0 0 20px rgba(96, 192, 240, 0.05), 0 8px 32px rgba(0, 32, 96, 0.4);
    ```
*   **`QRCard` / `ZelleQRCard`:**
    ```css
    background: #E0ECF4; /* Frost White instead of #ffffff */
    border: 2px solid rgba(224, 236, 244, 0.8);
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.25); /* Wing Purple glow */
    ```
*   **`ScanHint` / `ZelleScanHint`:** Change font-family to `'Sora', sans-serif` and color to `rgba(224, 236, 244, 0.7)` (Frost White at 70%).

---

### 3. PAYMENT METHOD ARENA CHOREOGRAPHY

**Severity:** HIGH
**File & Location:** `frontend/src/components/Checkout/PaymentMethodSelector.tsx` (`MethodCard`, `MethodContent`)
**Design Problem:** The payment method selection feels flat and lacks the "competitive arena" tactile feedback. The active state relies solely on a border change.
**Design Solution:** Introduce a staggered, glowing interaction model. Active cards should emit an Ice Wing glow, and the content area should feel like a depressed, secure vault.

**Implementation Notes for Claude:**
*   **`MethodCard` Active State (`${p => p.$active && css...}`):**
    ```css
    background: linear-gradient(145deg, rgba(96, 192, 240, 0.12) 0%, rgba(0, 48, 128, 0.4) 100%);
    border-color: #60C0F0;
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(96, 192, 240, 0.15), 
                0 0 0 1px rgba(96, 192, 240, 0.3),
                inset 0 2px 12px rgba(96, 192, 240, 0.1);
    ```
*   **`MethodCard` Hover State:** Add `transform: translateY(-2px);` to the hover state to create a physical "lift" before selection.
*   **`MethodContent`:**
    ```css
    background: rgba(0, 32, 96, 0.4); /* Midnight Sapphire */
    box-shadow: inset 0 4px 24px rgba(0, 0, 0, 0.2); /* Inner shadow for vault depth */
    border-top: 1px solid rgba(96, 192, 240, 0.15);
    ```

---

### 4. INPUT FOCUS & MICRO-INTERACTIONS (WCAG + UX)

**Severity:** MEDIUM
**File & Location:** `frontend/src/pages/gallery/DonationModal.tsx` (`CustomAmountInput`, `NoteInput`) and `frontend/src/components/Checkout/methods/ZellePayment.tsx` (`CopyBtn`)
**Design Problem:** Inputs lack premium focus rings (accessibility failure + missed design opportunity). The copy button lacks tactile click feedback.
**Design Solution:** Implement "Ice Wing" focus rings for all inputs. Add active transform states to utility buttons.

**Implementation Notes for Claude:**
*   **`CustomAmountInput` & `NoteInput` Focus State:**
    ```css
    &:focus {
      border-color: #60C0F0; /* Ice Wing */
      box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.2), inset 0 1px 3px rgba(0,0,0,0.1);
      background: rgba(224, 236, 244, 0.08); /* Frost White tint */
    }
    ```
*   **`CopyBtn`:**
    ```css
    &:active {
      transform: scale(0.94);
    }
    &:focus-visible {
      outline: 2px solid #60C0F0;
      outline-offset: 2px;
    }
    ```
*   **`CustomAmountInput::placeholder` & `NoteInput::placeholder`:** Increase opacity to `rgba(224, 236, 244, 0.4)` (Frost White) to pass WCAG AA contrast while maintaining the ghosted look.

---

### 5. LUXURY HEARTBEAT ANIMATION

**Severity:** LOW (but high impact for perceived value)
**File & Location:** `frontend/src/pages/gallery/DonationModal.tsx` (`heartPulse` keyframes, `HeartIcon`)
**Design Problem:** The current `heartPulse` is a basic scale animation. It doesn't feel like a "Crystalline Swan" luxury interaction.
**Design Solution:** Enhance the keyframes to include a Gilded Fern glow that breathes with the scale.

**Implementation Notes for Claude:**
*   **Update `heartPulse` keyframes:**
    ```css
    const heartPulse = keyframes`
      0%, 100% { 
        transform: scale(1); 
        box-shadow: 0 0 0 0 rgba(198, 168, 75, 0); 
      }
      50% { 
        transform: scale(1.12); 
        box-shadow: 0 0 20px 4px rgba(198, 168, 75, 0.25); 
      }
    `;
    ```
*   **`HeartIcon`:** Ensure `color: #C6A84B;` and `background: rgba(198, 168, 75, 0.08);` are explicitly set.

---

### Claude, Proceed with Execution.
Do not compromise on the hex codes or the box-shadow opacities. The interplay between `Midnight Sapphire` and `Ice Wing` is what gives this platform its signature depth. Implement these styled-component updates exactly as written.

---

*Part of SwanStudios 7-Brain Validation System*
