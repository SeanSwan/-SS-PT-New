# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 12.4s
> **Files:** frontend/src/components/BodyMap/PainEntryPanel.tsx, frontend/src/components/WorkoutLogger/VoiceMemoUpload.tsx, backend/routes/workoutLogUploadRoutes.mjs, backend/services/workoutLogParserService.mjs, backend/services/voiceTranscriptionService.mjs
> **Generated:** 3/6/2026, 8:43:19 PM

---

# Deep Architecture Review & Bug Hunt — SwanStudios

## Executive Summary

This review identifies **4 CRITICAL issues**, **7 HIGH severity issues**, and multiple MEDIUM/LOW concerns across the codebase. The most critical problems are: memory leak in rate limiter, missing API timeouts, insecure error message exposure, and PDF text extraction that will fail in production.

---

## 1. Bug Detection

### CRITICAL

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `workoutLogUploadRoutes.mjs:18-31` | **Memory leak in rate limiter**: The `uploadCounts` Map grows unbounded. Timestamps are filtered but the Map entries for users who stop uploading are never cleaned up. Over time, this will exhaust server memory. | Add periodic cleanup or use LRU cache with TTL:<br><br>`// Add after line 31`<br>`// Cleanup entries older than window every 5 minutes`<br>`setInterval(() => {`<br>`  const cutoff = Date.now() - window;`<br>`  for (const [key, times] of uploadCounts) {`<br>`    const filtered = times.filter(t => t > cutoff);`<br>`    if (filtered.length === 0) uploadCounts.delete(key);`<br>`    else uploadCounts.set(key, filtered);`<br>`  }`<br>`}, 5 * 60 * 1000);` |
| **CRITICAL** | `workoutLogParserService.mjs:89-98` | **No timeout on OpenAI fetch**: The `fetch()` call to OpenAI has no timeout. If the API hangs, the request will hang indefinitely, potentially exhausting server connections. | Add timeout AbortController:<br><br>`const controller = new AbortController();`<br>`const timeout = setTimeout(() => controller.abort(), 30000);`<br>`const response = await fetch('https://api.openai.com/v1/chat/completions', {`<br>`  ...options,`<br>`  signal: controller.signal,`<br>`});`<br>`clearTimeout(timeout);` |
| **CRITICAL** | `voiceTranscriptionService.mjs:27-45` | **No timeout on Whisper API**: Same issue — fetch to OpenAI has no timeout. | Apply same timeout pattern as above. |
| **CRITICAL** | `voiceTranscriptionService.mjs:66-79` | **Broken PDF text extraction**: The regex `/\(([^)]+)\)/g` only captures text in parentheses and will fail on most real PDFs. Most PDF text isn't stored as simple parentheses. This will return empty/invalid text for actual PDF uploads. | Use a proper PDF library:<br><br>`import pdf from 'pdf-parse';`<br>`// In extractText function:`<br>`if (mimetype === 'application/pdf') {`<br>`  try {`<br>`    const data = await pdf(buffer);`<br>`    return data.text.trim();`<br>`  } catch {`<br>`    return buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ').trim();`<br>`  }`<br>`}` |

### HIGH

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `PainEntryPanel.tsx:298-305` | **Race condition in side-swapping**: When user changes side, `setEffectiveRegionId(swapped)` is called which triggers the reset `useEffect` (lines 262-280). This effect depends on `effectiveRegionId`, causing the form to reset while the user is still interacting. The side change and form reset happen in same render cycle creating confusing UX. | Add a flag to prevent reset during side swap, or separate the side-change handler:<br><br>`const [isSideSwapping, setIsSideSwapping] = useState(false);`<br><br>`// In side change handler:`<br>`setIsSideSwapping(true);`<br>`setEffectiveRegionId(swapped);`<br>`setTimeout(() => setIsSideSwapping(false), 0);`<br><br>`// In reset useEffect:`<br>`useEffect(() => {`<br>`  if (isSideSwapping) return;`<br>`  // existing logic`<br>`}, [effectiveRegionId, existingEntry, isSideSwapping]);` |
| **HIGH** | `workoutLogUploadRoutes.mjs:84-86` | **Error message exposure**: Internal error messages are exposed directly to clients (`err.message`). This could leak sensitive information like file paths, API keys (if in message), or internal logic. | Sanitize all error responses:<br><br>`res.status(500).json({ error: 'Failed to process upload. Please try again.' });`<br><br>Log the detailed error server-side only. |
| **HIGH** | `workoutLogParserService.mjs:23-26` | **No input validation**: `clientId` and `trainerId` are passed directly to `getClientContext()` without validation. Malicious input could cause unexpected behavior. | Add validation at function start:<br><br>`if (!Number.isInteger(clientId) || clientId <= 0) {`<br>`  throw new Error('Invalid clientId');`<br>`}`<br>`if (!Number.isInteger(trainerId) || trainerId <= 0) {`<br>`  throw new Error('Invalid trainerId');`<br>`}` |
| **HIGH** | `VoiceMemoUpload.tsx:147-149` | **No file size validation on client**: The component accepts files up to 50MB (per backend) but doesn't validate before upload. User gets generic error after waiting for upload. | Add client-side validation:<br><br>`const MAX_SIZE = 50 * 1024 * 1024;`<br>`if (file.size > MAX_SIZE) {`<br>`  setError('File exceeds 50MB limit');`<br>`  return;`<br>`}` |
| **HIGH** | `workoutLogUploadRoutes.mjs:67` | **Insecure rate limiter**: The rate limiter runs AFTER authentication (`router.use(protect)`), but an unauthenticated attacker could still hit the endpoint and get a 401 before hitting rate limit. This makes DDoS easier. Rate limiting should be first. | Move `rateLimiter` before `protect`:<br><br>`router.post('/upload', rateLimiter, protect, authorize(...), ...)` |
| **HIGH** | `PainEntryPanel.tsx:330-335` | **No form validation before save**: `handleSave` only checks `if (!effectiveRegionId) return;` but doesn't validate required fields like `painType` or `painLevel`. User can save invalid/incomplete entries. | Add validation:<br><br>`const handleSave = () => {`<br>`  if (!effectiveRegionId) return;`<br>`  if (!painType) {`<br>`    alert('Please select a pain type');`<br>`    return;`<br>`  }`<br>`  // existing logic`<br>`};` |
| **HIGH** | `VoiceMemoUpload.tsx:125-145` | **Error handling swallows details**: The catch block uses `err.response?.data?.error || err.message` but doesn't handle network errors differently from API errors. A network failure shows unhelpful "Upload failed" message. | Differentiate error types:<br><br>`} catch (err: any) {`<br>`  if (err.code === 'ECONNABORTED') {`<br>`    setError('Request timed out. File may be too large.');`<br>`  } else if (!err.response) {`<br>`    setError('Network error. Check your connection.');`<br>`  } else {`<br>`    setError(err.response?.data?.error || 'Upload failed');`<br>`  }`<br>`}` |

### MEDIUM

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `PainEntryPanel.tsx:262-280` | **Complex useEffect with multiple responsibilities**: This effect handles both "sync from parent" and "reset form on region change" and "load existing entry". These three concerns should be separate effects for clarity and to avoid interaction bugs. | Split into separate effects:<br><br>`// Effect 1: Sync from parent`<br>`useEffect(() => { setEffectiveRegionId(regionId); }, [regionId]);`<br><br>`// Effect 2: Load existing entry`<br>`useEffect(() => {`<br>`  if (existingEntry) { /* load logic */ }`<br>`}, [existingEntry]);`<br><br>`// Effect 3: Reset form for new entry`<br>`useEffect(() => {`<br>`  if (!existingEntry && effectiveRegionId) { /* reset logic */ }`<br>`}, [effectiveRegionId, existingEntry]);` |
| **MEDIUM** | `VoiceMemoUpload.tsx:152-157` | **onDrop handler doesn't validate file count**: Users can drop multiple files but only the first is processed silently. Should either handle multiple files or explicitly reject. | Add validation:<br><br>`const onDrop = useCallback((e: React.DragEvent) => {`<br>`  e.preventDefault();`<br>`  setDragOver(false);`<br>`  if (e.dataTransfer.files.length > 1) {`<br>`    setError('Please upload one file at a time');`<br>`    return;`<br>`  }`<br>`  const file = e.dataTransfer.files[0];`<br>`  if (file) handleFile(file);`<br>`}, [handleFile]);` |
| **MEDIUM** | `workoutLogParserService.mjs:108-115` | **Confidence calculation is misleading**: The confidence score is based on heuristics (transcript length, number of exercises) that don't actually measure parsing accuracy. A long transcript with garbled audio could show high confidence. | Rename to reflect what it actually measures:<br><br>`const parsingCompleteness = calculateCompleteness(transcript, parsed);`<br><br>Or remove confidence entirely if it can't be accurately measured. |
| **MEDIUM** | `voiceTranscriptionService.mjs:81-88` | **getMimeType fallback is wrong**: Returns `'audio/mp4'` as fallback, but if the file is actually a different format, Whisper will fail with a confusing error. | Throw error instead of guessing:<br><br>`function getMimeType(filename) {`<br>`  const ext = filename.split('.').pop()?.toLowerCase();`<br>`  const mimeMap = { /* existing */ };`<br>`  if (!mimeMap[ext]) {`<br>`    throw new Error(`Unsupported audio format: ${ext}`);`<br>`  }`<br>`  return mimeMap[ext];`<br>`}` |

---

## 2. Architecture Flaws

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `PainEntryPanel.tsx` (entire file) | **God component (~450 lines)**: This component handles form state, side-swapping logic, region lookup, theming, responsive layout, and rendering. Should be split into smaller, focused components. | Extract:<br>`- PainLevelSlider` (lines 116-140)<br>`- ChipSelector` (for aggravating/relieving factors)<br>`- SyndromeSelector` (postural syndrome buttons)<br>`- PainEntryForm` (main form logic) |
| **HIGH** | `workoutLogUploadRoutes.mjs:52-102` | **Route handler does too much**: The route handles file upload, transcription, parsing, and response. This violates single responsibility and makes testing difficult. | Extract to controller/service:<br><br>`// routes/workoutLogUploadRoutes.mjs`<br>`router.post('/upload', rateLimiter, protect, authorize('admin', 'trainer'), upload.single('file'), handleUpload);`<br><br>`// controllers/workoutLogUploadController.mjs`<br>`async function handleUpload(req, res) {`<br>`  const result = await processWorkoutUpload(req.file, req.body);`<br>`  res

---

*Part of SwanStudios 7-Brain Validation System*
