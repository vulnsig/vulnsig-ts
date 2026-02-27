import type { HueResult } from './types.js';

export function scoreToHue(score: number): HueResult {
  const w = Math.max(0, Math.min(10, score)) / 10;

  // Light Yellow (low) → Orange (mid) → Dark Red (high)
  //   0 = light yellow  hsl(55, 95%, 55%)
  //   5 = orange         hsl(25, 95%, 53%)
  //  10 = dark red       hsl(0, 80%, 28%)
  let hue: number;
  if (w <= 0.5) {
    // light yellow → orange: hue 55 → 25
    hue = 55 - (w / 0.5) * 30;
  } else {
    // orange → dark red: hue 25 → 0
    hue = 25 - ((w - 0.5) / 0.5) * 25;
  }

  const sat = 85 + (1 - w) * 10; // 95% at low → 85% at high

  // Lightness multiplier: 1.2 at score 0 → 1.0 at score 5 → 0.55 at score 10
  // Makes high scores (8-10) visually darker and more distinguishable
  const light = 1.0 + (0.5 - w) * 0.9;

  return { hue, sat, light };
}
