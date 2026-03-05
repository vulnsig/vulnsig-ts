import type { RenderOptions } from './types.js';
import { parseCVSS, getSeverity, detectCVSSVersion, isVersion3 } from './parse.js';
import { calculateScore } from './score.js';
import { scoreToHue } from './color.js';
import { arcPath, starPath, radialCuts, ringFill } from './geometry.js';

export function renderGlyph(options: RenderOptions): string {
  const { vector, size = 120 } = options;
  const metrics = parseCVSS(vector);
  const version = detectCVSSVersion(vector);

  // Score precedence: explicit → auto-calculate → fallback 5.0
  let score: number;
  if (options.score != null) {
    score = options.score;
  } else {
    score = calculateScore(vector);
  }

  const { hue, sat, light } = scoreToHue(score);

  // Metric severities - handle CVSS 3.0, 3.1, and 4.0
  const ac = getSeverity(metrics, 'AC');

  // For CVSS 3.0/3.1, AT doesn't exist, so always treat as solid (AT:N)
  const at = isVersion3(version) ? 1.0 : getSeverity(metrics, 'AT');

  // For CVSS 3.0/3.1, use C/I/A instead of VC/VI/VA
  const vc = isVersion3(version) ? getSeverity(metrics, 'C') : getSeverity(metrics, 'VC');
  const vi = isVersion3(version) ? getSeverity(metrics, 'I') : getSeverity(metrics, 'VI');
  const va = isVersion3(version) ? getSeverity(metrics, 'A') : getSeverity(metrics, 'VA');

  // For CVSS 3.0/3.1, if S:C (Changed), both bands mirror C/I/A. If S:U (Unchanged), no split.
  let sc: number, si: number, sa: number;
  if (isVersion3(version)) {
    const scopeChanged = getSeverity(metrics, 'S') > 0.5; // S:C = 1.0, S:U = 0.0
    if (scopeChanged) {
      // Split band: both bands mirror C/I/A
      sc = vc;
      si = vi;
      sa = va;
    } else {
      // No split
      sc = 0;
      si = 0;
      sa = 0;
    }
  } else {
    // CVSS 4.0: use SC/SI/SA directly
    sc = getSeverity(metrics, 'SC');
    si = getSeverity(metrics, 'SI');
    sa = getSeverity(metrics, 'SA');
  }

  const hasAnySub = sc > 0 || si > 0 || sa > 0;
  const atPresent = at < 0.5;

  const cx = 60,
    cy = 60;
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
  const starInnerR = starOuterR * (0.55 - ac * 0.35);

  // PR stroke
  const prRaw = metrics.PR;
  const prStrokeWidth = prRaw === 'H' ? 3.5 : prRaw === 'L' ? 1.5 : 0;

  // UI spikes/bumps
  const uiRaw = metrics.UI;
  const spikeBase = hueRingR + ringWidth / 2 - 0.5;

  // Star fill — match the outer hue ring color
  const sfSat = sat;
  const sfLight = 52 * light;
  const sfAlpha = 1;

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
  parts.push(
    `<defs><radialGradient id="${gradId}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${starOuterR}">`,
  );
  parts.push(
    `<stop offset="0%" stop-color="hsla(${hue}, ${sfSat * 1.1}%, ${sfLight + 10}%, ${sfAlpha})"/>`,
  );
  parts.push(`<stop offset="100%" stop-color="hsla(${hue}, ${sfSat}%, ${sfLight}%, ${sfAlpha})"/>`);
  parts.push(`</radialGradient></defs>`);

  // Z-order 1: UI:N Spikes
  if (uiRaw === 'N') {
    for (let i = 0; i < petalCount; i++) {
      const a = (Math.PI * 2 * i) / petalCount - Math.PI / 2;
      const x1 = cx + Math.cos(a) * spikeBase;
      const y1 = cy + Math.sin(a) * spikeBase;
      const x2 = cx + Math.cos(a) * (spikeBase + 3.4);
      const y2 = cy + Math.sin(a) * (spikeBase + 3.4);
      parts.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="hsl(${hue}, ${sat}%, ${52 * light}%)" stroke-width="3.0" stroke-linecap="round"/>`,
      );
    }
  }

  // Z-order 2: UI:P Bumps
  if (uiRaw === 'P') {
    const bumpR = 4.6;
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
      parts.push(
        `<path d="M${x1},${y1} A${bumpR},${bumpR} 0 0,1 ${x2},${y2} Z" fill="hsl(${hue}, ${sat}%, ${52 * light}%)"/>`,
      );
    }
  }

  // Z-order 3: Background circle (transparent)
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none"/>`);

  // Z-order 3.5: E (Exploit Maturity) marker — CVSS 4.0 only, behind the star
  // A (Attacked) → concentric rings at 0.5 opacity
  // P (PoC)      → solid filled circle at 0.3 opacity
  // U / X        → no marker
  const eRaw = isVersion3(version) ? undefined : metrics.E;
  if (eRaw === 'A' || eRaw === 'P') {
    const eCircleR = innerR - ringGap;
    const eRingGap = ringGap * 3;
    if (eRaw === 'A') {
      const eColor = `hsla(${hue}, ${sat}%, ${52 * light}%, 0.5)`;
      const sw = ringWidth;
      const step = sw + eRingGap;
      let r = eCircleR - sw / 2;
      while (r - sw / 2 > 0) {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${eColor}" stroke-width="${sw}"/>`,
        );
        r -= step;
      }
    } else {
      // E:P → solid filled circle
      parts.push(
        `<circle cx="${cx}" cy="${cy}" r="${eCircleR}" fill="hsla(${hue}, ${sat}%, ${52 * light}%, 0.375)"/>`,
      );
    }
  }

  // Z-order 4: Star fill
  const starD = starPath(cx, cy, petalCount, starOuterR, starInnerR);
  parts.push(`<path d="${starD}" fill="url(#${gradId})" stroke="none"/>`);

  // Z-order 5: Star stroke (PR:N = no stroke)
  if (prStrokeWidth > 0) {
    parts.push(
      `<path d="${starD}" fill="none" stroke="hsl(${(hue + 10) % 360}, ${sat * 0.8}%, ${52 * light + 10}%)" stroke-width="${prStrokeWidth}" stroke-linejoin="round"/>`,
    );
  }

  // Z-order 6 & 7: CIA ring sectors (with AT:P clip-path if segmented)
  if (atPresent) {
    // Build a clip-path that keeps only the visible segments (gaps between cuts)
    const clipId = 'at-' + simpleHash(vector);
    let clipPaths = '';
    for (const sec of sectors) {
      const cuts = radialCuts(sec.s, sec.e, cutWidthDeg, cutGapDeg);
      // Visible segments are the gaps between cuts
      let prevEnd = sec.s;
      for (const cut of cuts) {
        if (cut.startDeg > prevEnd) {
          clipPaths += `<path d="${arcPath(cx, cy, vulnInnerR - 1, outerR + 1, prevEnd, cut.startDeg)}"/>`;
        }
        prevEnd = cut.endDeg;
      }
      if (prevEnd < sec.e) {
        clipPaths += `<path d="${arcPath(cx, cy, vulnInnerR - 1, outerR + 1, prevEnd, sec.e)}"/>`;
      }
    }
    parts.push(`<clipPath id="${clipId}">${clipPaths}</clipPath>`);
    parts.push(`<g clip-path="url(#${clipId})">`);
  }

  for (const sec of sectors) {
    // Vuln band (inner)
    const vulnBandOuter = hasAnySub ? vulnOuterR : outerR;
    parts.push(
      `<path d="${arcPath(cx, cy, vulnInnerR, vulnBandOuter, sec.s, sec.e)}" fill="${ringFill(sec.vuln, hue, sat, light)}"/>`,
    );

    // Sub band (outer) — only when split
    if (hasAnySub) {
      parts.push(
        `<path d="${arcPath(cx, cy, subInnerR, outerR, sec.s, sec.e)}" fill="${ringFill(sec.sub, hue, sat, light)}"/>`,
      );
    }
  }

  if (atPresent) {
    parts.push(`</g>`);
  }

  // Z-order 9: Outer hue ring
  parts.push(
    `<circle cx="${cx}" cy="${cy}" r="${hueRingR}" fill="none" stroke="hsl(${hue}, ${sat}%, ${52 * light}%)" stroke-width="${ringWidth}"/>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 120 120" style="overflow:visible">${parts.join('')}</svg>`;
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
