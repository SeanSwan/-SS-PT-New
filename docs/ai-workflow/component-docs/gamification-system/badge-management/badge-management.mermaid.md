# Badge Management System - Mermaid Diagrams

## System Architecture Flowchart
```mermaid
flowchart TD
    A[Admin Access Badge Management] --> B{Authentication Check}
    B -->|Admin Role| C[Load Badge Dashboard]
    B -->|Not Admin| D[Access Denied]

    C --> E[Display Badge Grid]
    E --> F[Create New Badge Button]
    E --> G[Edit Existing Badge]
    E --> H[Delete Badge]

    F --> I[Badge Creation Wizard]
    I --> J[Step 1: Basic Info]
    J --> K[Step 2: Image Upload]
    K --> L[Step 3: Criteria Definition]
    L --> M[Step 4: Rewards Setup]
    M --> N[Step 5: Review & Publish]

    N --> O{Validation Passed?}
    O -->|Yes| P[Save to Database]
    O -->|No| Q[Show Errors, Return to Step]

    P --> R[CDN Image Upload]
    R --> S[Update Badge Record]
    S --> T[Publish Badge]
    T --> U[Notify Achievement Engine]
    U --> V[Badge Available for Earning]

    G --> W[Load Badge Data]
    W --> X[Populate Edit Form]
    X --> Y[Save Changes]
    Y --> Z[Update Achievement Engine]

    H --> AA{Confirm Deletion}
    AA -->|Yes| BB[Soft Delete Badge]
    AA -->|No| CC[Cancel Operation]
    BB --> DD[Remove from Active Badges]
    DD --> EE[Update User Profiles]
```

## Badge Earning Sequence Diagram
```mermaid
sequenceDiagram
    participant User
    participant App
    participant BadgeEngine
    participant Database
    participant Notification

    User->>App: Completes Exercise/Challenge
    App->>BadgeEngine: Check Badge Criteria
    BadgeEngine->>Database: Query User Progress
    Database-->>BadgeEngine: User Stats

    BadgeEngine->>BadgeEngine: Evaluate Criteria Rules
    alt Criteria Met
        BadgeEngine->>Database: Award Badge to User
        Database-->>BadgeEngine: Confirmation
        BadgeEngine->>Notification: Send Achievement Alert
        Notification-->>User: "Badge Unlocked!" Notification
        BadgeEngine->>App: Update User Profile
        App-->>User: Show Badge Celebration
    else Criteria Not Met
        BadgeEngine->>App: Continue Normal Flow
    end
```

## Badge Creation State Diagram
```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Designing : Click Create Badge
    Designing --> Uploading : Basic Info Complete
    Uploading --> Processing : Image Selected
    Processing --> Validating : Upload Complete
    Validating --> Published : All Criteria Valid
    Validating --> Error : Validation Failed
    Error --> Designing : Fix Issues
    Published --> [*] : Badge Active
    Published --> Archived : Admin Archives
    Archived --> [*] : End of Life
```

## Badge Criteria Evaluation Flowchart
```mermaid
flowchart TD
    A[User Action Triggered] --> B{Action Type}
    B -->|Exercise Completed| C[Check Exercise Badges]
    B -->|Streak Achieved| D[Check Streak Badges]
    B -->|Challenge Completed| E[Check Challenge Badges]
    B -->|Social Action| F[Check Social Badges]

    C --> G[Load Exercise Criteria]
    D --> H[Load Streak Criteria]
    E --> I[Load Challenge Criteria]
    F --> J[Load Social Criteria]

    G --> K{Evaluate Rules}
    H --> K
    I --> K
    J --> K

    K -->|Rules Met| L[Award Badge]
    K -->|Rules Not Met| M[No Action]

    L --> N[Update User Badges]
    N --> O[Trigger Rewards]
    O --> P[Send Notification]
    P --> Q[Log Achievement]

    M --> R[Continue Normal Flow]
```

## Database Relationship Diagram
```mermaid
erDiagram
    BADGES ||--o{ BADGE_CRITERIA : has
    BADGES ||--o{ USER_BADGES : awarded_to
    BADGES }o--|| BADGE_COLLECTIONS : belongs_to

    BADGE_CRITERIA {
        string criteria_type
        json criteria_rules
        boolean is_active
    }

    USER_BADGES {
        integer user_id
        integer badge_id
        datetime earned_at
        json earning_context
    }

    BADGE_COLLECTIONS {
        string name
        string description
        string theme
        boolean is_active
    }

    USERS ||--o{ USER_BADGES : earns
    USERS {
        integer id
        string username
        json profile_data
    }
```

## Badge Upload Process Flowchart
```mermaid
flowchart TD
    A[Admin Selects Image] --> B{File Validation}
    B -->|Invalid Type| C[Show Error: Invalid File Type]
    B -->|Too Large| D[Show Error: File Too Large]
    B -->|Valid| E[Generate Unique Filename]

    E --> F[Upload to CDN]
    F --> G{Upload Success?}
    G -->|Yes| H[Get CDN URL]
    G -->|No| I[Show Error: Upload Failed]

    H --> J[Create Badge Record]
    J --> K[Associate Image URL]
    K --> L[Save to Database]
    L --> M[Show Success Message]

    C --> N[Allow Retry]
    D --> N
    I --> N
    N --> A
```

## Badge Display Component State Diagram
```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> Empty : No Badges Earned
    Loading --> Populated : Badges Found
    Loading --> Error : Load Failed

    Populated --> Viewing : User Interacts
    Viewing --> Expanded : Click Badge
    Expanded --> Viewing : Close Modal

    Error --> Retrying : User Retries
    Retrying --> Loading : Retry Load
    Retrying --> Error : Still Failed

    Empty --> Encouraging : Show Call-to-Action
    Encouraging --> [*] : User Dismisses