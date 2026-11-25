import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroWelcome } from './components/HeroWelcome';
import { InspectorView } from './components/InspectorView';
import { LineMonitorView } from './components/LineMonitorView';
import { CalibrationLabView } from './components/CalibrationLabView';
import { ConditionAdaptorView } from './components/ConditionAdaptorView';
import { AuditLogView } from './components/AuditLogView';
import { DefectFamiliesView } from './components/DefectFamiliesView';
import { ReportModal } from './components/ReportModal';
import { INITIAL_AUDIT_LOG, INITIAL_CONDITIONS, CURATED_SAMPLES } from './data/samples';
import { AuditEntry, Condition, InspectionResult } from './types';
import { sha256 } from './core/engine';
import { checkBackendHealth, getConditions, getAuditTrail, adaptConditionApi } from './api/client';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('hero');
  const [reviewerName, setReviewerName] = useState<string>('');
  const [selectedSampleId, setSelectedSampleId] = useState<string>('sample-normal');
  const [conditions, setConditions] = useState<Condition[]>(INITIAL_CONDITIONS);
  const [activeConditionId, setActiveConditionId] = useState<number>(1);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(INITIAL_AUDIT_LOG);
  const [activeReportResult, setActiveReportResult] = useState<InspectionResult | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  // Check backend health & sync initial data
  useEffect(() => {
    async function syncBackend() {
      const health = await checkBackendHealth();
      setBackendConnected(health.connected);

      if (health.connected) {
        try {
          const remoteConds = await getConditions();
          if (remoteConds && remoteConds.length > 0) {
            setConditions(remoteConds);
            const active = remoteConds.find((c: any) => c.active);
            if (active) setActiveConditionId(active.id);
          }
        } catch (e) {
          // Keep local fallback
        }

        try {
          const remoteAudit = await getAuditTrail();
          if (remoteAudit && remoteAudit.length > 0) {
            setAuditLog(remoteAudit);
          }
        } catch (e) {
          // Keep local fallback
        }
      }
    }

    syncBackend();
    const interval = setInterval(syncBackend, 8000);
    return () => clearInterval(interval);
  }, []);

  const activeCondition = conditions.find(c => c.id === activeConditionId) || conditions[0];

  // Cryptographic audit logger
  const handleAddAuditLog = async (action: string, entity: string, entityId: number, payloadObj: any) => {
    const payloadStr = JSON.stringify(payloadObj);
    const prevEntry = auditLog[auditLog.length - 1];
    const prevHash = prevEntry ? prevEntry.hash : '0'.repeat(64);
    
    // Hash = SHA256(prev_hash + body)
    const newHash = await sha256(prevHash + payloadStr);

    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    const newEntry: AuditEntry = {
      id: auditLog.length + 101,
      ts: timeStr,
      actor: reviewerName || 'Inspector',
      action,
      entity,
      entity_id: entityId,
      payload: payloadStr,
      prev_hash: prevHash,
      hash: newHash,
      verified: true
    };

    setAuditLog(prev => [...prev, newEntry]);
  };

  const handleActivateCondition = (id: number) => {
    setActiveConditionId(id);
    setConditions(prev => prev.map(c => ({
      ...c,
      active: c.id === id
    })));

    const cond = conditions.find(c => c.id === id);
    if (cond) {
      handleAddAuditLog('SWITCH_CONDITION_POINTER', 'conditions', id, {
        active_condition: cond.name,
        threshold: cond.threshold,
        reviewer: reviewerName
      });
    }
  };

  const handleSelectSampleFromHero = (sampleId: string) => {
    setSelectedSampleId(sampleId);
    setActiveTab('inspect');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-brand-100 selection:text-brand-900">
      {/* Navigation Bar */}
      <Header
        activeTab={activeTab === 'hero' ? 'inspect' : activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        reviewerName={reviewerName}
        activeConditionName={activeCondition.name}
        backendConnected={backendConnected}
        onOpenReport={() => {
          const sample = CURATED_SAMPLES.find(s => s.id === selectedSampleId) || CURATED_SAMPLES[0];
          setActiveReportResult(sample.result);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'hero' && (
          <HeroWelcome
            reviewerName={reviewerName}
            setReviewerName={setReviewerName}
            onEnterWorkspace={() => {
              setActiveTab('inspect');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectSample={handleSelectSampleFromHero}
          />
        )}

        {activeTab === 'inspect' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2">
              <button
                onClick={() => setActiveTab('hero')}
                className="hover:text-slate-900 font-semibold underline underline-offset-4 transition"
              >
                ← Back to Welcome Screen
              </button>
              <div className="flex items-center space-x-2">
                <span>Logged in as <strong>{reviewerName || 'Reviewer'}</strong></span>
                {backendConnected ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Live FastAPI Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Sim Mode
                  </span>
                )}
              </div>
            </div>

            <InspectorView
              reviewerName={reviewerName}
              selectedSampleId={selectedSampleId}
              backendConnected={backendConnected}
              onSelectSampleId={setSelectedSampleId}
              onAddAuditLog={handleAddAuditLog}
              onOpenReport={(res) => setActiveReportResult(res)}
            />
          </div>
        )}

        {activeTab === 'monitor' && <LineMonitorView />}

        {activeTab === 'calibration' && <CalibrationLabView />}

        {activeTab === 'adapt' && (
          <ConditionAdaptorView
            conditions={conditions}
            activeConditionId={activeConditionId}
            onActivateCondition={handleActivateCondition}
            onAddAuditLog={handleAddAuditLog}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogView
            auditLog={auditLog}
            reviewerName={reviewerName}
          />
        )}

        {activeTab === 'families' && <DefectFamiliesView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/60 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong>PROMETHEUS-X</strong> · Open-Set RGB Steel Surface Inspection & Epistemic Trust Platform
          </p>
          <p className="font-mono text-slate-400">
            SteelBlastQC (512×512 RGB) · Frozen WideResNet50_2 · FastAPI Backend (Port 8000)
          </p>
        </div>
      </footer>

      {/* Report / Certificate Modal */}
      {activeReportResult && (
        <ReportModal
          result={activeReportResult}
          reviewerName={reviewerName}
          onClose={() => setActiveReportResult(null)}
        />
      )}
    </div>
  );
}
