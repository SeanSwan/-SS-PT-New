# CUSTOM MEDIA MANAGEMENT SYSTEM - BLUEPRINT

## 1. EXECUTIVE SUMMARY

**Objective:** Create a robust system for admins to upload, manage, and associate custom media (images, GIFs, videos) with platform entities like Badges and Exercises. This eliminates generic placeholders and deeply integrates the SwanStudios brand aesthetic.

**Core Features:**
-   Admin-facing upload interface.
-   Cloud-based storage for scalability and performance (e.g., AWS S3, Cloudinary).
-   Database linkage between media URLs and corresponding entities.
-   Support for various media types (JPG, PNG, GIF, MP4).

---

## 2. SYSTEM ARCHITECTURE & DATA FLOW

```mermaid
graph TD
    subgraph "Admin Dashboard"
        A[Admin UI: Badge/Exercise Editor] --> B{Select File};
        B --> C[Upload Component];
    end

    subgraph "Application Backend"
        D[/api/admin/media/upload]
        E[Media Controller]
        F[Cloud Storage Service]
        G[Database Service]
    end

    subgraph "External & Storage"
        H[Cloud Storage Bucket]
        I[(Database)]
    end

    C -- FormData POST --> D;
    D -- Multer Middleware --> E;
    E -- Streams File to --> F;
    F -- Uploads to --> H;
    H -- Returns Public URL --> F;
    F -- Returns URL to --> E;
    E -- Returns URL to --> C;
    C -- On Save --> G;
    G -- Updates Record in --> I;
```

---

## 3. DATABASE SCHEMA CHANGES

### `Badges` Table (New)
-   **Purpose:** To store custom-created badges.
-   **Schema:**
    -   `id`: UUID (Primary Key)
    -   `name`: VARCHAR(255)
    -   `description`: TEXT
    -   `imageUrl`: VARCHAR(255) - *URL to the custom badge image/GIF.*
    -   `xpReward`: INTEGER
    -   `createdAt`, `updatedAt`

### `MeasurementMilestones` Table (Modification)
-   The `badgeAwarded` field will be changed from a `VARCHAR` to a `UUID` and will become a **foreign key** referencing `Badges.id`.

### `Exercises` Table (Modification)
-   **Purpose:** To add media fields to the existing exercise dictionary.
-   **New Fields:**
    -   `thumbnailUrl`: VARCHAR(255) - *URL for the list view image.*
    -   `videoUrl`: VARCHAR(255) - *URL for the main exercise demonstration video.*
    -   `skeletonDemoUrl`: VARCHAR(255) - *URL for the muscle activation/skeleton video.*

---

## 4. API ENDPOINTS

### `POST /api/admin/media/upload`
-   **Access:** Admin Only
-   **Body:** `multipart/form-data` with a `file` field.
-   **Action:** Uploads a single file to cloud storage and returns the public URL.
-   **Response:** `{ "success": true, "url": "https://..." }`

### `POST /api/admin/badges`
-   **Access:** Admin Only
-   **Body:** `{ "name": "string", "description": "string", "imageUrl": "string", "xpReward": "number" }`
-   **Action:** Creates a new badge record in the database.

### `PUT /api/admin/exercises/:exerciseId`
-   **Access:** Admin Only
-   **Body:** `{ "thumbnailUrl": "string", "videoUrl": "string", "skeletonDemoUrl": "string" }`
-   **Action:** Updates an existing exercise with its media URLs.

---

## 5. IMPLEMENTATION NOTES

-   **Admin UI:** A new "Media Management" section in the admin dashboard will be required to manage badges and link media to exercises.
-   **Security:** The upload endpoint must be strictly protected to prevent unauthorized file uploads. File type and size validation are mandatory.
-   **Frontend Display:** The `UserSocialDashboard` and `ClientProfilePage` will need to be updated to render `badge.imageUrl` instead of emoji placeholders.

---

**Document Version:** 1.0
**Status:** Ready for Implementation
```

#### New File: `docs/systems/CLIENT-PROFILE-PAGE-BLUEPRINT.md`
This blueprint details the structure and functionality of the new user profile page.

```diff