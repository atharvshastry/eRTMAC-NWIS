import { useState, useEffect, useRef, useCallback } from 'react';
import {
  parameterDefs,
  riskItems as riskItemsDefs,
  getSeedEvents,
  getInitialChartData,
  getLiveWellConfig,
} from '../data/mockLiveDrilling';
import { getLiveDrilling } from '../services/drillingApi';

const TICK_INTERVAL_MS = 2000;
const MAX_CHART_POINTS = 30;
const MAX_EVENTS = 20;

// Small random walk: value drifts slightly each tick
function nudge(current, def) {
  const delta = (Math.random() - 0.48) * def.step * 2;
  let next = current + delta;
  next = Math.max(def.min, Math.min(def.max, next));
  return parseFloat(next.toFixed(def.decimals));
}

// Determine risk status from parameter value and threshold config
function evaluateRisk(risk, paramValue) {
  if (risk.direction === 'above') {
    if (paramValue >= risk.criticalThreshold) return 'critical';
    if (paramValue >= risk.monitoringThreshold) return 'monitoring';
    return 'normal';
  }
  if (paramValue <= risk.criticalThreshold) return 'critical';
  if (paramValue <= risk.monitoringThreshold) return 'monitoring';
  return 'normal';
}

const EVENT_TEMPLATES = [
  (p) => `${p.label} updated`,
  (p) => `${p.label} changed`,
  (p) => `${p.label} increased`,
  (p) => `${p.label} decreased`,
  () => 'Formation depth updated',
  () => 'Drilling parameters refreshed',
];

function generateEvent(changedParam) {
  const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour12: false });
  return { time, message: template(changedParam) };
}

export default function useLiveSimulation(wellId = 'OIL-DEMO-001') {
  const selectedConfig = getLiveWellConfig(wellId);
  const [params, setParams] = useState(() => {
    const initial = {};
    for (const def of selectedConfig.parameterDefs) {
      initial[def.key] = def.value;
    }
    return initial;
  });

  const [chartData, setChartData] = useState(() => getInitialChartData(selectedConfig.parameterDefs));
  const [risks, setRisks] = useState(() => riskItemsDefs.map((r) => ({ ...r })));
  const [events, setEvents] = useState(() => getSeedEvents());
  const [paused, setPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isBackendLive, setIsBackendLive] = useState(false);

  const intervalRef = useRef(null);
  const tickCounterRef = useRef(0);

  // Check backend drilling API on mount
  useEffect(() => {
    async function checkBackend() {
      try {
        const live = await getLiveDrilling(wellId);
        if (live.isBackendLive) {
          setIsBackendLive(true);
        }
      } catch {
        setIsBackendLive(false);
      }
    }
    checkBackend();
  }, [wellId]);

  useEffect(() => {
    setParams(Object.fromEntries(selectedConfig.parameterDefs.map((def) => [def.key, def.value])));
    setChartData(getInitialChartData(selectedConfig.parameterDefs));
    setRisks(riskItemsDefs.map((risk) => ({ ...risk })));
    setEvents(getSeedEvents());
    setLastUpdated(Date.now());
    setSecondsAgo(0);
  }, [wellId]);

  const tick = useCallback(async () => {
    // If backend is active, try polling real API
    if (isBackendLive) {
      try {
        const res = await getLiveDrilling(wellId);
        if (res.isBackendLive && res.parameters) {
          const updated = {};
          res.parameters.forEach((p) => {
            updated[p.key] = p.value;
          });
          setParams(updated);
          setLastUpdated(Date.now());
          tickCounterRef.current += 1;
          return;
        }
      } catch {
        setIsBackendLive(false);
      }
    }

    // Otherwise use smooth simulation random walk
    setParams((prev) => {
      const next = { ...prev };
      const mainIdx = Math.floor(Math.random() * parameterDefs.length);
      for (let i = 0; i < parameterDefs.length; i++) {
        const def = parameterDefs[i];
        if (i === mainIdx) {
          next[def.key] = nudge(prev[def.key], { ...def, step: def.step * 2.5 });
        } else if (Math.random() > 0.4) {
          next[def.key] = nudge(prev[def.key], def);
        }
      }
      return next;
    });

    setLastUpdated(Date.now());
    tickCounterRef.current += 1;
  }, [isBackendLive, wellId]);

  useEffect(() => {
    setChartData((prev) => {
      const next = {};
      for (const def of parameterDefs) {
        const arr = [...(prev[def.key] || []), params[def.key]];
        next[def.key] = arr.length > MAX_CHART_POINTS ? arr.slice(-MAX_CHART_POINTS) : arr;
      }
      return next;
    });

    setRisks((prev) =>
      prev.map((risk) => ({
        ...risk,
        status: evaluateRisk(risk, params[risk.linkedParam]),
      }))
    );

    if (tickCounterRef.current > 0) {
      const randomDef = parameterDefs[Math.floor(Math.random() * parameterDefs.length)];
      const newEvent = generateEvent(randomDef);
      setEvents((prev) => [newEvent, ...prev].slice(0, MAX_EVENTS));
    }
  }, [params]);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, tick]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 500);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  return {
    params,
    chartData,
    risks,
    events,
    paused,
    togglePause,
    secondsAgo,
    isBackendLive,
  };
}
