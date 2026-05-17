import type { ParsedMetrics } from './types.js';

export type CVSSVersion = '2.0' | '3.0' | '3.1' | '4.0';

export const METRIC_DEFS: Record<string, { severity: Record<string, number> }> = {
  AV: { severity: { N: 1.0, A: 0.7, L: 0.4, P: 0.15 } },
  AC: { severity: { L: 1.0, M: 0.7, H: 0.4 } }, // M for CVSS 2.0
  AT: { severity: { N: 1.0, P: 0.4 } },
  PR: { severity: { N: 1.0, L: 0.6, H: 0.2 } },
  UI: { severity: { N: 1.0, P: 0.6, A: 0.2, R: 0.2 } }, // R for CVSS 3.0/3.1
  // CVSS 2.0 Authentication — shape mirrors PR so the stroke-width branch reuses it
  Au: { severity: { N: 1.0, S: 0.6, M: 0.2 } },
  VC: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  VI: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  VA: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SC: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SI: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SA: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  // CVSS 3.x C/I/A use H/L/N; CVSS 2.0 uses C/P/N — both letter sets resolve here.
  C: { severity: { H: 1.0, C: 1.0, L: 0.5, P: 0.5, N: 0.0 } },
  I: { severity: { H: 1.0, C: 1.0, L: 0.5, P: 0.5, N: 0.0 } },
  A: { severity: { H: 1.0, C: 1.0, L: 0.5, P: 0.5, N: 0.0 } },
  S: { severity: { C: 1.0, U: 0.0 } }, // Scope: Changed or Unchanged
  // Exploit Maturity — superset of CVSS 4.0 (A/P/U/X) and CVSS 2.0 (U/POC/F/H/ND)
  E: { severity: { A: 1.0, H: 1.0, F: 0.8, P: 0.6, POC: 0.6, U: 0.2, X: 0.0, ND: 0.0 } },
  // CVSS 2.0 temporal / environmental — included so parseCVSS retains them.
  RL: { severity: { OF: 0.0, TF: 0.4, W: 0.7, U: 1.0, ND: 0.0 } },
  RC: { severity: { UC: 0.3, UR: 0.6, C: 1.0, ND: 0.0 } },
  CDP: { severity: { N: 0.0, L: 0.2, LM: 0.4, MH: 0.6, H: 1.0, ND: 0.0 } },
  TD: { severity: { N: 0.0, L: 0.3, M: 0.6, H: 1.0, ND: 0.0 } },
  CR: { severity: { L: 0.4, M: 0.7, H: 1.0, ND: 0.0 } },
  IR: { severity: { L: 0.4, M: 0.7, H: 1.0, ND: 0.0 } },
  AR: { severity: { L: 0.4, M: 0.7, H: 1.0, ND: 0.0 } },
};

// CVSS 2.0 is commonly written bare (no prefix), occasionally in parens, sometimes
// with a non-spec "CVSS:2.0/" prefix. Strip all of that to a canonical form.
export function normalizeV2Vector(vector: string): string {
  return vector
    .trim()
    .replace(/^\(/, '')
    .replace(/\)$/, '')
    .replace(/^CVSS:2\.0\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

export function parseCVSS(vector: string): ParsedMetrics {
  const version = detectCVSSVersion(vector);
  const body = version === '2.0' ? normalizeV2Vector(vector) : vector;
  const m: Record<string, string> = {};
  for (const part of body.split('/')) {
    const [key, val] = part.split(':');
    if (METRIC_DEFS[key]) m[key] = val;
  }
  return m as unknown as ParsedMetrics;
}

export function detectCVSSVersion(vector: string): CVSSVersion {
  if (vector.startsWith('CVSS:3.1/')) {
    return '3.1';
  } else if (vector.startsWith('CVSS:3.0/')) {
    return '3.0';
  } else if (vector.startsWith('CVSS:4.0/')) {
    return '4.0';
  } else if (vector.startsWith('CVSS:2.0/')) {
    return '2.0';
  } else if (!vector.startsWith('CVSS:') && looksLikeCvss2(vector)) {
    return '2.0';
  }
  throw new Error(
    `Unsupported CVSS version. Vector must start with 'CVSS:2.0/', 'CVSS:3.0/', 'CVSS:3.1/', or 'CVSS:4.0/', or be a bare CVSS 2.0 vector.`,
  );
}

// CVSS 2.0 base vectors always include AV, AC, Au, C, I, A. Require at least the
// v2-distinctive Au token plus one CIA token so random strings still throw.
function looksLikeCvss2(vector: string): boolean {
  const body = normalizeV2Vector(vector);
  const tokens = new Set<string>();
  for (const part of body.split('/')) {
    const key = part.split(':')[0];
    if (key) tokens.add(key);
  }
  return tokens.has('Au') && tokens.has('AV') && tokens.has('AC');
}

export function isVersion3(version: CVSSVersion): boolean {
  return version === '3.0' || version === '3.1';
}

export function isVersion2(version: CVSSVersion): boolean {
  return version === '2.0';
}

export function getSeverity(metrics: ParsedMetrics, key: string): number {
  const def = METRIC_DEFS[key];
  const val = (metrics as unknown as Record<string, string>)[key];
  if (!def || !val) return 0;
  return def.severity[val] ?? 0;
}
