import React, { useState } from 'react';
import { Check, ArrowRight, Sparkles, Loader2, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HeroWelcomeProps {
  reviewerName: string;
  setReviewerName: (name: string) => void;
  onEnterWorkspace: () => void;
  onSelectSample?: (sampleId: string) => void;
}

export const HeroWelcome: React.FC<HeroWelcomeProps> = ({
  reviewerName,
  setReviewerName,
  onEnterWorkspace,
  onSelectSample
}) => {
  const [localName, setLocalName] = useState(reviewerName || '');
  const [isEntering, setIsEntering] = useState(false);

  const triggerCelebration = () => {
    // 3-Stage Confetti Burst
    const count = 200;
    const defaults = {
      origin: { y: 0.65 },
      zIndex: 9999
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#6366f1', '#a855f7', '#3b82f6']
    });
    fire(0.2, {
      spread: 60,
      colors: ['#8b5cf6', '#ec4899', '#06b6d4']
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      colors: ['#10b981', '#f59e0b', '#6366f1']
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim() || isEntering) return;

    const trimmed = localName.trim();
    setReviewerName(trimmed);
    setIsEntering(true);
    triggerCelebration();

    // Smooth transition with welcoming sequence
    setTimeout(() => {
      onEnterWorkspace();
    }, 1200);
  };

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* Ambient background glows matching reference design */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[480px] bg-gradient-to-tr from-violet-200/40 via-purple-100/30 to-indigo-200/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[420px] h-[420px] bg-purple-200/30 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Floating Interactive Status Pills */}
      <div className="absolute top-16 left-6 md:left-24 animate-float-slow hidden sm:block">
        <div className="status-pill cursor-pointer" onClick={() => onSelectSample?.('sample-normal')}>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
          <span className="text-slate-700 font-medium">Ready for paint · auto-pass</span>
        </div>
      </div>

      <div className="absolute top-20 right-6 md:right-28 animate-float-delayed hidden sm:block">
        <div className="status-pill cursor-pointer" onClick={() => onSelectSample?.('sample-weld')}>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"></span>
          <span className="text-slate-700 font-medium">Welding anomaly · needs review</span>
        </div>
      </div>

      <div className="absolute bottom-28 left-8 md:left-32 animate-float-reverse hidden sm:block">
        <div className="status-pill">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
          <span className="text-slate-700 font-medium">Audit chain · SHA-256 intact</span>
        </div>
      </div>

      <div className="absolute bottom-24 right-8 md:right-32 animate-float-slow hidden sm:block">
        <div className="status-pill cursor-pointer" onClick={() => onSelectSample?.('sample-corrosion')}>
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs"></span>
          <span className="text-slate-700 font-medium">SteelBlastQC · 3-ch RGB</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto text-center z-10 flex flex-col items-center">
        {/* Top checkmark badge icon */}
        <div className="relative mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-brand-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 transform transition hover:scale-110 duration-300">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-indigo-500/20 blur-sm -z-10 animate-ping opacity-40"></div>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-slate-900 via-indigo-900 to-brand-600 bg-clip-text text-transparent">
            PROMETHEUS-X
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mb-2 font-normal leading-relaxed">
          Automate the routine. Escalate the uncertain. Keep every decision accountable.
        </p>
        <p className="text-xs sm:text-sm font-semibold tracking-wide text-brand-700 uppercase mb-8">
          Detect. Doubt. Adapt. · Open-Set Steel Surface Inspection
        </p>

        {/* Reviewer Input Card */}
        <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col items-center">
          <div className="w-full relative mb-4">
            <div className={`relative rounded-2xl border-2 transition-all duration-300 bg-white/95 shadow-md p-3.5 ${
              isEntering
                ? 'border-emerald-500 ring-4 ring-emerald-100 shadow-emerald-100'
                : 'border-indigo-300/80 hover:border-indigo-400 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100'
            }`}>
              <label htmlFor="reviewerInput" className="block text-left text-xs font-semibold text-slate-500 mb-1 pl-1">
                What should we call you?
              </label>
              <div className="flex items-center">
                <input
                  id="reviewerInput"
                  type="text"
                  value={localName}
                  disabled={isEntering}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-transparent text-lg sm:text-xl font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-medium focus:outline-none pl-1"
                  required
                />
                {isEntering && (
                  <span className="flex items-center space-x-1 text-emerald-600 text-xs font-bold animate-fadeIn">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Button with Magnetic Motion & Shimmer Glint */}
          <button
            type="submit"
            disabled={isEntering}
            className={`group btn-magnetic btn-shimmer relative inline-flex items-center justify-center space-x-2.5 px-9 py-4 rounded-full text-white font-bold text-sm sm:text-base shadow-xl transition-all duration-300 ${
              isEntering
                ? 'bg-emerald-600 shadow-emerald-600/30'
                : 'bg-[#0d131f] hover:bg-slate-800 shadow-slate-900/20'
            }`}
          >
            {isEntering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                <span>Entering Workspace...</span>
              </>
            ) : (
              <>
                <span>Enter workspace</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
              </>
            )}
          </button>

          <p className="text-xs text-slate-400 mt-3 font-normal">
            Your name is used as the reviewer name in the audit log & official PDF certificates.
          </p>

          {/* Welcoming sequence animation bar */}
          {isEntering && (
            <div className="w-full max-w-xs mt-4 animate-fadeIn">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
                <span>Welcome, {localName}!</span>
                <span>Initializing...</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full animate-[shimmer_1.2s_ease-in-out_forwards] w-full"></div>
              </div>
            </div>
          )}
        </form>

        {/* Quick Demo Showcase Pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1">Quick Scenarios:</span>
          <button
            onClick={() => onSelectSample?.('sample-normal')}
            className="btn-magnetic text-xs px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 border border-slate-200 font-medium transition shadow-2xs hover:border-emerald-300"
          >
            Clean Surface (Pass)
          </button>
          <button
            onClick={() => onSelectSample?.('sample-corrosion')}
            className="btn-magnetic text-xs px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 border border-slate-200 font-medium transition shadow-2xs hover:border-red-300"
          >
            Scale & Abrasion (Reject)
          </button>
          <button
            onClick={() => onSelectSample?.('sample-dimmed')}
            className="btn-magnetic text-xs px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 border border-slate-200 font-medium transition shadow-2xs hover:border-purple-300"
          >
            Lighting Shift (Shift Hold)
          </button>
          <button
            onClick={() => onSelectSample?.('sample-shadow')}
            className="btn-magnetic text-xs px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 border border-slate-200 font-medium transition shadow-2xs hover:border-blue-300"
          >
            Suppression Bank (Feedback)
          </button>
        </div>
      </div>
    </section>
  );
};
