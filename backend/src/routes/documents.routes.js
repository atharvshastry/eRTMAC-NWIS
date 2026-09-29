/**
 * Document upload + OCR/extraction routes (PS 26121 requirement: turn historical PDF reports
 * into structured, searchable records). New route -- the original teammate backend had none.
 * Uploads are processed synchronously through the real Python AI service (documentProcessor.js:
 * /parse for real PDF text/OCR, /extract for regex-based event/depth/formation/mitigation
 * extraction) so a document is already "Completed" by the time the upload response returns --
 * no background job queue needed for a hackathon demo.
 */
const documentsStore = require("../data/documentsStore");
const { processUpload } = require("../services/documentProcessor");

async function documentsRoutes(app) {
  app.get("/api/documents", async () => ({
    documents: documentsStore.list(),
    summary: documentsStore.summary(),
  }));

  app.get("/api/documents/:id", async (request, reply) => {
    const doc = documentsStore.get(request.params.id);
    if (!doc) return reply.code(404).send({ success: false, message: `Unknown document ${request.params.id}` });
    return doc;
  });

  app.get("/api/documents/:id/status", async (request, reply) => {
    const doc = documentsStore.get(request.params.id);
    if (!doc) return reply.code(404).send({ success: false, message: `Unknown document ${request.params.id}` });
    const { id, status, ocrStatus, pipelineStage, stageName, progress } = doc;
    return { id, status, ocrStatus, pipelineStage, stageName, progress };
  });

  app.get("/api/documents/:id/ocr", async (request, reply) => {
    const doc = documentsStore.get(request.params.id);
    if (!doc) return reply.code(404).send({ success: false, message: `Unknown document ${request.params.id}` });
    return {
      documentId: doc.id,
      documentName: doc.name,
      ocrStatus: doc.ocrStatus,
      ocrQuality: doc.ocrQuality,
      ocrExtractedText: doc.ocrExtractedText,
      isDemoOutput: false,
    };
  });

  app.get("/api/documents/:id/entities", async (request, reply) => {
    const doc = documentsStore.get(request.params.id);
    if (!doc) return reply.code(404).send({ success: false, message: `Unknown document ${request.params.id}` });
    return {
      documentId: doc.id,
      documentName: doc.name,
      extractedDate: doc.uploadDate,
      ...doc.entities,
    };
  });

  // POST /api/documents/upload (multipart/form-data, one or more files under any field name).
  // Returns a bare array of the newly-created document records -- documentApi.js's
  // uploadDocuments() checks `Array.isArray(backendRes)` and uses it directly when true.
  app.post("/api/documents/upload", async (request, reply) => {
    const parts = request.files();
    const created = [];
    for await (const part of parts) {
      const buffer = await part.toBuffer();
      const doc = await processUpload({ buffer, filename: part.filename, sizeBytes: buffer.length });
      documentsStore.add(doc);
      created.push(documentsStore.get(doc.id));
    }
    if (!created.length) {
      return reply.code(400).send({ success: false, message: "No files found in upload." });
    }
    return created;
  });

  // Re-run parsing/extraction against the originally-uploaded buffer -- a genuine retry, not
  // just replaying the same cached result.
  app.post("/api/documents/:id/ocr/retry", async (request, reply) => {
    const full = documentsStore.getFull(request.params.id);
    if (!full) return reply.code(404).send({ success: false, message: `Unknown document ${request.params.id}` });
    documentsStore.update(full.id, { status: "Processing", ocrStatus: "Processing", pipelineStage: 2, stageName: "OCR Processing", progress: 50 });
    const reprocessed = await processUpload({ buffer: full._buffer, filename: full.name, sizeBytes: full.sizeBytes });
    const updated = documentsStore.update(full.id, { ...reprocessed, id: full.id, uploadDate: full.uploadDate });
    return updated;
  });

  app.delete("/api/documents/:id", async (request) => {
    const removed = documentsStore.remove(request.params.id);
    return { success: removed, id: request.params.id };
  });

  app.post("/api/documents/:id/publish", async (request, reply) => {
    const doc = documentsStore.get(request.params.id);
    if (!doc) return reply.code(404).send({ success: false, message: `Unknown document ${request.params.id}` });
    return {
      success: true,
      documentId: doc.id,
      documentName: doc.name,
      recordsAdded: doc.entities ? doc.entities.totalEntities : 0,
    };
  });
}

module.exports = documentsRoutes;
