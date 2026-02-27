export interface RenderOptions {
  /** CVSS 4.0, CVSS 3.1, or CVSS 3.0 vector string */
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
  AT?: 'N' | 'P'; // Optional for CVSS 3.1
  PR: 'N' | 'L' | 'H';
  UI: 'N' | 'P' | 'A' | 'R'; // R for CVSS 3.1
  // CVSS 4.0 metrics
  VC?: 'H' | 'L' | 'N';
  VI?: 'H' | 'L' | 'N';
  VA?: 'H' | 'L' | 'N';
  SC?: 'H' | 'L' | 'N';
  SI?: 'H' | 'L' | 'N';
  SA?: 'H' | 'L' | 'N';
  // CVSS 3.1 metrics
  C?: 'H' | 'L' | 'N';
  I?: 'H' | 'L' | 'N';
  A?: 'H' | 'L' | 'N';
  S?: 'C' | 'U'; // Scope: Changed or Unchanged
}

export interface HueResult {
  hue: number;
  sat: number;
}
