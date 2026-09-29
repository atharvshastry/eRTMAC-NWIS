/**
 * Mock Knowledge Repository Data for NWIS
 * Contains historical reports, operational events, observations, and mitigations
 */

export const DOCUMENT_TYPES = [
  'WCR',
  'DDR',
  'Mud Logging Report',
  'Drilling Report',
  'Completion Report',
  'Incident Report',
];

export const EVENT_TYPES = [
  'Mud Loss',
  'Stuck Pipe',
  'Kick',
  'NPT',
  'Cementing',
  'Fishing',
  'Overpressure',
];

// Real dataset formation names (formation_log.csv: Barail/Girujan/Lakwa/Nahorkatiya Sand/Tipam)
// plus the original demo-fallback names, so this matches in both live and mock-fallback mode.
export const FORMATIONS = [
  'Barail',
  'Girujan',
  'Lakwa',
  'Nahorkatiya Sand',
  'Tipam',
  'Demo Formation',
  'Barail Sandstone',
  'Tipam Sandstone',
  'Girujan Clay',
];

export const MOCK_KNOWLEDGE_RESULTS = [
  {
    id: 'KNOW-001',
    wellId: 'OIL-DEMO-003',
    documentName: 'Daily Drilling Report — DEMO-003',
    documentType: 'DDR',
    formation: 'Demo Formation',
    depth: 2680,
    event: 'Mud Loss',
    severity: 'High',
    shortDescription:
      'Mud losses of 45 bbl/hr were recorded while drilling through the fractured Demo Formation.',
    historicalObservation:
      'Sudden loss of returns occurred at 2,680 m upon penetrating upper fractured reservoir sand. Pit volume decreased by 35 bbl within 20 minutes.',
    historicalMitigation:
      'Pumped 30 bbl medium LCM pill (sized calcium carbonate, mica, and nut plug). Reduced annular pump rate to 1,200 lpm and allowed pill to soak for 2 hours before resuming slow rotary drilling.',
    sourceDocument: 'OIL-DDR-2019-11-28-SEC03.pdf',
    nptHours: '18 hr',
    date: '2019-11-28',
    engineer: 'Er. R. Barua (OIL Duliajan)',
  },
  {
    id: 'KNOW-002',
    wellId: 'OIL-DEMO-003',
    documentName: 'Incident Report — Differential Sticking Event',
    documentType: 'Incident Report',
    formation: 'Demo Formation',
    depth: 2900,
    event: 'Stuck Pipe',
    severity: 'High',
    shortDescription:
      'Drill string stalled due to differential sticking against depleted sandstone during a survey stop.',
    historicalObservation:
      'String remained stationary for 28 minutes during MWD survey transmission. High mud overbalance (390 psi) caused 8-inch drill collars to embed in thick filter cake.',
    historicalMitigation:
      'Spotted 40 bbl oil-based lubricating pill across the stuck interval. Applied maximum safe upward jarring (90 klbs overpull) with torque oscillation; pipe freed after 14 hours.',
    sourceDocument: 'OIL-INC-2019-12-04-STUCK.pdf',
    nptHours: '24 hr',
    date: '2019-12-04',
    engineer: 'Er. N. Gogoi',
  },
  {
    id: 'KNOW-003',
    wellId: 'OIL-DEMO-004',
    documentName: 'Well Completion Report — DEMO-004',
    documentType: 'WCR',
    formation: 'Barail Sandstone',
    depth: 2870,
    event: 'Mud Loss',
    severity: 'High',
    shortDescription:
      'Total circulation loss of 55 bbl/hr observed at the upper Barail sandstone transition zone.',
    historicalObservation:
      'Severe fractured losses in high permeability Barail sand; dynamic fluid level dropped 250 m below surface.',
    historicalMitigation:
      'Standard LCM pills failed to cure loss. Set balanced thixotropic cement plug (1.65 SG) across 2,850–2,890 m. Waited on cement 18 hours, tagged hard cement, and pressure tested shoe to 14.5 ppg EMW.',
    sourceDocument: 'OIL-WCR-2018-DEMO004-FINAL.pdf',
    nptHours: '48 hr',
    date: '2018-06-15',
    engineer: 'Er. P. K. Dutta',
  },
  {
    id: 'KNOW-004',
    wellId: 'OIL-DEMO-007',
    documentName: 'Daily Drilling Report — Gas Influx Event',
    documentType: 'DDR',
    formation: 'Barail Sandstone',
    depth: 3420,
    event: 'Kick',
    severity: 'High',
    shortDescription:
      'Gas kick detected with 18 bbl pit gain while penetrating abnormal pore pressure lens.',
    historicalObservation:
      'ROP surged from 8 m/hr to 24 m/hr. Flow check positive; shut-in well on annular BOP. SIDPP recorded 420 psi, SICP 580 psi.',
    historicalMitigation:
      'Executed Driller method well kill. Circulated gas bubble through mud-gas separator. Weighted active mud system from 1.18 SG to 1.32 SG using barite before opening choke.',
    sourceDocument: 'OIL-DDR-2017-09-12-KICK.pdf',
    nptHours: '36 hr',
    date: '2017-09-12',
    engineer: 'Er. S. Phukan',
  },
  {
    id: 'KNOW-005',
    wellId: 'OIL-DEMO-009',
    documentName: 'Incident Report — Sidetrack Decision Summary',
    documentType: 'Incident Report',
    formation: 'Girujan Clay',
    depth: 3510,
    event: 'NPT',
    severity: 'High',
    shortDescription:
      'Severe mechanical pack-off in reactive shale resulted in abandoned BHA and whipstock sidetrack.',
    historicalObservation:
      'Borehole sloughing and tight hole during POOH. Drill string stuck solid at 3,510 m; jar attempts failed after 96 hours continuous operation.',
    historicalMitigation:
      'Severed drill pipe above jars at 3,420 m using explosive back-off. Placed kick-off cement plug and initiated directional sidetrack 009-ST1.',
    sourceDocument: 'OIL-INC-2016-BHA-ABANDON.pdf',
    nptHours: '96 hr',
    date: '2016-04-20',
    engineer: 'Er. T. C. Saikia',
  },
  {
    id: 'KNOW-006',
    wellId: 'OIL-DEMO-002',
    documentName: 'Completion Report — Primary Cement Evaluation',
    documentType: 'Completion Report',
    formation: 'Demo Formation',
    depth: 2750,
    event: 'Cementing',
    severity: 'Low',
    shortDescription:
      'Gas channeling indicated behind 9-5/8 inch casing across permeable sand stringers.',
    historicalObservation:
      'CBL-VDL acoustic log showed poor cement acoustic bond over 2,740–2,760 m with gas micro-annulus.',
    historicalMitigation:
      'Perforated casing at 2,755 m and executed low-pressure remedial cement squeeze using microfine latex cement. Post-squeeze bond log confirmed hydraulic isolation.',
    sourceDocument: 'OIL-COMPL-2021-DEMO002.pdf',
    nptHours: '12 hr',
    date: '2021-03-10',
    engineer: 'Er. D. Bora',
  },
  {
    id: 'KNOW-007',
    wellId: 'OIL-DEMO-005',
    documentName: 'Drilling Report — Fishing Operation Record',
    documentType: 'Drilling Report',
    formation: 'Demo Formation',
    depth: 2150,
    event: 'Fishing',
    severity: 'Low',
    shortDescription:
      'Twisted off 6-1/2 inch drill collar connection successfully retrieved in a single run.',
    historicalObservation:
      'Cyclic bending fatigue caused pin failure of 6-1/2 inch drill collar at 2,150 m. Fish top clean at 2,148 m.',
    historicalMitigation:
      'Ran in hole with 8-1/8 inch Bowen overshot fitted with 6-1/2 inch spiral grapple and pack-off rubber. Latched fish on first attempt and pulled smoothly to surface.',
    sourceDocument: 'OIL-DR-2022-FISH-005.pdf',
    nptHours: '14 hr',
    date: '2022-08-14',
    engineer: 'Er. M. Ahmed',
  },
  {
    id: 'KNOW-008',
    wellId: 'OIL-DEMO-006',
    documentName: 'Mud Logging Report — Overpressure Transition',
    documentType: 'Mud Logging Report',
    formation: 'Barail Sandstone',
    depth: 3120,
    event: 'Overpressure',
    severity: 'Medium',
    shortDescription:
      'Abnormal pore pressure ramp detected by d-exponent drop and connection gas peaks.',
    historicalObservation:
      'Corrected d-exponent departed from normal trend line at 3,120 m. Background gas rose from 15 units to 120 units with trip gas of 380 units.',
    historicalMitigation:
      'Weighted active mud system from 1.15 SG to 1.25 SG incrementally over two circulation cycles to restore 200 psi overbalance margin.',
    sourceDocument: 'OIL-MLR-2021-DEMO006-LOG.pdf',
    nptHours: '6 hr',
    date: '2021-10-05',
    engineer: 'Er. B. Goswami',
  },
];

export const DEMO_UPLOAD_EXAMPLES = [
  {
    fileName: 'OIL-DDR-2023-DEMO-008.pdf',
    fileType: 'PDF Document',
    fileSize: '3.4 MB',
    uploadStatus: 'Extracted',
    extractionStatus: 'Complete',
    detectedData: {
      wellId: 'OIL-DEMO-008',
      formation: 'Tipam Sandstone',
      depth: '2,600 m',
      events: ['Cementing', 'Overpressure'],
      risks: ['Medium (Channeling)'],
      lessonsLearned:
        'Casing shoe squeeze at 2,600 m verified pressure integrity to 14.2 ppg equivalent. Recommended to circulate at least two bottoms up before cementing in Tipam sand.',
    },
  },
  {
    fileName: 'Composite_Log_Barail_Section.docx',
    fileType: 'DOCX Report',
    fileSize: '5.1 MB',
    uploadStatus: 'Extracted',
    extractionStatus: 'Complete',
    detectedData: {
      wellId: 'OIL-DEMO-007',
      formation: 'Barail Sandstone',
      depth: '3,420 m',
      events: ['Kick', 'NPT'],
      risks: ['High (Gas Influx)'],
      lessonsLearned:
        'Barail formation contains high-pressure coalbed methane stringers. Mud weight must remain above 1.28 SG to prevent swabbing on pipe trips.',
    },
  },
];

export default MOCK_KNOWLEDGE_RESULTS;
