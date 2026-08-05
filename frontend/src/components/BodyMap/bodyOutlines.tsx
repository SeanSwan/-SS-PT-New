/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MODULE: bodyOutlines                                        ║
 * ║  PURPOSE: Gender-specific SVG body outlines + head geometry  ║
 * ║  OWNER: Claude Fable 5 | CREATED: 2026-08-04 (Slice 2)       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Extracted from BodyMapSVG.tsx (300-line-cap relief) and extended with the
 * NEUTRAL figure (A5): non-binary / unset / prefer-not-to-say clients get an
 * androgynous silhouette by DEFAULT — nobody is silently rendered male.
 * Neutral has no photorealistic PNG on purpose; it renders outline-only at
 * full opacity.
 *
 * HEAD_GEOMETRY is the single source for the photo-head clip ellipse (A3):
 * the male head is rx14/ry18, female rx13/ry17 — one hardcoded clip used to
 * serve both. All outlines share viewBox 0 0 200 320.
 */
import React from 'react';

export type AnatomyFigure = 'male' | 'female' | 'neutral';

/** Photo-head clip geometry per figure — matches each outline's head ellipse. */
export const HEAD_GEOMETRY: Record<AnatomyFigure, { cx: number; cy: number; rx: number; ry: number }> = {
  male: { cx: 100, cy: 24, rx: 14, ry: 18 },
  female: { cx: 100, cy: 24, rx: 13, ry: 17 },
  neutral: { cx: 100, cy: 24, rx: 13.5, ry: 17.5 },
};

const strokeProps = {
  stroke: 'rgba(64, 112, 192, 0.40)',
  strokeWidth: 1.2,
  fill: 'none',
  strokeLinecap: 'round' as const,
};

/** Male front outline — broader shoulders, narrower hips, more angular musculature */
export const MaleFrontOutline: React.FC = () => (
  <g {...strokeProps}>
    {/* Head + jaw */}
    <ellipse cx="100" cy="24" rx="14" ry="18" />
    <path d="M88,36 Q88,42 92,44" />
    <path d="M112,36 Q112,42 108,44" />
    {/* Neck — trapezius flare */}
    <line x1="93" y1="44" x2="90" y2="60" />
    <line x1="107" y1="44" x2="110" y2="60" />
    {/* Shoulders — broad, angular deltoid caps */}
    <path d="M90,62 Q78,56 60,68 Q50,74 48,82" />
    <path d="M110,62 Q122,56 140,68 Q150,74 152,82" />
    {/* Chest — pec shelf */}
    <path d="M68,78 Q72,88 80,94 L100,98 L120,94 Q128,88 132,78" />
    <path d="M80,94 Q84,100 100,102 Q116,100 120,94" />
    {/* Torso sides — lats, obliques, hip bone */}
    <path d="M66,80 L64,100 Q62,120 66,140 L72,158 Q78,168 86,174" />
    <path d="M134,80 L136,100 Q138,120 134,140 L128,158 Q122,168 114,174" />
    {/* Waistline + hip line */}
    <path d="M72,158 Q86,162 100,162 Q114,162 128,158" />
    {/* Arms */}
    <path d="M48,82 Q44,96 42,112 L38,140 Q36,155 34,170" />
    <path d="M152,82 Q156,96 158,112 L162,140 Q164,155 166,170" />
    <path d="M48,82 Q52,96 54,112 L52,130" />
    <path d="M152,82 Q148,96 146,112 L148,130" />
    {/* Hands */}
    <ellipse cx="34" cy="174" rx="4" ry="6" />
    <ellipse cx="166" cy="174" rx="4" ry="6" />
    {/* Abs center line */}
    <line x1="100" y1="98" x2="100" y2="162" stroke="rgba(64,112,192,0.15)" strokeDasharray="3 4" />
    {/* Legs */}
    <path d="M86,174 Q84,190 82,210 L80,230 Q78,246 78,260 L76,290 Q76,296 80,300" />
    <path d="M114,174 Q116,190 118,210 L120,230 Q122,246 122,260 L124,290 Q124,296 120,300" />
    <path d="M86,174 Q92,178 100,178 Q108,178 114,174" />
    <path d="M96,178 Q94,200 92,220 L90,240 Q88,260 88,280 L88,300" />
    <path d="M104,178 Q106,200 108,220 L110,240 Q112,260 112,280 L112,300" />
    {/* Feet */}
    <path d="M76,298 L74,304 Q78,308 86,308 L92,306" />
    <path d="M124,298 L126,304 Q122,308 114,308 L108,306" />
  </g>
);

/** Female front outline — narrower shoulders, wider hips, curved silhouette */
export const FemaleFrontOutline: React.FC = () => (
  <g {...strokeProps}>
    {/* Head — slightly softer jaw */}
    <ellipse cx="100" cy="24" rx="13" ry="17" />
    <path d="M89,36 Q90,40 93,43" />
    <path d="M111,36 Q110,40 107,43" />
    {/* Neck — slimmer */}
    <line x1="94" y1="43" x2="92" y2="58" />
    <line x1="106" y1="43" x2="108" y2="58" />
    {/* Shoulders — narrower, rounder */}
    <path d="M92,60 Q82,58 68,66 Q58,72 56,80" />
    <path d="M108,60 Q118,58 132,66 Q142,72 144,80" />
    {/* Chest — bust curve */}
    <path d="M72,76 Q76,84 82,90 Q88,96 100,98 Q112,96 118,90 Q124,84 128,76" />
    <path d="M82,90 Q86,96 100,100 Q114,96 118,90" />
    {/* Torso — waist cinch + hip flare */}
    <path d="M70,78 L68,96 Q66,110 70,126 L74,140 Q72,152 68,162 Q72,174 82,180" />
    <path d="M130,78 L132,96 Q134,110 130,126 L126,140 Q128,152 132,162 Q128,174 118,180" />
    {/* Waist narrowing */}
    <path d="M74,140 Q86,136 100,136 Q114,136 126,140" />
    {/* Hip line — wider */}
    <path d="M68,162 Q82,170 100,170 Q118,170 132,162" />
    {/* Arms — slimmer */}
    <path d="M56,80 Q52,94 50,110 L46,138 Q44,152 42,168" />
    <path d="M144,80 Q148,94 150,110 L154,138 Q156,152 158,168" />
    <path d="M56,80 Q58,94 58,110 L56,128" />
    <path d="M144,80 Q142,94 142,110 L144,128" />
    {/* Hands */}
    <ellipse cx="42" cy="172" rx="3.5" ry="5.5" />
    <ellipse cx="158" cy="172" rx="3.5" ry="5.5" />
    {/* Center line */}
    <line x1="100" y1="98" x2="100" y2="170" stroke="rgba(64,112,192,0.12)" strokeDasharray="3 4" />
    {/* Legs — curvier */}
    <path d="M82,180 Q80,196 78,214 L76,234 Q74,250 74,264 L72,292 Q72,298 76,302" />
    <path d="M118,180 Q120,196 122,214 L124,234 Q126,250 126,264 L128,292 Q128,298 124,302" />
    <path d="M82,180 Q90,184 100,184 Q110,184 118,180" />
    <path d="M94,184 Q92,204 90,224 L88,244 Q86,264 86,282 L86,302" />
    <path d="M106,184 Q108,204 110,224 L112,244 Q114,264 114,282 L114,302" />
    {/* Feet */}
    <path d="M72,300 L70,306 Q74,310 82,310 L90,308" />
    <path d="M128,300 L130,306 Q126,310 118,310 L110,308" />
  </g>
);

/** Neutral front outline — androgynous: medium shoulders, straight torso, no bust/pec emphasis */
export const NeutralFrontOutline: React.FC = () => (
  <g {...strokeProps}>
    {/* Head */}
    <ellipse cx="100" cy="24" rx="13.5" ry="17.5" />
    <path d="M88.5,36 Q89,41 92.5,43.5" />
    <path d="M111.5,36 Q111,41 107.5,43.5" />
    {/* Neck */}
    <line x1="93.5" y1="43.5" x2="91" y2="59" />
    <line x1="106.5" y1="43.5" x2="109" y2="59" />
    {/* Shoulders — medium breadth */}
    <path d="M91,61 Q80,57 64,67 Q54,73 52,81" />
    <path d="M109,61 Q120,57 136,67 Q146,73 148,81" />
    {/* Chest — flat, unemphasized */}
    <path d="M70,77 Q74,86 81,92 L100,97 L119,92 Q126,86 130,77" />
    {/* Torso — gentle, straight sides */}
    <path d="M68,79 L66,98 Q64,116 68,134 L73,150 Q75,162 84,177" />
    <path d="M132,79 L134,98 Q136,116 132,134 L127,150 Q125,162 116,177" />
    {/* Waistline */}
    <path d="M73,150 Q86,154 100,154 Q114,154 127,150" />
    {/* Hip line — medium */}
    <path d="M75,166 Q86,170 100,170 Q114,170 125,166" />
    {/* Arms */}
    <path d="M52,81 Q48,95 46,111 L42,139 Q40,153 38,169" />
    <path d="M148,81 Q152,95 154,111 L158,139 Q160,153 162,169" />
    <path d="M52,81 Q55,95 56,111 L54,129" />
    <path d="M148,81 Q145,95 144,111 L146,129" />
    {/* Hands */}
    <ellipse cx="38" cy="173" rx="3.8" ry="5.8" />
    <ellipse cx="162" cy="173" rx="3.8" ry="5.8" />
    {/* Center line */}
    <line x1="100" y1="97" x2="100" y2="166" stroke="rgba(64,112,192,0.13)" strokeDasharray="3 4" />
    {/* Legs */}
    <path d="M84,177 Q82,193 80,212 L78,232 Q76,248 76,262 L74,291 Q74,297 78,301" />
    <path d="M116,177 Q118,193 120,212 L122,232 Q124,248 124,262 L126,291 Q126,297 122,301" />
    <path d="M84,177 Q91,181 100,181 Q109,181 116,177" />
    <path d="M95,181 Q93,202 91,222 L89,242 Q87,262 87,281 L87,301" />
    <path d="M105,181 Q107,202 109,222 L111,242 Q113,262 113,281 L113,301" />
    {/* Feet */}
    <path d="M74,299 L72,305 Q76,309 84,309 L91,307" />
    <path d="M126,299 L128,305 Q124,309 116,309 L109,307" />
  </g>
);

/** Male back outline */
export const MaleBackOutline: React.FC = () => (
  <g {...strokeProps}>
    {/* Head */}
    <ellipse cx="100" cy="24" rx="14" ry="18" />
    {/* Neck */}
    <line x1="93" y1="42" x2="90" y2="58" />
    <line x1="107" y1="42" x2="110" y2="58" />
    {/* Trapezius diamond */}
    <path d="M90,58 Q80,54 62,66 Q52,72 48,82" />
    <path d="M110,58 Q120,54 138,66 Q148,72 152,82" />
    <path d="M90,58 Q96,66 100,70 Q104,66 110,58" />
    {/* Spine line */}
    <line x1="100" y1="58" x2="100" y2="165" stroke="rgba(64,112,192,0.15)" strokeDasharray="3 4" />
    {/* Scapulae */}
    <path d="M72,80 Q78,86 82,96 Q80,104 74,108" opacity="0.4" />
    <path d="M128,80 Q122,86 118,96 Q120,104 126,108" opacity="0.4" />
    {/* Back torso — lats V-taper */}
    <path d="M66,82 L62,100 Q58,118 62,136 L68,156 Q76,168 86,174" />
    <path d="M134,82 L138,100 Q142,118 138,136 L132,156 Q124,168 114,174" />
    {/* Waistline */}
    <path d="M68,156 Q84,162 100,162 Q116,162 132,156" />
    {/* Arms */}
    <path d="M48,82 Q44,96 42,112 L38,140 Q36,155 34,170" />
    <path d="M152,82 Q156,96 158,112 L162,140 Q164,155 166,170" />
    <path d="M48,82 Q52,96 54,108 L52,128" />
    <path d="M152,82 Q148,96 146,108 L148,128" />
    <ellipse cx="34" cy="174" rx="4" ry="6" />
    <ellipse cx="166" cy="174" rx="4" ry="6" />
    {/* Glute line */}
    <path d="M86,174 Q92,178 100,180 Q108,178 114,174" />
    <path d="M90,170 Q100,176 110,170" opacity="0.3" />
    {/* Legs */}
    <path d="M86,174 Q82,196 80,218 L78,240 Q76,256 76,270 L74,294 Q74,300 78,304" />
    <path d="M114,174 Q118,196 120,218 L122,240 Q124,256 124,270 L126,294 Q126,300 122,304" />
    <path d="M96,178 Q94,200 92,222 L90,244 Q88,262 88,278 L88,304" />
    <path d="M104,178 Q106,200 108,222 L110,244 Q112,262 112,278 L112,304" />
    {/* Feet */}
    <path d="M74,302 L72,308 Q76,312 84,312 L92,310" />
    <path d="M126,302 L128,308 Q124,312 116,312 L108,310" />
  </g>
);

/** Female back outline */
export const FemaleBackOutline: React.FC = () => (
  <g {...strokeProps}>
    {/* Head */}
    <ellipse cx="100" cy="24" rx="13" ry="17" />
    {/* Neck */}
    <line x1="94" y1="41" x2="92" y2="56" />
    <line x1="106" y1="41" x2="108" y2="56" />
    {/* Trapezius — narrower */}
    <path d="M92,58 Q82,56 68,64 Q58,70 56,78" />
    <path d="M108,58 Q118,56 132,64 Q142,70 144,78" />
    <path d="M92,58 Q96,64 100,68 Q104,64 108,58" />
    {/* Spine */}
    <line x1="100" y1="58" x2="100" y2="168" stroke="rgba(64,112,192,0.12)" strokeDasharray="3 4" />
    {/* Scapulae */}
    <path d="M74,78 Q80,84 84,92 Q82,100 76,104" opacity="0.35" />
    <path d="M126,78 Q120,84 116,92 Q118,100 124,104" opacity="0.35" />
    {/* Back — waist cinch + hip flare */}
    <path d="M70,78 L68,96 Q64,112 68,130 L72,144 Q70,156 66,166 Q70,176 80,182" />
    <path d="M130,78 L132,96 Q136,112 132,130 L128,144 Q130,156 134,166 Q130,176 120,182" />
    <path d="M72,144 Q86,138 100,138 Q114,138 128,144" />
    {/* Hip line */}
    <path d="M66,166 Q82,174 100,174 Q118,174 134,166" />
    {/* Arms */}
    <path d="M56,78 Q52,92 50,108 L46,136 Q44,150 42,166" />
    <path d="M144,78 Q148,92 150,108 L154,136 Q156,150 158,166" />
    <path d="M56,78 Q58,92 58,106 L56,124" />
    <path d="M144,78 Q142,92 142,106 L144,124" />
    <ellipse cx="42" cy="170" rx="3.5" ry="5.5" />
    <ellipse cx="158" cy="170" rx="3.5" ry="5.5" />
    {/* Glute */}
    <path d="M80,182 Q90,186 100,188 Q110,186 120,182" />
    <path d="M86,176 Q100,182 114,176" opacity="0.3" />
    {/* Legs */}
    <path d="M80,182 Q78,200 76,218 L74,240 Q72,256 72,270 L70,296 Q70,302 74,306" />
    <path d="M120,182 Q122,200 124,218 L126,240 Q128,256 128,270 L130,296 Q130,302 126,306" />
    <path d="M94,186 Q92,206 90,226 L88,248 Q86,266 86,282 L86,306" />
    <path d="M106,186 Q108,206 110,226 L112,248 Q114,266 114,282 L114,306" />
    <path d="M70,304 L68,310 Q72,314 80,314 L88,312" />
    <path d="M130,304 L132,310 Q128,314 120,314 L112,312" />
  </g>
);

/** Neutral back outline — androgynous mid-form */
export const NeutralBackOutline: React.FC = () => (
  <g {...strokeProps}>
    {/* Head */}
    <ellipse cx="100" cy="24" rx="13.5" ry="17.5" />
    {/* Neck */}
    <line x1="93.5" y1="41.5" x2="91" y2="57" />
    <line x1="106.5" y1="41.5" x2="109" y2="57" />
    {/* Trapezius — medium */}
    <path d="M91,58 Q81,55 65,65 Q55,71 52,80" />
    <path d="M109,58 Q119,55 135,65 Q145,71 148,80" />
    <path d="M91,58 Q96,65 100,69 Q104,65 109,58" />
    {/* Spine */}
    <line x1="100" y1="58" x2="100" y2="166" stroke="rgba(64,112,192,0.13)" strokeDasharray="3 4" />
    {/* Scapulae */}
    <path d="M73,79 Q79,85 83,94 Q81,102 75,106" opacity="0.38" />
    <path d="M127,79 Q121,85 117,94 Q119,102 125,106" opacity="0.38" />
    {/* Back torso — straight taper */}
    <path d="M68,80 L65,98 Q61,116 65,134 L70,152 Q76,166 84,176" />
    <path d="M132,80 L135,98 Q139,116 135,134 L130,152 Q124,166 116,176" />
    {/* Waistline */}
    <path d="M70,152 Q85,157 100,157 Q115,157 130,152" />
    {/* Arms */}
    <path d="M52,80 Q48,94 46,110 L42,138 Q40,153 38,168" />
    <path d="M148,80 Q152,94 154,110 L158,138 Q160,153 162,168" />
    <path d="M52,80 Q55,94 56,109 L54,127" />
    <path d="M148,80 Q145,94 144,109 L146,127" />
    <ellipse cx="38" cy="172" rx="3.8" ry="5.8" />
    <ellipse cx="162" cy="172" rx="3.8" ry="5.8" />
    {/* Glute line */}
    <path d="M84,176 Q91,180 100,182 Q109,180 116,176" />
    <path d="M88,172 Q100,178 112,172" opacity="0.3" />
    {/* Legs */}
    <path d="M84,176 Q81,198 79,218 L77,240 Q75,256 75,270 L73,295 Q73,301 77,305" />
    <path d="M116,176 Q119,198 121,218 L123,240 Q125,256 125,270 L127,295 Q127,301 123,305" />
    <path d="M95,180 Q93,202 91,224 L89,246 Q87,264 87,280 L87,305" />
    <path d="M105,180 Q107,202 109,224 L111,246 Q113,264 113,280 L113,305" />
    {/* Feet */}
    <path d="M73,303 L71,309 Q75,313 83,313 L91,311" />
    <path d="M127,303 L129,309 Q125,313 117,313 L109,311" />
  </g>
);
