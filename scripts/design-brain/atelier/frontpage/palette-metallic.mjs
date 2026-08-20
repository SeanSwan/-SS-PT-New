/**
 * palette-metallic.mjs — the twelve metallic ramps, ONE definition.
 *
 * Sean 2026-08-20: "I gotta have that purple, that baby blue, and that green... create a
 * white and black one too. A yellow one, a pink one, red, a brown, and an orange one."
 *
 * Imported by BOTH build-buttonlab.mjs (the chooser) and build-winner.mjs (the page), so the
 * button he picks in the lab is byte-identical to the button the page renders. Two copies of a
 * palette is the drift class that has already cost this project real time - a colour "fixed" in
 * one generator and stale in the other is invisible until he looks at both.
 *
 * Every ramp is SIX stops: deep shadow -> mid-dark -> HOT NARROW HIGHLIGHT -> mid -> shadow ->
 * deep. The narrow hot band between two darker bands is what makes a colour read as metal; a
 * two-stop wash reads as plastic at any saturation. Where the brand owns a token, the ramp is
 * built around that token rather than around a generic hue.
 */
export const METALLIC = {
  // Sean 2026-08-20: "I gotta have that purple, that baby blue, and that green... create a
  // white and black one too. A yellow one, a pink one, red, a brown, and an orange one."
  // Every ramp is SIX stops: deep shadow -> mid-dark -> HOT NARROW HIGHLIGHT -> mid -> shadow
  // -> deep. The narrow hot band between two darks is what makes a colour read as metal.
  // Where the brand has a token, the ramp is built around it rather than around a generic hue.
  purple:   { bg: '#0C0618', shine: 'linear-gradient(90deg,#100823 0%,#4b1f9e 20%,#ddc9ff 40%,#8b5cf6 54%,#33146b 74%,#0b0517 100%)', gs: '#8B5CF6', ge: '#3B1E7A', label: 'Purple — Wing Purple #8B5CF6' },
  babyBlue: { bg: '#04121F', shine: 'linear-gradient(90deg,#061826 0%,#2b7fb5 20%,#dff3ff 40%,#60c0f0 54%,#124c72 74%,#04101a 100%)', gs: '#60C0F0', ge: '#124C72', label: 'Baby blue — Ice Wing #60C0F0' },
  green:    { bg: '#04120A', shine: 'linear-gradient(90deg,#06170e 0%,#0f7a45 20%,#b6ffd8 40%,#2fbf7a 54%,#0a4429 74%,#04150c 100%)', gs: '#2FBF7A', ge: '#0A5E36', label: 'Green — emerald metal' },
  white:    { bg: '#12141A', shine: 'linear-gradient(90deg,#2a2f38 0%,#8f98a6 20%,#ffffff 40%,#dfe4ec 54%,#6b7480 74%,#1a1e25 100%)', gs: '#FFFFFF', ge: '#B9C2CE', label: 'White — pearl' },
  black:    { bg: '#050506', shine: 'linear-gradient(90deg,#0a0a0c 0%,#2a2a30 20%,#9aa0aa 40%,#4a4d55 54%,#17181c 74%,#060607 100%)', gs: '#9AA0AA', ge: '#2A2A30', label: 'Black — onyx' },
  yellow:   { bg: '#16130A', shine: 'linear-gradient(90deg,#1c1808 0%,#9c8410 20%,#fff6bf 40%,#e8c93a 54%,#6b5a0e 74%,#141105 100%)', gs: '#E8C93A', ge: '#6B5A0E', label: 'Yellow — brass' },
  pink:     { bg: '#170811', shine: 'linear-gradient(90deg,#1e0a17 0%,#a83a72 20%,#ffd6e8 40%,#f078b0 54%,#6e1e46 74%,#150610 100%)', gs: '#F078B0', ge: '#6E1E46', label: 'Pink — rose metal' },
  red:      { bg: '#14040A', shine: 'linear-gradient(90deg,#1a0510 0%,#8c0f34 20%,#ffc2d4 40%,#d2436a 54%,#5c0a22 74%,#150409 100%)', gs: '#D2436A', ge: '#6E0A26', label: 'Red — ruby metal' },
  brown:    { bg: '#120B05', shine: 'linear-gradient(90deg,#180f07 0%,#8a5a2b 20%,#f2d5b0 40%,#c08a4e 54%,#5a3a1c 74%,#100a04 100%)', gs: '#C08A4E', ge: '#5A3A1C', label: 'Brown — bronze' },
  orange:   { bg: '#150A03', shine: 'linear-gradient(90deg,#1c0d04 0%,#a85512 20%,#ffdcb0 40%,#f08a2e 54%,#6e380c 74%,#130803 100%)', gs: '#F08A2E', ge: '#6E380C', label: 'Orange — copper' },
  silver:   { bg: '#0B0E12', shine: 'linear-gradient(90deg,#1a2028 0%,#5d6b7a 20%,#eef4fb 40%,#9fb0c2 54%,#39434f 74%,#12171d 100%)', gs: '#C8D4E0', ge: '#7C8FA3', label: 'Silver — steel (his original words)' },
  gilded:   { bg: '#140F03', shine: 'linear-gradient(90deg,#1a1405 0%,#8a6c1c 20%,#fff2c4 40%,#d8b64e 54%,#5c4712 74%,#130e03 100%)', gs: '#C6A84B', ge: '#7A5E18', label: 'Gold — Gilded Fern #C6A84B' },
};
