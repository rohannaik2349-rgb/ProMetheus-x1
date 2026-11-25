import { Decision, Triage, SeverityLevel } from '../types';

// SHA-256 hash calculation using Web Crypto API
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Config defaults matching default.yaml in Section 4 of MD
export const CONFIG = {
  seed: 42,
  tile_size: 256,
  tile_stride: 224,
  coreset_fraction: 0.10,
  alpha: 0.05,
  alpha_pass: 0.10,
  alpha_reject: 0.02,
  min_region_area: 40,
  pixel_quantile: 0.999,
  severity_weights: [0.5, 0.4, 0.1], // [w_A, w_I, w_C]
  severity_refs: { A_ref: 0.02, I_ref: 1.0, C_ref: 5 },
  severity_cuts: [0.33, 0.66], // Low < 0.33 <= Medium < 0.66 <= High
  suppress_radius: 0.5,
  suppress_factor: 0.5,
  n_calib: 41
};

// Empirical calibration scores from 41 clean calibration-normal samples
export const CALIBRATION_SCORES: number[] = [
  0.78, 0.82, 0.85, 0.89, 0.92, 0.96, 1.01, 1.04, 1.08, 1.12,
  1.15, 1.18, 1.21, 1.24, 1.28, 1.31, 1.35, 1.38, 1.42, 1.46,
  1.49, 1.52, 1.56, 1.59, 1.63, 1.67, 1.71, 1.75, 1.78, 1.82,
  1.85, 1.89, 1.93, 1.97, 2.01, 2.04, 2.06, 2.08, 2.09, 2.10, 2.11
];

// Conformal p-value calculation (Section 7.5)
export function computePValue(score: number, calibScores: number[] = CALIBRATION_SCORES): number {
  const countGreaterOrEqual = calibScores.filter(s => s >= score).length;
  return (1 + countGreaterOrEqual) / (calibScores.length + 1);
}

// Conformal threshold at alpha (Section 7.5)
export function computeThreshold(alpha: number, calibScores: number[] = CALIBRATION_SCORES): number {
  const sorted = [...calibScores].sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.ceil((n + 1) * (1 - alpha));
  if (k > n) return sorted[n - 1];
  return sorted[k - 1];
}

// Severity computation matching Section 7.6
export function computeSeverity(
  regs: { area_px: number }[],
  totalArea: number = 512 * 512,
  peakIntensityRatio: number = 1.0
): { score: number; level: SeverityLevel; breakdown: { A_term: number; I_term: number; C_term: number } } {
  if (!regs || regs.length === 0) {
    return {
      score: 0.0,
      level: 'None',
      breakdown: { A_term: 0, I_term: 0, C_term: 0 }
    };
  }

  const totalDefectArea = regs.reduce((sum, r) => sum + r.area_px, 0);
  const A = totalDefectArea / totalArea;
  const I = peakIntensityRatio;
  const C = regs.length;

  const { A_ref, I_ref, C_ref } = CONFIG.severity_refs;
  const [w0, w1, w2] = CONFIG.severity_weights;

  const A_term = w0 * Math.min(A / A_ref, 1.0);
  const I_term = w1 * Math.min(Math.max(I - 1.0, 0) / I_ref, 1.0);
  const C_term = w2 * Math.min(C / C_ref, 1.0);

  const S = Math.min(A_term + I_term + C_term, 1.0);
  const [lo, hi] = CONFIG.severity_cuts;
  const level: SeverityLevel = S < lo ? 'Low' : S < hi ? 'Medium' : 'High';

  return {
    score: Number(S.toFixed(2)),
    level,
    breakdown: {
      A_term: Number(A_term.toFixed(3)),
      I_term: Number(I_term.toFixed(3)),
      C_term: Number(C_term.toFixed(3))
    }
  };
}

// Decision & Triage table matching Section 7.8
export function evaluateDecision(
  score: number,
  threshold: number,
  shiftScore: number,
  shiftThreshold: number,
  concentration: number,
  concentrationThreshold: number,
  isConditionUnknown: boolean = false
): Decision {
  const anomalous = score > threshold;
  const shifted = shiftScore > shiftThreshold || isConditionUnknown;
  const localized = concentration >= concentrationThreshold;

  if (!anomalous && !shifted) return 'NORMAL';
  if (!anomalous && shifted) return 'SHIFT_WARNING';
  if (anomalous && !shifted) return 'DEFECT';
  if (anomalous && shifted && !localized) return 'SHIFT_HOLD';
  return 'DEFECT_LOW_TRUST';
}

export function evaluateTriage(
  decision: Decision,
  pValue: number,
  severityLevel: SeverityLevel,
  aPass = CONFIG.alpha_pass,
  aReject = CONFIG.alpha_reject
): Triage {
  if (decision === 'NORMAL' && pValue >= aPass) return 'PASS';
  if (decision === 'DEFECT' && pValue <= aReject && (severityLevel === 'Medium' || severityLevel === 'High')) {
    return 'REJECT';
  }
  return 'REVIEW';
}
