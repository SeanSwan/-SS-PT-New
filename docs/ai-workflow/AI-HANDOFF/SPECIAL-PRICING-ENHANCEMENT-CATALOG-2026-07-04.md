# Special Pricing / Bonus Sessions — Enhancement Idea Catalog

**Date:** 2026-07-04 · **Source:** orchestration workflow (6 domain data-miners across all 193 models → 7 strategic idea-lenses → adversarial dedup/rank/prune). **92 raw ideas → 51 survivors, 7 cut.** ~1.07M tokens of mining/reasoning distilled.
**Companion:** `SPECIAL-PRICING-FABLE-REVIEW-PACKET-2026-07-04.md` (the build spec) · Intent doc: `docs/ai-workflow/brainstorms/special-pricing-bonus-sessions-2026-07-04.md`
**Hard constraint on every idea:** the **$175/session sticker never drops** — value flows as bonus sessions / status perks / disclosure only. Every idea is grounded in a real `Table.column` and must strengthen coaching / adherence / progress / community / revenue / trust (rule 62). Anything failing that is in the Cut List.

---

## TOP 10 (must-do, ranked)
1. **Effective-Rate Floor Guardrail** — every bonus grant recomputes the client's *blended* effectiveHourlyRate and hard-blocks below $100/hr ($100–120 → approval gate). The safety prerequisite; generosity can never erode the $175 anchor or trainer commission. `CustomPackage.effectiveHourlyRate/belowThresholdApproved`
2. **Offer-Propensity Suggestion Inbox** — nightly job fuses churn/tier/attendance/lead signals into a 0–100 score, pre-drafts a targeted special per client, ranks as one-tap-approve cards. Makes the whole engine one-click. `RenewalAlert.urgencyScore + Gamification.currentTier + Session.attendance_status + Lead.score`
3. **Client Session Ledger (paid vs bonus)** — reconciled, provenance-labeled running balance; Sean's trust-first spine. `TrainerCommission.sessionsGranted/Consumed + CustomPackage.paid/bonusSessions + User.availableSessions`
4. **One-Tap EFT Pause/Cancel** — actually stops the Stripe subscription (not a local flag), writes a "withdrawn" consent row. Prevents the worst trust breach. `Subscription.status/stripeSubscriptionId + AiConsentLog`
5. **Urgency-Scored Renewal Bonus Ladder** — the core churn-save; wires the already-computed urgencyScore (which only pings staff today) into an automated full-sticker win-back. `RenewalAlert.* + AdminSpecial.bonusSessions`
6. **Points → Bonus-Session Redemption Store** — activates the fully-built but unused loyalty ledger; points redeem for bonus sessions on top of full-price packs. `User.points + PointTransaction.balance + Reward.pointCost + UserReward`
7. **Milestone-Celebration Renewal Bonus** — ties verified body-progress proof to the renewal moment (highest-conversion emotional peak), renews at full $175. `MeasurementMilestone.triggersRenewalConversation + BodyMeasurement.isVerified`
8. **Two-Sided Referral Bonus Session** — turns the existing unrewarded referral graph into acquisition whose cost is future capacity, both parties still at $175. `Lead.referredByUserId/convertedUserId + GalleryReferral.converted + WaiverRecord + Friendship`
9. **Prepay Volume → Bonus-Session Ladder** — bigger prepaid packs earn more bonus sessions, pricePerSession pinned $175; lifts AOV. Cleanest revenue win, S effort. `AdminSpecial.bonusSessions + StorefrontItem.totalSessions/pricePerSession`
10. **Idle-Capacity Bonus-Session Auto-Fill** — steer bonus sessions into unbooked trainer blocks so every giveaway costs dead inventory, not cash. Margin multiplier. `TrainerAvailability + Session.status='available'`

---

## Theme 1 — Margin Guardrails & Governance Spine (BUILD FIRST — everything rides on these)
| # | Idea | What it does | Powered by | Payoff | Effort |
|---|---|---|---|---|---|
|1|Effective-Rate Floor Guardrail|Recompute blended effective rate on every grant; hard-block <$100/hr, gate $100–120|`CustomPackage.effectiveHourlyRate/belowThresholdApproved/pricePerSession/paid+bonusSessions`|revenue+trust|M|
|2|Bonus-Session Margin Cockpit|Admin view of realized effective rate + outstanding bonus liability + floor-breach approvals across all specials|`CustomPackage.* + BusinessMetrics.avgOrderValue/refundRate + AdminSpecial.bonusSessions`|trust|M|
|3|Consent-Logged Special Audit Trail|Each issued special writes an immutable audit row (what/whom/size/approver/rate/override) — dispute-proof, esp. EFT|`AiConsentLog.action/sourceType/actorUserId + AdminSpecial.assignedClientIds + CustomPackage.belowThresholdApproved`|compliance|S|

## Theme 2 — Retention & Churn-Save Triggers (real signals → timed bonus saves, sticker fixed)
| # | Idea | What it does | Powered by | Payoff | Effort |
|---|---|---|---|---|---|
|1|Urgency-Scored Renewal Bonus Ladder|Escalate bonus sessions as churn urgencyScore climbs; richest save at score 8–10 + ≤1 session left|`RenewalAlert.urgencyScore/sessionsRemaining/status + AdminSpecial.bonusSessions`|retention|M|
|2|Zero-Balance Dormancy Reactivation|Balance hits 0 + goes quiet → dispute-proof win-back adds bonus to refill; EFT opt-in logs consent|`User.availableSessions/lastActive/sessionBillingMode + AiConsentLog`|retention|M|
|3|Use-It-Or-Lose-It Expiry Rescue|Before granted-minus-consumed gap expires, offer window extension + 1 bonus if they book in X days|`TrainerCommission.sessionsGranted/Consumed + CustomPackage.expiresAt`|retention|M|
|4|No-Show / Late-Cancel Goodwill Save|First no-show → trainer-authorized "next one's on us" instead of a punitive charge|`Session.attendance_status/cancellation_charge_type/session_date`|retention|S|
|5|Trainer Red-Flag Save Lever|Unresolved concern/red_flag note w/ due follow-up → one-tap permission-gated save special in trainer console|`ClientNote.noteType/followUpDate/isResolved/severity + TrainerPermissions.is_active`|coach-eff|M|
|6|Comeback Bonus Scaled by Days Missed|Completing a welcome-back challenge grants reactivation bonus sized to time gone (sub-linear, capped)|`ComebackChallenge.daysMissed/type/status/completedWorkouts + RenewalAlert.urgencyScore`|retention|M|
|7|Burn-Rate Early Churn Radar|Detect decaying session cadence before balance empties; pre-stage win-back earlier than zero-balance|`WorkoutSession.date/status trend + User.availableSessions`|coach-eff|M|
|8|Streak-Break Rescue (freeze + bonus)|At-risk streak, no freezes left → one-time freeze + comp session if they log/book in 72h|`Streak.currentCount/longestCount/freezesRemaining`|retention|S|
|9|Contacted-Not-Renewed Last-Touch|Stuck in status='contacted' → one final same-day bonus offer before dismissal (capped)|`RenewalAlert.status/daysSinceLastSession`|retention|S|
|10|Abandoned-Renewal-Cart Rescue|Session pack stuck in pending_payment → single "finish now +1 bonus" nudge|`ShoppingCart.status/lastActivityAt`|revenue|S|

## Theme 3 — Progress & Milestone Celebration (proof-of-value → renewal at the emotional peak)
| # | Idea | What it does | Powered by | Payoff | Effort |
|---|---|---|---|---|---|
|1|Milestone-Celebration Renewal Bonus|Verified body-progress milestone flags renewal → auto-attach celebration bonus to full-price renewal|`MeasurementMilestone.triggersRenewalConversation + BodyMeasurement.isVerified/method`|retention|M|
|2|Milestone-Moment Bonus (100th workout / 30-day streak)|Crossing a built-in workout milestone drops a celebratory bonus + deep-linked booking notification|`WorkoutSession.isMilestone/milestoneType/experiencePoints`|engagement|S|
|3|PR-Credit Accrual → Bonus Session|Each PR set drops a stackable credit; collect N → auto-convert to a bonus session|`Set.isPR/weightUsed/repsCompleted + PointTransaction.source/balance`|engagement|M|
|4|Membership-Anniversary Loyalty Bonus|"X months a member" auto-grants an anniversary bonus at 6/12/24-mo tenure|`UserMilestone.reachedAt + Milestone.name/tier + User.isActive`|retention|S|

## Theme 4 — Gamification & Loyalty Currency (activate the dormant points/streak/achievement ledgers)
| # | Idea | What it does | Powered by | Payoff | Effort |
|---|---|---|---|---|---|
|1|Points → Bonus-Session Redemption Store|Publish a "session" Reward SKU priced in points; redeem (idempotent) → bonus on top of full-price pack|`User.points + PointTransaction.balance/idempotencyKey + Reward.pointCost/rewardType + UserReward`|engagement|M|
|2|Streak-Tier Bonus Ladder|30/90/365-day streaks (+ Bronze→Platinum tier) mint escalating bonus sessions|`Streak.* + Gamification.currentTier + AdminSpecial.bonusSessions`|engagement|M|
|3|Wire Dormant Achievement 'discount' Rewards → Bonus Sessions|Achievement schema already models rewardType='discount' but nothing consumes it → reinterpret as rarity-scaled bonus sessions|`Achievement.rewardType/rewards/rarity/businessValue + UserAchievement.isCompleted`|engagement|M|
|4|Loyalty-Tier Perk Sheet (status, not price)|Map tiers to permanent NON-price perks (monthly bonus quota, priority booking, extra freezes)|`Gamification.currentTier/level/totalXP + ClientProgress.overallLevel`|retention|L|
|5|Points-Funded Streak-Freeze Token Shop|Spend points on streak-freeze tokens — pure loyalty sink that deepens daily adherence|`Streak.freezesRemaining + Reward.rewardType/pointCost + PointTransaction`|engagement|S|
|6|Scarcity Bonus-Session SKUs in Points Store|Limited-stock, time-boxed bonus-session rewards create urgency to spend accrued points|`Reward.stock/expiresAt/tier/pointCost + UserReward.status/expiresAt`|engagement|S|
|7|Perfect-Attendance Reliability Bonus|Reward clean no-show/late record with an earned bonus; withhold from chronic no-shows|`Session.attendance_status/rating/cancellation_decision`|trust|M|
|8|Badge-Collection Completion Bonus Bundle|Finishing a small badge set (3–5) unlocks a "collector" bonus bundle|`Badge.criteria/rewards + Achievement.category/rarity + UserAchievement.isCompleted`|engagement|M|

## Theme 5 — Acquisition & Referral Virality (grow the roster on comped/bonus capacity, sticker held)
| # | Idea | What it does | Powered by | Payoff | Effort |
|---|---|---|---|---|---|
|1|Two-Sided Referral Bonus Session|Referred friend's first paid pack clears → both get a bonus session; vest on cleared Order + linked waiver|`Lead.referredByUserId/convertedUserId + GalleryReferral.converted + Order.completedAt + WaiverRecord + Friendship`|virality|M|
|2|Gift a Session to a Friend|Client gifts a comped intro from their account to an accepted friend; redeemable only by a net-new account|`Friendship.status + AdminSpecial.bonusSessions + User.availableSessions/accountStatus`|virality|M|
|3|Waiver-Gated Gift/Special Redemption|Gifted/comped session stays pending until a linked non-revoked waiver exists — signing IS redemption (incl. guardian-signed minors)|`WaiverRecord.status/activityTypes/submittedByGuardian + WaiverConsentFlags.liabilityAccepted`|trust|M|
|4|Orientation / Onboarding Fast-Start Bonus|Orientation/questionnaire flips to completed → first-package bonus offer segmented by goals/experience|`Orientation.status/experience_level/training_goals + ClientOnboardingQuestionnaire.commitmentLevel`|acquisition|M|
|5|Warm-Lead Trial Trigger|Qualified lead crossing score threshold + engagement → comped intro via consented channel, not a cold call|`Lead.score/status/nextFollowUpAt/smsConsentStatus + LeadActivity.type + AutomationSequence`|acquisition|M|
|6|Event-Gallery Trial Drop|Event-gallery visitor claims account / at photo-delivery peak → short-window comped intro tied to the event|`GalleryVisitor.userId/eventId/newsletterOptIn + EnhancementRequest.status/deliveredAt + AdminSpecial`|acquisition|M|
|7|Trainer's Circle Intro Offer|Permissioned trainer issues a comped intro to a personally-brought prospect, booked against the stored commission split|`TrainerCommission.leadSource/trainerCut + TrainerPermissions.permission_type/is_active`|acquisition|M|

## Theme 6 — Prepay Depth & Margin-Aware Sizing (grow AOV/LTV, concession is future capacity)
| # | Idea | What it does | Powered by | Payoff | Effort |
|---|---|---|---|---|---|
|1|Prepay Volume → Bonus-Session Ladder|Bigger prepaid packs earn more bonus sessions; pricePerSession pinned $175|`AdminSpecial.bonusSessions + StorefrontItem.totalSessions/pricePerSession + CustomPackage.paid/bonusSessions`|revenue|S|
|2|Idle-Capacity Bonus-Session Auto-Fill|Compute available-block-minus-booked and steer bonus scheduling into gaps first — giveaway costs dead inventory|`TrainerAvailability(day/start/end/type) + Session.status='available'/trainer_id`|revenue|L|
|3|Margin-Aware Bonus Sizing by Lead Source|Bonus ceilings by who owns margin — deeper on platform leads, lighter on trainer-brought; show trainer_cut impact|`TrainerCommission.leadSource/business_cut/trainer_cut/isLoyaltyBump`|revenue|M|
|4|Prepay-the-Mesocycle Bonus|Prepay a full NASM block at $175/session with +1 bonus on block completion|`ProgramMesocycleBlock.duration_weeks × sessions_per_week + CustomPackage.paid/bonusSessions/expiresAt`|revenue|M|
|5|Consent-Logged Auto-Refill (EFT) Loyalty Bonus|Opt-in recurring billing at full $175 with a periodic bonus for staying enrolled; enrollment logs consent|`AiConsentLog.action + User.sessionBillingMode + Subscription.stripeSubscriptionId + SessionPackage.packageType`|revenue|L|

## Theme 7 — Client Trust & Billing Transparency (Sean's ordering: trust > EFT)
| # | Idea | What it does | Powered by | Payoff | Effort |
|---|---|---|---|---|---|
|1|One-Tap EFT Pause/Cancel (no dark patterns)|One tap flips Subscription.status AND cancels the real Stripe sub, logs "withdrawn", returns a receipt|`Subscription.status/stripeSubscriptionId + AiConsentLog.action`|retention|M|
|2|Client Session Ledger (paid vs bonus, running balance)|Line-item every credit as paid/bonus w/ live balance, reconciled against grant/consume counters|`TrainerCommission.sessionsGranted/Consumed + CustomPackage.paid/bonusSessions + User.availableSessions`|trust|M|
|3|EFT Consent Receipt (immutable enrollment proof)|Each sign-up writes signed consent row + plain-language receipt (amount/cadence/method/first-charge) in the same txn as the Stripe sub|`AiConsentLog.action/sourceType/metadata + Subscription.stripeSubscriptionId/paymentMethod`|compliance|M|
|4|Next-Charge Transparency Card|Before every recurring charge, show upcoming-charge card — date from Stripe truth, amount, method, one-tap pause|`Subscription.* + Notification.type`|retention|M|
|5|Bonus-Session Provenance Labels|Every bonus session shows WHY (milestone / special / loyalty / points) — never a mystery freebie|`AdminSpecial.bonusSessions + CustomPackage.bonusSessions + PointTransaction.source`|trust|S|
|6|Special Expiry Countdown + Auto-Manage Shelf|Real start/end window + local-tz countdown; auto-flip to visible "expired"; "expiring in 48h" extend/lapse shelf|`AdminSpecial.startDate/endDate/isActive + CustomPackage.expiresAt/status`|trust|S|
|7|Self-Serve Transaction & Refund Trail|Client sees each txn status/net/fees/refunds, hard-scoped to their rows, w/ "question this charge" → admin note|`FinancialTransaction.status/netAmount/feeAmount/refundAmount/stripePaymentIntentId`|trust|M|
|8|Channel-Consented Offer Delivery|Offers go only through opted-in active primary channel (SMS gated on smsConsentStatus); missing consent fails closed|`NotificationSettings.notificationType/isPrimary/isActive + Lead.smsConsentStatus`|compliance|S|
|9|'Never Double-Charged' Idempotency Audit|Surface idempotency protection as a client guarantee, backed by a real nightly duplicate-charge scan + auto-refund|`Order.idempotencyKey/completedAt + PointTransaction.idempotencyKey`|trust|S|
|10|Price-Lock Transparency|Show price locked at add-time, charge lower of locked-vs-current, honor drops with a shown credit line|`CartItem.price + OrderItem.price/subtotal`|trust|S|
|11|Re-Consent on Terms Change (versioned)|Waiver/terms change w/ requiresReconsent → EFT/booking pauses until re-acknowledged against exact new version|`WaiverVersion.requiresReconsent/version/textHash + AiConsentLog.action`|compliance|M|

## Theme 8 — Admin-Ops Efficiency (the system suggests; admin approves in one tap)
| # | Idea | What it does | Powered by | Payoff | Effort |
|---|---|---|---|---|---|
|1|Offer-Propensity Suggestion Inbox|Nightly fuse churn+tier+attendance+lead intent into 0–100 score, pre-draft targeted special, rank one-tap-approve cards|`RenewalAlert.urgencyScore + Gamification.currentTier + Session.attendance_status + Lead.score → AdminSpecial`|coach-eff|L|
|2|Bulk Cohort Targeting from One Screen|Multi-select a cohort (tier/trainer/streak/urgency/dormancy) → fire one time-boxed special to all, shared bonus+expiry|`AdminSpecial.assignedClientIds/bonusSessions/dates + Gamification.currentTier + Streak.currentCount`|coach-eff|S|
|3|Special Performance Scoreboard (reuse winners)|Join closed order outcomes back to the AdminSpecial that drove them; rank by conversion+margin; "clone this special"|`BusinessMetrics.topPackageId/revenue/refundRate + AdminSpecial.isActive + CustomPackage.status`|coach-eff|M|

---

## Cut List (pruned, with reasons)
| Idea | Why cut |
|---|---|
|Fee-Saved → Bonus-Session Credit|Gameable via split payments; margin/accounting ambiguity for marginal payoff — prepay & points ladders deliver the same benefit more cleanly.|
|Look-Alike Churn/Upsell ML Targeting|Depends on UserSimilarity/AIRecommendations vectors almost certainly unpopulated at ~40–70 clients; opaque targeting = fairness/privacy risk at L effort. The deterministic propensity inbox already covers it.|
|Creator Ambassador Guest Passes|Influencer/creator-economy program is a different business from trainer-led coaching; batch-comping creators is scope-creep.|
|Bring Your Squad (group onboarding)|Needs populated ChallengeTeam infra + heavy captain-bonus abuse surface at L effort; two-sided referral covers it.|
|Supporter Intro Credit (donation→trainee)|A small event donation is weak training-intent evidence; niche, low conversion.|
|Content-Drift Re-Engagement Special|Video watch-history decay is a noisy churn proxy; burn-rate + zero-balance triggers use real session behavior.|
|Share-a-PR, Unlock a Guest Pass|GoalLike thresholds trivially farmed by friends; redundant with "Gift a Session to a Friend."|

---

## How the catalog maps onto the build (integration note)
- **Theme 1 (Margin Guardrails) folds into build slice S1** — the Effective-Rate Floor Guardrail + audit trail are the safety spine the whole system rides on; they belong with the core, not "later."
- **The Client Session Ledger (Theme 7 #2) is build slice S5** — and Themes 4/5 (loyalty redemption, gifting) depend on it, confirming the ledger-first sequencing.
- **The Suggestion Inbox (Theme 8 #1)** is the highest-leverage automation but L-effort — a dedicated later slice after the core ships.
- **Theme 7 (11 trust ideas)** operationalizes Sean's "trust > EFT" mandate and should gate the EFT slice (S6): no auto-billing without consent receipt + one-tap cancel + next-charge card.
- **Everything here preserves the $175 sticker** — the ideas are the *generosity levers*; the guardrail is what keeps them safe.
