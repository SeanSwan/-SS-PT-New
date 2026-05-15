# SwanStudios Design Guardrails For Open Design

Use this file as the compact SwanStudios rule source when designing UserDashboard prototypes.

## Product Identity

SwanStudios is a production personal training SaaS. The active brand direction is **Enchanted Apex: Crystalline Swan**: dark-first, premium, crystalline, fitness-focused, and operationally clear.

Do not use the retired Galaxy-Swan direction as a new visual target.

## Visual System

- Dark-first by default.
- Use SwanStudios crystalline glass, sapphire depth, cyan/violet rim light, and restrained gold accents.
- Avoid generic SaaS dashboards, plain card grids, one-note purple gradients, beige/cream palettes, and decorative blobs.
- Keep the existing UserDashboard V3 / Crystalline Creator Observatory visual language as the source of truth.
- Typography stack: Plus Jakarta Sans, Sora, Fira Code, and Cormorant Garamond italic for rare editorial moments.

## Token Intent

Use these colors as semantic references:

- Midnight Sapphire: `#002060`
- Royal Depth: `#003080`
- Ice Wing: `#60C0F0`
- Arctic Cyan: `#50A0F0`
- Gilded Fern: `#C6A84B`
- Frost White: `#E0ECF4`
- Swan Lavender: `#4070C0`
- Wing Purple: `#8B5CF6`
- Obsidian Black: `#0A0A0F`
- Carbon: `#141419`
- Graphite: `#1A1A24`

## Implementation Bias

- Production implementation uses React, TypeScript, styled-components, and CSS custom properties.
- Do not propose Material UI.
- Use lucide-react icons for production handoff when practical.
- Keep controls accessible with 44px minimum touch targets.
- Preserve focus-visible states and WCAG contrast.
- Respect `prefers-reduced-motion`.
- Do not use `innerHTML` for dynamic logs or user data.

## Language Rules

- Use training, workout, recovery, stretching, mobility, flexibility, progress, coaching, and creator language.
- Do not use yoga or meditation language.
- Do not imply automatic AI writes, automatic posting, automatic client updates, or automatic workout logging.
- AI-related surfaces must clearly stage drafts/recommendations for user/operator approval.

## UserDashboard Direction

Preserve and extend:

- Creator Observatory Home tab.
- left rail / central creator workspace / right rail on desktop.
- bottom mobile nav with reachable primary create action.
- XP, level, streak, badges, challenges, and progress beats.
- social fitness modules: reels, feed, community, progress, profile, workouts, rewards.
- mobile-first clarity with no horizontal overflow at 300, 332, 390, and 430px widths.

When proposing changes, keep Home + shared shell as the first pass before extending the other tabs.
