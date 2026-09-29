import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/api';

// Active well's demo ID + its two nearest real offset wells (nearest-first, per wellIdMap.js on
// the backend) -- mirrors the same "compare the live well against its closest historical analogs"
// story the rest of Live Operations already tells (see OffsetComparison).
const ACTIVE_DEMO_ID = 'OIL-DEMO-001';
const OFFSET_DEMO_IDS = ['OIL-DEMO-002', 'OIL-DEMO-003'];

// Dataviz-validated categorical palette, dark-mode steps. Only the first 3 slots clear the
// all-pairs CVD/contrast check (every series visible at once, as in a 3D scatter) -- see
// references/palette.md. Exactly 3 wells plotted here, so no series folds into "Other".
const WELL_COLORS = ['#3987e5', '#d95926', '#199e70'];

const R_EARTH_M = 6371000;

/** Local east/north meters for (lat, lon) relative to a reference point -- equirectangular
 * approximation, fine at this scale (a few km between offset wells). */
function toLocalMeters(lat, lon, refLat, refLon) {
  const north = ((lat - refLat) * Math.PI) / 180 * R_EARTH_M;
  const east = (((lon - refLon) * Math.PI) / 180) * R_EARTH_M * Math.cos((refLat * Math.PI) / 180);
  return { north, east };
}

export default function Trajectory3D() {
  const containerRef = useRef(null);
  const [wells, setWells] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const ids = [ACTIVE_DEMO_ID, ...OFFSET_DEMO_IDS];
      const results = await Promise.all(ids.map((id) => apiClient.get(`/wells/${id}/trajectory`)));
      const withStations = results.filter((w) => w.stations && w.stations.length > 1);
      if (!withStations.length) {
        setError('No directional survey data available for these wells.');
        setWells(null);
      } else {
        setWells(results);
      }
    } catch (err) {
      setError(err.message || 'Unable to load trajectory data.');
      setWells(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!wells || !containerRef.current || typeof window === 'undefined' || !window.Plotly) return;

    const active = wells.find((w) => w.isActive) || wells[0];
    const refLat = active.surfaceLat;
    const refLon = active.surfaceLon;

    const traces = [];
    wells.forEach((well, idx) => {
      if (!well.stations || well.stations.length < 2) return;
      const { north: originNorth, east: originEast } = toLocalMeters(
        well.surfaceLat,
        well.surfaceLon,
        refLat,
        refLon
      );
      const color = WELL_COLORS[idx % WELL_COLORS.length];
      const x = well.stations.map((s) => originEast + (s.easting || 0));
      const y = well.stations.map((s) => originNorth + (s.northing || 0));
      const z = well.stations.map((s) => -(s.tvd || 0));
      const text = well.stations.map(
        (s) =>
          `${well.id} — ${well.name}<br>MD ${Math.round(s.md || 0).toLocaleString()} m ` +
          `· TVD ${Math.round(s.tvd || 0).toLocaleString()} m`
      );

      traces.push({
        type: 'scatter3d',
        mode: 'lines+markers',
        name: `${well.id}${well.isActive ? ' (active)' : ''}`,
        x,
        y,
        z,
        text,
        hoverinfo: 'text',
        line: { color, width: 5 },
        marker: { color, size: 2.5 },
      });
    });

    window.Plotly.react(
      containerRef.current,
      traces,
      {
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#94a3b8', family: 'ui-monospace, monospace', size: 10 },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: true,
        legend: { orientation: 'h', y: -0.02, font: { size: 10, color: '#cbd5e1' } },
        scene: {
          xaxis: { title: 'East (m)', gridcolor: '#1e293b', zerolinecolor: '#334155', color: '#64748b' },
          yaxis: { title: 'North (m)', gridcolor: '#1e293b', zerolinecolor: '#334155', color: '#64748b' },
          zaxis: { title: 'TVD (m)', gridcolor: '#1e293b', zerolinecolor: '#334155', color: '#64748b' },
          bgcolor: 'transparent',
          camera: { eye: { x: 1.4, y: -1.4, z: 0.9 } },
        },
      },
      { displayModeBar: false, responsive: true }
    );
  }, [wells]);

  const stats = useMemo(() => {
    if (!wells) return null;
    const withStations = wells.filter((w) => w.stations && w.stations.length);
    if (!withStations.length) return null;
    const stationCount = withStations.reduce((sum, w) => sum + w.stations.length, 0);
    const deepest = Math.max(...withStations.flatMap((w) => w.stations.map((s) => s.tvd || 0)));
    return { wellCount: withStations.length, stationCount, deepestTvd: deepest };
  }, [wells]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-sm p-3 lg:max-w-[88%] lg:mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Wellbore Trajectory — Active vs. Nearest Offsets
          </h3>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reload</span>
        </button>
      </div>

      {loading && (
        <div className="h-[380px] flex items-center justify-center text-xs font-mono text-slate-500">
          Loading real directional survey data...
        </div>
      )}

      {!loading && error && (
        <div className="h-[380px] flex flex-col items-center justify-center gap-2 text-center px-6">
          <span className="text-xs font-mono text-amber-400">{error}</span>
          <span className="text-[10px] font-mono text-slate-500">
            No trajectory shown rather than a fabricated one — check the backend/AI service are running.
          </span>
        </div>
      )}

      {!loading && !error && wells && (
        <>
          <div ref={containerRef} className="w-full h-[380px]" />
          {stats && (
            <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-800 text-center">
              <div>
                <div className="text-sm font-bold text-slate-100 font-mono">{stats.wellCount}</div>
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Wells Plotted</div>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-100 font-mono">{stats.stationCount}</div>
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Survey Stations</div>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-100 font-mono">
                  {stats.deepestTvd.toLocaleString(undefined, { maximumFractionDigits: 0 })} m
                </div>
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Deepest TVD</div>
              </div>
            </div>
          )}
          <p className="text-[10px] font-mono text-slate-600 mt-2">
            Real directional survey data (MD/TVD/inclination/azimuth/northing/easting) from the shared
            dataset — not simulated.
          </p>
        </>
      )}
    </div>
  );
}
