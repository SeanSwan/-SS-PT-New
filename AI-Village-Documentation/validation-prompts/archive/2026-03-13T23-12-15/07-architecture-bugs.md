# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 63.1s
> **Files:** frontend/src/components/Checkout/methods/ZellePayment.tsx, frontend/src/pages/gallery/DonationModal.tsx, frontend/src/components/Checkout/PaymentMethodSelector.tsx
> **Generated:** 3/13/2026, 4:12:15 PM

---

# Deep Code Review: SwanStudios Frontend

**Reviewer:** Principal Software Engineer (AI)
**Target:** `ZellePayment.tsx`, `DonationModal.tsx`, `PaymentMethodSelector.tsx`
**Theme:** Enchanted Apex (Active) vs. Retired Galaxy-Swan

---

## 1. Bug Detection

### 1.1. Memory Leak in ZellePayment
**Severity:** HIGH
**File:** `frontend/src/components/Checkout/methods/ZellePayment.tsx`
**Line:** 27-29

**What's Wrong:**
The `handleCopy` function sets a timeout to reset the `copied` state, but there is no cleanup in a `useEffect` to clear this timeout if the component unmounts before the 2 seconds elapse. This creates a memory leak and potential state update on an unmounted component.

```tsx
// Current code
const handleCopy = () => {
  navigator.clipboard.writeText(zelleRecipient);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000); // LEAK: No cleanup
};
```

**Fix:**
Use a `useEffect` to handle the timeout or use a ref to track it for cleanup.

```tsx
const [copied, setCopied] = useState(false);
const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

const handleCopy = () => {
  navigator.clipboard.writeText(zelleRecipient);
  setCopied(true);
  if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
};

useEffect(() => {
  return () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  };
}, []);
```

---

### 1.2. Hardcoded Credentials & Configuration
**Severity:** CRITICAL
**File:** `frontend/src/pages/gallery/DonationModal.tsx`
**Line:** 363

**What's Wrong:**
The Zelle recipient phone number (`3239968153`) is hardcoded directly in the component. This creates a maintenance nightmare and exposes sensitive operational data in the source code. Furthermore, the QR code image is statically imported (`../../assets/Zelle.png`), meaning if the Zelle account changes, a code deployment is required.

```tsx
// Line 363
const zelleRecipient = '3239968153';
```

**Fix:**
1.  The component should accept `paymentSettings` via props or use a context to fetch this data, similar to how `PaymentMethodSelector` handles it.
2.  The QR code URL should be fetched from the backend API (`/api/admin/payment-settings/public`) and rendered via an `<img src={settings.zelleQRUrl} />`.

---

### 1.3. Hardcoded Credentials (Selector)
**Severity:** CRITICAL
**File:** `frontend/src/components/Checkout/PaymentMethodSelector.tsx`
**Line:** 54

**What's Wrong:**
Default state contains the hardcoded phone number.

```tsx
const [settings, setSettings] = useState<PaymentSettings>({
  zelleRecipient: '3239968153', // Hardcoded
  venmoHandle: '',
  checkPayeeName: 'SwanStudios',
});
```

**Fix:**
Initialize with empty strings or fetch immediately in a `useEffect` before first render (or show a loading skeleton).

---

## 2. Architecture Flaws

### 2.1. DRY Violation: Fee Calculation
**Severity:** HIGH
**File

---

*Part of SwanStudios 7-Brain Validation System*
