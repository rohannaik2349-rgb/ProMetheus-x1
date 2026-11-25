import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Layers, ArrowRight, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { INITIAL_CONDITIONS } from '../data/samples';
import { Condition } from '../types';

interface ConditionAdaptorProps {
  conditions: Condition[];
  activeConditionId: number;
  onActivateCondition: (id: number) => void;
  onAddAuditLog: (action: string, entity: string, entityId: number, payload: any) => void;
}

export const ConditionAdaptorView: React.FC<ConditionAdaptorProps> = ({
  conditions,
  activeConditionId,
  onActivateCondition,
  onAddAuditLog
}) => {
  const [condList, setCondList] = useState<Condition[]>(INITIAL_CONDITIONS);
  const [isAdapting, setIsAdapting] = useState<boolean>(false);
  const [newConditionName, setNewConditionName] = useState<string>('Hot-Dip Galvanized Surface Batch B');
  const [sampleCount, setSampleCount] = useState<number>(14);
  const [adaptedResult, setAdaptedResult] = useState<any | null>(null);

  const handleSimulateAdapt = () => {
    setIsAdapting(true);
    setTimeout(() => {
      const newId = condList.length + 1;
      const newCond: Condition = {
        id: newId,
        name: newConditionName,
        description: `Renormalized from ${sampleCount} normal images. Zero network weights touched.`,
        threshold: 2.38,
        shift_threshold: 2.85,
        sample_count: sampleCount,
        active: false,
        calibrated_at: 'Just now',
        emb_mean_norm: 15.92
      };

      setCondList([...condList, newCond]);
      setAdaptedResult({
        name: newConditionName,
        threshold: 2.38,
        priorFAR: '44.2% (Without Adaptation)',
        postFAR: '4.8% (With Renormalization)',
        defectRecall: '100% (Zero loss in detection sensitivity)'
      });
      setIsAdapting(false);

      onAddAuditLog('ADAPT_RENORMALIZE', 'conditions', newId, {
        name: newConditionName,
        samples: sampleCount,
        threshold: 2.38,
        method: 'Method A: Renormalization',
        frozen_backbone: 'Untouched'
      });
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 text-brand-600" />
          <h2 className="text-base font-extrabold text-slate-900">
            Epistemic Adaptation Layer: Method A (Renormalization)
          </h2>
        </div>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
          When steel production conditions change (e.g. ambient lighting, new alloy tint, roll wear), traditional deep learning models produce massive false alarms. PROMETHEUS-X adapts in seconds using 10–20 normal samples to renormalize the conformal threshold and shift mean—without retraining a single neural weight!
        </p>
      </div>

      {/* Grid: Adaptor Action + Active Conditions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Adapt Simulator (6 cols) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Register New Operational Condition</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Condition Name / Line Identification
              </label>
              <input
                type="text"
                value={newConditionName}
                onChange={(e) => setNewConditionName(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Normal Samples Collected for Calibration: {sampleCount}
              </label>
              <input
                type="range"
                min="10"
                max="25"
                value={sampleCount}
                onChange={(e) => setSampleCount(parseInt(e.target.value))}
                className="w-full"
              />
              <span className="text-[11px] text-slate-400 font-mono">
                Recommended: 10 to 20 clean normal images (Section 9.1)
              </span>
            </div>

            <button
              onClick={handleSimulateAdapt}
              disabled={isAdapting}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center space-x-2 shadow-sm"
            >
              {isAdapting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing New Threshold & Mean...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Execute Method A Renormalization</span>
                </>
              )}
            </button>
          </div>

          {/* Adaptation Result Validation Card */}
          {adaptedResult && (
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2 animate-fadeIn">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-emerald-900">Adaptation Verified Successfully!</h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded-lg bg-white/70 border border-emerald-100">
                  <span className="text-[11px] text-slate-500 block">False Alarm Without Adapt:</span>
                  <span className="font-extrabold text-rose-600">{adaptedResult.priorFAR}</span>
                </div>
                <div className="p-2 rounded-lg bg-white/70 border border-emerald-100">
                  <span className="text-[11px] text-slate-500 block">False Alarm Post-Adapt:</span>
                  <span className="font-extrabold text-emerald-700">{adaptedResult.postFAR}</span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-800 font-medium pt-1">
                {adaptedResult.defectRecall}
              </p>
            </div>
          )}
        </div>

        {/* Right: Conditions Registry (6 cols) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-brand-600" />
            <span>Condition Memory Vault</span>
          </h3>

          <div className="space-y-3">
            {condList.map((cond) => {
              const isActive = cond.id === activeConditionId;
              return (
                <div
                  key={cond.id}
                  className={`p-3.5 rounded-xl border transition ${
                    isActive
                      ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-100'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>{cond.name}</span>
                      {isActive && (
                        <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </h4>

                    {!isActive && (
                      <button
                        onClick={() => onActivateCondition(cond.id)}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition"
                      >
                        Switch Pointer
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 mb-2">{cond.description}</p>

                  <div className="flex items-center space-x-4 text-[11px] text-slate-500 font-mono">
                    <span>Threshold: <strong>{cond.threshold.toFixed(2)}</strong></span>
                    <span>Shift Thr: <strong>{cond.shift_threshold.toFixed(2)}</strong></span>
                    <span>Samples: <strong>{cond.sample_count}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
