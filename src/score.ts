import aeCvss from 'ae-cvss-calculator';

// ae-cvss-calculator is a CJS webpack bundle; the default export
// contains all named exports when imported from ESM.
const { Cvss4P0, Cvss3P1 } = aeCvss as unknown as typeof import('ae-cvss-calculator');

export function calculateScore(vector: string): number {
  try {
    // Detect CVSS version from vector string
    if (vector.includes('CVSS:3.1')) {
      const cvss = new Cvss3P1();
      cvss.applyVector(vector);
      return cvss.calculateScores().base ?? 5.0;
    } else {
      // Default to CVSS 4.0
      const cvss = new Cvss4P0();
      cvss.applyVector(vector);
      return cvss.calculateScores().base ?? cvss.calculateScores().overall;
    }
  } catch {
    return 5.0;
  }
}
