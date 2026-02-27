import type { ParsedMetrics } from './types.js';

export const METRIC_DEFS: Record<string, { severity: Record<string, number> }> = {
  AV: { severity: { N: 1.0, A: 0.7, L: 0.4, P: 0.15 } },
  AC: { severity: { L: 1.0, H: 0.4 } },
  AT: { severity: { N: 1.0, P: 0.4 } },
  PR: { severity: { N: 1.0, L: 0.6, H: 0.2 } },
  UI: { severity: { N: 1.0, P: 0.6, A: 0.2, R: 0.2 } }, // R for CVSS 3.0/3.1
  VC: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  VI: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  VA: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SC: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SI: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SA: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  // CVSS 3.0/3.1 metrics (C/I/A without V prefix, S for scope)
  C: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  I: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  A: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  S: { severity: { C: 1.0, U: 0.0 } }, // Scope: Changed or Unchanged
};

export function parseCVSS(vector: string): ParsedMetrics {
  const m: Record<string, string> = {};
  for (const part of vector.split('/')) {
    const [key, val] = part.split(':');
    if (METRIC_DEFS[key]) m[key] = val;
  }
  return m as unknown as ParsedMetrics;
}

export function detectCVSSVersion(vector: string): '3.0' | '3.1' | '4.0' {
  if (vector.startsWith('CVSS:3.1/')) {
    return '3.1';
  } else if (vector.startsWith('CVSS:3.0/')) {
    return '3.0';
  } else if (vector.startsWith('CVSS:4.0/')) {
    return '4.0';
  }
  throw new Error(
    `Unsupported CVSS version. Vector must start with 'CVSS:3.0/', 'CVSS:3.1/', or 'CVSS:4.0/'`,
  );
}

export function isVersion3(version: '3.0' | '3.1' | '4.0'): boolean {
  return version === '3.0' || version === '3.1';
}

export function getSeverity(metrics: ParsedMetrics, key: string): number {
  const def = METRIC_DEFS[key];
  const val = (metrics as unknown as Record<string, string>)[key];
  if (!def || !val) return 0;
  return def.severity[val] ?? 0;
}
