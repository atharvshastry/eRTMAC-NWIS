import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, FilePlus, Upload } from 'lucide-react';
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '../../data/mockDocuments';

export default function DocumentUploader({ onFilesSelected, isUploading }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedStagedFiles, setSelectedStagedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateFiles = (fileList) => {
    setErrorMessage('');
    if (!fileList || fileList.length === 0) return [];

    const validFiles = [];
    const invalidNames = [];

    Array.from(fileList).forEach((file) => {
      const ext = `.${file.name.split('.').pop().toLowerCase()}`;
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        if (file.size <= MAX_FILE_SIZE_BYTES) {
          validFiles.push(file);
        } else {
          invalidNames.push(`${file.name} (exceeds 50MB)`);
        }
      } else {
        invalidNames.push(`${file.name} (unsupported format)`);
      }
    });

    if (invalidNames.length > 0) {
      setErrorMessage(`Skipped invalid files: ${invalidNames.join(', ')}`);
    }

    return validFiles;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer && e.dataTransfer.files) {
      const valid = validateFiles(e.dataTransfer.files);
      if (valid.length > 0) {
        setSelectedStagedFiles(valid);
        if (onFilesSelected) {
          onFilesSelected(valid);
        }
      }
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      const valid = validateFiles(e.target.files);
      if (valid.length > 0) {
        setSelectedStagedFiles(valid);
        if (onFilesSelected) {
          onFilesSelected(valid);
        }
      }
      e.target.value = '';
    }
  };

  const triggerBrowse = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUploadStaged = () => {
    if (selectedStagedFiles.length > 0 && onFilesSelected) {
      onFilesSelected(selectedStagedFiles);
      setSelectedStagedFiles([]);
    } else {
      triggerBrowse();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-4">
      {/* Upload Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerBrowse}
        className={`border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-all duration-150 ${
          isDragOver
            ? 'border-blue-500 bg-blue-950/30 text-blue-200'
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60 text-slate-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.png,.jpg,.jpeg"
          onChange={handleFileInputChange}
          className="hidden"
          id="drilling-document-input"
        />

        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-2">
          {/* Upload Icon */}
          <div
            className={`w-12 h-12 rounded-sm flex items-center justify-center transition-colors ${
              isDragOver
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-blue-400 group-hover:bg-slate-700'
            }`}
          >
            {isUploading ? (
              <FilePlus className="w-6 h-6 animate-pulse" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Drag & Drop documents here
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              or Browse Files · <span className="text-blue-400 font-medium">Multiple files supported</span>
            </p>
          </div>

          {/* Buttons: Browse Files & Upload Documents */}
          <div className="pt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={triggerBrowse}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-sm border border-slate-700 transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Browse Files</span>
            </button>

            <button
              type="button"
              onClick={handleUploadStaged}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-sm shadow-sm transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Documents</span>
            </button>
          </div>

          {/* Supported Format Tags */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono text-slate-400">
            <span className="text-slate-500">Supported:</span>
            {['PDF', 'DOCX', 'PNG', 'JPG', 'JPEG'].map((fmt) => (
              <span
                key={fmt}
                className="px-1.5 py-0.5 bg-slate-800 border border-slate-700/60 rounded-sm text-slate-300"
              >
                {fmt}
              </span>
            ))}
            <span className="text-slate-500 ml-1">· Max 50 MB</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-2.5 px-3 py-2 bg-red-950/50 border border-red-900/60 rounded-sm text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
