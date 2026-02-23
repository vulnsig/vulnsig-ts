import type { HueResult } from './types.js';

export function scoreToHue(score: number): HueResult {
  const w = Math.max(0, Math.min(10, score)) / 10;

  // Yellow (low) → Orange (mid) → Dark Red (high)
  // Matching fetter-orb VulnScoreIcon color range:
  //   0 = yellow  hsl(45, 93%, 47%)
  //   5 = orange  hsl(25, 95%, 53%)
  //  10 = dark red hsl(0, 70%, 35%)
  let hue: number;
  if (w <= 0.5) {
    // yellow → orange: hue 45 → 25
    hue = 45 - (w / 0.5) * 20;
  } else {
    // orange → dark red: hue 25 → 0
    hue = 25 - ((w - 0.5) / 0.5) * 25;
  }

  const sat = 70 + (1 - w) * 25; // 95% at low → 70% at high
  return { hue, sat };
}
