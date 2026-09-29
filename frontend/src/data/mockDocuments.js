/**
 * Mock Documents Data for NWIS Document Intelligence & OCR Interface (Phase 9)
 * Fictional DEMO drilling engineering documents and OCR extraction output.
 */

export const INITIAL_DOCUMENTS = [
  {
    id: 'doc-001',
    name: 'DDR-DEMO-003.pdf',
    type: 'PDF',
    size: '2.8 MB',
    sizeBytes: 2936012,
    pageCount: 16,
    status: 'Completed',
    ocrStatus: 'Completed',
    pipelineStage: 4, // 1 to 4 in OCR pipeline
    stageName: 'Ready for Analysis',
    progress: 100,
    uploadDate: '2026-09-22 11:45',
    wellId: 'OIL-DEMO-003',
    formation: 'Demo Formation',
    ocrQuality: {
      confidence: 94,
      pagesProcessed: 16,
      textBlocks: 186,
      tablesDetected: 12,
      warnings: 2,
    },
    ocrExtractedText: `WELL INFORMATION & DRILLING OPERATIONS SUMMARY
WELL ID: OIL-DEMO-003 | FIELD: UPPER ASSAM SHELF | RIG: OIL-RIG-04
REPORT DATE: 2026-09-18 | REPORT TYPE: DAILY DRILLING REPORT (DDR)

1. GEOLOGICAL SUMMARY & FORMATION DRILLING
Well OIL-DEMO-003 was drilled through Demo Formation (Barail Group).
At approximately 2680 m depth, partial mud losses were observed in a fractured sandstone stringer.
Mud weight prior to loss: 1.28 SG. Flow rate: 2,420 l/min with standpipe pressure at 3,120 psi.
Initial dynamic loss rate was measured at 28 bbl/hr.

2. OPERATIONAL MITIGATION & ACTIONS RECORDED
Drilling was temporarily suspended to conduct a flow check. 
The drilling operation continued after the recorded mitigation:
Spotted 40 bbl high-fluid-loss squeeze LCM pill (medium nut plug + mica) across 2,670 m - 2,685 m.
Held static under 250 psi hesitation squeeze for 4 hours.
Losses stabilized below 1.5 bbl/hr. Bit rotated off bottom with reduced pump discharge of 2,100 l/min.

3. SENSOR & DRILLING PARAMETERS LOG
- Depth: 2,680.0 m MD / 2,672.4 m TVD
- Rotary Speed: 110 RPM
- Weight on Bit (WOB): 18.5 kN
- Surface Torque: 16.8 kNm (erratic peaks up to 21.2 kNm observed)
- Rate of Penetration (ROP): 13.8 m/hr (dropped to 6.2 m/hr during loss mitigation)
- Total Gas: Background 42 units; connection peak 280 units.`,
  },
  {
    id: 'doc-002',
    name: 'WCR-DEMO-003.pdf',
    type: 'PDF',
    size: '5.4 MB',
    sizeBytes: 5662310,
    pageCount: 38,
    status: 'Completed',
    ocrStatus: 'Completed',
    pipelineStage: 4,
    stageName: 'Ready for Analysis',
    progress: 100,
    uploadDate: '2026-09-22 10:14',
    wellId: 'OIL-DEMO-003',
    formation: 'Tipam Sandstone',
    ocrQuality: {
      confidence: 96,
      pagesProcessed: 38,
      textBlocks: 342,
      tablesDetected: 24,
      warnings: 0,
    },
    ocrExtractedText: `WELL COMPLETION REPORT (WCR)
WELL: OIL-DEMO-003 | OPERATOR: OIL INDIA LIMITED
COORDINATES: LAT 27° 22' 18.4" N, LONG 95° 18' 04.2" E | ELEVATION: 118.5 m (GL)

1. SECTION DEPTHS & CASING SCHEMATIC
- 20" Conductor set at 120 m MD (cemented to surface)
- 13-3/8" Surface Casing set at 980 m MD (Class G + 2% Bentonite)
- 9-5/8" Intermediate Casing set at 2,450 m MD (High Sulfate Resistant cement)
- 7" Production Liner from 2,380 m to 3,450 m (Latex modified ThermaLock slurry)
- Total Depth (TD): 3,450 m MD / 3,428 m TVD

2. FORMATION EVALUATION & HYDROCARBON OCCURRENCE
Top of Tipam Formation encountered at 2,140 m MD.
Barail Sandstone reservoir section penetrated between 2,620 m and 2,980 m MD.
Good oil shows recorded on ditch cuttings with bright yellow-green fluorescence and fast streaming cut.
Borehole caliper showed good gauge stability through upper sandstones with minor dogleg severity (<1.5°/30m).`,
  },
  {
    id: 'doc-003',
    name: 'MudLog-DEMO-003.pdf',
    type: 'PDF',
    size: '6.1 MB',
    sizeBytes: 6396313,
    pageCount: 24,
    status: 'Processing',
    ocrStatus: 'Processing',
    pipelineStage: 2, // OCR Processing
    stageName: 'OCR Processing',
    progress: 65,
    uploadDate: '2026-09-23 09:30',
    wellId: 'OIL-DEMO-003',
    formation: 'Barail Coal Shale',
    ocrQuality: {
      confidence: 88,
      pagesProcessed: 15,
      textBlocks: 142,
      tablesDetected: 8,
      warnings: 3,
    },
    ocrExtractedText: `[OCR PROCESSING IN PROGRESS — 65% COMPLETED]
Track 1: Rate of Penetration (ROP) 0 - 50 m/hr
Track 2: Gamma Ray (0 - 150 GAPI), Resistivity (0.2 - 2000 ohm-m)
Track 3: Total Gas (0 - 5000 units), Chromatograph Breakdown (C1, C2, C3, iC4, nC4)
Interval scanned: 2,400 m to 2,850 m. High methane peak detected at 2,740 m.
Text extraction pending completion for lower lithology column.`,
  },
  {
    id: 'doc-004',
    name: 'Completion-DEMO-003.pdf',
    type: 'PDF',
    size: '3.6 MB',
    sizeBytes: 3774873,
    pageCount: 18,
    status: 'Uploaded',
    ocrStatus: 'Uploaded',
    pipelineStage: 1, // Uploaded
    stageName: 'Uploaded',
    progress: 25,
    uploadDate: '2026-09-23 10:05',
    wellId: 'OIL-DEMO-003',
    formation: 'Demo Formation',
    ocrQuality: {
      confidence: 0,
      pagesProcessed: 0,
      textBlocks: 0,
      tablesDetected: 0,
      warnings: 0,
    },
    ocrExtractedText: `File queued for optical character recognition. Click "Retry OCR" or wait for queue processor to begin text extraction.`,
  },
  {
    id: 'doc-005',
    name: 'MUDLOG_DEMO_004.pdf',
    type: 'PDF',
    size: '4.8 MB',
    sizeBytes: 5033164,
    pageCount: 30,
    status: 'Completed',
    ocrStatus: 'Completed',
    pipelineStage: 4,
    stageName: 'Ready for Analysis',
    progress: 100,
    uploadDate: '2026-09-21 16:30',
    wellId: 'OIL-DEMO-004',
    formation: 'Barail Coal Shale',
    ocrQuality: {
      confidence: 95,
      pagesProcessed: 30,
      textBlocks: 278,
      tablesDetected: 18,
      warnings: 1,
    },
    ocrExtractedText: `HYDROCARBON LOGGING REPORT — WELL OIL-DEMO-004
FORMATION: BARAIL COAL SHALE | DEPTH RANGE: 2,100 m - 3,600 m

Lithology consisted predominantly of carbonaceous shale interbedded with thin sub-bituminous coal seams.
Seepage loss of 8 bbl/hr recorded between 2,890 m and 2,930 m.
Trip gas peak of 1,840 units (C1-C4) observed after 12 hr connection break.
Degasser maintained online throughout interval. Mud weight weighted up from 1.28 to 1.32 SG with barite.`,
  },
  {
    id: 'doc-006',
    name: 'CASING_REP_DEMO_002.docx',
    type: 'DOCX',
    size: '1.9 MB',
    sizeBytes: 1992294,
    pageCount: 12,
    status: 'Completed',
    ocrStatus: 'Completed',
    pipelineStage: 4,
    stageName: 'Ready for Analysis',
    progress: 100,
    uploadDate: '2026-09-21 09:20',
    wellId: 'OIL-DEMO-002',
    formation: 'Girujan Clay',
    ocrQuality: {
      confidence: 97,
      pagesProcessed: 12,
      textBlocks: 110,
      tablesDetected: 14,
      warnings: 0,
    },
    ocrExtractedText: `CASING AND CEMENTING JOB REPORT
WELL: MORAN STEPOUT #2 (OIL-DEMO-002) | 9-5/8" INTERMEDIATE STRING

Job executed smoothly with guide shoe positioned at 2,450 m MD.
Slurry pumped: 550 sacks Lead (1.56 SG) followed by 200 sacks Tail (1.90 SG).
Bumped plug with 2,150 psi. Floats held positive. Full mud returns observed throughout displacement.
Zero non-productive time incurred.`,
  },
  {
    id: 'doc-007',
    name: 'WELL_LOG_SECTION_005.png',
    type: 'PNG',
    size: '5.4 MB',
    sizeBytes: 5662310,
    pageCount: 1,
    status: 'Failed',
    ocrStatus: 'Failed',
    pipelineStage: 2,
    stageName: 'OCR Processing',
    progress: 45,
    uploadDate: '2026-09-22 13:05',
    wellId: 'OIL-DEMO-005',
    formation: 'Barail Sandstone',
    ocrQuality: {
      confidence: 42,
      pagesProcessed: 1,
      textBlocks: 14,
      tablesDetected: 0,
      warnings: 5,
    },
    ocrExtractedText: `[OCR PROCESSING FAILED: LOW DPI RESOLUTION]
Unable to binarize raster image cleanly. Mud log raster resolution is below 150 DPI.
Recommendation: Rescan raster with minimum 300 DPI or provide vector PDF file.`,
  },
];

// 4-Stage OCR Pipeline
export const OCR_PIPELINE_STAGES = [
  { id: 1, name: 'Uploaded', key: 'uploaded', description: 'Document uploaded and file format verified' },
  { id: 2, name: 'OCR Processing', key: 'ocr_processing', description: 'Optical character recognition text layer raster' },
  { id: 3, name: 'Text Extracted', key: 'text_extracted', description: 'Raw text digitized and cleaned' },
  { id: 4, name: 'Ready for Analysis', key: 'ready_analysis', description: 'Verified text ready for NLP & entity parsing' },
];

// 7-Stage End-to-End Architecture
export const END_TO_END_PIPELINE = [
  { id: 1, name: 'Document Upload', status: 'current' },
  { id: 2, name: 'File Storage', status: 'ready' },
  { id: 3, name: 'OCR', status: 'current' },
  { id: 4, name: 'Text Extraction', status: 'ready' },
  { id: 5, name: 'NLP', status: 'future' },
  { id: 6, name: 'Entity Extraction', status: 'future' },
  { id: 7, name: 'Knowledge Repository', status: 'future' },
];

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
