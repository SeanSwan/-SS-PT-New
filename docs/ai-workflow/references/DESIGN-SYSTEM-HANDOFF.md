# Design System Handoff
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: design/styling specs, error states, focus rings, skeleton loaders

---

## Design System Handoff (AI Village Consensus — Approved 2026-03-22)

### Error State: Crimson Frost
- **Error toast:** Graphite bg `rgba(26,26,36,0.95)` + 4px Crimson Frost `#C92A54` left border + Frost White `#E0ECF4` text
- **Success toast:** Gilded Fern `#C6A84B` accent
- **Warning toast:** Metallic Gold `#D4AF37` accent
- **Info toast:** Ice Wing `#60C0F0` accent
- **MANDATORY:** Error text is ALWAYS Frost White, never Crimson. Crimson is border-only.

### Global Focus Ring
```css
*:focus-visible {
  outline: 2px solid #60C0F0; /* Ice Wing */
  outline-offset: 4px;
  box-shadow: 0 0 16px rgba(96,192,240,0.4), inset 0 0 0 1px rgba(139,92,246,0.2);
}
```

### Frost Shimmer Skeleton Loaders
- MANDATORY on all data-fetching components
- Arctic Cyan shimmer at 10% opacity on surface color
- Hardware mirrors/treadmills: 18% opacity, 1.5s duration
- `role="status" aria-live="polite" aria-label="Loading content"`

### Hardware-Adaptive Touch Targets
| Context | Min Touch Target | Font Scale |
|---------|-----------------|------------|
| Desktop | 48px | 1.0x |
| Mobile (<768px) | 56px | 1.0x |
| Treadmill Console (2560×1600) | 64px | 1.125x |
| Hardware Mirror (1080×1920 portrait) | 64px | 1.125x |

### Glassmorphism Fallback
- Always provide `@supports not (backdrop-filter)` fallback with opaque bg + box-shadow
- TV casting: 5vh/5vw padding for overscan safe areas

### Event-Driven Architecture (Phase 2 Consensus — Future Sprint)
The AI Village reached consensus on migrating optional services (gamification, analytics) to event-driven:
- Core services emit domain events after transaction commit
- Optional modules subscribe via Event Bus with retry + DLQ
- **Transactional Outbox pattern** approved for guaranteed delivery
- Cross-module associations use **soft references** (UUID columns, no Sequelize FK constraints)
- **Current state:** Direct calls (will migrate incrementally)
- **Pattern to adopt:** `EventOutbox.create()` in same transaction → poller publishes to bus
