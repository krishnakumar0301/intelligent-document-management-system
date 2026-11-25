import { useState } from 'react';
import { Mic, Search as SearchIcon, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import FilePreview from '../components/files/FilePreview';
import { searchFiles } from '../api/client';
import { formatBytes } from '../utils/format';
import { SkeletonFileList } from '../components/ui/LoadingSpinner';

const EXAMPLES = [
  'python files', 'receipt', 'screenshot', 'invoice',
  'resume', 'nature photos', 'lecture videos', 'voice notes',
];

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [listening, setListening] = useState(false);

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await searchFiles({ query: q, page: 1, page_size: 30 });
      setResults(res.data);
    } catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const startVoiceSearch = () => {
    const sr = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!sr) { toast.error('Voice search not supported'); return; }
    const recognition = new sr();
    recognition.lang = 'en-US';
    setListening(true);
    recognition.onresult = (e) => { const t = e.results[0][0].transcript; setQuery(t); handleSearch(t); setListening(false); };
    recognition.onerror = () => { setListening(false); toast.error('Voice recognition failed'); };
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  return (
    <Layout title="Search">
      <div className="glass-card mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              className="input-field pl-10"
              placeholder='Try "receipt", "screenshot", "invoice"...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              autoFocus
            />
          </div>
          <button className="btn-primary" onClick={() => handleSearch()} disabled={loading}>
            <SearchIcon className="w-4 h-4" />
          </button>
          <button className={`btn-secondary ${listening ? '!border-red-500/30 !text-red-400' : ''}`} onClick={startVoiceSearch} title="Voice search">
            <Mic className={`w-4 h-4 ${listening ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4">
          {results?.interpreted && <span className="text-xs text-oracle-400"><Sparkles className="w-3 h-3 inline mr-1" />{results.interpreted}</span>}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="text-2xs px-3 py-1.5 rounded-lg bg-surface-800/40 border border-surface-400/5 text-surface-400 hover:text-surface-200 hover:border-surface-400/15 transition-all"
              onClick={() => { setQuery(ex); handleSearch(ex); }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {loading && <SkeletonFileList count={5} />}

      {results && <p className="text-xs text-surface-500 mb-4">{results.total} result{results.total !== 1 ? 's' : ''}</p>}

      <div className="space-y-1">
        {results?.items?.map((f) => (
          <div key={f.id} className="glass-card-interactive py-2.5 px-4 cursor-pointer" onClick={() => setPreviewId(f.id)}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-surface-200 truncate flex-1">{f.name}</p>
              <span className="text-xs text-surface-500 ml-2 shrink-0">{formatBytes(f.size_bytes)}</span>
            </div>
            <div className="flex items-center flex-wrap gap-2 text-2xs text-surface-500 mt-1">
              <span className="capitalize">{f.category}</span>
              {f.subcategory && <><span className="text-surface-600">/</span><span className="capitalize">{f.subcategory.replace(/_/g, ' ')}</span></>}
              {f.ai_confidence_score != null && (
                <span className={`px-1.5 py-0.5 rounded text-2xs ${
                  f.ai_confidence_score >= 0.7 ? 'tag-green' : f.ai_confidence_score >= 0.4 ? 'tag-amber' : 'tag-red'
                }`}>
                  {(f.ai_confidence_score * 100).toFixed(0)}%
                </span>
              )}
              {f.ai_tags?.slice(0, 3).map((t) => <span key={t} className="tag-oracle text-2xs">{t}</span>)}
            </div>
          </div>
        ))}
        {results?.items?.length === 0 && !loading && (
          <div className="empty-state py-12">
            <p className="empty-state-title">No results</p>
            <p className="empty-state-text">Try a different search term</p>
          </div>
        )}
      </div>

      <FilePreview fileId={previewId} onClose={() => setPreviewId(null)} />
    </Layout>
  );
}
