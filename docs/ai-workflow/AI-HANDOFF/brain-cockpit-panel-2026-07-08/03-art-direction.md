# FREE PANEL — Art Direction / Theme System (COMPLETE)
SYSTEM RULE: every theme fills the SAME 5 semantic node slots, each locked to ONE hue family across all skins so the legend never has to be relearned: --c-app=cyan/teal, --c-routine=gold/amber, --c-memory=periwinkle, --c-skill=violet/magenta, --c-fault=RED (never reassigned). Only saturation/value/warmth shift per theme. This is what scales to Sean's FUTURE apps: retune 5 hue families, don't redesign the legend.
10 THEMES (each: bg-deep/bg-card/bg-edge + 5 accents + text + muted):
1 Aurora Galaxy (#06071A/#10123A; app#5CE8E0 routine#F0C05A mem#9FA8FF skill#B98BFF fault#FF5D6C) - nebula blooms, recolored stars.
2 James Webb (#0A0805/#1C130A; app#4DD0C4 routine#E8B24A mem#8FA8E8 skill#C97BD1 fault#E85D4A) - hexagon-mirror watermark, infrared bloom; gold NEVER body text.
3 Zebra (#050505/#161616; app#0FE8FF electric pop, skill#FF3DD8) - diagonal stripes <=6%, electric cyan only on FOCUSED node, 21:1 contrast.
4 Glacier/Ice = SAFE DEFAULT (Crystalline Swan polished): bg-card #171B24 (lightened), bg-edge #232B3D (louder), text #E0ECF4, MUTED #A6B4CC (fixes readability - current #8b93a7 is the culprit).
5 SoCal Dusk (#0D0A1A/#1E1533) - sunset horizon band.
6 Mojave Desert (#0C0906/#1D160E) - dune silhouette, grain.
7 Redwood Cathedral (#060B08/#10190F) - god-rays, fault-red kept FULLY saturated to read against green.
8 Pacific Islands (#050F14/#0D1F26) - bioluminescent plankton drift.
9 Alpine Summit (#0A0C10/#161A20) - granite grain, alpenglow.
10 Bioluminescent Deep/Xeno (#050510/#10091F; skill#D95FFF loudest) - cellular veins, blob-glow, breathing particles.
READABILITY GUARANTEE (the fix): --c-text locked HSL L>=92% sat<=15%, --c-muted floor L>=62% (current #8b93a7 ~4.3:1 = the bug), accents NEVER body copy, Glacier's padding/line-height bump = new floor for ALL themes, 7-pair contrast lint per theme (Rule 50 Tier-A).
TOKENIZATION: 11 Tier-1 color vars re-skin ~90% zero-JS + one small Tier-2 texture block per theme (textures = background-image, can't be a flat var - honest caveat).
SWITCH: 300-450ms crossfade default; 1.2-1.8s cinematic "establishing" flourish ONCE per skin per session (not every toggle); reduced-motion=instant; persist last choice; default=Glacier.
SHIP FIRST: Glacier (mandatory house default, fixes dim/weak alone) + Aurora Galaxy (matches "galaxies," reuses existing star/spark mechanism, lowest risk). James Webb #3.
*** 2 BUILD BUGS FOUND: (a) --aur referenced in .aurora but NEVER declared in :root (contributes to "dim"); (b) .core-glow/.core-ring/.core-spin bake ${PAL.app}/${PAL.skill} at gen-time NOT var() -> live theme swap won't recolor the core. Both must be fixed for the theme system to work. ***
