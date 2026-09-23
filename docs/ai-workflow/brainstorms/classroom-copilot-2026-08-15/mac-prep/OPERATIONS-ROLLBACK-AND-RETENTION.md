# Operations, Rollback, and Retention

## Ownership

- **Teacher:** chooses/prints cards, supplies one-tap feedback, keeps school
  records in the school-approved system, and reports unexpected behavior.
- **Sean:** named family infrastructure operator for the always-on 5090 route,
  Hermes profile maintenance, SwanGuard identity/revocation, and incident help.
- **School/director:** decides whether any child information may exist on a
  personal device and names the record/retention policy.
- **System rule:** if Sean/operator support is unavailable, the system degrades
  to the local H0/template/paper floor. It never opens a cloud fallback.

Electricity and end-of-life cost ownership for the always-on 5090 remains a
recorded D-30 fact to confirm; it does not change the privacy rules.

## Maintenance cadence

| Cadence | Owner | Check |
|---|---|---|
| weekly | teacher | card usefulness; broken source; one-tap summary |
| monthly | Sean | Hermes/Ollama update availability, source/recall staleness, access audit |
| quarterly | Sean + teacher | revoke test, offline test, restore drill, tool/skill inventory |
| school-year boundary | teacher + director | policy/retention confirmation and authorized purge |
| any OS/model update | Sean | backup, synthetic offline/network regression, explicit acceptance |

Updates are previewed, backed up, and tested with synthetic content. Automatic
model/runtime updates stay off where the product permits. No update silently
enables a cloud provider, fallback, voice, browser, gateway, cron, or tool.

## Data placement and retention

1. SwanGuard and Radar hold public opportunity data only.
2. The 5090 receives structured generic planning inputs only and retains no
   prompt bodies.
3. Her Hermes brain may learn her generic preferences, workflows, materials,
   schedule shape, and teaching style. It may not accumulate child dossiers,
   rosters, family facts, allergies, incidents, photos, audio, or assessments.
4. Deterministic allergy data, if school-authorized, stays in a separate local
   store and only emits aggregate pass/hold flags to the planner.
5. School-required child records stay in the school-approved system.
6. H0 remains stateless across sessions unless a later written, reviewed policy
   explicitly changes that boundary.

Purge triggers: a child leaves, school year ends, teacher leaves, device is lost,
authorization changes, profile is compromised, or the tool is retired. The
school's written rule controls authorized records. Public opportunity history can
be retained separately because its schema cannot hold child fields.

## Incident response

1. Disconnect the Mac from Wi-Fi/overlay; stop Hermes/Ollama sessions.
2. Do not paste logs into a cloud support chat.
3. Record time, mode, visible action, and synthetic/non-synthetic classification
   without copying content.
4. Revoke the Mac's SwanGuard, overlay, and 5090 application credentials.
5. Preserve relevant local evidence encrypted; involve the director under the
   school's incident procedure if child data may be involved.
6. Determine the exact egress/tool/memory path before restoring service.
7. Repair, then repeat the full synthetic acceptance matrix and two clean hostile
   rounds. No automatic paid retry.

## Reversible rollback

Rollback order, using exact observed paths only:

1. remove the one-front-door launcher from Dock/Desktop (do not delete recovery);
2. stop the classroom-teacher profile/gateway if one was enabled;
3. revoke its 5090/SwanGuard/overlay identities;
4. restore the previous H0 launcher and confirm offline use;
5. export the Hermes profile only if the export contains no child content;
6. remove the classroom profile through the documented Hermes profile command
   after reviewing the exact target;
7. uninstall Hermes only if it is not used by another profile on that Mac.

Never run a recursive delete against `$HOME`, `~`, `.hermes`, or an unresolved
variable. A supervised operator must verify the resolved profile path first.

## Readiness receipt

The operator signs only after recording:

- director-policy date/citation;
- safe preflight JSON hash;
- Hermes/Ollama/model versions and model digest;
- profile-home path verification;
- tool/fallback inventory;
- network and public-reachability test;
- 50/50 hostile contract rejections;
- five synthetic printed cards and teacher rating;
- revoke and rollback test timestamps.

