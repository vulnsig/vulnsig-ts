import type { RenderOptions } from './types.js';
import { parseCVSS, getSeverity } from './parse.js';
import { calculateScore } from './score.js';
import { scoreToHue } from './color.js';
import { arcPath, starPath, radialCuts, ringFill } from './geometry.js';

export function renderGlyph(options: RenderOptions): string {
  const { vector, size = 120, showLabel = true } = options;
  const metrics = parseCVSS(vector);

  // Score precedence: explicit → auto-calculate → fallback 5.0
  let score: number;
  if (options.score != null) {
    score = options.score;
  } else {
    score = calculateScore(vector);
  }

  const { hue, sat } = scoreToHue(score);

  // Metric severities
  const ac = getSeverity(metrics, 'AC');
  const at = getSeverity(metrics, 'AT');
  const vc = getSeverity(metrics, 'VC');
  const vi = getSeverity(metrics, 'VI');
  const va = getSeverity(metrics, 'VA');
  const sc = getSeverity(metrics, 'SC');
  const si = getSeverity(metrics, 'SI');
  const sa = getSeverity(metrics, 'SA');

  const hasAnySub = sc > 0 || si > 0 || sa > 0;
  const atPresent = at < 0.5;

  const cx = 60, cy = 60;
  const petalCount = ({ N: 8, A: 6, L: 4, P: 3 } as Record<string, number>)[metrics.AV] || 8;

  // Geometry constants
  const ringWidth = 4.375;
  const ringGap = 1.5;
  const outerR = 44;
  const hueRingR = outerR + ringGap + ringWidth / 2;

  const subInnerR = outerR - ringWidth;
  const vulnOuterR = subInnerR - ringGap;
  const vulnInnerR = vulnOuterR - ringWidth;
  const innerR = vulnInnerR;

  const gapDeg = 3;
  const cutGapDeg = 4;
  const cutWidthDeg = 3;

  const starOuterR = innerR - 2;
  const starInnerR = starOuterR * (0.75 - ac * 0.5);

  // PR stroke
  const prRaw = metrics.PR;
  const prStrokeWidth = prRaw === 'H' ? 2.5 : prRaw === 'L' ? 1.5 : 0.5;
  const prStrokeAlpha = prRaw === 'H' ? 0.8 : prRaw === 'L' ? 0.55 : 0.2;

  // UI spikes/bumps
  const uiRaw = metrics.UI;
  const spikeBase = hueRingR + ringWidth / 2 - 0.5;

  // Star fill
  const sfSat = sat * 0.85;
  const sfLight = 35;
  const sfAlpha = 0.85;

  const bgColor = `hsl(${hue}, 4%, 5%)`;

  // Deterministic gradient ID from vector hash
  const gradId = 'sg-' + simpleHash(vector);

  // Sectors
  const sectors = [
    { key: 'C', s: -150 + gapDeg / 2, e: -30 - gapDeg / 2, vuln: vc, sub: sc },
    { key: 'I', s: -30 + gapDeg / 2, e: 90 - gapDeg / 2, vuln: vi, sub: si },
    { key: 'A', s: 90 + gapDeg / 2, e: 210 - gapDeg / 2, vuln: va, sub: sa },
  ];

  const parts: string[] = [];

  // Defs
  parts.push(`<defs><radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">`);
  parts.push(`<stop offset="0%" stop-color="hsla(${hue}, ${sfSat * 1.1}%, ${sfLight + 6}%, ${Math.min(1, sfAlpha + 0.1)})"/>`);
  parts.push(`<stop offset="100%" stop-color="hsla(${hue}, ${sfSat}%, ${sfLight}%, ${sfAlpha})"/>`);
  parts.push(`</radialGradient></defs>`);

  // Z-order 1: UI:N Spikes
  if (uiRaw === 'N') {
    for (let i = 0; i < petalCount; i++) {
      const a = (Math.PI * 2 * i) / petalCount - Math.PI / 2;
      const x1 = cx + Math.cos(a) * spikeBase;
      const y1 = cy + Math.sin(a) * spikeBase;
      const x2 = cx + Math.cos(a) * (spikeBase + 4.7);
      const y2 = cy + Math.sin(a) * (spikeBase + 4.7);
      parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="hsla(${hue}, ${sat}%, 65%, 0.7)" stroke-width="4.5" stroke-linecap="butt"/>`);
    }
  }

  // Z-order 2: UI:P Bumps
  if (uiRaw === 'P') {
    const bumpR = 4.7;
    for (let i = 0; i < petalCount; i++) {
      const a = (Math.PI * 2 * i) / petalCount - Math.PI / 2;
      const bx = cx + Math.cos(a) * spikeBase;
      const by = cy + Math.sin(a) * spikeBase;
      const perpL = a - Math.PI / 2;
      const perpR = a + Math.PI / 2;
      const x1 = bx + Math.cos(perpL) * bumpR;
      const y1 = by + Math.sin(perpL) * bumpR;
      const x2 = bx + Math.cos(perpR) * bumpR;
      const y2 = by + Math.sin(perpR) * bumpR;
      parts.push(`<path d="M${x1},${y1} A${bumpR},${bumpR} 0 0,1 ${x2},${y2} Z" fill="hsla(${hue}, ${sat}%, 60%, 0.65)"/>`);
    }
  }

  // Z-order 3: Background circle
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${bgColor}"/>`);

  // Z-order 4: Star fill
  const starD = starPath(cx, cy, petalCount, starOuterR, starInnerR);
  parts.push(`<path d="${starD}" fill="url(#${gradId})" stroke="none"/>`);

  // Z-order 5: Star stroke
  parts.push(`<path d="${starD}" fill="none" stroke="hsla(${hue}, ${sat * 0.5}%, 70%, ${prStrokeAlpha})" stroke-width="${prStrokeWidth}" stroke-linejoin="round"/>`);

  // Z-order 6 & 7: CIA ring sectors
  for (const sec of sectors) {
    // Vuln band (inner)
    const vulnBandOuter = hasAnySub ? vulnOuterR : outerR;
    parts.push(`<path d="${arcPath(cx, cy, vulnInnerR, vulnBandOuter, sec.s, sec.e)}" fill="${ringFill(sec.vuln, hue, sat)}"/>`);

    // Sub band (outer) — only when split
    if (hasAnySub) {
      parts.push(`<path d="${arcPath(cx, cy, subInnerR, outerR, sec.s, sec.e)}" fill="${ringFill(sec.sub, hue, sat)}"/>`);
    }
  }

  // Z-order 8: AT:P radial cuts
  if (atPresent) {
    for (const sec of sectors) {
      const cuts = radialCuts(sec.s, sec.e, cutWidthDeg, cutGapDeg);
      for (const cut of cuts) {
        parts.push(`<path d="${arcPath(cx, cy, vulnInnerR - 0.5, outerR + 0.5, cut.startDeg, cut.endDeg)}" fill="${bgColor}"/>`);
      }
    }
  }

  // Z-order 9: Outer hue ring
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${hueRingR}" fill="none" stroke="hsl(${hue}, ${sat}%, 52%)" stroke-width="${ringWidth}"/>`);

  // Z-order 10: Sector labels
  if (showLabel && size >= 140) {
    const fontSize = size >= 200 ? 8 : 6;
    for (const sec of sectors) {
      const midDeg = (sec.s + sec.e) / 2;
      const midRad = (midDeg * Math.PI) / 180;
      const labelR = hasAnySub ? (vulnInnerR + vulnOuterR) / 2 : (vulnInnerR + outerR) / 2;
      const lx = cx + Math.cos(midRad) * labelR;
      const ly = cy + Math.sin(midRad) * labelR;
      const fill = sec.vuln > 0.5
        ? 'rgba(0,0,0,0.4)'
        : sec.vuln > 0.01
          ? 'rgba(255,255,255,0.22)'
          : 'rgba(255,255,255,0.07)';
      parts.push(`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" fill="${fill}" font-size="${fontSize}" font-family="'JetBrains Mono', monospace" font-weight="700">${sec.key}</text>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 120 120" style="overflow:visible">${parts.join('')}</svg>`;
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
