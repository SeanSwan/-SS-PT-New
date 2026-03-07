# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 12.8s
> **Files:** docs/ai-workflow/blueprints/AI-FORM-ANALYSIS-BLUEPRINT.md
> **Generated:** 3/6/2026, 10:46:46 AM

---

This review evaluates the **AI-FORM-ANALYSIS-BLUEPRINT.md** from a performance, scalability, and infrastructure perspective. Since this is a blueprint for a high-compute feature (Computer Vision), the focus is on preventing architectural bottlenecks before implementation.

### Executive Summary
The hybrid approach (Client-side MediaPipe + Server-side Python) is architecturally sound for cost-scalability. However, the "Upload Analysis" path and "Real-time Overlay" during WebRTC sessions present significant memory and network risks if not handled with specific optimizations.

---

### 1. Bundle Size & Frontend Impact
| Finding | Rating | Description |
|:---|:---|:---|
| **WASM Binary Bloat** | **HIGH** | `@mediapipe/tasks-vision` and the associated `.tflite` models (BlazePose) are several megabytes. Loading these on the landing page or main dashboard will tank Lighthouse scores. |
| **Heavy Math Libraries** | **MEDIUM** | Using `mathjs` or complex geometry libraries in the frontend for angle calculations can add 100KB+. |

**Recommendations:**
*   **Dynamic Imports:** Wrap the `<FormAnalyzer />` and `useMediaPipe` hook in `React.lazy()`. Only trigger the download of the WASM binary when the user explicitly clicks "Start Analysis".
*   **Asset Caching:** Ensure the `.wasm` and `.tflite` files are served with long-term `Cache-Control` headers or via a PWA Service Worker to prevent re-downloading on every session.

---

### 2. Render Performance
| Finding | Rating | Description |
|:---|:---|:---|
| **Canvas Redraw Bottleneck** | **CRITICAL** | Drawing a 33-point skeleton + angle annotations at 30fps inside a standard React render cycle will cause massive UI lag and battery drain on mobile. |
| **Coordinate Scaling** | **MEDIUM** | Recalculating landmark positions from normalized (0-1) to pixel coordinates on every frame inside the render path is expensive. |

**Recommendations:**
*   **Ref-based Drawing:** Do **not** store landmark coordinates in React `state`. Use a `requestAnimationFrame` loop and a `ref` to a `<canvas>` element to draw directly to the 2D context, bypassing the React reconciliation engine entirely.
*   **OffscreenCanvas:** For supported browsers, move the MediaPipe inference and drawing to a **Web Worker** using `OffscreenCanvas` to keep the main UI thread responsive for the `FeedbackPanel`.

---

### 3. Network Efficiency & Scalability
| Finding | Rating | Description |
|:---|:---|:---|
| **Unbounded Video Uploads** | **CRITICAL** | `multer` to R2 without pre-signed URLs means video data flows through your Node.js executable. This will saturate Node's event loop and memory during concurrent uploads. |
| **Landmark Data Storage** | **MEDIUM** | Storing raw `landmarkData` JSONB for every frame of a 60-second video (30fps * 60s * 33 points) will create multi-megabyte rows, slowing down `SELECT *` queries. |

**Recommendations:**
*   **Direct-to-S3/R2 Uploads:** Use **Pre-signed URLs**. The client should upload the video directly to R2. The Node.js API should only receive the metadata and the "Upload Complete" trigger.
*   **Data Pruning:** Compress landmark data before storage (e.g., Protobuf or simply thinning the data to 10fps for storage while keeping 30fps for analysis).

---

### 4. Database & Query Efficiency
| Finding | Rating | Description |
|:---|:---|:---|
| **JSONB Indexing** | **HIGH** | The blueprint relies heavily on `JSONB` for `findings` and `mobilityScores`. Querying "Users with knee valgus" for trainer dashboards will require sequential scans without proper indexing. |
| **N+1 on History** | **LOW** | Fetching `FormAnalyses` alongside `MovementProfiles` for a dashboard needs careful eager loading. |

**Recommendations:**
*   **GIN Indexes:** Add GIN indexes to `findings` and `commonCompensations` in the `FormAnalyses` and `MovementProfiles` tables to allow efficient querying of specific AI-detected patterns.
*   **Materialized Views:** For the "Improvement Trend" charts, consider a materialized view or a summary table updated via a trigger to avoid recalculating trends across hundreds of analysis rows on every page load.

---

### 5. Memory Leaks & Resource Management
| Finding | Rating | Description |
|:---|:---|:---|
| **Camera Stream Leak** | **HIGH** | Failing to explicitly stop the `MediaStreamTrack` when the component unmounts will keep the camera "On" (green light active) and leak memory/battery. |
| **Python Worker Memory** | **MEDIUM** | OpenCV `VideoCapture` objects in the Python service often leak if not explicitly released in a `finally` block, eventually crashing the container. |

**Recommendations:**
*   **Cleanup Hook:** In `useCamera`, return a cleanup function that iterates through `stream.getTracks()` and calls `.stop()`.
*   **Context Managers:** In the Python FastAPI service, use `with` statements for all OpenCV and MediaPipe objects to ensure deterministic resource release.

---

### 6. Multi-Instance Scalability
| Finding | Rating | Description |
|:---|:---|:---|
| **Local File Processing** | **MEDIUM** | If the Python worker saves frames to local disk (`/tmp`) during processing, it won't scale horizontally unless using shared volumes or immediate cleanup. |
| **WebSocket Routing** | **MEDIUM** | Notifying the user of "Analysis Complete" via WebSockets requires a Redis Pub/Sub backplane if you have multiple Node.js instances. |

**Recommendations:**
*   **Stateless Workers:** Ensure the Python worker processes frames in memory or uses a fast SSD buffer that is wiped immediately after the JSON report is generated.
*   **Redis Adapter:** Ensure `socket.io` (or equivalent) uses the Redis adapter to broadcast the "Analysis Complete" event across the cluster.

---

### Final Performance Rating: 
**Feasibility: 9/10** | **Risk: High (Compute/Battery)**

The plan is solid, but the **"Build vs Buy"** decision places a heavy maintenance burden on the team for the **Biomechanics Layer**. To ensure scalability, prioritize **Client-Side Inference** for 90% of use cases to keep server costs at near-zero.

---

*Part of SwanStudios 7-Brain Validation System*
