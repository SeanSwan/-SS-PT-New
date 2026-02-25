# MUI → Swan Migration Guide

## Rules (Follow Exactly)
1. Remove ALL `@mui/material` and `@mui/icons-material` imports
2. Replace with `styled-components` + `lucide-react`
3. Use transient props: `$active`, `$status`, etc.
4. 44px min touch targets on buttons/inputs
5. Keep ALL business logic EXACTLY as-is

## Common Replacements
| MUI | Swan |
|-----|------|
| Box | styled.div |
| Typography | styled.h1-h6, p, span |
| Button | styled.button (min-height:44px) |
| TextField | styled input + label |
| Grid | CSS grid |
| Dialog | ModalOverlay + ModalPanel |
| Card | styled.div (glass effect) |
| Chip | styled.span |
| Alert | styled.div (border-left) |
| Table | styled table/tr/td |

## Icons (lucide-react)
- Add→Plus, Delete→Trash2, Edit→Edit
- Search→Search, Settings→Settings
- CheckCircle→CheckCircle2, Warning→AlertTriangle

## Theme
- bg: rgba(15,23,42,0.95)
- border: rgba(14,165,233,0.2)
- text: #e2e8f0
- accent: #0ea5e9