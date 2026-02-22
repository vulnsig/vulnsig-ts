export interface RenderOptions {
  /** CVSS 4.0 vector string */
  vector: string;
  /** Explicit score override (0-10). Auto-calculated when null. */
  score?: number | null;
  /** Rendered size in pixels. Default: 120 */
  size?: number;
  /** Show C/I/A sector labels when size >= 140. Default: true */
  showLabel?: boolean;
}

export interface ParsedMetrics {
  AV: 'N' | 'A' | 'L' | 'P';
  AC: 'L' | 'H';
  AT: 'N' | 'P';
  PR: 'N' | 'L' | 'H';
  UI: 'N' | 'P' | 'A';
  VC: 'H' | 'L' | 'N';
  VI: 'H' | 'L' | 'N';
  VA: 'H' | 'L' | 'N';
  SC?: 'H' | 'L' | 'N';
  SI?: 'H' | 'L' | 'N';
  SA?: 'H' | 'L' | 'N';
}

export interface HueResult {
  hue: number;
  sat: number;
}
