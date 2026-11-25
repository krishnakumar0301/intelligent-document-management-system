import { useEffect, useState } from 'react';
import { Copy, Trash2, AlertTriangle, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { SkeletonCard } from '../components/ui/LoadingSpinner';
import { getDuplicates, deleteDuplicates } from '../api/client';
import { formatBytes } from '../utils/format';

export default function Duplicates() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  const load = () => {
    setLoading(true);
    getDuplicates().then((res) => setData(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (group) => {
    const keepId = group.files[0]?.id;
    const toDelete = group.files.slice(1).map((f) => f.id);
    try {
      await deleteDuplicates({ file_ids: toDelete, keep_id: keepId });
      toast.success(`Moved ${toDelete.length} duplicates to recycle bin`);
      load();
    } catch { toast.error('Delete failed'); }
  };

  const handleBulkDelete = async () => {
    if (!selected.length) return;
    try {
      await deleteDuplicates({ file_ids: selected });
      toast.success(`Moved ${selected.length} files to recycle bin`);
      setSelected([]);
      load();
    } catch { toast.error('Bulk delete failed'); }
  };

  return (
    <Layout title="Duplicates">
      {/* Summary bar */}
      <div className="glass-card flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/10">
            <Copy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-surface-400">Duplicate groups</p>
            <p className="text-xl font-bold text-surface-100">{loading ? '...' : data?.total_groups ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/10">
            <HardDrive className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-surface-400">Wasted space</p>
            <p className="text-xl font-bold text-amber-400">{loading ? '...' : formatBytes(data?.total_wasted_bytes)}</p>
          </div>
        </div>
        {selected.length > 0 && (
          <button className="btn-danger" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4" /> Delete {selected.length} selected
          </button>
        )}
      </div>

      {/* Groups */}
      {loading ? (
        <div className="space-y-4"><SkeletonCard lines={3} /><SkeletonCard lines={3} /></div>
      ) : !data?.groups?.length ? (
        <div className="empty-state">
          <div className="empty-state-icon"><AlertTriangle className="w-6 h-6 text-surface-500" /></div>
          <p className="empty-state-title">No duplicates found</p>
          <p className="empty-state-text">Scan folders first to detect duplicate files by hash</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.groups.map((group) => (
            <div key={group.hash} className="glass-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono text-surface-500">{group.hash.slice(0, 16)}...</span>
                  <span className="text-2xs text-surface-500">({group.files.length} copies, {formatBytes(group.total_size)})</span>
                </div>
                <button className="btn-success text-xs" onClick={() => handleDelete(group)}>
                  <Trash2 className="w-3 h-3" /> Keep first, delete rest
                </button>
              </div>
              <div className="space-y-1">
                {group.files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-800/40 border border-surface-400/5 text-sm hover:bg-surface-800/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={selected.includes(f.id)}
                      onChange={() => setSelected((prev) => prev.includes(f.id) ? prev.filter((x) => x !== f.id) : [...prev, f.id])}
                      className="w-4 h-4 rounded border-surface-600 bg-surface-800 accent-oracle-500"
                    />
                    <span className="flex-1 truncate text-surface-200">{f.name}</span>
                    <span className="text-xs text-surface-500">{formatBytes(f.size_bytes)}</span>
                    <span className="text-2xs capitalize text-surface-500">{f.category}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
