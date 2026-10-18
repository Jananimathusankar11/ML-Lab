import React from 'react';

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'purple',
  trend,
  className = ''
}) {
  const accentClasses = {
    purple: {
      border: 'hover:border-[#8B5CF6]/50',
      iconBg: 'bg-[#8B5CF6]/15 text-[#8B5CF6]',
      glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]'
    },
    cyan: {
      border: 'hover:border-[#22D3EE]/50',
      iconBg: 'bg-[#22D3EE]/15 text-[#22D3EE]',
      glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(34,211,238,0.3)]'
    },
    emerald: {
      border: 'hover:border-[#34D399]/50',
      iconBg: 'bg-[#34D399]/15 text-[#34D399]',
      glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(52,211,153,0.3)]'
    },
    amber: {
      border: 'hover:border-[#FBBF24]/50',
      iconBg: 'bg-[#FBBF24]/15 text-[#FBBF24]',
      glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(251,191,36,0.3)]'
    },
    rose: {
      border: 'hover:border-[#FB7185]/50',
      iconBg: 'bg-[#FB7185]/15 text-[#FB7185]',
      glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(251,113,133,0.3)]'
    }
  }[accent] || {
    border: 'hover:border-[#8B5CF6]/50',
    iconBg: 'bg-[#8B5CF6]/15 text-[#8B5CF6]',
    glow: ''
  };

  return (
    <div
      className={`group relative bg-[#171E35] border border-[#2B3550] rounded-xl p-5 transition-all duration-300 ${accentClasses.border} ${accentClasses.glow} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A7B1C8]">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
              {value}
            </h3>
            {trend && (
              <span className="text-xs font-medium text-[#34D399] bg-[#34D399]/10 px-1.5 py-0.5 rounded">
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[#A7B1C8]/80 font-normal">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${accentClasses.iconBg} transition-transform group-hover:scale-110 duration-200`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
