import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, Lock, AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import { AuditEntry } from '../types';

interface AuditLogProps {
  auditLog: AuditEntry[];
  reviewerName: string;
}

export const AuditLogView: React.FC<AuditLogProps> = ({ auditLog, reviewerName }) => {
  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [tamperedIndex, setTamperedIndex] = useState<number | null>(null);

  const handleSimulateTamper = () => {
    setIsTampered(true);
    setTamperedIndex(1); // Tamper with entry #2
  };

  const handleReset = () => {
    setIsTampered(false);
    setTamperedIndex(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Ledger Status */}
      <div className="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            {isTampered ? (
              <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            )}
            <h2 className="text-base font-extrabold text-slate-900">
              Immutable Cryptographic Audit Ledger (SHA-256)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Every inspection, triage override, harmless marking, and condition adaptation is cryptographically signed and chained with SHA-256 hashes according to Section 9.3.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center space-x-1.5 ${
            isTampered
              ? 'bg-rose-100 text-rose-800 border border-rose-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}>
            <Lock className="w-3.5 h-3.5" />
            <span>{isTampered ? 'CHAIN BROKEN · TAMPER DETECTED' : 'CHAIN INTACT · 100% VERIFIED'}</span>
          </div>

          {!isTampered ? (
            <button
              onClick={handleSimulateTamper}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 transition font-semibold"
            >
              Simulate Block Tamper
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
            >
              Restore Chain Integrity
            </button>
          )}
        </div>
      </div>

      {/* Audit Blocks Timeline / Cards */}
      <div className="space-y-3">
        {auditLog.map((entry, idx) => {
          const isThisBlockTampered = isTampered && idx === tamperedIndex;
          const isAffectedDownstream = isTampered && tamperedIndex !== null && idx > tamperedIndex;

          return (
            <div
              key={entry.id}
              className={`p-4 rounded-xl border transition-all ${
                isThisBlockTampered
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
                  : isAffectedDownstream
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-white/80 border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-slate-400">#{entry.id}</span>
                  <span className="text-xs font-extrabold text-slate-900 px-2 py-0.5 rounded bg-slate-100">
                    {entry.action}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    by <strong className="text-slate-800">{entry.actor}</strong>
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
                  <span>{entry.ts}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isThisBlockTampered
                      ? 'bg-rose-200 text-rose-900'
                      : isAffectedDownstream
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isThisBlockTampered ? 'HASH MISMATCH' : isAffectedDownstream ? 'INVALID PREV_HASH' : 'VALID'}
                  </span>
                </div>
              </div>

              {/* Payload code block */}
              <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto mb-2">
                {isThisBlockTampered ? (
                  <span className="text-rose-300">
                    {entry.payload.replace('"alpha": 0.05', '"alpha": 0.25 (MALICIOUSLY TAMPERED!)')}
                  </span>
                ) : (
                  <span>{entry.payload}</span>
                )}
              </div>

              {/* Hash Chain Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
                <div className="truncate">
                  <span className="font-semibold text-slate-400">prev_hash: </span>
                  <span className="text-slate-600">{entry.prev_hash}</span>
                </div>
                <div className="truncate">
                  <span className="font-semibold text-slate-400">block_hash: </span>
                  <span className={isThisBlockTampered ? 'text-rose-600 font-bold' : 'text-indigo-600 font-semibold'}>
                    {isThisBlockTampered ? 'TAMPERED_HASH_INVALID_CHECKSUM' : entry.hash}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
