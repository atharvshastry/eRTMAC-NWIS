/**
 * Mock Extracted Entities for Document Intelligence (Phase 8)
 * Contains structured extracted entities mapped across drilling engineering categories.
 */

export const MOCK_EXTRACTED_ENTITIES = {
  // Document 1 / Default Template: OIL-DEMO-001 (Well Completion Report)
  'entities-doc-001': {
    documentId: 'doc-001',
    documentName: 'WCR_DEMO_001.pdf',
    totalEntities: 31,
    averageConfidence: 94.6,
    extractedDate: '2026-09-22 10:22',
    categories: {
      WELL: [
        { label: 'Well ID', value: 'OIL-DEMO-001', confidence: 99, source: 'Page 1, Header block' },
        { label: 'Well Name', value: 'Bhogpara Exploration Well #1', confidence: 98, source: 'Page 1, Title summary' },
        { label: 'Field', value: 'Upper Assam Shelf', confidence: 97, source: 'Page 1, Well classification' },
      ],
      LOCATION: [
        { label: 'Latitude', value: '27° 28\' 14.20" N', confidence: 96, source: 'Page 2, Survey coordinate sheet' },
        { label: 'Longitude', value: '95° 12\' 43.60" E', confidence: 96, source: 'Page 2, Survey coordinate sheet' },
      ],
      DEPTH: [
        { label: 'Top Depth', value: '1,850 m', confidence: 98, source: 'Page 3, Section 2.1' },
        { label: 'Bottom Depth', value: '3,450 m', confidence: 99, source: 'Page 3, Section 2.1' },
        { label: 'Event Depth', value: '2,845 m', confidence: 96, source: 'Page 8, Operational incident log' },
      ],
      FORMATION: [
        { label: 'Formation Name', value: 'Barail Sandstone', confidence: 96, source: 'Page 4, Geological synopsis' },
        { label: 'Lithology', value: 'Fine-to-medium grained quartzose sandstone with shale intercalations', confidence: 94, source: 'Page 4, Petrographic description' },
      ],
      DRILLING_PARAMETERS: [
        { label: 'ROP', value: '14.2 m/hr', confidence: 94, source: 'Page 7, Daily performance log' },
        { label: 'WOB', value: '18.5 kN', confidence: 95, source: 'Page 7, Parameter summary' },
        { label: 'RPM', value: '115 RPM', confidence: 96, source: 'Page 7, Surface drive record' },
        { label: 'Torque', value: '16.8 kNm', confidence: 92, source: 'Page 7, Rotary sensor log' },
        { label: 'Mud Flow', value: '2,420 l/min', confidence: 93, source: 'Page 7, Triplex pump record' },
        { label: 'Mud Weight', value: '1.28 SG', confidence: 97, source: 'Page 8, Mud properties report' },
        { label: 'Pressure', value: '3,120 psi', confidence: 95, source: 'Page 8, Standpipe gauge sheet' },
      ],
      OPERATIONAL_EVENTS: [
        { label: 'Mud Loss', value: 'Partial mud loss of 28 bbl/hr recorded during penetration of fractured sandstone', confidence: 94, source: 'Page 9, Incident report' },
        { label: 'Kick', value: 'Gas influx detected; shut-in drillpipe pressure +240 psi', confidence: 92, source: 'Page 11, Well control record' },
        { label: 'Stuck Pipe', value: 'Differential sticking risk at 2,900 m during wiper trip due to thick filter cake', confidence: 91, source: 'Page 13, Operational log' },
        { label: 'Fishing', value: 'Washing and jarring over fish assembly (8-1/2" bit + motor) completed in 18 hrs', confidence: 89, source: 'Page 14, Fishing summary' },
        { label: 'NPT', value: '32.5 hours total non-productive time incurred', confidence: 96, source: 'Page 15, Operations recap' },
        { label: 'Torque Spike', value: 'Peak torque surged from 14.5 kNm to 23.2 kNm before wiper trip', confidence: 93, source: 'Page 12, MWD torque log' },
        { label: 'Cementing Issue', value: 'Channeling observed during primary liner cementing; top tagged 45 m low', confidence: 90, source: 'Page 17, Cement evaluation' },
        { label: 'Overpressure', value: 'Pore pressure gradient increased to 1.34 SG equivalent at 2,840 m', confidence: 93, source: 'Page 10, Pore pressure analysis' },
      ],
      CASING_AND_CEMENTING: [
        { label: 'Casing Size', value: '9-5/8" Intermediate Casing (47 lb/ft L-80 BTC)', confidence: 98, source: 'Page 5, Casing tally record' },
        { label: 'Setting Depth', value: '2,450 m MD', confidence: 99, source: 'Page 5, Casing shoe certification' },
        { label: 'Cement Type', value: 'Class G High Sulfate Resistant + 35% Silica Flour', confidence: 95, source: 'Page 6, Cement slurry design' },
        { label: 'Cement Volume', value: '420 sacks (1.82 SG lead slurry)', confidence: 94, source: 'Page 6, Pumping service ticket' },
      ],
      MITIGATION: [
        { label: 'Problem', value: 'Severe mud loss of 45 bbl/hr at 2,680 m in depleted Barail reservoir', confidence: 95, source: 'Page 9, Wellbore event log' },
        { label: 'Action Taken', value: 'Pumped 40 bbl high-fluid-loss squeeze LCM pill (medium nut plug + mica) and held for 4 hrs', confidence: 93, source: 'Page 9, Action ledger' },
        { label: 'Outcome', value: 'Losses cured to <2 bbl/hr; drilling resumed with flow rate staged at 2,100 l/min', confidence: 92, source: 'Page 10, Post-mitigation review' },
      ],
      LESSONS_LEARNED: [
        { label: 'Historical Observation', value: 'Offset wells OIL-DEMO-002 and OIL-DEMO-003 experienced rapid loss transitions in upper Barail', confidence: 93, source: 'Page 19, Lessons learned log' },
        { label: 'Lesson', value: 'Maintain pre-mixed 50 bbl coarse/medium LCM pill in reserve pit prior to entering Barail top', confidence: 95, source: 'Page 19, Lessons learned log' },
        { label: 'Mitigation', value: 'Cap dynamic ECD below 1.31 SG and execute flow check every 50 m interval', confidence: 92, source: 'Page 20, Rig recommendations' },
      ],
    },
  },

  // Document 3: MUDLOG_DEMO_004.pdf
  'entities-doc-003': {
    documentId: 'doc-003',
    documentName: 'MUDLOG_DEMO_004.pdf',
    totalEntities: 28,
    averageConfidence: 95.1,
    extractedDate: '2026-09-21 16:42',
    categories: {
      WELL: [
        { label: 'Well ID', value: 'OIL-DEMO-004', confidence: 99, source: 'Page 1, Mud log header' },
        { label: 'Well Name', value: 'Nahorkatiya South #4', confidence: 98, source: 'Page 1, Mud log header' },
        { label: 'Field', value: 'Nahorkatiya Field', confidence: 97, source: 'Page 1, Mud log header' },
      ],
      LOCATION: [
        { label: 'Latitude', value: '27° 19\' 05.10" N', confidence: 95, source: 'Page 2, Survey sheet' },
        { label: 'Longitude', value: '95° 21\' 18.40" E', confidence: 95, source: 'Page 2, Survey sheet' },
      ],
      DEPTH: [
        { label: 'Top Depth', value: '2,100 m', confidence: 98, source: 'Page 2, Mud log scale' },
        { label: 'Bottom Depth', value: '3,600 m', confidence: 99, source: 'Page 2, Mud log scale' },
        { label: 'Event Depth', value: '2,910 m', confidence: 97, source: 'Page 18, Hydrocarbon show log' },
      ],
      FORMATION: [
        { label: 'Formation Name', value: 'Barail Coal Shale', confidence: 97, source: 'Page 12, Lithology strip' },
        { label: 'Lithology', value: 'Carbonaceous shale interbedded with thin sub-bituminous coal seams', confidence: 95, source: 'Page 12, Sample analysis' },
      ],
      DRILLING_PARAMETERS: [
        { label: 'ROP', value: '11.8 m/hr', confidence: 95, source: 'Page 14, ROP curve track' },
        { label: 'WOB', value: '20.0 kN', confidence: 94, source: 'Page 14, Sensor track' },
        { label: 'RPM', value: '110 RPM', confidence: 96, source: 'Page 14, Sensor track' },
        { label: 'Torque', value: '18.2 kNm', confidence: 93, source: 'Page 14, Sensor track' },
        { label: 'Mud Flow', value: '2,350 l/min', confidence: 94, source: 'Page 15, Hydraulics track' },
        { label: 'Mud Weight', value: '1.32 SG', confidence: 98, source: 'Page 15, Mud check log' },
        { label: 'Pressure', value: '3,250 psi', confidence: 95, source: 'Page 15, SPP curve' },
      ],
      OPERATIONAL_EVENTS: [
        { label: 'Mud Loss', value: 'Seepage loss of 8 bbl/hr recorded between 2,890 m and 2,930 m', confidence: 94, source: 'Page 18, Mud balance ticket' },
        { label: 'Kick', value: 'Trip gas peak of 1,840 units (C1-C4) observed after 12 hr connection break', confidence: 96, source: 'Page 19, Gas chromatograph' },
        { label: 'Stuck Pipe', value: 'No mechanical sticking; torque fluctuations observed due to coal swelling', confidence: 92, source: 'Page 20, Mud engineer notes' },
        { label: 'Fishing', value: 'None reported in this section', confidence: 98, source: 'Page 21, Operations summary' },
        { label: 'NPT', value: '6.0 hours circulated bottoms up for degassing', confidence: 95, source: 'Page 22, Daily summary' },
        { label: 'Torque Spike', value: 'Erratic torque spikes up to 21.0 kNm in coal stringers', confidence: 93, source: 'Page 17, Mud log track' },
        { label: 'Cementing Issue', value: 'Not applicable for this section log', confidence: 97, source: 'Page 24, Log end note' },
        { label: 'Overpressure', value: 'Connection gas elevated; mud weight weighted up from 1.28 to 1.32 SG', confidence: 95, source: 'Page 19, Pore pressure note' },
      ],
      CASING_AND_CEMENTING: [
        { label: 'Casing Size', value: '7" Production Liner (29 lb/ft P-110)', confidence: 97, source: 'Page 4, Well schematic' },
        { label: 'Setting Depth', value: '3,550 m MD', confidence: 98, source: 'Page 4, Well schematic' },
        { label: 'Cement Type', value: 'ThermaLock latex-modified cement', confidence: 93, source: 'Page 5, Mud log casing block' },
        { label: 'Cement Volume', value: '280 sacks', confidence: 92, source: 'Page 5, Slurry record' },
      ],
      MITIGATION: [
        { label: 'Problem', value: 'Excessive trip gas and borehole sloughing in fractured coal zone', confidence: 96, source: 'Page 20, Engineering note' },
        { label: 'Action Taken', value: 'Increased mud weight to 1.32 SG using Micronized Barite and added potassium chloride shale inhibitor', confidence: 94, source: 'Page 20, Chemical addition log' },
        { label: 'Outcome', value: 'Gas dropped to background 120 units; borehole caliper stabilized with zero cave-ins', confidence: 93, source: 'Page 21, Follow-up report' },
      ],
      LESSONS_LEARNED: [
        { label: 'Historical Observation', value: 'Barail Coal interval produces heavy methane background requiring higher mud weight window', confidence: 94, source: 'Page 23, Geologist review' },
        { label: 'Lesson', value: 'Condition mud prior to tripping; maintain backpressure during bottom-up circulation', confidence: 95, source: 'Page 23, Geologist review' },
        { label: 'Mitigation', value: 'Keep degasser online continuously when drilling through coal marker horizons', confidence: 93, source: 'Page 23, Geologist review' },
      ],
    },
  },

  // Document 4: CASING_REP_DEMO_002.docx
  'entities-doc-004': {
    documentId: 'doc-004',
    documentName: 'CASING_REP_DEMO_002.docx',
    totalEntities: 22,
    averageConfidence: 96.0,
    extractedDate: '2026-09-21 09:35',
    categories: {
      WELL: [
        { label: 'Well ID', value: 'OIL-DEMO-002', confidence: 99, source: 'Section 1.0, Job summary' },
        { label: 'Well Name', value: 'Moran Stepout #2', confidence: 99, source: 'Section 1.0, Job summary' },
        { label: 'Field', value: 'Moran Field', confidence: 98, source: 'Section 1.0, Job summary' },
      ],
      LOCATION: [
        { label: 'Latitude', value: '27° 11\' 44.00" N', confidence: 97, source: 'Section 1.2, Well site metadata' },
        { label: 'Longitude', value: '94° 58\' 32.10" E', confidence: 97, source: 'Section 1.2, Well site metadata' },
      ],
      DEPTH: [
        { label: 'Top Depth', value: '0 m (RKB)', confidence: 99, source: 'Section 2.1, Casing tally' },
        { label: 'Bottom Depth', value: '2,450 m MD', confidence: 99, source: 'Section 2.1, Casing tally' },
        { label: 'Event Depth', value: '2,448 m MD', confidence: 98, source: 'Section 2.4, Float collar depth' },
      ],
      FORMATION: [
        { label: 'Formation Name', value: 'Girujan Clay', confidence: 96, source: 'Section 3.1, Geological markers' },
        { label: 'Lithology', value: 'Massive mottled claystone with minor siltstone laminations', confidence: 94, source: 'Section 3.1, Formation notes' },
      ],
      DRILLING_PARAMETERS: [
        { label: 'ROP', value: 'N/A (Casing operation)', confidence: 95, source: 'Section 2.0, Operations record' },
        { label: 'WOB', value: 'N/A (Running casing)', confidence: 95, source: 'Section 2.0, Operations record' },
        { label: 'RPM', value: 'N/A', confidence: 95, source: 'Section 2.0, Operations record' },
        { label: 'Torque', value: '3,800 ft-lbs (Makeup torque)', confidence: 96, source: 'Section 2.2, Torque-turn record' },
        { label: 'Mud Flow', value: '1,800 l/min (Circulating prior to cement)', confidence: 94, source: 'Section 4.1, Pre-flush ledger' },
        { label: 'Mud Weight', value: '1.24 SG (Displacement mud)', confidence: 97, source: 'Section 4.1, Mud report' },
        { label: 'Pressure', value: '2,150 psi (Plug bump pressure)', confidence: 96, source: 'Section 4.3, Pressure chart' },
      ],
      OPERATIONAL_EVENTS: [
        { label: 'Mud Loss', value: 'Zero losses experienced during casing run or cement displacement', confidence: 97, source: 'Section 4.4, Loss log' },
        { label: 'Kick', value: 'None observed', confidence: 99, source: 'Section 4.4, Loss log' },
        { label: 'Stuck Pipe', value: 'Casing run freely to TD without tagging bridges', confidence: 98, source: 'Section 2.3, Running log' },
        { label: 'Fishing', value: 'None', confidence: 99, source: 'Section 2.3, Running log' },
        { label: 'NPT', value: 'Zero NPT; job completed 2 hours ahead of AFE schedule', confidence: 98, source: 'Section 5.0, Time analysis' },
        { label: 'Torque Spike', value: 'All 198 connections verified within API makeup limits', confidence: 96, source: 'Section 2.2, Torque graph' },
        { label: 'Cementing Issue', value: 'Full returns throughout slurry pump and displacement', confidence: 96, source: 'Section 4.2, Pumping graph' },
        { label: 'Overpressure', value: 'Borehole stable throughout cement cure', confidence: 97, source: 'Section 4.5, Evaluation' },
      ],
      CASING_AND_CEMENTING: [
        { label: 'Casing Size', value: '9-5/8" (40 lb/ft J-55 STC)', confidence: 99, source: 'Section 2.1, Casing manifest' },
        { label: 'Setting Depth', value: '2,450 m MD / 2,442 m TVD', confidence: 99, source: 'Section 2.1, Shoe certification' },
        { label: 'Cement Type', value: 'Class G Standard + 2% Bentonite Pre-flush', confidence: 96, source: 'Section 4.1, Recipe spec' },
        { label: 'Cement Volume', value: '550 sacks Lead (1.56 SG) + 200 sacks Tail (1.90 SG)', confidence: 95, source: 'Section 4.2, Service ticket' },
      ],
      MITIGATION: [
        { label: 'Problem', value: 'Risk of tight hole in reactive Girujan Clay during casing descent', confidence: 95, source: 'Section 1.3, Risk mitigation' },
        { label: 'Action Taken', value: 'Ran casing with guide shoe and installed centralizers every 2 joints across reactive clay', confidence: 94, source: 'Section 2.3, Centralizer tally' },
        { label: 'Outcome', value: 'Good centralization achieved; CBL/VDL confirmed 92% cement bond quality', confidence: 95, source: 'Section 5.1, CBL log interpretation' },
      ],
      LESSONS_LEARNED: [
        { label: 'Historical Observation', value: 'Girujan Clay exhibits severe swelling if left open for >7 days before casing', confidence: 95, source: 'Section 6.0, Operational review' },
        { label: 'Lesson', value: 'Complete conditioning trip and immediately begin casing run within 24 hours of reaching TD', confidence: 96, source: 'Section 6.0, Operational review' },
        { label: 'Mitigation', value: 'Ensure casing crew and equipment rigged up before reaching casing point', confidence: 94, source: 'Section 6.0, Operational review' },
      ],
    },
  },
};

/**
 * Transforms categorized entities into a flat structured table format:
 * [ { id, category, entity, value, confidence, source } ]
 */
export function getFlatEntityRows(entitiesObj) {
  if (!entitiesObj || !entitiesObj.categories) return [];

  const rows = [];
  let rowId = 1;

  const categoryDisplayNames = {
    WELL: 'Well',
    LOCATION: 'Location',
    DEPTH: 'Depth',
    FORMATION: 'Formation',
    DRILLING_PARAMETERS: 'Drilling Parameters',
    OPERATIONAL_EVENTS: 'Operational Events',
    CASING_AND_CEMENTING: 'Casing & Cementing',
    MITIGATION: 'Mitigation',
    LESSONS_LEARNED: 'Lessons Learned',
  };

  Object.entries(entitiesObj.categories).forEach(([catKey, items]) => {
    const categoryName = categoryDisplayNames[catKey] || catKey;
    items.forEach((item) => {
      rows.push({
        id: `entity-${rowId++}`,
        categoryKey: catKey,
        category: categoryName,
        entity: item.label,
        value: item.value,
        confidence: item.confidence,
        source: item.source,
      });
    });
  });

  return rows;
}
