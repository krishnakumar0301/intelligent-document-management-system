export default function StatCard({ icon: Icon, label, value, sub, color = 'oracle', trend = null }) {
  const gradientMap = {
    oracle: 'from-oracle-500/20 to-cyan-600/10 border-oracle-500/10',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/10',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/10',
    red: 'from-red-500/20 to-red-600/10 border-red-500/10',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/10',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/10',
  };

  const iconColors = {
    oracle: 'text-oracle-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    violet: 'text-violet-400',
    pink: 'text-pink-400',
  };

  const gradient = gradientMap[color] || gradientMap.oracle;
  const iconColor = iconColors[color] || iconColors.oracle;

  return (
    <div className="glass-card-interactive group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-surface-400 tracking-wide uppercase">{label}</p>
          <p className="text-2xl lg:text-3xl font-bold text-surface-100 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-surface-500">{sub}</p>}
          {trend && (
            <span className={`inline-flex items-center gap-1 text-2xs font-medium ${
              trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-surface-400'
            }`}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
            </span>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} border`}>
            <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  );
}
