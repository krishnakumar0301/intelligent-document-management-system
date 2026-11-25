import { useCallback, useState } from 'react';
import { Upload, File, Check, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadFiles } from '../../api/client';

export default function DropZone({ destination, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);

  const handleFiles = useCallback(
    async (files) => {
      if (!destination) {
        toast.error('Set a destination folder first');
        return;
      }
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('files', f));
      setUploading(true);
      setUploadResults([]);
      try {
        const res = await uploadFiles(destination, formData);
        setUploadResults(res.data.uploaded);
        toast.success(`Uploaded ${res.data.count} file(s) with AI classification`);
        onUploaded?.();
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [destination, onUploaded]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeResult = (i) => {
    setUploadResults((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative rounded-2xl p-10 text-center transition-all duration-300 border-2 border-dashed cursor-pointer
          ${dragging
            ? 'border-oracle-400/60 bg-oracle-500/5 shadow-[0_0_40px_-8px_rgba(6,182,212,0.15)] scale-[1.01]'
            : 'border-surface-400/15 bg-surface-800/30 hover:border-surface-400/20 hover:bg-surface-800/40'
          }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-oracle-400 animate-spin" />
            <p className="text-sm text-surface-400">Uploading & classifying...</p>
          </div>
        ) : (
          <>
            <div className={`p-4 rounded-2xl inline-flex mb-4 transition-colors duration-300 ${
              dragging ? 'bg-oracle-500/20' : 'bg-surface-800/60'
            }`}>
              <Upload className={`w-8 h-8 transition-colors duration-300 ${
                dragging ? 'text-oracle-400' : 'text-surface-400'
              }`} strokeWidth={1.5} />
            </div>
            <p className="text-sm text-surface-300 mb-1">
              {dragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-2xs text-surface-500 mb-4">or click to browse</p>
            <label className="btn-primary cursor-pointer inline-flex">
              <File className="w-4 h-4" />
              Browse files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </>
        )}
      </div>

      {/* Upload results */}
      {uploadResults.length > 0 && (
        <div className="space-y-1.5 animate-fade-in">
          <p className="text-2xs font-semibold text-surface-500 uppercase tracking-wider px-1">
            Upload Results — AI classified
          </p>
          {uploadResults.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-surface-800/40 border border-surface-400/10 rounded-xl px-4 py-2.5 text-sm group"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="flex-1 truncate text-surface-200 text-xs">{r.name}</span>
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-2xs font-medium ${
                  r.confidence >= 0.7 ? 'tag-green'
                  : r.confidence >= 0.4 ? 'tag-amber'
                  : 'tag-red'
                }`}>
                  {(r.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-2xs text-surface-500 capitalize">{r.category}</span>
                <span className="text-2xs text-surface-500">/</span>
                <span className="text-2xs text-surface-400 capitalize">{r.subcategory?.replace(/_/g, ' ')}</span>
              </div>
              <button
                className="btn-icon w-6 h-6 opacity-0 group-hover:opacity-100 -mr-1"
                onClick={() => removeResult(i)}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
