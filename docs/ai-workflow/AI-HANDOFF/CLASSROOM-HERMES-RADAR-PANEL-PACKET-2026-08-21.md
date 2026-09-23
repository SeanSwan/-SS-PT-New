# Classroom Hermes + Radar — Five-Model Review Packet

**Date:** 2026-08-21  
**Owner:** Codex planning lane  
**Status:** REVIEW PACKET — public and synthetic context only  
**Purpose:** Obtain independent, adversarial recommendations before installing a teacher-owned Hermes profile on an Apple Silicon Mac or connecting it to family-controlled AI infrastructure.  
**Privacy classification:** CLOUD-ELIGIBLE SANITIZED PACKET. It contains no child names, family names, home address, credentials, private messages, client records, IP addresses, hostnames, or secrets.

## 1. Decision Needed

Design and hostile-review a usable, privacy-first assistant ecosystem for an educator responsible for a classroom of two-year-old children. The system must reduce planning burden, improve developmentally appropriate teaching ideas, support routine-based toilet learning without coercion, surface affordable classroom materials, and remain simple enough to become a daily habit.

The reviewers must decide what belongs in the immediate Mac/Hermes installation, what belongs in the radar/SwanGuard integration, what must remain local-only, and what should be deferred.

## 2. Human and Product Goal

The educator gets her own Hermes brain, memories, sessions, skills, credentials, schedules, and interface on her Apple Silicon Mac. She is not borrowing another person's agent or memory.

She is fully authorized to use the family-controlled SwanGuard application and its research library. A separate trusted identity is still required for device revocation, audit history, and recovery; it must not reduce her permissions.

Success is not “more AI.” Success means:

1. Useful ideas arrive before she needs them.
2. Plans are appropriate for two-year-olds, adaptable, safe, inclusive, and realistically executable.
3. The assistant never turns normal developmental variation into diagnosis or punishment.
4. Student-specific information does not reach external model providers.
5. The daily workflow is faster than searching Pinterest, social feeds, and teacher sites manually.
6. The system clearly separates verified sources, generated suggestions, and teacher decisions.

## 3. Confirmed Architecture Intent

- **Teacher Mac:** her Hermes profile, local memory, local classroom notes, local drafting, and local inference when the hardware permits it.
- **Private GPU server:** an always-on, family-controlled high-end NVIDIA workstation provides Qwen 3.8 27B inference over an authenticated private overlay. It is never exposed as a public Ollama endpoint.
- **Radar station:** a separate always-on research computer finds public educational resources, seasonal ideas, merchant offers, community resources, and reusable inspiration. It is the hands/research worker, not the final reasoning authority.
- **SwanGuard:** the shared, family-controlled application and canonical opportunity library. Both authorized adults have full access.
- **External reviewers:** selected cloud models may critique sanitized plans only through a fail-closed outbound privacy broker. They never receive raw classroom notes, rosters, child-specific observations, credentials, or private family/client data.
- **Human authority:** the educator chooses what enters the classroom. AI suggestions do not autonomously contact families, purchase products, change schedules, or create child records.

## 4. Two-Year-Old Teaching Baseline

The plan must be anchored to infant/toddler guidance rather than curricula intended for four- or five-year-olds.

### Developmental domains

- responsive relationships and emotional security;
- expressive/receptive language and back-and-forth conversation;
- identity, belonging, peer interaction, turn-taking, and asking for help;
- curiosity, cause-and-effect, matching, sorting, simple problem-solving, and pretend play;
- gross motor movement, balance, throwing/kicking, simple action songs, and safe active play;
- fine motor exploration using age-safe, non-choking materials;
- self-help routines: eating with utensils, handwashing, dressing participation, cleanup, and toilet-learning readiness;
- sensory exploration with explicit allergy, ingestion, sanitation, and choking checks;
- individualization for disability, dual-language development, temperament, culture, and family preferences.

### Required teaching doctrine

- joyful, strengths-based, play-based learning;
- short embedded learning opportunities inside real routines and transitions;
- predictable visual routines with flexibility for individual needs;
- simple language, modeling, repetition, choices, songs, movement, and concrete materials;
- observe -> interpret cautiously -> adapt environment or support -> document only what is necessary;
- no forced group performance, shame, public behavior ranking, or diagnostic claims;
- screen output is primarily for the teacher; it must not replace child-adult interaction.

### Toilet-learning doctrine

- readiness varies; chronological age alone is not the gate;
- coordinate with the child's authorized representative and the school's written policy/plan;
- notice body-awareness, communication, mobility, clothing, willingness, and dry-period signals;
- use neutral language, predictable opportunities, easy clothing, modeling, and encouragement;
- never punish, shame, force prolonged sitting, promise medical outcomes, or treat accidents as misconduct;
- preserve sanitation, supervision, incident escalation, and family/medical referral boundaries.

## 5. Radar Research Mission

The geographic anchor is a public preschool campus in Anaheim, California 92807. The radar uses the campus area—not a private residence—as the local-search origin.

The radar is not primarily a field-trip engine. Its high-value jobs are:

1. Find age-appropriate classroom activity and design ideas tied to the week, weather, season, curriculum theme, and available materials.
2. Find utensils, art tools, storage, manipulatives, dramatic-play materials, books, sensory equipment, and consumables at good prices.
3. Compare teacher stores, craft stores, discount stores, reuse organizations, merchant sales, and school-approved vendors.
4. Maintain human-approved saved-search queues for secondhand goods.
5. Flag safety and hygiene concerns for used items: recalls, broken/missing pieces, cleanability, lead/paint risk, fabric pests, choking hazards, tip-over risk, and seller/pickup safety.
6. Produce a short daily digest and a more complete weekly planning board.

### Marketplace boundary

Meta, OfferUp, and Craigslist restrict unauthorized automated collection. Do not recommend covert scraping, CAPTCHA evasion, account sharing, proxy rotation, or automated seller messaging.

Design a compliant alternative using some combination of:

- platform-native saved searches and notifications;
- teacher-created wish lists and search terms;
- email notification ingestion where the platform permits it;
- user-opened browser review with explicit approval;
- merchant feeds, public product pages, newsletters, and authorized APIs;
- manual “save to SwanGuard” capture;
- price/condition scoring after the user supplies a listing link;
- no purchase or seller contact without a human action.

## 6. Daily and Weekly Experience to Critique

### Daily briefing target: under three minutes

- Today’s classroom rhythm and likely pressure points.
- One primary activity, one movement option, and one calm transition idea.
- Materials already available plus a substitute list.
- A two-minute setup version and a richer version.
- Developmental domains supported and observable signs—without grading children.
- Safety/allergy/choking/sanitation checks.
- One optional local deal or reusable-material lead.
- Confidence, source links, and “why this fits two-year-olds.”

### Weekly planning target: under twenty minutes

- Five flexible day cards aligned to the school calendar and teacher-selected themes.
- Repeated core routines with small variations rather than five unrelated spectacles.
- Language prompts, movement, sensory/art, books/songs, pretend play, and self-help opportunities.
- Adaptations for different communication, mobility, sensory, and participation needs.
- Supply inventory and shopping plan separated into must-have, substitute, borrow/free, and optional.
- Teacher feedback loop: used / adapted / skipped / children engaged / setup too hard / revisit.

## 7. Privacy and Security Gate

Current evidence shows multiple partial sanitizers but does **not** yet prove a universal fail-closed egress boundary. Review this proposed gate as mandatory before any student-specific cloud use:

1. One outbound broker below every cloud provider, research agent, transcription path, attachment/OCR path, AI Village call, and tool-result callback.
2. Default deny. Missing roster, unavailable policy, parse failure, sanitizer exception, unknown content type, or unclassified attachment blocks the request.
3. Remove credentials and direct identifiers; detect semantic re-identification and cohort uniqueness; keep child-specific or sensitive narratives local even after names are removed.
4. No raw prompt, audio, image, attachment, tool output, or redacted text in logs. Log only reason codes, hashes, byte counts, destination, policy version, and a receipt.
5. Canary tokens and network egress controls prove that callers cannot bypass the broker.
6. No automatic cloud fallback and no automatic paid retry.
7. Synthetic adversarial tests cover Unicode, homoglyphs, misspellings, nicknames, nested JSON, streaming, multipart uploads, copied email threads, OCR, prompt history, tool outputs, and indirect references.
8. “100% safe” is a prohibited claim. Readiness requires reproducible evidence and two consecutive clean fresh-vantage hostile rounds after repairs.

## 8. Mac and Model Constraints

- Apple Silicon macOS is a Tier-1 Hermes platform.
- Official Hermes documentation supports a separate profile/home with isolated config, keys, memories, sessions, skills, cron jobs, and state.
- Two processes must never write to the same Hermes home.
- Local Hermes tools run with the macOS user's filesystem authority unless sandboxed or individually disabled.
- The official Hermes Desktop download was recently reported as older than the source-level remote-client onboarding. Installation must verify the artifact version and behavior rather than assume the website package is current.
- Ollama on macOS currently requires macOS 14 or later.
- Qwen 3.8 27B Q4 is roughly 19 GB before context and OS overhead. Confirm exact Mac RAM, free disk, macOS version, model tag, and measured responsiveness before selecting it as the local default.
- If local Qwen 3.8 27B is not comfortable, preserve Qwen 3.8 as the private 5090 model and choose an explicitly approved smaller local fallback rather than allowing silent cloud fallback.

## 9. Source Baseline

Reviewers may challenge or extend these sources, but must prefer primary/authoritative guidance and provide links:

- California Infant–Toddler Learning and Development Foundations and curriculum framework: <https://www.cde.ca.gov/sp/cd/re/cddpublications.asp>
- California guidance for serving two-year-olds: <https://www.cde.ca.gov/sp/cd/ci/serving2yofaqs.asp>
- California DRDP developmental continuum: <https://www.cde.ca.gov/SP/CD/ci/desiredresults.asp>
- NAEYC Developmentally Appropriate Practice: <https://www.naeyc.org/resources/position-statements/dap/contents>
- Head Start Effective Practice Guides: <https://headstart.gov/school-readiness/effective-practice-guides/effective-practice-guides>
- Head Start embedded learning opportunities: <https://headstart.gov/publication/embedded-learning-opportunities-faqs>
- CDC milestones by two years: <https://www.cdc.gov/act-early/milestones/2-years.html>
- American Academy of Pediatrics toilet-learning readiness: <https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/Pages/the-right-age-to-toilet-train.aspx>
- California child-care regulations: <https://www.cdss.ca.gov/inforesources/letters-regulations/legislation-and-regulations/community-care-licensing-regulations/child-care>
- Hermes official documentation: <https://hermes-agent.nousresearch.com/docs/>
- Hermes profiles: <https://hermes-agent.nousresearch.com/docs/user-guide/profiles>
- Ollama macOS documentation: <https://docs.ollama.com/macos>
- Meta automated data collection terms: <https://www.facebook.com/legal/automated_data_collection_terms>
- OfferUp terms: <https://offerup.com/terms>
- Craigslist terms: <https://www.craigslist.org/about/terms>

## 10. Questions Every Reviewer Must Answer

1. What is developmentally wrong, unsafe, over-ambitious, or missing for a two-year-old classroom?
2. What should the daily and weekly teacher experience actually look like?
3. Which information can safely reach the radar, private GPU server, SwanGuard, and external reviewers?
4. How can the radar deliver useful local ideas and bargains without violating marketplace terms?
5. What minimum inventory, source-quality, safety, and recall checks belong in supply recommendations?
6. What should be installed on the Mac first, and what should remain disabled until later gates pass?
7. Is Qwen 3.8 27B a sensible local default across 24 GB and 32 GB Apple Silicon Macs? Give explicit alternatives and tradeoffs.
8. What is the smallest daily workflow likely to survive teacher fatigue?
9. Which suggestions require school policy, director, family, medical, legal, or licensing confirmation?
10. What did the plan fail to ask?

## 11. Required Output

- **Verdict:** APPROVE / REVISE / BLOCK.
- Top ten findings ranked by severity and leverage.
- Must-build-now / next / later / reject table.
- Corrected end-to-end architecture and trust boundaries.
- Corrected daily and weekly teacher workflow.
- Two-year-old pedagogy and toilet-learning corrections, with authoritative citations.
- Radar source and sourcing strategy, including marketplace-compliant alternatives.
- Mac installation sequence with rollback and acceptance gates.
- Privacy attack paths and required tests.
- Adoption risks and simplifications.
- Single highest-risk assumption and the fastest way to test it.
- Confidence labels and missing evidence.

Do not give generic praise. Do not invent legal conclusions, product APIs, local store availability, model tags, hardware performance, or school policy. Mark uncertain claims and identify how to verify them.
