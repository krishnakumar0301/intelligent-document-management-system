import { useEffect, useState } from 'react';
import { Files, HardDrive, Copy, Trash2, ArrowRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import StatCard from '../components/ui/StatCard';
import CategoryChart from '../components/charts/CategoryChart';
import { SkeletonCard } from '../components/ui/LoadingSpinner';
import { getDashboard, getActivity, getRecommendations } from '../api/client';
import { formatBytes, formatDate } from '../utils/format';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), getActivity(), getRecommendations()])
      .then(([s, a, r]) => {
        setStats(s.data);
        setActivity(Array.isArray(a.data) ? a.data : []);
        setRecs(Array.isArray(r.data) ? r.data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Dashboard">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={2} />)
        ) : (
          <>
            <StatCard icon={Files} label="Total Files" value={stats?.total_files ?? 0} color="oracle" />
            <StatCard icon={HardDrive} label="Storage Used" value={formatBytes(stats?.total_size_bytes)} sub={`${stats?.storage_used_mb ?? 0} MB`} color="emerald" />
            <StatCard icon={Copy} label="Duplicate Groups" value={stats?.duplicate_groups ?? 0} color="amber" />
            <StatCard icon={Trash2} label="In Recycle Bin" value={stats?.deleted_count ?? 0} color="red" />
          </>
        )}
      </div>

      {/* Charts + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-surface-100">File Type Distribution</h3>
            <span className="text-2xs text-surface-500">by count</span>
          </div>
          {loading ? <SkeletonCard lines={1} /> : <CategoryChart categories={stats?.categories} />}
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-surface-100">Smart Recommendations</h3>
            <span className="text-2xs text-surface-500">AI-powered</span>
          </div>
          <div className="space-y-2">
            {loading ? (
              <SkeletonCard lines={3} />
            ) : recs.length === 0 ? (
              <div className="empty-state py-8">
                <p className="text-sm text-surface-500">All good — no recommendations.</p>
              </div>
            ) : (
              recs.map((r, i) => (
                <Link
                  key={i}
                  to={`/${r.action === 'organizer' ? 'organizer' : r.action}`}
                  className="group flex items-center justify-between p-3.5 rounded-xl bg-surface-800/40 border border-surface-400/5 hover:bg-surface-800/60 hover:border-surface-400/15 transition-all duration-200"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-surface-200 group-hover:text-surface-100 transition-colors">{r.title}</p>
                    <p className="text-xs text-surface-500">{r.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-surface-500 group-hover:text-oracle-400 transition-all group-hover:translate-x-0.5" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-surface-100">Recent Activity</h3>
          <span className="text-2xs text-surface-500">latest</span>
        </div>
        {loading ? (
          <SkeletonCard lines={5} />
        ) : activity.length === 0 ? (
          <p className="text-sm text-surface-500 py-4">No activity yet.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-custom">
            {activity.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-surface-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="status-dot-active" />
                  <span className="text-sm text-surface-200 capitalize">{a.action.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-2xs text-surface-500">{formatDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
