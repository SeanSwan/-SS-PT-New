# Mobbin P/I/S/D/X Upgrade - Independent Opus Review Packet

## Scope and independence

Review the uncommitted Swan Design Brain external-reference upgrade on `codex/mobbin-protocol-v3-20260725`. No prior verdict or restricted source/user data is included. Do not infer missing facts.

Goal: bounded research value without source retention, reconstruction, evidence laundering, automatic canon mutation, or silent context expansion.

## Implemented model

- P - Probe: exactly one query/result; durable log contains only timestamp, connector label, and availability; rolling 90-day retention.
- I - Inspect: one named task/surface/job/question; maximum 3 queries, 10 viewed results, and 3 products; no durable source or learning write; task context expires.
- S - Spec: optional original text-only Swan Design Intent Record (SDIR); ships `enabled:false`; one per task, three/day, forty/quarter, two per surface per 30 days.
- D - Doctrine: Sean-only canon edit, requiring Swan-owned trial evidence; scripts and agents cannot promote doctrine.
- X - Source corpus: Mobbin-derived source retention is blocked unless a written clearance record names source, scope, terms basis, actor, and decision type.

Legacy letters map only for migration: H to P, T to I plus S, L to D plus X. They do not grant authority.

## S-mode controls

An SDIR is original Swan implementation intent, not evidence. It must contain exactly seven states (default, loading, empty, success, error, disabled, offline) and responsive behavior for 320, 375, 414, 768, 1024, 1440, 2560, and 3840 widths.

ART controls:

1. ART-1 rejects off-token colors and spacing.
2. ART-2 rejects outside proper nouns and long quoted runs.
3. ART-3 enforces cross-category disclosure.
4. ART-4 rejects source-comparison phrasing.
5. ART-5 rejects tokens that can reverse-map to live attestation detail.

Every SDIR is permanently `corroborationEligible:false` and `doctrineEligible:false`. The spec emitter revalidates before writing to a separate `design-specs` collection and verifies that `design-claims` bytes remain unchanged. No Mobbin-informed visual Spec Sheet is created.

Inspect attestation detail is redacted after 14 days to a salted non-source stub. The protocol forbids durable screenshots, image bytes, URLs, deep links, HTML/CSS/SVG, copied copy, source measurements, product/screen identifiers, or reconstruction hints.

## Source-corpus and novelty controls

Receipt writers require `sourceClass` to be one of owned, synthetic, licensed, or mobbin. Missing classification fails closed. Mobbin classification fails with `E_SOURCE_CLASS_BLOCKED` unless exact clearance validates. Mobbin-classed events are excluded from novelty calculation and cannot corroborate claims.

Probe/Inspect availability does not activate Spec or Source-corpus modes. General design requests and connector payment are explicitly insufficient activation authority.

## Current verification

- Full Design Brain suite: 67/67 passed.
- Hostile repair added a regression test for omission-based source-class laundering.
- Syntax checks: `spec-contract`, `provenance`, `log-spec`, `log-receipt`, `novelty`, and `emit-vault` clean.
- `git diff --check`: clean.
- No paid model call, connector research call, commit, push, deploy, screenshot, or source-media artifact occurred in this implementation pass.

Key artifact SHA-256 receipts:

- protocol: `f134399df26baaa5e58e50e6e6b61f05c5c2490ee2b4d49efe910e59c6086ad6`
- operator README: `f16188d42bf673dcae3ae5e6b9f46ad2830e3694fa757e699fd3908159759eae`
- SDIR contract: `4430172f843bad7d26fd18cab402fe4b6d791bb0430b1465aef348a85611666a`
- novelty regression: `e017106edbdfe68542bfbd0bf6ad9ea874986bd6bfc721ab7bb1ac99a073a0f7`
- provenance regression: `e46fc022447531162643c8fa7ff3092619bd1650c5196bb1ed6ab002906107f4`
- dated risk decision: `bcc8213166941ee5ae62cb0f166c6bbfb393f4a5194eefc0618ae77ed2d49a83`
- clarification request: `405596aa70a583da557e3ba4dae89f132bf6a098698722fdb7043d16fda98ec1`
- disabled kill switch: `c5b2651bf9c12feab00e13eee5055e4a94a0f750a7313c4b88cd0c1a5d64c2d1`

## Review questions

1. Does P/I/S/D/X create a defensible separation of transient research, original specification, Swan-owned doctrine, and forbidden source retention?
2. Can any path launder Mobbin-derived material into `design-claims`, novelty, corroboration, doctrine, or an external-model prompt?
3. Are salted 14-day attestation stubs and 90-day probe logs minimized enough, or do they retain avoidable source identity?
4. Are the ART controls meaningful against reverse reconstruction, or mostly lexical theater that can be bypassed by paraphrase, structure, ordering, or measurements?
5. Does separate `design-specs` retrieval still create practical copyright, contract, or provenance risk even with eligibility flags?
6. Are clearance validation and human authority boundaries fail-closed under malformed, omitted, stale, or conflicting records?
7. What tests or operational controls are missing before S could ever be enabled?

## Required output

Return: VERDICT (`APPROVE`, `APPROVE-WITH-GATES`, or `REVISE`); severity-ranked findings with exploit/failure paths; strongest counterargument; required fixes versus optional hardening; a revised architecture only where necessary; validation plan; explicit activation recommendation for S; and a list of information that must never be sent to an external model.

Treat legal conclusions as questions for qualified counsel, not engineering certainty. Repository governance, privacy rules, and human authority remain binding.
