# BLUEPRINT: Universal Master Schedule Refactor (Phase 1)

## PHASE 4: UX ENHANCEMENTS

### 4.1 Toast Notification System
Replace blocking `alert()` calls with non-blocking toasts.

**Flowchart (alert() ? Toast):**
```mermaid
flowchart LR
    A[Validation/Error] --> B[Toast Service]
    B --> C[Toast Component]
    C --> D[Auto-dismiss 4s]
```

**Component Spec (Toast.tsx):**
```ts
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration?: number; // default 4000ms
  onClose: (id: string) => void;
  actionLabel?: string;
  onAction?: () => void;
}
```

### 4.2 Header Button Consolidation
Group primary actions into two dropdowns to reduce visual overload:
- **Create ▼**: Create Session, Create Recurring, Block Time  
- **Manage ▼**: Availability, Notifications, Payment  
Keep Refresh as standalone icon button.

**Before/After Grouping Diagram:**
```mermaid
graph TB
    subgraph BEFORE["BEFORE: Flat Button Row"]
      A[Refresh] --> B[Notification Settings] --> C[Manage Availability] --> D[Block Time] --> E[Create Recurring] --> F[Apply Payment] --> G[Create Session]
    end
    subgraph AFTER["AFTER: Grouped Actions"]
      R[Refresh]
      C1[Create ▼] --> C2[Create Session]
      C1 --> C3[Create Recurring]
      C1 --> C4[Block Time]
      M1[Manage ▼] --> M2[Availability]
      M1 --> M3[Notifications]
      M1 --> M4[Payment]
    end
```

### 4.3 Keyboard Shortcuts
Add productivity shortcuts for admins and power users.

**Shortcut Table:**
| Key | Action |
|-----|--------|
| N | Open Create Session |
| T | Jump to Today |
| ← / → | Previous / Next period |
| Esc | Close any open modal |

**Implementation Hook:**
`frontend/src/components/UniversalMasterSchedule/hooks/useKeyboardShortcuts.ts`

### 4.4 Session Templates
Templates reduce repetitive data entry in the create flow.

**Template Data Structure:**
```ts
interface SessionTemplate {
  id: string;
  name: string;
  duration: number;
  location: string;
  notes?: string;
}
```

**localStorage Persistence Pattern:**
```ts
const STORAGE_KEY = 'schedule.sessionTemplates';
const loadTemplates = (): SessionTemplate[] =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveTemplates = (templates: SessionTemplate[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
```

---

## DIAGRAMS (PHASE 4)

### Toast Notification Flow
```mermaid
sequenceDiagram
  participant UI
  participant Toast
  UI->>Toast: push({variant, message})
  Toast-->>UI: render toast
  Toast->>Toast: auto-dismiss (4s)
```

### Header Action Grouping (Structure)
```mermaid
graph LR
  H[Header Actions]
  H --> R[Refresh]
  H --> C[Create (dropdown)]
  H --> M[Manage (dropdown)]
  C --> CS[Create Session]
  C --> CR[Create Recurring]
  C --> BT[Block Time]
  M --> AV[Availability]
  M --> NF[Notifications]
  M --> PM[Payment]
```

### Quick Create Flow (Slot Click -> Inline Form -> Session Created)
```mermaid
flowchart TD
  A[Click empty slot] --> B[Inline Quick Create Form]
  B --> C[Select duration + trainer]
  C --> D[Create]
  D --> E[Session created + toast]
```

## IMPLEMENTATION ORDER
1. **Phase 4.1** Toast notifications (replace alert calls)
2. **Phase 4.2** Header button consolidation (Create/Manage dropdowns)
3. **Phase 4.3** Keyboard shortcuts (useKeyboardShortcuts hook)
4. **Phase 4.4** Session templates (modal selector + localStorage)

## File Structure Changes

```
frontend/src/components/UniversalMasterSchedule/
├── components/
│   ├── ScheduleHeader.tsx
│   ├── ScheduleStats.tsx
│   ├── ScheduleCalendar.tsx
│   └── ScheduleModals.tsx
├── UniversalMasterSchedule.tsx (Refactored Container)
└── ... (existing sub-components)
```

## ✅ Success Criteria
- [ ] `UniversalMasterSchedule.tsx` reduced to < 300 lines.
- [ ] All data fetched via `useCalendarData`.
- [ ] Zero direct `fetch` calls in UI components.
- [ ] Full Galaxy-Swan theme compliance.
- [ ] All existing functionality (Recurring, Blocked, Payment) preserved.
