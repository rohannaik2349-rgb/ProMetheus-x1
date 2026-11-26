import React from 'react';
import { Layers, Grid, Target, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { DEFECT_FAMILIES } from '../data/samples';

export const DefectFamiliesView: React.FC = () => {
  // Synthetic CutPaste detection limit matrix: Recall % across Size vs Contrast (Section 10 Add-on B)
  const syntheticGrid = [
    { contrast: 'High (0.8)', size10: 92, size20: 100, size40: 100, size80: 100 },
    { contrast: 'Med (0.5)', size10: 74, size20: 96, size40: 100, size80: 100 },
    { contrast: 'Low (0.3)', size10: 38, size20: 78, size40: 94, size80: 100 },
    { contrast: 'Faint (0.15)', size10: 12, size20: 42, size40: 76, size80: 91 }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-brand-600" />
          <h2 className="text-base font-extrabold text-slate-900">
            Unsupervised Defect Families & Empirical Detection Limits
          </h2>
        </div>
      </div>

      {/* Grid: Families Cards + Synthetic Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Defect Families Cluster Cards (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
            <Target className="w-4 h-4 text-indigo-600" />
            <span>Discovered Defect Families (Cosine Embedding Space)</span>
          </h3>

          <div className="space-y-3">
            {DEFECT_FAMILIES.map((fam) => (
              <div key={fam.id} className="glass-card rounded-xl p-4 border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: fam.color }}
                    />
                    <h4 className="text-xs font-bold text-slate-900">{fam.name}</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {fam.count} Instances
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-2">{fam.description}</p>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                  <span>Avg Severity: <strong>{fam.avg_severity}</strong></span>
                  <span>Morphology: <span className="text-slate-700">{fam.sample_pattern}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Synthetic Detection Limit Matrix (6 cols) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <Grid className="w-4 h-4 text-emerald-600" />
              <span>Synthetic CutPaste Detection-Limit Matrix</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-500">1,200 Held-Out Trials</span>
          </div>

          <p className="text-xs text-slate-500">
            Empirical recall (%) as a function of defect pixel diameter vs optical contrast ratio:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="pb-2 text-left">Contrast Ratio</th>
                  <th className="pb-2">10px (~0.8mm)</th>
                  <th className="pb-2">20px (~1.6mm)</th>
                  <th className="pb-2">40px (~3.2mm)</th>
                  <th className="pb-2">80px (~6.4mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {syntheticGrid.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-3 text-left font-sans font-medium text-slate-700">{row.contrast}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        row.size10 >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        row.size10 >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {row.size10}%
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        row.size20 >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        row.size20 >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {row.size20}%
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        row.size40 >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        row.size40 >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {row.size40}%
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                        {row.size80}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
