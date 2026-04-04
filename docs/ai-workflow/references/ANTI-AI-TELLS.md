# Anti-AI-Tells Checklist
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: UI component design, banned patterns, required states

---

## Anti-AI-Tells Checklist (MANDATORY — adapted from taste-skill)

AI-generated interfaces have recognizable "tells" that make them look generic. All SwanStudios code MUST avoid these patterns:

### Banned Patterns
- **No pure `#000000` black** — Use Obsidian Black `#0A0A0F` or Carbon `#141419`
- **No `99.99%` or `100%` fake round numbers** in dashboards — Use organic data like `97.3%`, `47.2%`
- **No "John Doe" / "Jane Smith"** placeholder names — Use realistic names or user's actual data
- **No filler words in copy:** "Elevate", "Seamless", "Unleash", "Next-Gen", "Cutting-Edge", "Revolutionary" (in user-facing text)
- **No Unsplash links** for placeholder images — Use `/api/placeholder/` or picsum.photos
- **No oversaturated neon outer glows** (except controlled Ice Wing/Wing Purple glow system)
- **No gradient text on large headers** — Use solid Frost White `#E0ECF4`
- **No custom mouse cursors** — Standard pointer is correct
- **No generic 3-column equal-width card layouts** — Use asymmetric bento grids or varied widths
- **No cards that don't communicate hierarchy** — Only use elevation when it serves information architecture
- **No linear easing on animations** — Use `cubic-bezier(0.16, 1, 0.3, 1)` (spring snap-and-settle) or `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- **No `Inter`, `Roboto`, `Arial`, `Helvetica`** — These are banned AI-slop fonts. Use Plus Jakarta Sans, Sora, Cormorant Garamond, Fira Code

### Required States (every interactive component)
1. **Default** — Resting state
2. **Hover** — Visual feedback with glow/transform
3. **Active/Pressed** — Scale-down feedback
4. **Focus-visible** — Ice Wing focus ring (accessibility)
5. **Loading** — Frost Shimmer skeleton or spinner
6. **Empty** — Meaningful empty state with CTA
7. **Error** — Crimson Frost border + Frost White text + retry action
