import { useEffect, useState } from 'react';
import { Download, BarChart3, HardDrive, FileText, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import CategoryChart from '../components/charts/CategoryChart';
import StorageChart from '../components/charts/StorageChart';
import { SkeletonCard } from '../components/ui/LoadingSpinner';
import { getAnalytics, exportReport } from '../api/client';
import { formatBytes, formatDate } from '../utils/format';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics().then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    try {
      const res = await exportReport();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fileoracle-report.pdf';
      a.click();
      toast.success('Report downloaded');
    } catch { toast.error('Export failed'); }
  };

  return (
    <Layout title="Analytics">
      <div className="flex justify-end mb-6">
        <button className="btn-primary" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-8">
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-category-documents" />
            <h3 className="font-semibold text-sm text-surface-100">Type Distribution</h3>
          </div>
          {loading ? <SkeletonCard /> : <CategoryChart categories={data?.type_distribution} />}
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="w-4 h-4 text-category-spreadsheets" />
            <h3 className="font-semibold text-sm text-surface-100">Storage by Category</h3>
          </div>
          {loading ? <SkeletonCard /> : <StorageChart storageByCategory={data?.storage_by_category} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-category-documents" />
            <h3 className="font-semibold text-sm text-surface-100">Largest Files</h3>
          </div>
          {loading ? <SkeletonCard lines={5} /> : (
            <div className="space-y-1">
              {data?.largest_files?.length === 0 && <p className="text-sm text-surface-500 py-4">No data</p>}
              {data?.largest_files?.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-surface-800/40 transition-colors">
                  <span className="text-sm text-surface-200 truncate flex-1">{f.name}</span>
                  <span className="text-xs text-surface-400 ml-2 font-mono">{formatBytes(f.size_bytes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-category-other" />
            <h3 className="font-semibold text-sm text-surface-100">Recently Modified</h3>
          </div>
          {loading ? <SkeletonCard lines={5} /> : (
            <div className="space-y-1">
              {data?.recent_files?.length === 0 && <p className="text-sm text-surface-500 py-4">No data</p>}
              {data?.recent_files?.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-surface-800/40 transition-colors">
                  <span className="text-sm text-surface-200 truncate flex-1">{f.name}</span>
                  <span className="text-2xs text-surface-500 ml-2">{formatDate(f.modified_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
