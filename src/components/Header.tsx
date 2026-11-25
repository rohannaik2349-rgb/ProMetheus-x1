import React from 'react';
import { Activity, Sparkles, Sliders, RefreshCw, ShieldCheck, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  reviewerName: string;
  activeConditionName?: string;
  backendConnected?: boolean;
  onOpenReport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  reviewerName
}) => {
  const tabs = [
    { id: 'inspect', label: 'Inspect', icon: Activity },
    { id: 'monitor', label: 'Line Monitor', icon: Sparkles },
    { id: 'calibration', label: 'Calibration Lab', icon: Sliders },
    { id: 'adapt', label: 'Adapt Condition', icon: RefreshCw },
    { id: 'audit', label: 'Audit Chain', icon: ShieldCheck },
    { id: 'families', label: 'Defect Families', icon: Layers },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Never wraps */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer shrink-0 select-none group" 
            onClick={() => setActiveTab('inspect')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-brand-500/20 text-white font-extrabold text-base shrink-0 group-hover:scale-105 transition-transform">
              PX
            </div>
            <div className="flex flex-col shrink-0">
              <div className="flex items-center space-x-1.5 whitespace-nowrap">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg whitespace-nowrap">
                  PROMETHEUS-X
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 whitespace-nowrap">
                  RGB Steel
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap -mt-0.5">
                Detect. Doubt. Adapt.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 btn-magnetic ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Reviewer Badge Only - Removed PDF Report button and FastAPI status tag from Header */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800 bg-white px-3 py-1.5 rounded-full border border-slate-200/90 shadow-2xs whitespace-nowrap">
              <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                {reviewerName ? reviewerName.charAt(0).toUpperCase() : 'R'}
              </div>
              <span className="truncate max-w-[120px]">{reviewerName || 'Reviewer'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <div className="md:hidden flex overflow-x-auto py-1.5 border-t border-slate-100 space-x-1 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 bg-slate-100/70 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
