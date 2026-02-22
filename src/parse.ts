import type { ParsedMetrics } from './types.js';

export const METRIC_DEFS: Record<string, { severity: Record<string, number> }> = {
  AV: { severity: { N: 1.0, A: 0.7, L: 0.4, P: 0.15 } },
  AC: { severity: { L: 1.0, H: 0.4 } },
  AT: { severity: { N: 1.0, P: 0.4 } },
  PR: { severity: { N: 1.0, L: 0.6, H: 0.2 } },
  UI: { severity: { N: 1.0, P: 0.6, A: 0.2 } },
  VC: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  VI: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  VA: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SC: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SI: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
  SA: { severity: { H: 1.0, L: 0.5, N: 0.0 } },
};

export function parseCVSS(vector: string): ParsedMetrics {
  const m: Record<string, string> = {};
  for (const part of vector.split('/')) {
    const [key, val] = part.split(':');
    if (METRIC_DEFS[key]) m[key] = val;
  }
  return m as unknown as ParsedMetrics;
}

export function getSeverity(metrics: ParsedMetrics, key: string): number {
  const def = METRIC_DEFS[key];
  const val = (metrics as unknown as Record<string, string>)[key];
  if (!def || !val) return 0;
  return def.severity[val] ?? 0;
}
