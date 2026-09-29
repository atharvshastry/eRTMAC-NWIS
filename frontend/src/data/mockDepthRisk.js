/**
 * Depth Analysis reference dataset — a generic, depth-indexed risk model shared
 * across the field (not per-well). The 4 hazard curves and the 7-layer regional
 * stratigraphy column apply to any well's trajectory; only the "current bit"
 * marker, coordinates and header status are wired to the app's selected well.
 *
 * Well IDs below follow the app's OIL-DEMO-0XX convention (continuing past the
 * existing OIL-DEMO-002..009 offset wells in mockWells.js, so these don't collide).
 */

export const CHART_MAX_DEPTH = 3500;
export const HAZARD_ZONE = { start: 2700, end: 2800 };

export const STRATIGRAPHY_DATA = [
  {
    id: 'quaternary-alluvium',
    name: 'Quaternary Alluvium',
    depthStart: 0,
    depthEnd: 350,
    pressure: 'Normal (8.6 ppg)',
    lithology: 'Unconsolidated Sand & Gravel',
    hazards: 'Surface hole washout, lost circulation in gravel beds',
    color: '#f59e0b',
  },
  {
    id: 'thumbli-claystone',
    name: 'Thumbli Claystone',
    depthStart: 350,
    depthEnd: 1150,
    pressure: 'Normal (8.9 ppg)',
    lithology: 'Lignitic Claystone & Siltstone',
    hazards: 'Bit balling, reactive clay swelling',
    color: '#10b981',
  },
  {
    id: 'dharvi-dungar',
    name: 'Dharvi Dungar Siltstone',
    depthStart: 1150,
    depthEnd: 1950,
    pressure: 'Normal (9.2 ppg)',
    lithology: 'Interbedded Sandstone & Claystone',
    hazards: 'Mild tight hole on trips, abrasive sand streaks',
    color: '#06b6d4',
  },
  {
    id: 'barmer-hill',
    name: 'Barmer Hill Shale',
    depthStart: 1950,
    depthEnd: 2650,
    pressure: 'Slight Overpressure (9.8 ppg)',
    lithology: 'Siliceous Porcellanite & Organic Shale',
    hazards: 'Brittle shale caving, wellbore sloughing, torque spikes',
    color: '#8b5cf6',
  },
  {
    id: 'fatehgarh-upper',
    name: 'Fatehgarh Upper',
    depthStart: 2650,
    depthEnd: 2700,
    pressure: 'Transitional (10.2 ppg)',
    lithology: 'Fluvial Coarse Sandstone',
    hazards: 'Seepage losses, differential sticking in porous intervals',
    color: '#a855f7',
  },
  {
    id: 'fatehgarh-lower',
    name: 'Fatehgarh Lower',
    depthStart: 2700,
    depthEnd: 2850,
    pressure: 'Overpressured Reservoir (10.8 ppg)',
    lithology: 'Glauconitic Sandstone & Fractured Shale',
    hazards: 'CRITICAL RISK: Differential sticking, severe lost circulation, gas influx/kick, excessive drag',
    color: '#ef4444',
  },
  {
    id: 'nagana-volcanics',
    name: 'Nagana Volcanics / Basement',
    depthStart: 2850,
    depthEnd: 3600,
    pressure: 'Sub-normal to Depleted (9.4 ppg)',
    lithology: 'Basalt & Fractured Rhyolite',
    hazards: 'High vibration, severe drill bit wear, lost circulation in fracture corridors',
    color: '#64748b',
  },
];

export const OFFSET_INCIDENTS_DATA = [
  {
    id: 'inc-001',
    wellId: 'OIL-DEMO-010',
    depth: 2742,
    severity: 'CRITICAL',
    description: 'Differential sticking while stationary for survey at 2,742 m. Overbalance estimated at 480 psi.',
    remedialAction: 'Spotted 45 bbl pipe-release oil-based pill. Jarred down with 110 klbs for 4.2 hours to free BHA.',
    formation: 'Fatehgarh Lower',
    nptImpact: '28.5h',
  },
  {
    id: 'inc-002',
    wellId: 'OIL-DEMO-011',
    depth: 2760,
    severity: 'HIGH',
    description: 'Erratic surface torque fluctuations exceeding 32 kft-lbs with severe stick-slip oscillations.',
    remedialAction: 'Wiper trip performed to 2,650 m. Conditioned mud with 2% lubricant additive to reduce wall friction.',
    formation: 'Fatehgarh Lower',
    nptImpact: '8.5h',
  },
  {
    id: 'inc-003',
    wellId: 'OIL-DEMO-012',
    depth: 2780,
    severity: 'HIGH',
    description: 'Mechanical key-seating and differential sticking on trip-out at 2,780 m. High overpull of 90 klbs.',
    remedialAction: 'Pumped acid wash pill and worked pipe with maximum torque and rotary jarring.',
    formation: 'Fatehgarh Lower',
    nptImpact: '14.5h',
  },
  {
    id: 'inc-004',
    wellId: 'OIL-DEMO-013',
    depth: 2718,
    severity: 'MEDIUM',
    description: 'Minor gas influx detected with 12 bbl pit volume gain while drilling through fractured interval.',
    remedialAction: 'Flow checked, shut-in well, circulated kick out via drillers method and weighted mud by 0.4 ppg.',
    formation: 'Fatehgarh Lower',
    nptImpact: '6.2h',
  },
];

// Piecewise depth-risk model — a fixed mathematical function of depth alone,
// shared by every well (it is a regional reference curve, not per-well fitted data).
export function calculateDepthRisks(depth) {
  // 1. Gas Influx / Kick (Green #10b981)
  let gasInflux = 1;
  if (depth < 1900) gasInflux = 1;
  else if (depth < 2600) gasInflux = 2;
  else if (depth <= 2750) gasInflux = 2 + ((depth - 2600) / 150) * 25; // 2% -> 27%
  else if (depth <= 2850) gasInflux = 27 - ((depth - 2750) / 100) * 25; // 27% -> 2%
  else gasInflux = 1.5;

  // 2. High Torque Hazard (Purple #a855f7)
  let highTorque = 12;
  if (depth < 1850) highTorque = 12;
  else if (depth <= 1900) highTorque = 12 + ((depth - 1850) / 50) * 29; // 12% -> 41%
  else if (depth <= 2600) highTorque = 41 + ((depth - 1900) / 700) * 20; // 41% -> 61%
  else if (depth <= 2750) highTorque = 61 + ((depth - 2600) / 150) * 24; // 61% -> 85%
  else if (depth <= 2850) highTorque = 85 - ((depth - 2750) / 100) * 33; // 85% -> 52%
  else highTorque = 55;

  // 3. Lost Circulation Risk (Amber #f59e0b)
  let lostCirculation = 6;
  if (depth < 1850) lostCirculation = 6;
  else if (depth <= 1900) lostCirculation = 6 + ((depth - 1850) / 50) * 12; // 6% -> 18%
  else if (depth <= 2600) lostCirculation = 18;
  else if (depth <= 2750) lostCirculation = 18 + ((depth - 2600) / 150) * 46; // 18% -> 64%
  else if (depth <= 2850) lostCirculation = 64 - ((depth - 2750) / 100) * 29; // 64% -> 35%
  else lostCirculation = 35;

  // 4. Stuck Pipe Risk (Red #ef4444)
  let stuckPipe = 8;
  if (depth < 1850) stuckPipe = 8;
  else if (depth <= 1900) stuckPipe = 8 + ((depth - 1850) / 50) * 20; // 8% -> 28%
  else if (depth <= 2600) stuckPipe = 28 + ((depth - 1900) / 700) * 23; // 28% -> 51%
  else if (depth <= 2750) stuckPipe = 51 + ((depth - 2600) / 150) * 31; // 51% -> 82%
  else if (depth <= 2850) stuckPipe = 82 - ((depth - 2750) / 100) * 67; // 82% -> 15%
  else stuckPipe = 15;

  const formation = STRATIGRAPHY_DATA.find(
    (layer) => depth >= layer.depthStart && depth < layer.depthEnd
  ) || STRATIGRAPHY_DATA[STRATIGRAPHY_DATA.length - 1];

  return {
    depth,
    gasInflux: Math.round(gasInflux * 10) / 10,
    highTorque: Math.round(highTorque * 10) / 10,
    lostCirculation: Math.round(lostCirculation * 10) / 10,
    stuckPipe: Math.round(stuckPipe * 10) / 10,
    formationName: formation.name,
    isCriticalZone: depth >= HAZARD_ZONE.start && depth <= HAZARD_ZONE.end,
  };
}

export function generateTrajectoryPoints(step = 25) {
  const points = [];
  for (let d = 0; d <= CHART_MAX_DEPTH; d += step) {
    points.push(calculateDepthRisks(d));
  }
  return points;
}

// Pre-computed once — the curves never change per render or per well.
export const DEPTH_TRAJECTORY = generateTrajectoryPoints(25);

export function findLayerAtDepth(depth) {
  return (
    STRATIGRAPHY_DATA.find((layer) => depth >= layer.depthStart && depth < layer.depthEnd) ||
    STRATIGRAPHY_DATA[STRATIGRAPHY_DATA.length - 1]
  );
}
