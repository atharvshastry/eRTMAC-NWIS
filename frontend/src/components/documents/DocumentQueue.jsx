import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Eye,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileCode,
} from 'lucide-react';

export default function DocumentQueue({
  documents = [],
  selectedDocId = null,
  onSelectDoc,
  onRetryDoc,
  onDeleteDoc,
}) {
  const getFileIcon = (type) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-4 h-4 text-red-400 shrink-0" />;
      case 'DOCX':
        return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'PNG':
      case 'JPG':
      case 'JPEG':
        return <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <FileCode className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase bg-green-950/80 text-green-400 border border-green-800/80">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Completed
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase bg-amber-950/80 text-amber-400 border border-amber-800/80">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            Processing
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase bg-red-950/80 text-red-400 border border-red-800/80">
            <AlertCircle className="w-2.5 h-2.5" />
            Failed
          </span>
        );
      case 'Uploaded':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase bg-blue-950/80 text-blue-400 border border-blue-800/80">
            Uploaded
          </span>
        );
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 text-center text-slate-400 text-xs">
        No documents currently in queue. Drag & drop files above or click Browse to begin.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
      {/* Table Header / Summary */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-200">
            Document Queue
          </span>
          <span className="px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700/60">
            {documents.length} {documents.length === 1 ? 'file' : 'files'}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          Click row to view details & OCR text
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
            <tr>
              <th className="py-2.5 px-3">File Name</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Size</th>
              <th className="py-2.5 px-3">Pages</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Progress</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {documents.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              const isProcessing = doc.status === 'Processing';

              return (
                <tr
                  key={doc.id}
                  onClick={() => onSelectDoc && onSelectDoc(doc)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-950/40 border-l-2 border-blue-500'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  {/* File Name */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getFileIcon(doc.type)}
                      <div className="truncate">
                        <div className="font-medium text-slate-200 truncate">
                          {doc.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {doc.wellId ? `Well: ${doc.wellId}` : 'Offset Document'} · {doc.uploadDate}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded-sm bg-slate-800 border border-slate-700/60 font-mono text-[10px] text-slate-300">
                      {doc.type}
                    </span>
                  </td>

                  {/* Size */}
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {doc.size}
                  </td>

                  {/* Pages */}
                  <td className="py-2.5 px-3 font-mono text-slate-300">
                    {doc.pageCount || 1}
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {getStatusBadge(doc.status)}
                  </td>

                  {/* Progress */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col gap-1 min-w-[90px] max-w-[130px]">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="truncate text-slate-400">
                          {doc.stageName || (doc.progress === 100 ? 'Completed' : 'Pending')}
                        </span>
                        <span className="text-slate-300 font-semibold">{doc.progress || 0}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-sm overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            doc.status === 'Completed'
                              ? 'bg-green-500'
                              : doc.status === 'Failed'
                              ? 'bg-red-500'
                              : doc.status === 'Processing'
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${doc.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Actions: View, Remove, Retry */}
                  <td className="py-2.5 px-3 text-right">
                    <div
                      className="inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* View */}
                      <button
                        type="button"
                        onClick={() => onSelectDoc && onSelectDoc(doc)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition-colors"
                        title="View document & OCR"
                      >
                        <Eye className="w-3 h-3 text-blue-400" />
                        <span>View</span>
                      </button>

                      {/* Retry */}
                      {onRetryDoc && (
                        <button
                          type="button"
                          onClick={() => onRetryDoc(doc.id)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-medium border border-slate-700 transition-colors disabled:opacity-40"
                          title="Retry OCR processing"
                        >
                          <RotateCcw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                          <span>Retry</span>
                        </button>
                      )}

                      {/* Remove */}
                      {onDeleteDoc && !isProcessing && (
                        <button
                          type="button"
                          onClick={() => onDeleteDoc(doc.id)}
                          className="p-1 rounded-sm text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                          title="Remove document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
