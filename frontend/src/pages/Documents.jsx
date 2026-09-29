import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../components/layout/PageHeader';
import DocumentUploader from '../components/documents/DocumentUploader';
import DocumentQueue from '../components/documents/DocumentQueue';
import DocumentPreview from '../components/documents/DocumentPreview';
import OCRTextPreview from '../components/documents/OCRTextPreview';
import {
  getDocuments,
  getDocumentOcr,
  uploadDocuments,
  retryOcr,
  deleteDocument,
} from '../services/documentApi';
import { END_TO_END_PIPELINE } from '../data/mockDocuments';
import {
  Files,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Database,
} from 'lucide-react';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [ocrData, setOcrData] = useState(null);
  const [summary, setSummary] = useState({
    total: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [processingDocId, setProcessingDocId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const textPreviewRef = useRef(null);

  useEffect(() => {
    fetchDocumentsList();
  }, []);

  const fetchDocumentsList = async () => {
    try {
      setIsLoading(true);
      const res = await getDocuments();
      setDocuments(res.documents);
      setSummary(res.summary);

      if (res.documents.length > 0) {
        // Select first completed or first item
        const initial = res.documents.find((d) => d.status === 'Completed') || res.documents[0];
        setSelectedDoc(initial);
        loadOcrText(initial.id);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOcrText = async (docId) => {
    try {
      const data = await getDocumentOcr(docId);
      setOcrData(data);
    } catch (err) {
      console.error('Failed to load OCR text:', err);
    }
  };

  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc);
    loadOcrText(doc.id);
  };

  const handleFilesSelected = async (fileList) => {
    try {
      setIsUploading(true);
      const newDocs = await uploadDocuments(fileList);

      setDocuments((prev) => [...newDocs, ...prev]);
      setSummary((prev) => ({
        ...prev,
        total: prev.total + newDocs.length,
        uploaded: (prev.uploaded || 0) + newDocs.length,
      }));

      showToast(`Added ${newDocs.length} ${newDocs.length === 1 ? 'file' : 'files'} to queue.`);

      if (newDocs.length > 0) {
        const firstNew = newDocs[0];
        setSelectedDoc(firstNew);
        loadOcrText(firstNew.id);

        // Auto-run OCR on uploaded document
        handleRetryDoc(firstNew.id);
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryDoc = async (docId) => {
    if (processingDocId) return;

    try {
      setProcessingDocId(docId);

      await retryOcr(docId, (updatedDoc) => {
        setDocuments((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, ...updatedDoc } : d))
        );

        setSelectedDoc((curr) =>
          curr && curr.id === docId ? { ...curr, ...updatedDoc } : curr
        );
      });

      await loadOcrText(docId);

      // Refresh summary
      const res = await getDocuments();
      setSummary(res.summary);

      showToast('OCR Processing completed for document!');
    } catch (err) {
      console.error('OCR execution error:', err);
      showToast('OCR execution encountered an issue', 'error');
    } finally {
      setProcessingDocId(null);
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await deleteDocument(docId);
      const remaining = documents.filter((d) => d.id !== docId);
      setDocuments(remaining);

      // Update summary
      const res = await getDocuments();
      setSummary(res.summary);

      if (selectedDoc?.id === docId) {
        if (remaining.length > 0) {
          setSelectedDoc(remaining[0]);
          loadOcrText(remaining[0].id);
        } else {
          setSelectedDoc(null);
          setOcrData(null);
        }
      }
      showToast('Document removed from queue.');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleScrollToTextPreview = () => {
    if (textPreviewRef.current) {
      textPreviewRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const showToast = (text, type = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 bg-slate-900 text-slate-100 border border-blue-600 rounded-sm shadow-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Document Intelligence"
        subtitle="Upload historical drilling documents for OCR processing and structured data extraction."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDocumentsList}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
              title="Refresh queue"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* 8. Top KPI Cards: Total Documents, Processing, Completed, Failed */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Documents */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Total Documents
            </span>
            <span className="text-lg font-bold text-slate-100">
              {summary.total}
            </span>
          </div>
          <Files className="w-4 h-4 text-slate-500" />
        </div>

        {/* Processing */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Processing
            </span>
            <span className="text-lg font-bold text-amber-400">
              {summary.processing}
            </span>
          </div>
          <Cpu className="w-4 h-4 text-amber-400" />
        </div>

        {/* Completed */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Completed
            </span>
            <span className="text-lg font-bold text-green-400">
              {summary.completed}
            </span>
          </div>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        </div>

        {/* Failed */}
        <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono block">
              Failed
            </span>
            <span className="text-lg font-bold text-red-400">
              {summary.failed}
            </span>
          </div>
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
      </div>

      {/* 12. Future OCR Pipeline Architecture Display */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-sm p-3">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] font-mono text-slate-400">
          <span className="font-semibold uppercase text-slate-300">
            End-to-End Extraction Pipeline Architecture
          </span>
          <span className="text-slate-500">
            Stages 1-4 Active (OCR Layer) · Stages 5-7 Ready for Backend NLP Model
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-center">
          {END_TO_END_PIPELINE.map((stage, idx) => (
            <div
              key={stage.id}
              className="p-1.5 rounded-sm border flex items-center justify-center gap-1.5 text-[10px] font-mono bg-blue-950/70 text-blue-300 border-blue-600/70 font-semibold shadow-xs"
            >
              <span>{stage.id}. {stage.name}</span>
              {idx < END_TO_END_PIPELINE.length - 1 && (
                <ArrowRight className="w-2.5 h-2.5 text-blue-400/80 hidden lg:inline" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Document Upload Area */}
      <DocumentUploader
        onFilesSelected={handleFilesSelected}
        isUploading={isUploading}
      />

      {/* 3. Document Queue & 5. Document Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Queue Table (7 cols on large screens) */}
        <div className="lg:col-span-7">
          <DocumentQueue
            documents={documents}
            selectedDocId={selectedDoc?.id}
            onSelectDoc={handleSelectDoc}
            onRetryDoc={handleRetryDoc}
            onDeleteDoc={handleDeleteDoc}
          />
        </div>

        {/* Selected Document Details Panel (5 cols on large screens) */}
        <div className="lg:col-span-5">
          <DocumentPreview
            document={selectedDoc}
            onViewExtractedText={handleScrollToTextPreview}
            onRetryOcr={handleRetryDoc}
            isProcessing={processingDocId === selectedDoc?.id}
          />
        </div>
      </div>

      {/* 6. OCR Text Preview Section */}
      <div ref={textPreviewRef} className="pt-2">
        <OCRTextPreview
          text={ocrData?.ocrExtractedText}
          documentName={selectedDoc?.name || 'Selected Document'}
          ocrStatus={selectedDoc?.ocrStatus || selectedDoc?.status}
          isDemoOutput={ocrData?.isDemoOutput ?? true}
        />
      </div>
    </div>
  );
}
