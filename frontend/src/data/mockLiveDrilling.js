import { DASHBOARD_WELLS } from './mockWells';

// ============================================================
// Mock Live Drilling Data — DEMO ONLY
// All values are fictional. No real backend or eRTMAC connection.
// ============================================================

export const activeWellInfo = {
  id: 'OIL-DEMO-001',
  status: 'LIVE',
  formation: 'Demo Formation',
  currentDepth: 2845,
  field: 'Demo Field',
};

// Parameter definitions with initial values and realistic ranges
export const parameterDefs = [
  { key: 'depth',     label: 'Depth',              unit: 'm',     value: 2845,   min: 2800,  max: 2900,  step: 0.3,  decimals: 1 },
  { key: 'rop',       label: 'ROP',                unit: 'm/hr',  value: 18.4,   min: 8,     max: 28,    step: 0.4,  decimals: 1 },
  { key: 'wob',       label: 'WOB',                unit: 'tons',  value: 14.2,   min: 8,     max: 22,    step: 0.3,  decimals: 1 },
  { key: 'torque',    label: 'Torque',             unit: 'kNm',   value: 12.8,   min: 5,     max: 25,    step: 0.3,  decimals: 1 },
  { key: 'rpm',       label: 'RPM',                unit: 'rpm',   value: 120,    min: 60,    max: 180,   step: 2,    decimals: 0 },
  { key: 'spp',       label: 'Standpipe Pressure', unit: 'psi',   value: 2940,   min: 2200,  max: 3800,  step: 15,   decimals: 0 },
  { key: 'mudFlow',   label: 'Mud Flow',           unit: 'lpm',   value: 1850,   min: 1400,  max: 2200,  step: 10,   decimals: 0 },
  { key: 'mudWeight', label: 'Mud Weight',         unit: 'ppg',   value: 10.4,   min: 9.0,   max: 12.0,  step: 0.05, decimals: 2 },
  { key: 'hookLoad',  label: 'Hook Load',          unit: 'tons',  value: 185,    min: 140,   max: 240,   step: 1.5,  decimals: 0 },
  { key: 'ecd',       label: 'ECD',                unit: 'ppg',   value: 10.8,   min: 9.5,   max: 12.5,  step: 0.04, decimals: 2 },
];

// Formation data
export const formationData = {
  name: 'Demo Formation',
  topDepth: 2650,
  currentDepth: 2845,
  status: 'ACTIVE',
};

// Offset well comparison data
export const offsetWells = {
  parameters: ['ROP', 'Torque', 'WOB', 'Pressure'],
  units: ['m/hr', 'kNm', 'tons', 'psi'],
  currentWell:    [18.4, 12.8, 14.2, 2940],
  averageOffset:  [15.0, 11.5, 13.8, 2780],
  nearestSimilar: [17.2, 13.1, 14.0, 2860],
};

// Risk items with thresholds for live monitoring
export const riskItems = [
  {
    key: 'mudLoss',
    label: 'Mud Loss',
    status: 'monitoring',          // 'normal' | 'monitoring' | 'critical'
    linkedParam: 'mudFlow',        // which parameter triggers status change
    monitoringThreshold: 1600,     // below this → monitoring
    criticalThreshold: 1450,       // below this → critical
    direction: 'below',           // 'below' = value < threshold is bad
  },
  {
    key: 'stuckPipe',
    label: 'Stuck Pipe',
    status: 'normal',
    linkedParam: 'torque',
    monitoringThreshold: 18,
    criticalThreshold: 22,
    direction: 'above',
  },
  {
    key: 'kick',
    label: 'Kick',
    status: 'normal',
    linkedParam: 'spp',
    monitoringThreshold: 3400,
    criticalThreshold: 3650,
    direction: 'above',
  },
  {
    key: 'overpressure',
    label: 'Overpressure',
    status: 'monitoring',
    linkedParam: 'ecd',
    monitoringThreshold: 11.2,
    criticalThreshold: 12.0,
    direction: 'above',
  },
];

// Seed events for initial event stream
// The event log's initial rows, timestamped relative to whenever the page actually loads
// (or the TD loop-back resets it) rather than a literal clock time baked into this file -
// a hardcoded '22:31:12' would only coincidentally match "now" and look stale/out-of-order
// within seconds once live-generated events (which do use the real current time) start
// appending above it.
function formatTime(date) {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

export function getSeedEvents() {
  const now = Date.now();
  const secondsAgo = (s) => formatTime(new Date(now - s * 1000));
  return [
    { time: secondsAgo(2), message: 'Depth updated' },
    { time: secondsAgo(6), message: 'Torque increased' },
    { time: secondsAgo(20), message: 'ROP changed' },
    { time: secondsAgo(33), message: 'Formation depth updated' },
  ];
}

// Generate initial chart history (last 20 points)
function generateChartHistory(baseDef, points = 20) {
  const history = [];
  let val = baseDef.value - baseDef.step * points * 0.5;
  for (let i = 0; i < points; i++) {
    val += (Math.random() - 0.45) * baseDef.step * 2;
    val = Math.max(baseDef.min, Math.min(baseDef.max, val));
    history.push(parseFloat(val.toFixed(baseDef.decimals)));
  }
  // ensure last point matches the initial value
  history[history.length - 1] = baseDef.value;
  return history;
}

export function getInitialChartData(definitions = parameterDefs) {
  const chartData = {};
  for (const def of definitions) {
    chartData[def.key] = generateChartHistory(def);
  }
  return chartData;
}

export function getLiveWellConfig(wellId = 'OIL-DEMO-001') {
  const dashboardWell = DASHBOARD_WELLS.find((well) => well.wellId === wellId) || DASHBOARD_WELLS[0];
  const values = Object.fromEntries(dashboardWell.kpis.map(([label, value]) => [label, Number(String(value).replace(/,/g, ''))]));
  const selectedDefs = parameterDefs.map((def) => ({
    ...def,
    value: {
      depth: dashboardWell.currentDepth,
      rop: values.ROP,
      wob: values.WOB,
      torque: values.Torque,
      rpm: values.RPM,
      spp: values['Standpipe Pressure'],
      mudFlow: values['Mud Flow'],
      mudWeight: values['Mud Weight'],
      ecd: values.ECD,
      hookLoad: 185 + (dashboardWell.currentDepth - 2845) * 0.03,
    }[def.key] ?? def.value,
  }));
  return {
    activeWell: {
      id: dashboardWell.wellId,
      status: dashboardWell.status === 'LIVE' ? 'LIVE' : 'DEMO LIVE',
      formation: dashboardWell.formation,
      currentDepth: dashboardWell.currentDepth,
      field: dashboardWell.field,
    },
    parameterDefs: selectedDefs,
    formationData: { name: dashboardWell.formation, topDepth: Math.max(0, dashboardWell.currentDepth - 250), currentDepth: dashboardWell.currentDepth, status: dashboardWell.status === 'LIVE' ? 'ACTIVE' : 'HISTORICAL' },
    offsetWells: {
      parameters: ['ROP', 'Torque', 'WOB', 'Pressure'],
      units: ['m/hr', 'kNm', 'tons', 'psi'],
      currentWell: [values.ROP, values.Torque, values.WOB, values['Standpipe Pressure']],
      averageOffset: [15.0, 11.5, 13.8, 2780],
      nearestSimilar: [values.ROP * 0.94, values.Torque * 1.02, values.WOB * 0.98, values['Standpipe Pressure'] * 0.97],
    },
  };
}
