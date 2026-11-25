import { useEffect, useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { SkeletonFileList } from '../components/ui/LoadingSpinner';
import { listRecycle, restoreFile, permanentDelete } from '../api/client';
import { formatBytes } from '../utils/format';

export default function RecycleBin() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listRecycle({ page: 1, page_size: 50 })
      .then((res) => setFiles(res.data.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRestore = async (id) => {
    await restoreFile(id);
    toast.success('File restored');
    load();
  };

  const handlePermanent = async (id) => {
    if (!confirm('Permanently delete this file? This cannot be undone.')) return;
    await permanentDelete(id);
    toast.success('Permanently deleted');
    load();
  };

  return (
    <Layout title="Recycle Bin" subtitle={`${files.length} file${files.length !== 1 ? 's' : ''}`}>
      {loading ? (
        <SkeletonFileList count={5} />
      ) : files.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Trash2 className="w-6 h-6 text-surface-500" />
          </div>
          <p className="empty-state-title">Recycle bin is empty</p>
          <p className="empty-state-text">Deleted files will appear here</p>
        </div>
      ) : (
        <div className="space-y-1">
          {files.map((f) => (
            <div key={f.id} className="glass-card-interactive py-3 px-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-800/60 border border-surface-400/5 flex items-center justify-center">
                  <HardDrive className="w-4 h-4 text-surface-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">{f.name}</p>
                  <p className="text-2xs text-surface-500">{formatBytes(f.size_bytes)} · {f.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="btn-success text-xs py-1.5" onClick={() => handleRestore(f.id)}>
                  <RotateCcw className="w-3 h-3" /> Restore
                </button>
                <button className="btn-danger text-xs py-1.5" onClick={() => handlePermanent(f.id)}>
                  <Trash2 className="w-3 h-3" /> Delete forever
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
