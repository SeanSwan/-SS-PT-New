# SwanStudios Avatar Economy Blueprint: XP, SwanCoins, Skins, and Digital Goods

**Status:** Product/economy architecture blueprint  
**Date:** 2026-07-01  
**Branch:** `aura-social-current`

## Core decision

Do **not** make XP the primary spendable currency for avatar clothes, companion skins, rooms, or digital cosmetics.

Use three separate value layers:

1. **XP** — permanent progression and identity.
2. **SwanCoins** — earnable spendable soft currency.
3. **Premium Credits** — optional paid cosmetic currency for future digital goods.

This protects user motivation while still creating a future revenue path.

---

## Why XP should not be spent

XP should represent who the user is becoming:

- level
- rank
- tier
- mastery
- titles
- badge unlock thresholds
- season progress
- social credibility

If users spend XP on avatar clothes and their level progress goes down, they may feel punished for buying cosmetics. That undermines the progression loop.

Instead:

```txt
XP = permanent growth
SwanCoins = earnable spend currency
Premium Credits = optional paid currency
```

---

## SwanCoins

SwanCoins are the main in-app soft currency.

Earned through:

- workout completion
- streak maintenance
- onboarding completion
- challenge completion
- positive social actions
- referrals after validation
- event participation
- nutrition consistency
- trainer-approved milestones

Spent on:

- avatar clothes
- companion accessories
- room furniture
- MY SPACE decorations
- profile frames
- aura effects
- badge display shelves
- background cards
- seasonal cosmetic recolors

SwanCoins should be rate-limited and fraud-resistant, but not as strict as real-money credits.

---

## Premium Credits

Premium Credits are future paid or high-value grant currency.

Used for:

- premium avatar skins
- limited seasonal outfits
- companion evolution skins
- creator cosmetic drops
- trainer-branded packs
- founder cosmetics
- digital collectible bundles

Rules:

- Never imply Premium Credits improve fitness results.
- Avoid pay-to-win for leaderboards.
- Paid cosmetics should be expressive, not competitive stat boosts.
- Any real-money purchase must go through the approved storefront/checkout path.

---

## Reward balance philosophy

### Repeated actions

Small repeated actions earn small XP and small SwanCoins.

Examples:

- supportive reaction
- short comment
- daily login
- daily hydration log
- routine workout log

### Meaningful actions

Medium actions earn more.

Examples:

- workout completion
- meaningful progress post
- completed challenge tier
- trainer-approved PR
- referral that signs up

### Rare/high-value actions

Rare actions can unlock badges, titles, cosmetics, or real-world rewards.

Examples:

- first paid package
- 10 paid sessions completed
- 90-day streak
- 1-year transformation
- verified referral who becomes a paying client
- corporate wellness team challenge win

---

## Unity Weaver economy role

Unity Weaver / Swan Aura should only award economy value when a real action succeeds.

No XP or SwanCoins for:

- opening the app repeatedly in a short window
- clicking a CTA without completing the action
- spamming comments
- self-liking
- fake reports
- duplicate messages
- engagement bait

Possible future awards:

| Action | XP | SwanCoins | Notes |
|---|---:|---:|---|
| Encourage a friend | 8 | 2 | Rate limited; no self-awards |
| Welcome a new member | 10 | 3 | Recipient account age limit |
| Gratitude comment | 6 | 2 | Meaningful text only |
| Honest progress post | 12 | 4 | No body-shaming; cooldown |
| Challenge cheer | 8 | 2 | Must be connected to challenge |
| Confirmed helpful tip | 15 | 5 | Requires validation |
| Confirmed safety report | 10 | 3 | Award only after moderation confirms |

---

## Digital goods catalog structure

Future digital items should use a structured catalog:

```ts
interface DigitalCosmeticItem {
  id: string;
  sku: string;
  name: string;
  itemType: 'avatar_clothing' | 'companion_skin' | 'room_item' | 'profile_frame' | 'aura_effect' | 'badge_shelf';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'pearlescent';
  priceSwanCoins?: number;
  pricePremiumCredits?: number;
  unlockRequirement?: {
    level?: number;
    badgeId?: string;
    seasonId?: string;
    challengeId?: string;
    paidPackageSku?: string;
  };
  isTradeable: false;
  isLimitedTime: boolean;
  startsAt?: string;
  endsAt?: string;
  assetUrl: string;
  thumbnailUrl: string;
}
```

---

## First MVP implementation path

1. Keep XP as progression only.
2. Add SwanCoin ledger later, separate from `PointTransaction` if needed.
3. Add read-only catalog of digital cosmetics.
4. Add unlock-only cosmetics first before paid cosmetics.
5. Add MY SPACE inventory display.
6. Add storefront purchase path for premium cosmetics only after checkout rules are stable.
7. Add avatar/companion equip slots.
8. Add seasonal cosmetics and creator drops.

---

## Hostile review checklist

Before implementing spendable cosmetics:

1. Does buying an item reduce XP or level? If yes, reject.
2. Can users farm currency with fake comments/reactions? If yes, fix limits.
3. Can paid cosmetics improve leaderboard advantage? If yes, reject.
4. Is every paid item routed through checkout? If no, block.
5. Are refunds/reversals handled? If no, block real-money sales.
6. Are minors protected from exploitative pricing? If no, block.
7. Is rarity honest and not misleading? If no, revise.
8. Are digital goods accessible and not only visually meaningful? If no, add text/title alternatives.
9. Can users preview before purchase? If no, improve UX.
10. Is inventory ownership auditable? If no, add ledger/inventory records.

---

## Brand framing

SwanStudios cosmetics should feel earned, joyful, and expressive — not predatory.

Plain-language promise:

> Level up through real healthy action. Earn SwanCoins through discipline and good energy. Customize your Swan world with cosmetics that celebrate who you are becoming.
