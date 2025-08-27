# 🌳 SWANSTUDIOS HOMEPAGE & DEPENDENCIES TREE

## **📍 CURRENT HOMEPAGE LOADING PATH**
```
sswanstudios.com → App.tsx → main-routes.tsx → Layout → HomePage.component.tsx + Header
```

---

## **🔍 EXACT FILE LOCATIONS & DEPENDENCY TREE**

### **🏠 HOMEPAGE COMPONENT**
**Location:** `frontend/src/pages/HomePage/components/HomePage.component.tsx`
**Import Path in Routes:** `../pages/HomePage/components/HomePage.component`

```
📁 pages/HomePage/
├── 📁 components/
│   ├── 📄 HomePage.component.tsx ← **MAIN HOMEPAGE** (what's actually loaded)
│   ├── 📄 Hero-Section.tsx
│   ├── 📄 TrainerProfilesSection.tsx
│   └── 📄 CreativeExpressionSection.tsx
```

### **🗂️ LAYOUT WRAPPER**
**Location:** `frontend/src/components/Layout/layout.tsx`
**What it contains:**
```typescript
import Header from '../Header/header'; // IMPORTS HEADER
import Footer from '../Footer/Footer';
import { ConstructionBannerContainer } from '../common';
import FloatingSessionWidget from '../SessionDashboard/FloatingSessionWidget';
```

### **🧭 HEADER COMPONENT** 
**Location:** `frontend/src/components/Header/header.tsx`
**Dependencies:**
```
📁 components/Header/
├── 📄 header.tsx ← **MAIN HEADER** (loaded by Layout)
├── 📄 EnhancedNotificationSectionWrapper.tsx
├── 📄 NotificationSection.tsx
├── 📄 ProfileSection.tsx
├── 📄 SearchSection.tsx
└── 📄 NotificationList.tsx
```

**Header Imports:**
```typescript
// Critical dependencies
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import ShoppingCart from "../ShoppingCart/ShoppingCart";
import DashboardSelector from "../DashboardSelector/DashboardSelector";
import EnhancedNotificationSectionWrapper from './EnhancedNotificationSectionWrapper';
import { UserSwitcher } from '../UserSwitcher';
import UniversalThemeToggle from '../../context/ThemeContext/UniversalThemeToggle';
import { useUniversalTheme } from '../../context/ThemeContext';
```

---

## **⚡ COMPLETE DEPENDENCY CHAIN**

### **🔄 HOMEPAGE RENDERING FLOW**
```
1. main.jsx
   ↓ loads App.tsx
   
2. App.tsx  
   ↓ creates RouterProvider with MainRoutes
   ↓ wraps in multiple context providers
   
3. main-routes.tsx
   ↓ defines route: index → HomePage (lazy loaded)
   ↓ wraps routes in Layout component
   
4. Layout (layout.tsx)
   ↓ renders Header + Content + Footer
   ↓ adds ConstructionBannerContainer
   ↓ adds FloatingSessionWidget
   
5. HomePage.component.tsx
   ↓ renders the actual homepage content
```

### **🧩 CONTEXT PROVIDERS WRAPPING EVERYTHING**
```
QueryClientProvider
├── Redux Provider  
│   └── HelmetProvider
│       └── StyleSheetManager  
│           └── UniversalThemeProvider
│               └── ThemeProvider
│                   └── ConfigProvider
│                       └── MenuStateProvider
│                           └── AuthProvider ← **CRITICAL**
│                               └── ToastProvider
│                                   └── CartProvider ← **CRITICAL** 
│                                       └── SessionProvider
│                                           └── TouchGestureProvider
│                                               └── DevToolsProvider
│                                                   └── ErrorBoundary
│                                                       └── **AppContent**
```

---

## **❌ POTENTIAL FAILURE POINTS**

### **1. Header Component Complex Dependencies**
**File:** `components/Header/header.tsx`
**High-Risk Imports:**
- `useAuth` from AuthContext ← **CRITICAL**
- `useCart` from CartContext ← **CRITICAL**  
- `ShoppingCart` component
- `DashboardSelector` component
- `EnhancedNotificationSectionWrapper`
- `UserSwitcher` component
- Theme-related hooks and components

### **2. Context Provider Chain**
**Location:** `App.tsx` 
**Risk:** Any context provider failing causes entire chain to fail
- AuthProvider initialization
- CartProvider initialization  
- ThemeProvider theme resolution
- Redux store connection

### **3. Lazy Loading with Error Handling**
**Location:** `main-routes.tsx`
**Risk:** HomePage lazy import failing
```typescript
const HomePage = lazyLoadWithErrorHandling(
  () => import('../pages/HomePage/components/HomePage.component'),
  'Home Page'
);
```

---

## **🎯 LIKELY CULPRITS FOR BLANK PAGE**

### **Most Probable Issues:**
1. **AuthContext initialization failing** (used by Header)
2. **CartContext initialization failing** (used by Header) 
3. **Theme context not resolving** (used by Header)
4. **ShoppingCart component crashing** (imported by Header)
5. **DashboardSelector component failing** (imported by Header)

### **Testing Strategy:**
1. **Test Header independently** - Create minimal test page with just Header
2. **Test HomePage without Layout** - See if HomePage renders without Header
3. **Test context providers individually** - Find which provider is failing
4. **Check browser network tab** - See if any imports are failing to load

---

## **🔧 DIAGNOSTIC FILES TO CHECK**

### **Check these files for issues:**
```
✓ frontend/src/context/AuthContext.tsx
✓ frontend/src/context/CartContext.tsx  
✓ frontend/src/components/Header/header.tsx
✓ frontend/src/components/ShoppingCart/ShoppingCart.tsx
✓ frontend/src/components/DashboardSelector/DashboardSelector.tsx
✓ frontend/src/components/Layout/layout.tsx
✓ frontend/src/pages/HomePage/components/HomePage.component.tsx
```

### **Key imports to verify exist:**
```
✓ components/ShoppingCart/ShoppingCart
✓ components/DashboardSelector/DashboardSelector  
✓ components/Header/EnhancedNotificationSectionWrapper
✓ components/UserSwitcher
✓ context/ThemeContext/UniversalThemeToggle
```

---

**🎯 NEXT STEPS:** Check each of these critical dependencies to find what's actually causing the blank page!
