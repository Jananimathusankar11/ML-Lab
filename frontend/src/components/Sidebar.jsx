import React from 'react';
import {
  LayoutDashboard,
  Eye,
  SlidersHorizontal,
  Brain,
  Database,
  PlayCircle,
  BarChart3,
  History,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
  { id: 'detect', label: 'Detect Retinopathy', icon: Eye, highlight: true },
  { id: 'preprocess', label: 'Image Preprocessing', icon: SlidersHorizontal },
  { id: 'features', label: 'Feature Analysis', icon: Brain },
  { id: 'dataset', label: 'Dataset Explorer', icon: Database },
  { id: 'training', label: 'Model Training', icon: PlayCircle },
  { id: 'evaluation', label: 'Model Evaluation', icon: BarChart3 },
  { id: 'history', label: 'Prediction History', icon: History },
  { id: 'docs', label: 'Documentation', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  modelStatus = 'Model Trained & Active',
  trainingStatus = 'idle'
}) {
  const isTraining = trainingStatus === 'running';

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-[#080D19] border-r border-[#2B3550] flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#2B3550]">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
              <Eye className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-[#F8FAFC] tracking-tight">Retina</span>
                <span className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE]">AI</span>
              </div>
              <p className="text-[10px] text-[#A7B1C8] font-medium tracking-wide">DR Clinical Detection</p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
              <Eye className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg text-[#A7B1C8] hover:text-[#F8FAFC] hover:bg-[#171E35] border border-transparent hover:border-[#2B3550] transition-colors ${
            collapsed ? 'hidden' : 'block'
          }`}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-[#8B5CF6]/20 to-[#22D3EE]/10 text-[#F8FAFC] border border-[#8B5CF6]/40 shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                  : 'text-[#A7B1C8] hover:text-[#F8FAFC] hover:bg-[#171E35]/80 border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive
                    ? 'text-[#22D3EE]'
                    : 'text-[#A7B1C8] group-hover:text-[#8B5CF6]'
                }`}
              />
              {!collapsed && (
                <span className="truncate tracking-wide">{item.label}</span>
              )}
              {item.highlight && !collapsed && (
                <span className="ml-auto w-2 h-2 rounded-full bg-[#22D3EE] shadow-[0_0_8px_#22D3EE]" />
              )}

              {/* Tooltip on collapse */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#171E35] text-[#F8FAFC] text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none border border-[#2B3550] shadow-xl z-50 transition-opacity">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Model Health Widget */}
      <div className="p-3 border-t border-[#2B3550] bg-[#0B1020]/60">
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-[#171E35] border border-[#2B3550] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase text-[#A7B1C8] tracking-wider">Engine Status</span>
              {isTraining ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#FBBF24] font-medium bg-[#FBBF24]/10 px-2 py-0.5 rounded-full">
                  <Activity className="w-3 h-3 animate-spin" /> Training
                </span>
              ) : modelStatus.includes('Active') || modelStatus.includes('Trained') ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#34D399] font-medium bg-[#34D399]/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#FB7185] font-medium bg-[#FB7185]/10 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" /> Untrained
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-[#F8FAFC] truncate">
              {modelStatus}
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setCollapsed(false)}
              className="p-2 rounded-lg text-[#A7B1C8] hover:text-[#F8FAFC] hover:bg-[#171E35]"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
