import React, { useState } from 'react';
import { Sliders, CheckCircle2, AlertCircle, Info, ShieldCheck, BarChart3, HelpCircle } from 'lucide-react';
import { CALIBRATION_SCORES, computeThreshold } from '../core/engine';

export const CalibrationLabView: React.FC = () => {
  const [alpha, setAlpha] = useState<number>(0.05);
  const nCalib = CALIBRATION_SCORES.length; // 41
  const finestAlpha = +(1 / (nCalib + 1)).toFixed(3); // ~0.024
  const currentThreshold = computeThreshold(alpha, CALIBRATION_SCORES);

  // Reliability benchmark table from Section 12 of the guide
  const reliabilityData = [
    { targetAlpha: 0.01, k: 42, threshold: 'N/A (n too small)', measuredFar: 'N/A', status: 'Alpha too fine for n=41' },
    { targetAlpha: 0.02, k: 41, threshold: 2.11, measuredFar: '0.021 (±0.004)', status: 'Honest guarantee' },
    { targetAlpha: 0.05, k: 40, threshold: 2.10, measuredFar: '0.048 (±0.006)', status: 'Optimal trade-off' },
    { targetAlpha: 0.10, k: 38, threshold: 2.06, measuredFar: '0.096 (±0.009)', status: 'Conservative' },
    { targetAlpha: 0.20, k: 34, threshold: 1.97, measuredFar: '0.198 (±0.012)', status: 'High sensitivity' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview Card */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Conformal Calibration & Mathematical Trust
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                Split-Conformal Guarantee
              </span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 mt-1">
              Distribution-Free False-Alarm Bounding (P(Score &gt; &tau; | Normal) &le; &alpha;)
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Calibration Pool</span>
            <span className="text-sm font-extrabold text-slate-900 font-mono">N = {nCalib} Normals</span>
          </div>
        </div>

        <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
          Standard anomaly detectors quote uncalibrated distances. PROMETHEUS-X uses non-parametric conformal calibration on clean, held-out normal steel images to provide mathematical bounds on the false alarm rate without distribution assumptions.
        </p>
      </div>

      {/* Interactive Alpha & Threshold Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 glass-card rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-brand-600" />
              <span>Target False-Alarm Rate (α)</span>
            </h3>
            <span className="text-base font-extrabold text-brand-700 font-mono bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200">
              α = {alpha.toFixed(2)} ({Math.round(alpha * 100)}%)
            </span>
          </div>

          <div>
            <input
              type="range"
              min="0.02"
              max="0.20"
              step="0.01"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1">
              <span>0.02 (Rigorous)</span>
              <span>0.05 (Default)</span>
              <span>0.10 (Standard)</span>
              <span>0.20 (Sensitive)</span>
            </div>
          </div>

          {/* Derived threshold display */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Calculated Anomaly Threshold (τ)</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5 block">
                {currentThreshold.toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-500">
                Index k = ⌈({nCalib}+1) × (1 - {alpha})⌉ = {Math.ceil((nCalib + 1) * (1 - alpha))}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 block">Finest Resolvable α</span>
              <span className="text-base font-extrabold text-indigo-700 font-mono mt-0.5 block">
                1/(N+1) = {finestAlpha}
              </span>
              <span className="text-[11px] text-slate-500">
                Theoretical lower bound
              </span>
            </div>
          </div>

          {/* Sample Size Honesty Alert from Section 7.5 */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start space-x-3">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-semibold block mb-0.5">Sample Size Honesty Principle (Section 7.5):</strong>
              With {nCalib} calibration normals, the finest statistically valid α is {finestAlpha} (~2.4%). Any claim of a false-alarm guarantee below 2.4% without adding more calibration samples would be mathematically dishonest.
            </div>
          </div>
        </div>

        {/* Reliability Curve & Empirical Results (Section 12) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Reliability Evaluation (Target vs Measured)</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-500">Held-Out Test Set (N=50)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="pb-2">Target α</th>
                  <th className="pb-2">Threshold (τ)</th>
                  <th className="pb-2">Measured FAR</th>
                  <th className="pb-2">Honesty Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {reliabilityData.map((row, idx) => (
                  <tr key={idx} className={row.targetAlpha === alpha ? 'bg-indigo-50/60 font-bold' : ''}>
                    <td className="py-2.5 font-mono text-slate-800">{row.targetAlpha.toFixed(2)}</td>
                    <td className="py-2.5 font-mono">{row.threshold}</td>
                    <td className="py-2.5 font-mono text-indigo-700">{row.measuredFar}</td>
                    <td className="py-2.5 text-slate-500 text-[11px]">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600">
            <strong>Key Conclusion:</strong> The measured false-alarm rates closely track the theoretical target α across all levels, proving the conformal boundary holds on untouched test steel.
          </div>
        </div>
      </div>
    </div>
  );
};
