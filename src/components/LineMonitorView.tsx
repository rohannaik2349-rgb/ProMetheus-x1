import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Activity, AlertTriangle, CheckCircle, 
  TrendingUp, Zap, RefreshCw, AlertOctagon, Radio
} from 'lucide-react';

interface StreamEvent {
  id: number;
  time: string;
  score: number;
  threshold: number;
  shiftScore: number;
  concentration: number;
  decision: 'NORMAL' | 'DEFECT' | 'SHIFT_WARNING' | 'SHIFT_HOLD' | 'DEFECT_LOW_TRUST';
  triage: 'PASS' | 'REVIEW' | 'REJECT';
  severity: 'None' | 'Low' | 'Medium' | 'High';
  defectType?: string;
  coilType: 'clean' | 'rust' | 'weld' | 'scratch' | 'dimmed';
}

interface ConveyorCoil {
  uid: number;
  id: number;
  x: number; // -25 to 125 (% along track)
  scanned: boolean;
  type: 'clean' | 'rust' | 'weld' | 'scratch' | 'dimmed';
  decision: 'NORMAL' | 'DEFECT' | 'SHIFT_WARNING' | 'SHIFT_HOLD' | 'DEFECT_LOW_TRUST';
  triage: 'PASS' | 'REVIEW' | 'REJECT';
  severity: 'None' | 'Low' | 'Medium' | 'High';
  score: number;
  shiftScore: number;
  concentration: number;
  defectType?: string;
}

export const LineMonitorView: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [lineSpeed] = useState<number>(2.5); // base m/s
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0); // 0.5x, 1x, 2.5x, 5x
  
  const [coilsInspected, setCoilsInspected] = useState<number>(1842);
  const [defectCount, setDefectCount] = useState<number>(76);
  const [ewmaShift, setEwmaShift] = useState<number>(1.22);
  const [isDriftInjected, setIsDriftInjected] = useState<boolean>(false);
  const [emergencyHalt, setEmergencyHalt] = useState<boolean>(false);

  const [scannerPulse, setScannerPulse] = useState<{ active: boolean; decision: string; score: number }>({
    active: false,
    decision: 'NORMAL',
    score: 1.14
  });

  const [recentEvents, setRecentEvents] = useState<StreamEvent[]>([
    { id: 1842, time: '18:50:22', score: 1.14, threshold: 2.10, shiftScore: 1.15, concentration: 0.12, decision: 'NORMAL', triage: 'PASS', severity: 'None', coilType: 'clean' },
    { id: 1841, time: '18:50:18', score: 1.08, threshold: 2.10, shiftScore: 1.10, concentration: 0.10, decision: 'NORMAL', triage: 'PASS', severity: 'None', coilType: 'clean' },
    { id: 1840, time: '18:50:14', score: 3.84, threshold: 2.10, shiftScore: 1.35, concentration: 0.68, decision: 'DEFECT', triage: 'REJECT', severity: 'High', defectType: 'Corrosion Crust / Rust', coilType: 'rust' },
    { id: 1839, time: '18:50:10', score: 1.22, threshold: 2.10, shiftScore: 1.05, concentration: 0.15, decision: 'NORMAL', triage: 'PASS', severity: 'None', coilType: 'clean' },
    { id: 1838, time: '18:50:06', score: 2.28, threshold: 2.10, shiftScore: 4.86, concentration: 0.18, decision: 'SHIFT_HOLD', triage: 'REVIEW', severity: 'Low', defectType: 'Ambient Dimming (40%)', coilType: 'dimmed' },
    { id: 1837, time: '18:50:02', score: 2.92, threshold: 2.10, shiftScore: 1.18, concentration: 0.52, decision: 'DEFECT', triage: 'REVIEW', severity: 'Medium', defectType: 'Welding Seam Cut', coilType: 'weld' }
  ]);

  const [cusumHistory, setCusumHistory] = useState<number[]>([1.10, 1.15, 1.08, 1.22, 1.18, 1.25, 1.20, 1.28, 1.22]);

  // Generate a new coil specimen using Section 7.8 logic
  const createCoil = (id: number, x: number, driftActive: boolean): ConveyorCoil => {
    let coilType: 'clean' | 'rust' | 'weld' | 'scratch' | 'dimmed' = 'clean';
    let score = +(0.95 + Math.random() * 0.85).toFixed(2);
    let shift = +(1.05 + Math.random() * 0.45).toFixed(2);
    let concentration = +(0.10 + Math.random() * 0.15).toFixed(2);
    let defectType: string | undefined = undefined;

    if (driftActive) {
      coilType = 'dimmed';
      score = +(2.15 + Math.random() * 0.35).toFixed(2);
      shift = +(4.20 + Math.random() * 1.20).toFixed(2);
      concentration = +(0.14 + Math.random() * 0.10).toFixed(2);
      defectType = 'Ambient Optical Dimming (40%)';
    } else {
      const rand = Math.random();
      if (rand < 0.16) {
        coilType = 'rust';
        score = +(3.40 + Math.random() * 0.90).toFixed(2);
        concentration = +(0.60 + Math.random() * 0.25).toFixed(2);
        defectType = 'Corrosion Crust / Heavy Rust';
      } else if (rand < 0.26) {
        coilType = 'weld';
        score = +(2.80 + Math.random() * 0.50).toFixed(2);
        concentration = +(0.50 + Math.random() * 0.20).toFixed(2);
        defectType = 'Welding Seam Irregularity';
      } else if (rand < 0.34) {
        coilType = 'scratch';
        score = +(2.60 + Math.random() * 0.40).toFixed(2);
        concentration = +(0.48 + Math.random() * 0.18).toFixed(2);
        defectType = 'Longitudinal Surface Scratch';
      }
    }

    const thr = 2.10;
    const shiftThr = 2.45;
    const concThr = 0.42;
    const anomalous = score > thr;
    const shifted = shift > shiftThr;
    const localized = concentration >= concThr;

    let decision: ConveyorCoil['decision'];
    let triage: ConveyorCoil['triage'];
    let severity: ConveyorCoil['severity'];

    if (!anomalous && !shifted) {
      decision = 'NORMAL';
      triage = 'PASS';
      severity = 'None';
    } else if (!anomalous && shifted) {
      decision = 'SHIFT_WARNING';
      triage = 'REVIEW';
      severity = 'Low';
    } else if (anomalous && !shifted) {
      decision = 'DEFECT';
      severity = score > 3.3 ? 'High' : 'Medium';
      triage = severity === 'High' ? 'REJECT' : 'REVIEW';
    } else if (anomalous && shifted && !localized) {
      decision = 'SHIFT_HOLD';
      triage = 'REVIEW';
      severity = 'Low';
    } else {
      decision = 'DEFECT_LOW_TRUST';
      triage = 'REVIEW';
      severity = 'Medium';
    }

    return {
      uid: id,
      id,
      x,
      scanned: x >= 50,
      type: coilType,
      decision,
      triage,
      severity,
      score,
      shiftScore: shift,
      concentration,
      defectType
    };
  };

  // Continuous 3-coil belt state driven by requestAnimationFrame
  const [coils, setCoils] = useState<ConveyorCoil[]>(() => [
    createCoil(1843, 15, false),
    createCoil(1844, -32, false),
    createCoil(1845, -79, false),
  ]);

  // Refs for smooth 60fps animation without interval teardown
  const speedRef = useRef(speedMultiplier);
  const driftRef = useRef(isDriftInjected);
  const nextIdRef = useRef(1846);
  const ewmaRef = useRef(ewmaShift);
  const pulseTimerRef = useRef<number | null>(null);

  useEffect(() => { speedRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { driftRef.current = isDriftInjected; }, [isDriftInjected]);

  useEffect(() => {
    if (!isRunning || emergencyHalt) return;

    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000); // cap dt for tab-switch safety
      lastTime = now;

      // Base belt travel: 22% per second * speedMultiplier
      const dx = 22 * speedRef.current * dt;

      setCoils((prevCoils) => {
        const newlyScanned: ConveyorCoil[] = [];
        let minX = Math.min(...prevCoils.map(c => c.x));

        const updated = prevCoils.map((coil) => {
          const nextX = coil.x + dx;

          // Crossed scanner focal plane at x = 50%
          if (!coil.scanned && nextX >= 50) {
            const scannedCoil = { ...coil, x: nextX, scanned: true };
            newlyScanned.push(scannedCoil);
            return scannedCoil;
          }

          // Exited right edge -> recycle cleanly behind leftmost coil
          if (nextX >= 122) {
            const newId = nextIdRef.current++;
            const spawnX = Math.min(-24, minX - 47);
            minX = spawnX;
            return createCoil(newId, spawnX, driftRef.current);
          }

          return { ...coil, x: nextX };
        });

        // Commit scan events outside pure map
        if (newlyScanned.length > 0) {
          const latest = newlyScanned[newlyScanned.length - 1];
          setScannerPulse({ active: true, decision: latest.decision, score: latest.score });
          if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
          pulseTimerRef.current = window.setTimeout(() => {
            setScannerPulse((p) => ({ ...p, active: false }));
          }, Math.max(90, 220 / speedRef.current));

          setCoilsInspected((prev) => prev + newlyScanned.length);

          const defectsAdded = newlyScanned.filter(
            (c) => c.decision === 'DEFECT' || c.decision === 'DEFECT_LOW_TRUST'
          ).length;
          if (defectsAdded > 0) {
            setDefectCount((prev) => prev + defectsAdded);
          }

          const newEwma = +(0.85 * ewmaRef.current + 0.15 * latest.shiftScore).toFixed(2);
          ewmaRef.current = newEwma;
          setEwmaShift(newEwma);
          setCusumHistory((prev) => [...prev.slice(1), newEwma]);

          const timeStr = new Date().toTimeString().split(' ')[0];
          const newEvents: StreamEvent[] = newlyScanned.map((c) => ({
            id: c.id,
            time: timeStr,
            score: c.score,
            threshold: 2.10,
            shiftScore: c.shiftScore,
            concentration: c.concentration,
            decision: c.decision,
            triage: c.triage,
            severity: c.severity,
            defectType: c.defectType,
            coilType: c.type
          }));

          setRecentEvents((prev) => [...newEvents.reverse(), ...prev].slice(0, 12));
        }

        return updated;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, [isRunning, emergencyHalt]);

  const handleToggleDrift = () => {
    setIsDriftInjected(!isDriftInjected);
  };

  const handleAdaptBaseline = () => {
    setIsDriftInjected(false);
    ewmaRef.current = 1.15;
    setEwmaShift(1.15);
    setCusumHistory([1.10, 1.12, 1.08, 1.14, 1.10, 1.15, 1.12, 1.16, 1.15]);
  };

  const defectRate = ((defectCount / coilsInspected) * 100).toFixed(2);
  const actualVelocity = (lineSpeed * speedMultiplier).toFixed(1);
  const throughputPerHour = Math.round(180 * speedMultiplier * (isRunning && !emergencyHalt ? 1 : 0));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & High-Speed Controls */}
      <div className="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className={`w-3 h-3 rounded-full ${isRunning && !emergencyHalt ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              High-Speed Production Line Monitor (RGB Line-Scan Cam #01)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
              Line Velocity: {actualVelocity} m/s
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous steel coil strip monitoring · Split-conformal calibration &amp; CUSUM drift detection
          </p>
        </div>

        {/* Speed Multiplier & Line Interlock Controls */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSpeedMultiplier(0.5)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                speedMultiplier === 0.5 ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              0.5x
            </button>
            <button
              onClick={() => setSpeedMultiplier(1.0)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                speedMultiplier === 1.0 ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              1.0x
            </button>
            <button
              onClick={() => setSpeedMultiplier(2.5)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                speedMultiplier === 2.5 ? 'bg-white shadow-2xs text-indigo-700 font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              2.5x (High Speed)
            </button>
            <button
              onClick={() => setSpeedMultiplier(5.0)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                speedMultiplier === 5.0 ? 'bg-indigo-600 text-white shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              5.0x Turbo
            </button>
          </div>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`btn-magnetic inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              isRunning
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Feed' : 'Resume Feed'}</span>
          </button>

          <button
            onClick={() => setEmergencyHalt(!emergencyHalt)}
            className={`btn-magnetic inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition shadow-xs ${
              emergencyHalt
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{emergencyHalt ? 'Reset Interlock' : 'Emergency Stop'}</span>
          </button>
        </div>
      </div>

      {/* Emergency Stop Alert Banner */}
      {emergencyHalt && (
        <div className="p-4 rounded-2xl bg-rose-600 text-white flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center space-x-3">
            <AlertOctagon className="w-7 h-7 stroke-[2.5]" />
            <div>
              <h4 className="text-sm font-extrabold uppercase tracking-wide">
                Emergency Line Halt Active (Safety Interlock Engaged)
              </h4>
              <p className="text-xs text-rose-100">
                Conveyor belt and optical scanner are locked. Click &quot;Reset Interlock&quot; above to resume high-speed production.
              </p>
            </div>
          </div>
          <button
            onClick={() => setEmergencyHalt(false)}
            className="btn-magnetic px-4 py-2 rounded-xl bg-white text-rose-700 text-xs font-extrabold shadow"
          >
            Reset Interlock
          </button>
        </div>
      )}

      {/* Interactive Drift Demonstration Banner (Section 6 & 9.4) */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 ${
        isDriftInjected 
          ? 'bg-purple-900 text-white border-purple-700 shadow-lg' 
          : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              isDriftInjected ? 'bg-purple-500 text-white' : 'bg-indigo-600 text-white'
            }`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {isDriftInjected ? 'OPTICAL SHIFT INJECTED: 40% AMBIENT DIMMING ACTIVE' : 'Section 6 / 9.4 Interactive Drift Injection'}
                </h4>
                {isDriftInjected && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-400 text-purple-950 font-mono animate-pulse">
                    SHIFT_HOLD ENGAGED
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isDriftInjected ? 'text-purple-200' : 'text-slate-600'}`}>
                {isDriftInjected
                  ? 'Diffuse shift detected (Mahalanobis Score > 2.45). Trust layer prevents false defect rejects and pauses for adaptation!'
                  : 'Demonstrate how PROMETHEUS-X distinguishes true physical defects from optical lighting shifts.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isDriftInjected ? (
              <button
                onClick={handleToggleDrift}
                className="btn-magnetic px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs flex items-center space-x-1.5 whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 text-purple-200" />
                <span>Inject 40% Dimming</span>
              </button>
            ) : (
              <button
                onClick={handleAdaptBaseline}
                className="btn-magnetic px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold transition shadow-md flex items-center space-x-1.5 whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-100" />
                <span>Adapt Baseline (Section 9.1)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Coils Scanned</span>
          <span className="text-2xl font-extrabold text-slate-900 font-mono">{coilsInspected.toLocaleString()}</span>
          <span className="text-[11px] text-emerald-600 block mt-1 font-medium">99.8% Scanner Uptime</span>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Current Defect Rate</span>
          <span className="text-2xl font-extrabold text-rose-600 font-mono">{defectRate}%</span>
          <span className="text-[11px] text-slate-500 block mt-1 font-medium">{defectCount} Physical Defect Strips</span>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Shift Score (EWMA)</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              ewmaShift > 2.45 ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
            }`}>
              Limit: 2.45
            </span>
          </div>
          <span className={`text-2xl font-extrabold font-mono ${
            ewmaShift > 2.45 ? 'text-purple-700' : 'text-indigo-700'
          }`}>
            {ewmaShift.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1 font-medium">
            {ewmaShift > 2.45 ? 'DRIFT ALERT (CUSUM Exceeded)' : 'In-Distribution (Stable)'}
          </span>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Line Throughput</span>
          <span className="text-2xl font-extrabold text-slate-900 font-mono">{throughputPerHour}</span>
          <span className="text-[11px] text-slate-500 block mt-1 font-medium">
            Coils / Hr ({actualVelocity} m/s)
          </span>
        </div>
      </div>

      {/* HIGH-SPEED CONVEYOR & DUAL-BEAM OPTICAL SCANNER */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-cyan-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              High-Speed Optical Scanner Feed (Conveyor #4)
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Velocity: <strong>{actualVelocity} m/s</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300">
              60 FPS Optical Sync
            </span>
          </div>
        </div>

        {/* Conveyor track */}
        <div className="relative w-full h-44 rounded-2xl bg-slate-950 overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center">
          {/* Conveyor Bed Rollers background */}
          <div 
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 10px, #334155 10px, #334155 20px)'
            }}
          />

          {/* CONTINUOUS MOVING STEEL COILS (60fps rAF, zero CSS transition jitter) */}
          {coils.map((coil) => (
            <div
              key={coil.uid}
              className="absolute top-3 bottom-3 rounded-xl overflow-hidden shadow-2xl border border-slate-600 will-change-transform"
              style={{
                left: `${coil.x}%`,
                width: '260px',
                transform: 'translateX(-50%)',
                background: coil.type === 'rust'
                  ? 'radial-gradient(circle at 40% 50%, #9a431c 0%, #7c3110 50%, #522007 100%)'
                  : coil.type === 'weld'
                  ? 'linear-gradient(90deg, #64748b 0%, #475569 45%, #1e293b 50%, #475569 55%, #64748b 100%)'
                  : coil.type === 'scratch'
                  ? 'linear-gradient(135deg, #64748b 0%, #94a3b8 48%, #334155 50%, #94a3b8 52%, #64748b 100%)'
                  : coil.type === 'dimmed'
                  ? 'linear-gradient(90deg, #334155 0%, #1e293b 100%)'
                  : 'linear-gradient(90deg, #94a3b8 0%, #cbd5e1 50%, #94a3b8 100%)'
              }}
            >
              {/* Visual Micrograin Texture */}
              <div
                className="w-full h-full opacity-35"
                style={{
                  backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                  backgroundSize: '4px 4px'
                }}
              />

              {/* Coil ID Tag */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 text-[10px] font-mono font-bold text-white shadow">
                Coil #{coil.id}
              </div>

              {/* Scanned Result Pill */}
              {coil.scanned && (
                <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded text-[9px] font-mono font-extrabold shadow ${
                  coil.decision === 'NORMAL' ? 'bg-emerald-600 text-white' :
                  coil.decision === 'SHIFT_HOLD' ? 'bg-purple-600 text-white' :
                  'bg-rose-600 text-white'
                }`}>
                  {coil.decision} ({coil.score.toFixed(2)})
                </div>
              )}

              {/* In-Transit Defect Overlay */}
              {coil.type === 'rust' && (
                <div className="absolute inset-y-3 left-14 right-14 rounded border-2 border-yellow-400 bg-rose-500/25 flex items-center justify-center">
                  <span className="text-[9px] font-extrabold text-yellow-300 bg-slate-950/80 px-1.5 py-0.5 rounded">
                    RUST CRUST
                  </span>
                </div>
              )}
              {coil.type === 'weld' && (
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-slate-950/70 border-x-2 border-yellow-400 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-yellow-300 rotate-90 whitespace-nowrap">
                    SEAM CUT
                  </span>
                </div>
              )}
              {coil.type === 'scratch' && (
                <div className="absolute inset-y-4 left-16 right-16 rounded border-2 border-amber-400 bg-amber-500/20 flex items-center justify-center">
                  <span className="text-[9px] font-extrabold text-amber-200 bg-slate-950/80 px-1.5 py-0.5 rounded">
                    SCRATCH
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* DUAL-BEAM HIGH-SPEED LASER SCANNER HEAD */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 z-20 pointer-events-none flex flex-col justify-between items-center">
            <div className="w-14 h-4 rounded-b-lg bg-cyan-500 shadow-[0_0_20px_6px_rgba(6,182,212,0.8)] flex items-center justify-around px-1">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span className="w-2 h-2 rounded-full bg-white"></span>
            </div>

            <div className={`w-1.5 h-full transition-colors duration-75 ${
              scannerPulse.active
                ? (scannerPulse.decision === 'NORMAL'
                    ? 'bg-emerald-400 shadow-[0_0_30px_10px_rgba(52,211,153,0.95)]'
                    : scannerPulse.decision === 'SHIFT_HOLD'
                    ? 'bg-purple-400 shadow-[0_0_30px_10px_rgba(192,132,252,0.95)]'
                    : 'bg-rose-500 shadow-[0_0_35px_12px_rgba(244,63,94,0.95)]')
                : 'bg-cyan-400 shadow-[0_0_20px_5px_rgba(34,211,238,0.75)]'
            }`} />

            <div className="w-14 h-4 rounded-t-lg bg-cyan-500 shadow-[0_0_20px_6px_rgba(6,182,212,0.8)] flex items-center justify-around px-1">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            </div>
          </div>

          {/* Scanner Focal Plane Label */}
          <div className="absolute right-4 top-3 text-[10px] font-mono text-cyan-400 bg-slate-900/85 px-2.5 py-1 rounded border border-cyan-800/60 z-20">
            FOCAL PLANE: 512×512 RGB · {Math.max(8, Math.round(24 / speedMultiplier))} ms
          </div>

          {/* Live Scanner Flash Alert Badge */}
          {scannerPulse.active && (
            <div className="absolute left-4 top-3 z-20 pointer-events-none">
              <div className={`px-3 py-1 rounded-full text-[11px] font-extrabold shadow-lg flex items-center space-x-1.5 ${
                scannerPulse.decision === 'NORMAL'
                  ? 'bg-emerald-600 text-white'
                  : scannerPulse.decision === 'SHIFT_HOLD'
                  ? 'bg-purple-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                {scannerPulse.decision === 'NORMAL' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>SCAN: {scannerPulse.decision} ({scannerPulse.score.toFixed(2)})</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 9.4 CUSUM DRIFT & EWMA ROLLING CHART */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Rolling CUSUM Shift Monitor (Section 9.4)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Control Limit: <strong>h = 2.45</strong> (Mahalanobis Distance)
          </span>
        </div>

        <div className="h-20 w-full bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-end justify-between gap-1">
          {cusumHistory.map((val, idx) => {
            const isExceeded = val > 2.45;
            const barHeight = Math.min(100, (val / 5.0) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                <div 
                  className={`w-full rounded-t transition-all duration-300 ${
                    isExceeded ? 'bg-purple-600 shadow-md' : 'bg-indigo-500'
                  }`}
                  style={{ height: `${barHeight}%` }}
                />
                <span className="text-[9px] font-mono text-slate-400">#{idx + 1}</span>
                <div className="absolute -top-7 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-mono opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20">
                  {val.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>Target baseline: &mu; = 1.15</span>
          <span className="text-purple-700 font-bold">Purple: Shift Trigger Threshold (&gt; 2.45)</span>
        </div>
      </div>

      {/* SECTION 7.8 REAL-TIME 5-CLASS STREAM AUDIT LOG */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-brand-600" />
            <span>Real-Time Stream Audit Log (Section 7.8 Decision Table)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Buffered: {recentEvents.length} Recent Strips
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Coil ID</th>
                <th className="pb-2">Specimen Type</th>
                <th className="pb-2">Patch Score</th>
                <th className="pb-2">Shift Score</th>
                <th className="pb-2">Decision (Sec 7.8)</th>
                <th className="pb-2">Triage</th>
                <th className="pb-2">Severity</th>
                <th className="pb-2">Action Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recentEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-2.5 font-mono text-slate-500">{evt.time}</td>
                  <td className="py-2.5 font-mono font-bold text-slate-900">Coil #{evt.id}</td>
                  <td className="py-2.5 capitalize text-slate-700">
                    {evt.defectType || `${evt.coilType} steel`}
                  </td>
                  <td className="py-2.5 font-mono font-bold">
                    {evt.score.toFixed(2)}
                  </td>
                  <td className="py-2.5 font-mono">
                    <span className={evt.shiftScore > 2.45 ? 'text-purple-700 font-bold' : 'text-slate-600'}>
                      {evt.shiftScore.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      evt.decision === 'NORMAL' ? 'bg-emerald-100 text-emerald-800' : 
                      evt.decision === 'SHIFT_HOLD' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                      evt.decision === 'SHIFT_WARNING' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {evt.decision}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      evt.triage === 'PASS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      evt.triage === 'REJECT' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {evt.triage}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-600">{evt.severity}</td>
                  <td className="py-2.5">
                    {evt.decision === 'SHIFT_HOLD' ? (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        Line Hold (Adapt)
                      </span>
                    ) : evt.decision === 'DEFECT' ? (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Divert to Reject Bay
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Proceed to Paint
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
