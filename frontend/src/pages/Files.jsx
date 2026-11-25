import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Star,
  Tag,
  Search as SearchIcon,
  ArrowUpDown,
  RefreshCw,
  Image,
  Video,
  Music,
  FileText,
  Table,
  Archive,
  File,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import FilePreview from '../components/files/FilePreview';
import LoadingSpinner, { SkeletonFileList } from '../components/ui/LoadingSpinner';
import {
  listFiles, listByCategory, listBySubcategory,
  aiSearch, toggleFavorite, setTags, reclassifyFiles,
} from '../api/client';
import { formatBytes } from '../utils/format';

const fileTypeIcons = {
  images: Image, videos: Video, audio: Music, documents: FileText,
  spreadsheets: Table, archives: Archive, code: File, Others: File,
};

const fileTypeColors = {
  images: 'file-icon-images', videos: 'file-icon-videos', audio: 'file-icon-audio',
  documents: 'file-icon-documents', spreadsheets: 'file-icon-spreadsheets',
  archives: 'file-icon-archives', code: 'file-icon-code', Others: 'file-icon-other',
};

export default function Files() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState(null);
  const [tagInput, setTagInput] = useState({});
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');

  const category = searchParams.get('category') || '';
  const subcategory = searchParams.get('subcategory') || '';
  const searchQ = searchParams.get('q') || '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      const params = { page, page_size: 24, sort_by: sortBy, sort_dir: sortDir };
      if (searchQ) res = await aiSearch(searchQ, { ...params, category: category || undefined, subcategory: subcategory || undefined });
      else if (subcategory) res = await listBySubcategory(subcategory, { ...params, category: category || undefined });
      else if (category) res = await listByCategory(category, params);
      else res = await listFiles(params);
      setFiles(res.data.items);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load files'); }
    finally { setLoading(false); }
  }, [category, subcategory, searchQ, page, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  const handleFavorite = async (id, e) => {
    e.stopPropagation();
    await toggleFavorite(id);
    load();
  };

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortBy(field); setSortDir('desc'); }
  };

  const sortedByLabel = { created_at: 'Date', size_bytes: 'Size', name: 'Name' };

  const token = localStorage.getItem('fileoracle_token');

  return (
    <Layout title={category ? `Files / ${category}${subcategory ? ` / ${subcategory.replace(/_/g, ' ')}` : ''}` : 'All Files'} subtitle={`${total} file${total !== 1 ? 's' : ''}`}>
      {/* Controls */}
      <div className="glass-card flex flex-wrap items-center gap-3 mb-6 py-3 px-5">
        <div className="flex items-center gap-1.5 bg-surface-800/40 rounded-lg p-0.5 border border-surface-400/5">
          <button className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface-700/60 text-surface-100' : 'text-surface-400 hover:text-surface-100'}`} onClick={() => setViewMode('grid')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface-700/60 text-surface-100' : 'text-surface-400 hover:text-surface-100'}`} onClick={() => setViewMode('list')}>
            <List className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1" />
        {['date', 'name', 'size'].map((field) => (
          <button key={field} className={`btn-ghost text-xs ${sortBy === field ? 'text-oracle-400' : ''}`} onClick={() => toggleSort(field + (field === 'date' ? '_at' : field === 'name' ? '' : '_bytes'))}>
            <ArrowUpDown className="w-3 h-3" />
            {field.charAt(0).toUpperCase() + field.slice(1)}
            {sortBy === (field + (field === 'date' ? '_at' : field === 'name' ? '' : '_bytes')) && (sortDir === 'desc' ? ' ↓' : ' ↑')}
          </button>
        ))}
        <button className="btn-ghost text-xs text-oracle-400" onClick={async () => { if (!confirm('Re-run AI classification?')) return; await reclassifyFiles(null); toast.success('Reclassified'); load(); }}>
          <RefreshCw className="w-3 h-3" /> Reclassify
        </button>
      </div>

      {loading ? (
        <SkeletonFileList count={6} />
      ) : files.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><SearchIcon className="w-6 h-6 text-surface-500" /></div>
          <p className="empty-state-title">No files found</p>
          <p className="empty-state-text">{searchQ ? 'Try a different search term' : 'Upload or scan files to get started'}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
          {files.map((f) => {
            const Icon = fileTypeIcons[f.category] || File;
            const color = fileTypeColors[f.category] || 'file-icon-other';
            const isImage = f.category === 'images';
            const thumbUrl = isImage ? `/api/v1/files/${f.id}/preview?token=${token}` : null;
            return (
              <div key={f.id} className="glass-card-interactive p-3 cursor-pointer group" onClick={() => setPreviewId(f.id)}>
                <div className="relative mb-2.5">
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={f.name} className="w-full aspect-[4/3] object-cover rounded-xl bg-black/40" loading="lazy" />
                  ) : (
                    <div className="w-full aspect-[4/3] rounded-xl bg-surface-800/60 flex items-center justify-center border border-surface-400/5">
                      <Icon className={`w-8 h-8 ${color}`} strokeWidth={1.5} />
                    </div>
                  )}
                  <button onClick={(e) => handleFavorite(f.id, e)} className="absolute top-2 right-2 p-1 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                    <Star className={`w-3.5 h-3.5 ${f.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-surface-400'}`} />
                  </button>
                </div>
                <p className="text-xs font-medium text-surface-200 truncate">{f.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-2xs text-surface-500 capitalize truncate">{f.subcategory?.replace(/_/g, ' ') || f.category}</p>
                  <span className="text-2xs text-surface-500">{formatBytes(f.size_bytes)}</span>
                </div>
                {f.ai_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1.5">
                    {f.ai_tags.slice(0, 2).map((t) => (
                      <span key={t} className="text-2xs px-1.5 py-0.5 rounded-md bg-oracle-500/10 text-oracle-300 border border-oracle-500/5">{t}</span>
                    ))}
                  </div>
                )}
                {f.ai_confidence_score != null && (
                  <div className="progress-bar mt-1.5">
                    <div className="progress-bar-fill" style={{ width: `${Math.round(f.ai_confidence_score * 100)}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {files.map((f) => {
            const Icon = fileTypeIcons[f.category] || File;
            const color = fileTypeColors[f.category] || 'file-icon-other';
            return (
              <div key={f.id} className="glass-card-interactive py-2.5 px-4 flex items-center gap-3 cursor-pointer group" onClick={() => setPreviewId(f.id)}>
                <Icon className={`w-5 h-5 shrink-0 ${color}`} strokeWidth={1.75} />
                <button onClick={(e) => handleFavorite(f.id, e)}>
                  <Star className={`w-4 h-4 ${f.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-surface-600'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">{f.name}</p>
                  <div className="flex items-center gap-2 text-2xs text-surface-500 mt-0.5">
                    <span className="capitalize">{f.category}</span>
                    {f.subcategory && <><span className="text-surface-600">/</span><span className="capitalize">{f.subcategory.replace(/_/g, ' ')}</span></>}
                    {f.ai_tags?.slice(0, 3).map((t) => <span key={t} className="tag-oracle text-2xs">{t}</span>)}
                    {f.ai_confidence_score != null && (
                      <span className={`text-2xs ${f.ai_confidence_score >= 0.7 ? 'text-emerald-400' : f.ai_confidence_score >= 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                        {(f.ai_confidence_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-surface-500 shrink-0">{formatBytes(f.size_bytes)}</span>
              </div>
            );
          })}
        </div>
      )}

      {total > 24 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button className="btn-secondary text-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-sm text-surface-500">Page {page} of {Math.ceil(total / 24)}</span>
          <button className="btn-secondary text-sm" disabled={page >= Math.ceil(total / 24)} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      <FilePreview fileId={previewId} onClose={() => setPreviewId(null)} />
    </Layout>
  );
}
