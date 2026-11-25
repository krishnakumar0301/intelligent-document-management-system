import { useEffect, useState } from 'react';
import { ScanLine, FolderTree, Brain, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import DropZone from '../components/files/DropZone';
import { scanFolder, organizeFolder, getSettings, reclassifyFiles } from '../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Organizer() {
  const [scanPath, setScanPath] = useState('');
  const [organize, setOrganize] = useState(true);
  const [runOcr, setRunOcr] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    getSettings().then((res) => {
      if (res.data.scan_path) setScanPath(res.data.scan_path);
    });
  }, []);

  const handleScan = async () => {
    if (!scanPath.trim()) { toast.error('Enter a folder path to scan'); return; }
    setLoading(true);
    try {
      const res = await scanFolder({ path: scanPath, organize, run_ocr: runOcr });
      setLastResult(res.data);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Scan failed');
    } finally { setLoading(false); }
  };

  const handleOrganizeOnly = async () => {
    setLoading(true);
    try {
      const res = await organizeFolder({ path: scanPath, dry_run: false });
      toast.success(`Organized ${res.data.organized} files into AI-based structure`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Organize failed');
    } finally { setLoading(false); }
  };

  const handleReclassifyAll = async () => {
    if (!confirm('Re-run AI classification on ALL files? This may take time for large libraries.')) return;
    setLoading(true);
    try {
      const res = await reclassifyFiles(null);
      toast.success(`AI reclassified ${res.data.reclassified} files`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reclassification failed');
    } finally { setLoading(false); }
  };

  return (
    <Layout title="Organizer">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Scan panel */}
        <div className="glass-card space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-oracle-500/20 to-cyan-600/10 border border-oracle-500/10">
              <ScanLine className="w-5 h-5 text-oracle-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-surface-100">Scan & Organize</h3>
              <p className="text-xs text-surface-400">Index, classify, and structure your files</p>
            </div>
          </div>

          <input
            className="input-field"
            placeholder="e.g. C:\Users\You\Documents"
            value={scanPath}
            onChange={(e) => setScanPath(e.target.value)}
          />

          <div className="space-y-3 bg-surface-800/30 rounded-xl p-4 border border-surface-400/5">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`toggle ${organize ? 'active' : ''}`} onClick={() => setOrganize(!organize)}>
                <span className="toggle-handle" />
              </div>
              <span className="text-sm text-surface-300 group-hover:text-surface-100 transition-colors">Auto-organize after scan</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`toggle ${useAi ? 'active' : ''}`} onClick={() => setUseAi(!useAi)}>
                <span className="toggle-handle" />
              </div>
              <span className="text-sm text-surface-300 group-hover:text-surface-100 transition-colors">AI classification <span className="text-oracle-400">(recommended)</span></span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`toggle ${runOcr ? 'active' : ''}`} onClick={() => setRunOcr(!runOcr)}>
                <span className="toggle-handle" />
              </div>
              <span className="text-sm text-surface-300 group-hover:text-surface-100 transition-colors">OCR on images <span className="text-2xs text-surface-500">(Tesseract)</span></span>
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={handleScan} disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : <ScanLine className="w-4 h-4" />}
              {loading ? 'Processing...' : 'Start Scan'}
            </button>
            <button className="btn-secondary" onClick={handleOrganizeOnly} disabled={loading}>
              <FolderTree className="w-4 h-4" />
              Organize
            </button>
            <button className="btn-secondary" onClick={handleReclassifyAll} disabled={loading}>
              <Brain className="w-4 h-4" />
              Reclassify
            </button>
          </div>

          {lastResult && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-oracle-500/5 border border-oracle-500/10 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-oracle-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="text-surface-300"><span className="text-surface-100 font-medium">{lastResult.scanned}</span> files scanned</p>
                <p className="text-surface-400"><span className="text-emerald-400">+{lastResult.added}</span> new · <span className="text-oracle-400">{lastResult.updated}</span> updated · <span className="text-amber-400">{lastResult.organized}</span> organized</p>
              </div>
            </div>
          )}

          <details className="group">
            <summary className="text-xs text-surface-500 cursor-pointer hover:text-surface-300 transition-colors select-none">
              How AI classification works
            </summary>
            <div className="mt-3 text-xs text-surface-500 space-y-1 bg-surface-800/30 rounded-xl p-4 border border-surface-400/5">
              <p>• <span className="text-surface-400">Filename</span> — keyword matching</p>
              <p>• <span className="text-surface-400">Text extraction</span> — PDF, DOCX, TXT content analysis</p>
              <p>• <span className="text-surface-400">OCR</span> — image text recognition</p>
              <p>• <span className="text-surface-400">Metadata</span> — EXIF, audio/video tags</p>
              <p>• <span className="text-surface-400">Confidence &lt; 40%</span> → saved as "Others"</p>
            </div>
          </details>
        </div>

        {/* Upload panel */}
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/10">
              <RefreshCw className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-surface-100">Upload Files</h3>
              <p className="text-xs text-surface-400">Auto-classified on upload</p>
            </div>
          </div>
          <DropZone destination={scanPath} />
        </div>
      </div>

      {loading && <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center"><LoadingSpinner text="Processing..." /></div>}
    </Layout>
  );
}
