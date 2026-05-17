export interface RenderOptions {
  /** CVSS 4.0, 3.1, 3.0, or 2.0 vector string */
  vector: string;
  /** Explicit score override (0-10). Auto-calculated when null. */
  score?: number | null;
  /** Rendered size in pixels. Default: 120 */
  size?: number;
}

export interface ParsedMetrics {
  AV: 'N' | 'A' | 'L' | 'P';
  AC: 'L' | 'M' | 'H'; // M only in CVSS 2.0
  AT?: 'N' | 'P'; // CVSS 4.0
  PR?: 'N' | 'L' | 'H'; // CVSS 3.x / 4.0
  UI?: 'N' | 'P' | 'A' | 'R'; // R for CVSS 3.x; absent in CVSS 2.0
  // CVSS 4.0 metrics
  VC?: 'H' | 'L' | 'N';
  VI?: 'H' | 'L' | 'N';
  VA?: 'H' | 'L' | 'N';
  SC?: 'H' | 'L' | 'N';
  SI?: 'H' | 'L' | 'N';
  SA?: 'H' | 'L' | 'N';
  // CVSS 3.x C/I/A use H/L/N; CVSS 2.0 uses C/P/N
  C?: 'H' | 'L' | 'N' | 'C' | 'P';
  I?: 'H' | 'L' | 'N' | 'C' | 'P';
  A?: 'H' | 'L' | 'N' | 'C' | 'P';
  S?: 'C' | 'U'; // Scope: Changed or Unchanged (CVSS 3.x)
  // CVSS 2.0 Authentication
  Au?: 'N' | 'S' | 'M';
  // Exploit Maturity — CVSS 4.0 uses A/P/U/X; CVSS 2.0 uses U/POC/F/H/ND
  E?: 'A' | 'P' | 'U' | 'X' | 'POC' | 'F' | 'H' | 'ND';
  // CVSS 2.0 temporal
  RL?: 'OF' | 'TF' | 'W' | 'U' | 'ND';
  RC?: 'UC' | 'UR' | 'C' | 'ND';
  // CVSS 2.0 environmental
  CDP?: 'N' | 'L' | 'LM' | 'MH' | 'H' | 'ND';
  TD?: 'N' | 'L' | 'M' | 'H' | 'ND';
  CR?: 'L' | 'M' | 'H' | 'ND';
  IR?: 'L' | 'M' | 'H' | 'ND';
  AR?: 'L' | 'M' | 'H' | 'ND';
}

export interface HueResult {
  hue: number;
  sat: number;
  light: number; // multiplier: >1 lighter (low scores), <1 darker (high scores)
}
