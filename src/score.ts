import aeCvss from 'ae-cvss-calculator';
import { detectCVSSVersion, normalizeV2Vector } from './parse.js';

// ae-cvss-calculator is a CJS webpack bundle; the default export
// contains all named exports when imported from ESM.
const { Cvss4P0, Cvss3P1, Cvss3P0, Cvss2 } =
  aeCvss as unknown as typeof import('ae-cvss-calculator');

export function calculateScore(vector: string): number {
  try {
    const version = detectCVSSVersion(vector);

    if (version === '3.1') {
      const cvss = new Cvss3P1();
      cvss.applyVector(vector);
      return cvss.calculateScores().base ?? 5.0;
    } else if (version === '3.0') {
      const cvss = new Cvss3P0();
      cvss.applyVector(vector);
      return cvss.calculateScores().base ?? 5.0;
    } else if (version === '2.0') {
      const cvss = new Cvss2();
      cvss.applyVector(normalizeV2Vector(vector));
      const scores = cvss.calculateScores();
      return scores.overall ?? scores.base ?? 5.0;
    } else {
      // CVSS 4.0 (validated by detectCVSSVersion)
      const cvss = new Cvss4P0();
      cvss.applyVector(vector);
      return cvss.calculateScores().base ?? cvss.calculateScores().overall;
    }
  } catch {
    return 5.0;
  }
}
