# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/radar/PANEL-R3.md
**Tokens (Ollama):** 1850 in / 1791 out | **Wall:** 28.9s | **done_reason:** stop

---
VERDICT: UPHOLD-WITH-AMENDMENT

**1. The Shape**
I uphold the rejection of the Netflix model. The owner’s request for "Netflix slash YouTube" is a functional description of *density* and *grid*, not a legal mandate for *rehosting*. Netflix tiles are playable assets; SwanGuard tiles are link-outs. A Netflix-style hero billboard implies the content is "ready to consume" locally. With `rss_headline_snippet_linkout` and a dormant catalogue (51/39 sources off), a hero is a lie. It promises a stream that doesn't exist. YouTube Subscriptions is the correct analog because it is a *feed of links* to external content, organized by source, not by algorithmic retention. The "civic rail" is the differentiator, but the grid shape is legally and functionally sound.

**2. Attack the Layout**
The breakpoint that actually breaks is **768px (Tablet)**.
Grok’s table shows: `768 | drawer | 280 overlay | 2`.
At 768px, a 280px rail overlay leaves only ~488px for the main content. With 2 tiles per row, each tile is ~244px wide. This is acceptable.
However, the **collapse order** is flawed at **320px-414px**.
Grok says: "forms first, rail second, tiles last."
This is a UX failure for a *monitoring* tool. If I am on a phone, I am checking the *status* (rail) or *browsing* (tiles). Forms are for *setup*. Burying the rail behind a 70vh bottom sheet (which requires two taps: open sheet, then scroll) while prioritizing forms (which are rarely used after setup) inverts the user intent.
**Amendment:** At <768px, the rail must be a **persistent 48px top-bar ticker** (not a bottom sheet) that is *always* visible, even if it overlaps slightly with the top of the grid, or the grid must start below it. The "peek bar" must be *above* the content, not a modal. A bottom sheet hides the "civic present" (the rail) which is the core value prop.

**3. Attack the Rail**
The `aria-live="off"` + 30s throttle is **compliant but deceptive**. It hides the *urgency* of the civic monitor. A screen reader user gets a "polite" announcement every 30s. If 40 stories arrive in a burst, the user hears "40 new stories" once, then silence for 30s. This is not "accessible," it is *obstructive*.
**The Defect:** The "Rise" animation (transform/opacity) combined with `aria-live="off"` creates a **phantom state**. The visual list updates, but the accessibility tree does not reflect the *order* of the new items until the 30s tick. If a keyboard user tabs into the rail, they are tabbing into a *static* DOM order that may not match the visual "Rise" order if the DOM is not reordered.
**Amendment:**
1.  The rail must be a **`<ul>`** where new items are **prepended** to the DOM, not just visually moved.
2.  `aria-live="polite"` must be on the **container**, but the throttle must be **5s**, not 30s. 30s is too long for a "monitor."
3.  **Keyboard:** When a new item arrives, if `:focus-within` is false, the focus must **not** move. If `:focus-within` is true, the focus must **stay** on the current item, and the new item must be announced via `aria-live` but *not* steal focus.
4.  **Burst:** If >5 items arrive in <2s, coalesce them into a single announcement: "5 new stories from [Source]." Do not announce individually.

**4. One Defect Nobody Has Named**
**The `prefers-reduced-motion` fallback is broken.**
Grok says: "no transition at all — new item simply appears at the top of a scrollable list."
This is a **visual jump** that causes layout shift (CLS) and disorientation. If the list is scrollable, and a new item appears at the top, the user’s scroll position *relative to the content* changes. If they were reading item #5, and item #1 is inserted, item #5 is now visually lower, but their scroll offset is unchanged. They are now looking at item #6.
**Amendment:**
In `prefers-reduced-motion`, new items must be inserted **below** the current viewport if the user is scrolled down, or **above** if at the top, but with a **`scroll-margin-top`** and **`scroll-behavior: smooth`** (which is ignored by reduced-motion, so it must be instant) *only* if the user is at the top.
Actually, the correct fix: **Do not insert at the top.** Insert at the **bottom** of the visible list, and let the user scroll up to see it. Or, better: **Highlight** the new item in the existing list (if it’s a duplicate) or add a "New" badge to the top item, but **do not shift the layout**.
**Code:**
```css
@media (prefers-reduced-motion: reduce) {
  .rail-item {
    transition: none;
    animation: none;
  }
  .rail-item--new {
    background-color: var(--token-accent, #007bff);
    /* No transform, no opacity change. Just a color flash. */
  }
}
```
The "Rise" animation is **forbidden** under reduced motion. The list must be **static**. New items are added to the DOM, but the visual order is **chronological (newest last)** in reduced motion mode, or **newest first** but with **no layout shift** (i.e., the container height is fixed, and items overflow hidden, with a "scroll to top" button appearing).
**Wait, simpler:** In reduced motion, the rail is a **static list**. New items are appended to the **end** of the list. The user must scroll to see them. This is honest. It does not "rise." It "accumulates."

**Disagreement:** I disagree with **DEEPSEEK** and **QWEN** from Round 2 (who were partial) because they likely missed the **legal** binding of `rss_headline_snippet_linkout` as a *shape* constraint, not just a content constraint. I agree with **GROK** on the legal shape, but disagree on the **reduced-motion** implementation and the **mobile rail** placement.

**Final Ruling:**
1.  **Shape:** Uphold YouTube-Subs + Civic Rail.
2.  **Layout:** Amend mobile rail to be a **top-bar** (not bottom sheet) at <768px.
3.  **Rail:** Amend `aria-live` throttle to **5s**. Amend reduced-motion to **static accumulation** (no rise, no layout shift).
4.  **Defect:** Reduced-motion layout shift is a WCAG 2.2.2 violation (Pause, Stop, Hide) if it causes disorientation. The "Rise" must be **disabled** entirely under reduced motion, replaced by a **static list** with **newest at bottom** or **highlighted top item**.

**Converged Decision:**
The owner’s build is unblocked by:
1.  Using a **YouTube-Subs grid** (link-outs, not rehosting).
2.  Using a **Civic Rail** that is **event-driven** but **static** under reduced motion.
3.  Mobile rail is a **top-bar**, not a bottom sheet.
4.  `aria-live` throttle is **5s**.

This satisfies the owner’s "Netflix slash YouTube" ask (grid + feed) while respecting the legal and accessibility constraints.
