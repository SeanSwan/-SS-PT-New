# SwanStudios Photo Gallery & Lead Generation System
## Enhanced Master Plan — For AI Village Review

### Business Context
Sean (SwanStudios owner) photographs youth sports games. Parents want these photos. This creates a natural lead generation funnel:
1. **Parents visit site** to see their kids' game photos
2. **Email capture** — must enter email + event password to access gallery
3. **Browse & download** — ALL photos are FREE, unlimited downloads, no watermarks, no gates
4. **Enhancement requests** — parents can mark photos they want professionally color-graded
5. **Optional support** — parents MAY leave a donation (any amount, including $0) OR give a PT referral. Neither is required.
6. **Newsletter opt-in** — captured emails receive SwanStudios updates (bi-weekly)

### Core Philosophy: NO PAYWALLS
- **Downloads are 100% free** — every photo, full resolution, no limits
- **Donations are truly optional** — $0 is valid, no minimum, no guilt-tripping
- **The real conversion is the email** — that's the lead gen funnel
- **Referrals are a bonus** — soft ask, never a gate
- **Enhancement requests are free to submit** — parent just flags which photos they want enhanced
- **Enhanced photos delivered free** — once Sean color-grades them, parent gets them at no cost
- **Donation/referral prompt** appears as a gentle "thank you" option, not a checkout wall

### Core User Flows

#### Flow 1: Admin Photo Upload (Sean)
```
Admin Dashboard → Photo Gallery Manager tab
  → Create Event (name, date, sport, location, password)
  → Bulk upload JPGs (drag & drop, multi-select)
  → Photos auto-numbered (EVENT-001, EVENT-002, etc.)
  → EXIF metadata extracted & stored (camera, date, GPS if present)
  → Photos stored in Cloudflare R2 (already configured)
  → Generate shareable link: sswanstudios.com/gallery/{event-slug}
```

#### Flow 2: Parent Gallery Access
```
Header link: "Game Photos" → /gallery
  → Event listing page (cards with cover photo, event name, date)
  → Click event → Modal: "Enter your email + event password"
  → Email captured → GalleryVisitor record created
  → Access granted → Full photo grid with:
    - Thumbnail view (lazy loaded)
    - Lightbox on click (full res)
    - Download button (free, watermark-free)
    - "★ Request Enhancement" button per photo
    - Photo number displayed (matches filename)
```

#### Flow 3: Enhancement Request (FREE — No Gate)
```
Parent clicks "★ Request Enhancement" on photo(s)
  → Enhancement selections build up (selected photo numbers)
  → Submit: "Request Enhanced Versions" button
  → Enhancement request submitted immediately (no payment required)
  → Thank-you screen with OPTIONAL soft prompts:
    "Love what we do? Here are ways to support SwanStudios:"
    Option A: "Know someone who'd love personal training?" → simple referral form (name + phone)
    Option B: "Leave a tip" → Stripe/Venmo/Zelle donation (any amount, $0 OK, suggested $5/$10/$20)
    Option C: Skip — "No thanks, just send my photos!" (equally prominent, no guilt)
  → Admin sees queue of enhancement requests with photo numbers
  → Sean enhances offline, uploads enhanced versions
  → Parent gets email: "Your enhanced photos are ready!" (free download link)
```

#### Flow 3B: Donation Options (All Optional)
```
If parent chooses to donate:
  💳 Card/Apple Pay/Google Pay → Stripe Checkout (any amount, no minimum)
  📱 Venmo → Stripe-native Venmo payment method (any amount)
  🏦 Zelle → Show Sean's Zelle info, parent sends manually, admin verifies later

All donations tracked in admin dashboard for tax/accounting purposes.
Enhancement delivery is NOT gated by donation — photos come regardless.
```

#### Flow 4: Newsletter/Email Marketing
```
Captured emails → bi-weekly newsletter
  - New event announcements
  - SwanStudios training updates
  - Special offers / seasonal promos
  - Unsubscribe link in every email
```

---

### Technical Architecture

#### New Database Models

**GalleryEvent**
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | STRING | "Lakers vs Warriors - March 8" |
| slug | STRING UNIQUE | URL-friendly: "lakers-vs-warriors-march-8" |
| sport | STRING | basketball, soccer, football, etc. |
| eventDate | DATE | When the game happened |
| location | STRING | "LA Fitness Court 3" |
| password | STRING | Simple event password (not hashed — low security, shared verbally) |
| coverPhotoId | INTEGER FK | Points to GalleryPhoto |
| photoCount | INTEGER DEFAULT 0 | Denormalized count |
| isPublished | BOOLEAN DEFAULT false | Admin publishes when ready |
| createdAt/updatedAt | TIMESTAMP | Standard |

**GalleryPhoto**
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | Auto-increment |
| eventId | INTEGER FK | → GalleryEvent |
| photoNumber | INTEGER | Sequential within event (1, 2, 3...) |
| displayName | STRING | "EVENT-001" auto-generated |
| storageKey | STRING | R2 key: "gallery/{event-slug}/{number}.jpg" |
| thumbnailKey | STRING | R2 key for resized thumbnail |
| url | STRING | Public URL or presigned |
| thumbnailUrl | STRING | Thumbnail URL |
| originalFilename | STRING | What was uploaded |
| fileSize | INTEGER | Bytes |
| width | INTEGER | Pixel width |
| height | INTEGER | Pixel height |
| mimeType | STRING | image/jpeg |
| metadata | JSONB | EXIF data (camera, lens, ISO, shutter, GPS) |
| enhancedStorageKey | STRING NULL | R2 key for enhanced version (uploaded later) |
| enhancedUrl | STRING NULL | Enhanced version URL |
| enhancementRequestCount | INTEGER DEFAULT 0 | How many parents want this enhanced |
| createdAt/updatedAt | TIMESTAMP | Standard |

**GalleryVisitor**
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | Auto-increment |
| email | STRING | Parent's email (indexed) |
| firstName | STRING NULL | Optional |
| lastName | STRING NULL | Optional |
| phone | STRING NULL | Optional |
| eventId | INTEGER FK | Which event they accessed |
| newsletterOptIn | BOOLEAN DEFAULT true | Can unsubscribe |
| source | STRING DEFAULT 'gallery' | Lead source tracking |
| referralSubmitted | BOOLEAN DEFAULT false | Did they refer someone? |
| donationAmount | DECIMAL NULL | If they donated |
| createdAt/updatedAt | TIMESTAMP | Standard |

**EnhancementRequest**
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | Auto-increment |
| visitorId | INTEGER FK | → GalleryVisitor |
| photoId | INTEGER FK | → GalleryPhoto |
| status | ENUM | 'requested', 'in_progress', 'completed', 'delivered' |
| completedAt | TIMESTAMP NULL | When admin marked complete |
| deliveredAt | TIMESTAMP NULL | When email sent to parent |
| createdAt/updatedAt | TIMESTAMP | Standard |

**GalleryDonation** (separate from enhancement — donations are optional and independent)
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | Auto-increment |
| visitorId | INTEGER FK | → GalleryVisitor |
| eventId | INTEGER FK | → GalleryEvent |
| amount | DECIMAL | Donation amount (can be 0) |
| method | ENUM | 'stripe', 'venmo', 'zelle' |
| stripePaymentId | STRING NULL | Stripe payment/session ID |
| zelleConfirmed | BOOLEAN DEFAULT false | Admin manually confirms Zelle receipt |
| note | STRING NULL | Optional thank-you note from parent |
| createdAt/updatedAt | TIMESTAMP | Standard |

**GalleryReferral** (separate from enhancement — referrals are optional and independent)
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | Auto-increment |
| visitorId | INTEGER FK | → GalleryVisitor |
| eventId | INTEGER FK | → GalleryEvent |
| referralName | STRING | Name of referred person |
| referralPhone | STRING | Phone of referred person |
| referralEmail | STRING NULL | Email (optional) |
| contacted | BOOLEAN DEFAULT false | Has Sean reached out? |
| converted | BOOLEAN DEFAULT false | Did they book a session? |
| createdAt/updatedAt | TIMESTAMP | Standard |

#### Existing Infrastructure to Leverage

| What | Status | How to Use |
|------|--------|-----------|
| **Cloudflare R2** | Configured | Store gallery photos in `gallery/` prefix |
| **photoStorageService.mjs** | Exists | Extend with gallery category |
| **r2StorageService.mjs** | Exists | Direct R2 upload/presigned URLs |
| **Stripe** | Configured | Donation checkout sessions |
| **sendgridService.mjs** | Exists | Newsletter + enhancement delivery emails |
| **emailTemplates.mjs** | Exists | Galaxy-Swan themed templates |
| **multer** | Configured | File upload middleware |
| **ClientPhoto model** | Exists | Pattern reference for GalleryPhoto |

#### New Backend Routes

```
/api/gallery/events                    GET    — List published events (public)
/api/gallery/events/:slug              GET    — Get event details (public, no photos)
/api/gallery/events/:slug/access       POST   — Verify password + capture email → return token
/api/gallery/events/:slug/photos       GET    — Get photos (requires gallery access token)
/api/gallery/photos/:id/download       GET    — Download full-res (requires access)
/api/gallery/enhancement-request       POST   — Submit enhancement request (FREE, no payment needed)
/api/gallery/donation                  POST   — Optional donation (Stripe checkout session, any amount)
/api/gallery/donation/zelle-confirm    POST   — Parent marks "I sent Zelle" (admin verifies later)
/api/gallery/referral                  POST   — Optional referral submission (name + phone)

/api/admin/gallery/events              CRUD   — Admin event management
/api/admin/gallery/events/:id/upload   POST   — Bulk photo upload (multer array)
/api/admin/gallery/events/:id/photos   GET    — List photos with enhancement stats
/api/admin/gallery/enhancements        GET    — Enhancement request queue
/api/admin/gallery/enhancements/:id    PATCH  — Update status, upload enhanced photo
/api/admin/gallery/visitors            GET    — Email list with lead scoring
/api/admin/gallery/newsletter          POST   — Send newsletter to opted-in visitors
```

#### New Frontend Routes & Components

```
Public:
  /gallery                          — Event listing page
  /gallery/:slug                    — Password gate → photo grid
  /gallery/:slug/photo/:id          — Lightbox deeplink

Admin Dashboard (new workspace tab or sub-section):
  /dashboard/content/gallery           — Gallery Manager
  /dashboard/content/gallery/new       — Create Event
  /dashboard/content/gallery/:id       — Edit Event + Upload Photos
  /dashboard/content/gallery/requests  — Enhancement Request Queue
  /dashboard/content/gallery/leads     — Visitor/Lead Management
```

#### Header Integration
```
Existing header nav → Add "Game Photos" link
  - Visible to everyone (not just logged-in users)
  - Links to /gallery
  - Galaxy-Swan styled badge: "NEW" indicator
```

---

### Security Considerations

1. **Gallery access tokens** — Short-lived JWTs (24h) issued after email+password verification. NOT the same as user auth tokens.
2. **Event passwords** — Simple plaintext (shared verbally at games). NOT hashed — these are convenience passwords, not security passwords.
3. **Rate limiting** — Download endpoints rate-limited (prevent scraping)
4. **Email validation** — Basic format validation, no verification email needed
5. **Donations (optional, multi-method)**:
   - **Stripe** — Checkout session with `mode: 'payment'`, NO minimum (any amount including $0.50+ for Stripe's min, or skip entirely)
   - **Venmo** — Enabled as Stripe payment method (`payment_method_types: ['card', 'venmo']`), processed through Stripe's security
   - **Zelle** — No API; display Sean's Zelle info, parent sends manually, admin verifies receipt in dashboard
   - **All card data handled by Stripe** — server never touches card numbers (PCI DSS compliant)
   - **Donations NEVER gate content** — enhanced photos delivered regardless of donation status
6. **EXIF stripping** — Strip GPS data from served photos for privacy (keep in DB)
7. **COPPA awareness** — Sports photos involve minors; include parental consent checkbox at email capture

### Design Direction (For Gemini 3.1 Pro)

- Galaxy-Swan theme throughout
- Public gallery pages should feel premium but accessible (not "admin dashboard")
- Photo grid: masonry or uniform grid, lazy-loaded thumbnails
- Lightbox: full-screen with arrow navigation, download button, enhancement star
- Password gate: clean modal, email + password fields, SwanStudios branding
- Enhancement cart: slide-out panel showing selected photos
- Mobile-first: 44px touch targets, swipe navigation in lightbox

### Success Metrics

- **Email capture rate**: % of gallery visitors who enter email
- **Enhancement request rate**: % of visitors who request at least one enhancement
- **Referral conversion**: % of enhancement requests fulfilled via referral
- **Donation revenue**: Total donation amount from enhancement requests
- **Newsletter engagement**: Open rate, click rate of bi-weekly emails
- **PT lead quality**: % of referrals that convert to consultations
