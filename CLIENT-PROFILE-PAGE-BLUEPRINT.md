# CLIENT PROFILE PAGE - BLUEPRINT

## 1. EXECUTIVE SUMMARY

**Objective:** Create a rich, engaging, and shareable user profile page that serves as a "fitness resume" and social hub for each user, blending their training achievements with their social activity.

---

## 2. UI WIREFRAME & COMPONENT LAYOUT

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🖼️ Cover Photo                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ 👤 Avatar | Name: Jane Doe      [ Follow ]                               │
│         | Level 27: Fitness Enthusiast                                   │
│         | "Just trying to be better than I was yesterday."               │
├──────────────────────────────────────────────────────────────────────────┤
│ 📊 12 Workouts | 🔥 5 Day Streak | 🏆 7 Achievements | 👥 150 Followers   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [ Feed ]   [ Achievements ]   [ Progress ]   [ Goals ]                  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ 🏋️ Jane Doe completed 'Leg Day'. Feeling strong! - 2h ago           │ │
│ │    [👍 15 Likes] [💬 4 Comments]                                      │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ 🎉 Jane Doe earned the '100 Squats Club' badge! - 1d ago             │ │
│ │    [👍 32 Likes] [💬 9 Comments]                                      │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. COMPONENT ARCHITECTURE

-   **`ClientProfilePage.tsx` (Container):**
    -   Fetches all profile data from `GET /api/profiles/:userId`.
    -   Manages the state for the active tab.

-   **`ProfileHeader.tsx`:**
    -   Displays avatar, cover photo, name, bio, level, and key stats.
    -   Contains the "Follow/Unfollow" or "Edit Profile" button.

-   **`ProfileNav.tsx`:**
    -   Tabbed navigation for switching between content views.

-   **Content Panes (Rendered based on active tab):**
    -   **`UserActivityFeed.tsx`:** A filtered version of the main feed, showing only posts by this user.
    -   **`AchievementGallery.tsx`:** Displays all unlocked badges in a grid format. Uses `badge.imageUrl` from the new `Badges` table.
    -   **`ProgressCharts.tsx`:** Re-uses the existing `WorkoutProgressCharts` component to show detailed analytics.
    -   **`UserGoals.tsx`:** A read-only view of the user's public life goals.

---

## 4. API ENDPOINT

### `GET /api/profiles/:userId`
-   **Access:** Public (within the app)
-   **Action:** Aggregates and returns all necessary data for a user's profile.
-   **Response Data Structure:**
    ```json
    {
      "user": { "id", "firstName", "lastName", "profilePicture", "coverPhoto", "bio" },
      "stats": {
        "level": 27,
        "xp": 2450,
        "streak": 5,
        "followers": 150,
        "following": 75
      },
      "recentActivity": [ ... ], // Paginated list of user's feed items
      "achievements": [ ... ], // List of unlocked badge objects (with imageUrl)
      "goals": [ ... ] // List of public goals
    }
    ```

---

**Document Version:** 1.0
**Status:** Ready for Implementation
```

#### New File: `docs/systems/COMMENTING-SYSTEM-BLUEPRINT.md`
This blueprint details the commenting feature.

```diff