/**
 * Document Intelligence & OCR API Service
 * 
 * Endpoints:
 *   POST  /documents/upload (multipart/form-data)
 *   GET   /documents
 *   GET   /documents/:id
 *   GET   /documents/:id/status
 *   GET   /documents/:id/ocr
 *   GET   /documents/:id/entities
 */

import { apiClient, safeApiCall } from './api';
import { INITIAL_DOCUMENTS, OCR_PIPELINE_STAGES, SUPPORTED_EXTENSIONS } from '../data/mockDocuments';
import { MOCK_EXTRACTED_ENTITIES, getFlatEntityRows } from '../data/mockExtractedEntities';

// In-memory document fallback store
let documentsStore = [...INITIAL_DOCUMENTS];
const entitiesStore = { ...MOCK_EXTRACTED_ENTITIES };

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getCurrentTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getFallbackSummary() {
  return {
    total: documentsStore.length,
    processing: documentsStore.filter((d) => d.status === 'Processing').length,
    completed: documentsStore.filter((d) => d.status === 'Completed').length,
    failed: documentsStore.filter((d) => d.status === 'Failed').length,
    uploaded: documentsStore.filter((d) => d.status === 'Uploaded').length,
  };
}

/**
 * GET /documents
 */
export async function getDocuments() {
  const res = await safeApiCall(
    () => apiClient.get('/documents'),
    () => ({
      documents: [...documentsStore],
      summary: getFallbackSummary(),
    }),
    'GET /documents'
  );

  return {
    ...res.data,
    isBackendLive: res.isBackendLive,
  };
}

/**
 * GET /documents/:id
 */
export async function getDocumentById(id) {
  const fallback = documentsStore.find((d) => d.id === id);

  const res = await safeApiCall(
    () => apiClient.get(`/documents/${id}`),
    fallback,
    `GET /documents/${id}`
  );

  return res.data;
}

/**
 * GET /documents/:id/status
 */
export async function getDocumentStatus(id) {
  const doc = documentsStore.find((d) => d.id === id);
  const fallback = doc
    ? {
        id: doc.id,
        status: doc.status,
        ocrStatus: doc.ocrStatus,
        pipelineStage: doc.pipelineStage,
        stageName: doc.stageName,
        progress: doc.progress,
      }
    : null;

  const res = await safeApiCall(
    () => apiClient.get(`/documents/${id}/status`),
    fallback,
    `GET /documents/${id}/status`
  );

  return res.data;
}

/**
 * GET /documents/:id/ocr
 */
export async function getDocumentOcr(id) {
  const doc = documentsStore.find((d) => d.id === id);
  const fallback = doc
    ? {
        documentId: doc.id,
        documentName: doc.name,
        ocrStatus: doc.ocrStatus || doc.status,
        ocrQuality: doc.ocrQuality || {
          confidence: 94,
          pagesProcessed: doc.pageCount,
          textBlocks: 186,
          tablesDetected: 12,
          warnings: 1,
        },
        ocrExtractedText:
          doc.ocrExtractedText ||
          `Extracted text layer for ${doc.name}.\nWell: ${doc.wellId || 'OIL-DEMO-003'}\nFormation: ${doc.formation || 'Demo Formation'}\nOperation normal.`,
        isDemoOutput: true,
      }
    : null;

  const res = await safeApiCall(
    () => apiClient.get(`/documents/${id}/ocr`),
    fallback,
    `GET /documents/${id}/ocr`
  );

  return res.data;
}

/**
 * POST /documents/upload
 * Supports multipart/form-data.
 */
export async function uploadDocuments(input, onProgress) {
  let filesList = [];
  let formData = null;

  if (input instanceof FormData) {
    formData = input;
    filesList = input.getAll('documents') || input.getAll('files') || [];
  } else if (Array.isArray(input) || input instanceof FileList) {
    filesList = Array.from(input);
    formData = new FormData();
    filesList.forEach((file) => formData.append('documents', file));
  }

  // Attempt backend upload via multipart/form-data
  try {
    const backendRes = await apiClient.upload('/documents/upload', formData);
    if (backendRes && Array.isArray(backendRes)) {
      return backendRes;
    }
  } catch (err) {
    // Graceful offline fallback
  }

  // Fallback in-memory document creation
  const uploadedDocs = [];

  for (let idx = 0; idx < filesList.length; idx++) {
    const file = filesList[idx];
    const extension = `.${file.name.split('.').pop().toLowerCase()}`;

    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      throw new Error(
        `Unsupported file type "${extension}". Supported types: ${SUPPORTED_EXTENSIONS.join(', ')}`
      );
    }

    const docType = extension.replace('.', '').toUpperCase();
    const docId = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const pageEst =
      docType === 'PNG' || docType === 'JPG' || docType === 'JPEG'
        ? 1
        : Math.max(1, Math.round(file.size / (180 * 1024)));

    const newDoc = {
      id: docId,
      name: file.name,
      type: docType,
      size: formatFileSize(file.size),
      sizeBytes: file.size,
      pageCount: pageEst,
      status: 'Uploaded',
      ocrStatus: 'Uploaded',
      pipelineStage: 1,
      stageName: 'Uploaded',
      progress: 25,
      uploadDate: getCurrentTimestamp(),
      wellId: 'OIL-DEMO-003',
      formation: 'Demo Formation',
      ocrQuality: {
        confidence: 0,
        pagesProcessed: 0,
        textBlocks: 0,
        tablesDetected: 0,
        warnings: 0,
      },
      ocrExtractedText: `Document uploaded and validated. Ready for OCR processing pipeline. Click "Retry OCR" or wait for queue processing.`,
      rawFile: file,
    };

    documentsStore.unshift(newDoc);
    uploadedDocs.push(newDoc);

    if (typeof onProgress === 'function') {
      onProgress(Math.round(((idx + 1) / filesList.length) * 100));
    }
  }

  return uploadedDocs;
}

/**
 * Simulates or triggers retry OCR pipeline
 */
export async function retryOcr(id, onStageChange) {
  // Attempt backend retry endpoint
  try {
    const res = await apiClient.post(`/documents/${id}/ocr/retry`, {});
    if (res && res.status) {
      return res;
    }
  } catch {
    // Proceed to fallback simulation
  }

  const docIndex = documentsStore.findIndex((d) => d.id === id);
  if (docIndex === -1) {
    throw new Error(`Document with ID "${id}" not found.`);
  }

  // Step 2: OCR Processing
  documentsStore[docIndex] = {
    ...documentsStore[docIndex],
    status: 'Processing',
    ocrStatus: 'Processing',
    pipelineStage: 2,
    stageName: 'OCR Processing',
    progress: 50,
  };

  if (typeof onStageChange === 'function') {
    onStageChange({ ...documentsStore[docIndex] });
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Step 3: Text Extracted
  documentsStore[docIndex] = {
    ...documentsStore[docIndex],
    pipelineStage: 3,
    stageName: 'Text Extracted',
    progress: 80,
  };

  if (typeof onStageChange === 'function') {
    onStageChange({ ...documentsStore[docIndex] });
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Step 4: Ready for Analysis
  documentsStore[docIndex] = {
    ...documentsStore[docIndex],
    status: 'Completed',
    ocrStatus: 'Completed',
    pipelineStage: 4,
    stageName: 'Ready for Analysis',
    progress: 100,
    ocrQuality: {
      confidence: 95,
      pagesProcessed: documentsStore[docIndex].pageCount || 16,
      textBlocks: 186,
      tablesDetected: 12,
      warnings: 1,
    },
    ocrExtractedText: `WELL INFORMATION & DRILLING OPERATIONS SUMMARY
WELL ID: ${documentsStore[docIndex].wellId || 'OIL-DEMO-003'} | FIELD: UPPER ASSAM SHELF
REPORT: ${documentsStore[docIndex].name}

1. GEOLOGICAL SUMMARY & FORMATION DRILLING
Well ${documentsStore[docIndex].wellId || 'OIL-DEMO-003'} was drilled through ${documentsStore[docIndex].formation || 'Demo Formation'}.
At approximately 2680 m depth, partial mud losses were observed in a fractured sandstone stringer.
Mud weight prior to loss: 1.28 SG. Flow rate: 2,420 l/min with standpipe pressure at 3,120 psi.
The drilling operation continued after the recorded mitigation.

2. OPERATIONAL MITIGATION RECORDED
Spotted 40 bbl LCM pill across fractured zone. Held static under 250 psi hesitation squeeze for 4 hours.
Losses stabilized below 1.5 bbl/hr. Drilling resumed safely with reduced annular velocity.`,
  };

  if (typeof onStageChange === 'function') {
    onStageChange({ ...documentsStore[docIndex] });
  }

  return { ...documentsStore[docIndex] };
}

/**
 * DELETE /documents/:id
 */
export async function deleteDocument(id) {
  try {
    await apiClient.delete(`/documents/${id}`);
  } catch {
    // Local fallback deletion
  }
  documentsStore = documentsStore.filter((d) => d.id !== id);
  return { success: true, id };
}

/**
 * GET /documents/:id/entities
 */
export async function getDocumentEntities(id) {
  const doc = documentsStore.find((d) => d.id === id);
  let entitiesObj = entitiesStore[doc?.entitiesId] || entitiesStore['entities-doc-001'];

  const fallback = {
    ...entitiesObj,
    flatRows: getFlatEntityRows(entitiesObj),
  };

  const res = await safeApiCall(
    () => apiClient.get(`/documents/${id}/entities`),
    fallback,
    `GET /documents/${id}/entities`
  );

  return res.data;
}

export async function sendToKnowledgeRepository(id, entities) {
  const doc = documentsStore.find((d) => d.id === id);
  const fallback = {
    success: true,
    documentId: id,
    documentName: doc?.name || 'Document',
    recordsAdded: entities?.totalEntities || 28,
  };

  const res = await safeApiCall(
    () => apiClient.post(`/documents/${id}/publish`, { entities }),
    fallback,
    `POST /documents/${id}/publish`
  );

  return res.data;
}
