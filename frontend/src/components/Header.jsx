import React from 'react';
import { Eye, Shield, Activity, RefreshCw } from 'lucide-react';
import { NAV_ITEMS } from './Sidebar';

export default function Header({
  activeTab,
  setActiveTab,
  apiOnline = true,
  onRefresh,
  refreshing = false
}) {
  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0B1020]/80 backdrop-blur-md border-b border-[#2B3550] px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#F8FAFC] tracking-tight flex items-center gap-2">
            {currentNav.label}
          </h1>
          <p className="text-xs text-[#A7B1C8]">
            Diabetic Retinopathy Computer Vision Diagnostics Platform
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* API Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#171E35] border border-[#2B3550] text-xs font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              apiOnline
                ? 'bg-[#34D399] shadow-[0_0_8px_#34D399]'
                : 'bg-[#FB7185] shadow-[0_0_8px_#FB7185]'
            }`}
          />
          <span className="text-[#A7B1C8]">
            Flask API: <strong className={apiOnline ? 'text-[#34D399]' : 'text-[#FB7185]'}>{apiOnline ? 'Connected' : 'Offline'}</strong>
          </span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-[#171E35] border border-[#2B3550] text-[#A7B1C8] hover:text-[#F8FAFC] hover:border-[#8B5CF6]/50 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#8B5CF6]' : ''}`} />
          </button>
        )}

        {/* Quick Predict Action */}
        {activeTab !== 'detect' && (
          <button
            onClick={() => setActiveTab('detect')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white text-xs font-semibold hover:shadow-[0_0_15px_rgba(139,92,246,0.5)] transition-all"
          >
            <Eye className="w-4 h-4" />
            <span>Analyze Fundus</span>
          </button>
        )}
      </div>
    </header>
  );
}
