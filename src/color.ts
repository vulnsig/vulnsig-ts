import type { HueResult } from './types.js';

export function scoreToHue(score: number): HueResult {
  const w = score / 10;
  let hue: number;

  if (w <= 0.1) hue = 175;
  else if (w <= 0.25) hue = 175 + ((w - 0.1) / 0.15) * 30;
  else if (w <= 0.4) hue = 205 + ((w - 0.25) / 0.15) * 40;
  else if (w <= 0.55) hue = 245 + ((w - 0.4) / 0.15) * 30;
  else if (w <= 0.7) hue = 275 + ((w - 0.55) / 0.15) * 40;
  else if (w <= 0.8) hue = 315 + ((w - 0.7) / 0.1) * 30;
  else if (w <= 0.9) hue = 345 + ((w - 0.8) / 0.1) * 20;
  else hue = 5 + ((w - 0.9) / 0.1) * 35;

  if (hue >= 360) hue -= 360;

  const sat = 60 + w * 25;
  return { hue, sat };
}
