import { useState, useEffect } from 'react';
import {
  FileText,
  Image,
  Video,
  Music,
  Table,
  Archive,
  File,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  HardDrive,
  FolderOpen,
  FileType,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import client from '../../api/client';
import { formatBytes, formatDate } from '../../utils/format';
import LoadingSpinner from '../ui/LoadingSpinner';

const categoryIcons = {
  images: Image,
  videos: Video,
  audio: Music,
  documents: FileText,
  spreadsheets: Table,
  archives: Archive,
  code: File,
  Others: File,
};

const categoryColors = {
  images: 'text-category-images',
  videos: 'text-category-videos',
  documents: 'text-category-documents',
  audio: 'text-category-audio',
  spreadsheets: 'text-category-spreadsheets',
  archives: 'text-category-archives',
  code: 'text-category-code',
  Others: 'text-category-other',
};

export default function FilePreview({ fileId, onClose }) {
  const [meta, setMeta] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showText, setShowText] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!fileId) { setMeta(null); return; }
    setLoading(true);
    setBlobUrl(null);
    setShowText(false);

    const token = localStorage.getItem('fileoracle_token');

    Promise.all([
      client.get(`/api/v1/files/${fileId}/metadata`),
      client
        .get(`/api/v1/files/${fileId}/preview`, {
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => null),
    ])
      .then(([metaRes, previewRes]) => {
        setMeta(metaRes.data);
        if (previewRes?.data) {
          setBlobUrl(URL.createObjectURL(previewRes.data));
        }
      })
      .finally(() => setLoading(false));

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [fileId]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (fileId) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [fileId, onClose]);

  if (!fileId) return null;

  const file = meta?.file;
  const isImage = file?.category === 'images';
  const isVideo = file?.category === 'videos';
  const isAudio = file?.category === 'audio';
  const isPdf = file?.extension === '.pdf';
  const isText = file?.extension === '.txt' || file?.extension === '.md';
  const Icon = categoryIcons[file?.category] || File;
  const colorClass = categoryColors[file?.category] || 'text-category-other';

  const confLevel = file?.ai_confidence_score != null
    ? file.ai_confidence_score >= 0.7 ? 'high'
      : file.ai_confidence_score >= 0.4 ? 'medium'
      : 'low'
    : null;

  const confColors = {
    high: 'tag-green',
    medium: 'tag-amber',
    low: 'tag-red',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card-strong max-w-3xl w-full max-h-[90vh] overflow-auto scrollbar-custom animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`p-3 rounded-xl bg-surface-800/60 border border-surface-400/10 ${colorClass}`}>
              <Icon className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-base text-surface-100 truncate">{file?.name || 'Preview'}</h2>
              {file && (
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <span className={`text-xs font-medium capitalize ${colorClass}`}>{file.category}</span>
                  {file.subcategory && (
                    <>
                      <span className="text-surface-600">/</span>
                      <span className="text-xs text-surface-400 capitalize">{file.subcategory.replace(/_/g, ' ')}</span>
                    </>
                  )}
                  {confLevel && (
                    <span className={`text-2xs ${confColors[confLevel]}`}>
                      {(file.ai_confidence_score * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading preview..." />
        ) : (
          <>
            {/* Preview area */}
            {blobUrl && (isImage || isVideo || isAudio || isPdf || isText) && (
              <div className="mb-6 rounded-2xl overflow-hidden bg-black/40 border border-surface-400/10 min-h-[200px] flex items-center justify-center">
                {isImage && (
                  <img src={blobUrl} alt={file.name} className="max-h-96 object-contain" loading="lazy" />
                )}
                {isVideo && (
                  <video src={blobUrl} controls className="max-h-96 w-full" />
                )}
                {isAudio && (
                  <div className="p-8 w-full text-center">
                    <div className={`p-4 rounded-2xl bg-surface-800/60 inline-flex mb-4 ${colorClass}`}>
                      <Music className="w-12 h-12" strokeWidth={1.5} />
                    </div>
                    <audio src={blobUrl} controls className="w-full max-w-sm mx-auto" />
                  </div>
                )}
                {isPdf && (
                  <iframe src={`${blobUrl}#toolbar=1`} title={file.name} className="w-full h-96" />
                )}
                {isText && (
                  <iframe src={blobUrl} title={file.name} className="w-full h-80" />
                )}
              </div>
            )}

            {!blobUrl && !isImage && !isVideo && !isAudio && !isPdf && !isText && (
              <div className="mb-6 rounded-2xl bg-surface-800/40 border border-surface-400/10 p-12 text-center">
                <Icon className={`w-12 h-12 mx-auto mb-3 ${colorClass}`} strokeWidth={1.5} />
                <p className="text-sm text-surface-400">Preview not available</p>
              </div>
            )}

            {/* AI Tags */}
            {file?.ai_tags?.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-3.5 h-3.5 text-surface-400" />
                  <span className="text-2xs font-semibold text-surface-400 uppercase tracking-wider">AI Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {file.ai_tags.map((t) => (
                    <span key={t} className="tag-oracle">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted text toggle */}
            {(file?.extracted_text || file?.ocr_text) && (
              <div className="mb-5">
                <button
                  onClick={() => setShowText(!showText)}
                  className="btn-ghost text-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {showText ? 'Hide' : 'Show'} extracted text
                  {showText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showText && (
                  <pre className="mt-2 p-4 rounded-xl bg-surface-900/60 border border-surface-400/10 text-xs text-surface-400 max-h-48 overflow-auto scrollbar-custom whitespace-pre-wrap font-mono">
                    {file.extracted_text || file.ocr_text}
                  </pre>
                )}
              </div>
            )}

            {/* Toggle metadata */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="btn-ghost text-xs mb-3"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Hide' : 'Show'} details
            </button>

            {expanded && (
              <div className="grid grid-cols-2 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-surface-400/10">
                {[
                  { icon: HardDrive, label: 'Size', value: formatBytes(file?.size_bytes) },
                  { icon: FileType, label: 'Type', value: file?.extension?.toUpperCase() || '—', mono: true },
                  { icon: FolderOpen, label: 'Category', value: file?.category || '—' },
                  { icon: FolderOpen, label: 'Subcategory', value: file?.subcategory?.replace(/_/g, ' ') || '—' },
                  { icon: Clock, label: 'Modified', value: formatDate(file?.modified_at) },
                  { icon: Clock, label: 'Created', value: formatDate(file?.created_at) },
                  { icon: ShieldCheck, label: 'Confidence', value: file?.ai_confidence_score != null ? `${(file.ai_confidence_score * 100).toFixed(0)}%` : '—' },
                ].map(({ icon: InfoIcon, label, value, mono }) => (
                  <div key={label} className="bg-surface-900/40 px-4 py-3">
                    <div className="flex items-center gap-2 text-2xs text-surface-500 mb-1">
                      <InfoIcon className="w-3 h-3" />
                      {label}
                    </div>
                    <p className={`text-sm text-surface-200 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
                  </div>
                ))}
                <div className="col-span-2 bg-surface-900/40 px-4 py-3">
                  <div className="flex items-center gap-2 text-2xs text-surface-500 mb-1">
                    <MapPin className="w-3 h-3" />
                    Path
                  </div>
                  <p className="text-xs text-surface-400 break-all font-mono">{file?.path}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
