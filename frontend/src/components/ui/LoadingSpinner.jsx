export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div
        className={`${sizes[size]} rounded-full border-2 border-surface-700/50 border-t-oracle-400 animate-spin`}
      />
      {text && <p className="text-xs text-surface-500 animate-pulse">{text}</p>}
    </div>
  );
}

export function SkeletonLine({ className = '', width = '100%' }) {
  return (
    <div className={`skeleton h-4 ${className}`} style={{ width }} />
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="glass-card-strong space-y-3 animate-pulse">
      <div className="skeleton h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3" style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}

export function SkeletonFileList({ count = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card-strong flex items-center gap-4 py-3 px-4 animate-pulse">
          <div className="skeleton w-5 h-5 rounded" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-3/5" />
            <div className="skeleton h-3 w-2/5" />
          </div>
          <div className="skeleton h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
