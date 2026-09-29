import React, { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Crosshair,
  ArrowRight,
  GitCompare,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Loader2,
  MapPinOff,
} from 'lucide-react';

// Tile Layer Configurations
const TILE_LAYERS = {
  default: {
    name: 'Default',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  },
  terrain: {
    name: 'Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey',
    maxZoom: 18,
  },
};

// Frames a view around `center` sized to the active search radius, instead of a fixed
// zoom level - this is what makes genuinely-separated wells read as naturally spread out
// rather than clumped, without ever touching the real lat/lon values.
function boundsForRadius(center, radiusKm) {
  const [lat, lon] = center;
  const metres = Math.max(Number(radiusKm) || 10, 1) * 1000;
  // Plain equirectangular offset - deliberately not `L.circle(...).getBounds()`, which
  // throws unless the circle has already been added to a live map (it needs the map's
  // pixel projection internally). This needs no map instance, just the center + radius.
  const latDelta = metres / 111320; // metres per degree of latitude is ~constant
  const lonDelta = metres / (111320 * Math.cos((lat * Math.PI) / 180));
  return L.latLngBounds(
    [lat - latDelta, lon - lonDelta],
    [lat + latDelta, lon + lonDelta]
  );
}

// Helper component to programmatically pan/zoom using Leaflet hook
function MapController({ center, targetTrigger, hasRealCenter, currentRadius }) {
  const map = useMap();
  const didInitialRealCenter = useRef(false);
  const lastRadiusRef = useRef(currentRadius);
  // Last [lat, lon] actually flown to, compared BY VALUE (not by reference -- `center` is a
  // fresh array every render). Value comparison is what makes the "field changed" case below
  // race-proof: `centerWellId` flips the instant the toggle is clicked, well before the async
  // /wells/nearby fetch resolves with the new well's real coordinates, so an effect keyed on
  // "did the switch happen" fires too early with the still-stale old center and never re-checks
  // once the real coordinates land a moment later. Keying on the coordinates themselves instead
  // means the fly-to naturally fires exactly when they actually change, whatever caused it.
  const lastFlownCenterRef = useRef(null);

  // The map's initial view is set from `defaultCenter` the moment WellMap first mounts -
  // but the active well is fetched asynchronously, so on that very first render it's still
  // null and the map opens centered on a generic fallback point instead of the real well.
  // react-leaflet only applies MapContainer's center/zoom once on mount, so once the real
  // coordinates arrive we have to explicitly move the view there ourselves - this does that,
  // exactly once, the first time a real center is available, framing to the search radius
  // instead of a fixed zoom (never fights the user's own pan/zoom on later re-renders).
  React.useEffect(() => {
    if (hasRealCenter && center && !didInitialRealCenter.current) {
      map.fitBounds(boundsForRadius(center, currentRadius), { padding: [48, 48], animate: false });
      didInitialRealCenter.current = true;
      lastRadiusRef.current = currentRadius;
      lastFlownCenterRef.current = center;
    }
  }, [hasRealCenter, center, currentRadius, map]);

  // Re-frame when the radius filter itself changes (e.g. 10km -> 20km).
  React.useEffect(() => {
    if (
      hasRealCenter &&
      center &&
      didInitialRealCenter.current &&
      currentRadius !== lastRadiusRef.current
    ) {
      map.flyToBounds(boundsForRadius(center, currentRadius), { padding: [48, 48], duration: 1 });
      lastRadiusRef.current = currentRadius;
      lastFlownCenterRef.current = center;
    }
  }, [currentRadius, hasRealCenter, center, map]);

  // Re-frame whenever the center's real coordinates actually move meaningfully (>~1km) from
  // wherever we last flew to -- covers switching the Nearby Wells field toggle (Assam <->
  // Mumbai High) once the new well's real lat/lon has actually arrived from the fetch, without
  // the stale-coordinate race a "did the selection change" flag would have.
  React.useEffect(() => {
    if (!hasRealCenter || !center || !didInitialRealCenter.current) return;
    const last = lastFlownCenterRef.current;
    const moved = !last || Math.abs(last[0] - center[0]) > 0.01 || Math.abs(last[1] - center[1]) > 0.01;
    if (moved) {
      map.flyToBounds(boundsForRadius(center, currentRadius), { padding: [48, 48], duration: 1.2 });
      lastFlownCenterRef.current = center;
    }
  }, [center, hasRealCenter, currentRadius, map]);

  // Explicit "Recenter Well" button click.
  React.useEffect(() => {
    if (targetTrigger && center) {
      map.flyToBounds(boundsForRadius(center, currentRadius), { padding: [48, 48], duration: 1.2 });
      lastFlownCenterRef.current = center;
    }
  }, [targetTrigger, center, currentRadius, map]);

  return null;
}

function MapResizeHandler({ isFullscreen }) {
  const map = useMap();

  useEffect(() => {
    const resizeMap = () => map.invalidateSize({ animate: false });
    resizeMap();
    const frame = requestAnimationFrame(resizeMap);
    return () => cancelAnimationFrame(frame);
  }, [isFullscreen, map]);

  return null;
}

// Custom Leaflet DivIcon Generator
const createWellIcon = (well) => {
  if (well.isActive) {
    return L.divIcon({
      className: 'custom-active-well-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(37, 99, 235, 0.35); border: 2px solid #3b82f6; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(59, 130, 246, 0.9);">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb; border: 1.5px solid #ffffff;"></div>
          </div>
          <div style="margin-top: 2px; background: #020617; border: 1px solid #3b82f6; border-radius: 2px; padding: 1px 4px; font-family: monospace; font-size: 9px; font-weight: bold; color: #ffffff; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.8);">
            ${well.id}
          </div>
        </div>
      `,
      iconSize: [70, 44],
      iconAnchor: [35, 12],
      popupAnchor: [0, -14],
    });
  }

  let color = '#10b981'; // Green normal
  let bg = 'rgba(16, 185, 129, 0.3)';
  if (well.riskLevel === 'HIGH') {
    color = '#ef4444'; // Red high risk
    bg = 'rgba(239, 68, 68, 0.35)';
  } else if (well.riskLevel === 'MEDIUM') {
    color = '#f59e0b'; // Amber medium
    bg = 'rgba(245, 158, 11, 0.35)';
  }

  return L.divIcon({
    className: 'custom-offset-well-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="width: 16px; height: 16px; border-radius: 50%; background: ${bg}; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px ${color};">
          <div style="width: 4px; height: 4px; border-radius: 50%; background: #ffffff;"></div>
        </div>
        <div style="margin-top: 2px; background: #090d16; border: 1px solid #1e293b; border-radius: 2px; padding: 1px 3px; font-family: monospace; font-size: 8px; color: #cbd5e1; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.8);">
          ${well.id}
        </div>
      </div>
    `,
    iconSize: [50, 36],
    iconAnchor: [25, 8],
    popupAnchor: [0, -10],
  });
};

// Best-effort short basin/field label for the datum badge, derived from the centered
// well's real `field` string rather than hardcoded -- so it reads correctly whether the
// map is centered on the Assam active well or e.g. one of the Mumbai High wells.
function datumLabel(activeWell) {
  const field = activeWell && activeWell.field;
  if (!field) return 'ASSAM-ARAKAN BASIN';
  if (/mumbai/i.test(field)) return 'MUMBAI OFFSHORE BASIN';
  if (/assam|arakan/i.test(field)) return 'ASSAM-ARAKAN BASIN';
  return field.toUpperCase();
}

export default function WellMap({
  activeWell,
  wells = [],
  currentRadius = 10,
  onCompareWell,
  loading = false,
}) {
  const [mapStyle, setMapStyle] = useState('default'); // 'default' | 'satellite' | 'terrain'
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === mapContainerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Active well coordinates or fallback to Assam-Arakan default
  const defaultCenter = activeWell
    ? [activeWell.lat, activeWell.lon]
    : [27.35, 95.32];

  const currentTileLayer = TILE_LAYERS[mapStyle];

  const handleRecenter = () => {
    setRecenterTrigger((prev) => prev + 1);
  };

  const toggleFullscreen = async () => {
    if (!mapContainerRef.current) return;

    try {
      if (document.fullscreenElement === mapContainerRef.current) {
        await document.exitFullscreen();
      } else if (!document.fullscreenElement) {
        await mapContainerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error('Unable to toggle map fullscreen mode:', error);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'HIGH':
        return 'text-red-400 bg-red-950/70 border-red-900/80';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-950/70 border-amber-900/80';
      case 'LOW':
      default:
        return 'text-blue-400 bg-blue-950/70 border-blue-900/80';
    }
  };

  return (
    <div
      ref={mapContainerRef}
      className={`relative w-full bg-[#0b101b] border border-slate-800 overflow-hidden select-none ${isFullscreen ? 'h-screen rounded-none' : 'h-[540px] lg:h-[620px] rounded-sm'}`}
    >
      {/* Top Left: GIS Datum Indicator -- reflects whichever field is actually centered,
          not always Assam (the map can also center on e.g. the Mumbai High field). */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-300 shadow-md pointer-events-none">
        <Compass className="w-3.5 h-3.5 text-blue-400" />
        <span>WGS84 • {datumLabel(activeWell)}</span>
      </div>

      {/* Top Right: Map View Switcher: [ Default ] [ Satellite ] [ Terrain ] */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1 p-1 rounded-sm bg-slate-900/95 border border-slate-800 shadow-lg">
        {['default', 'satellite', 'terrain'].map((styleKey) => {
          const isSelected = mapStyle === styleKey;
          return (
            <button
              key={styleKey}
              type="button"
              onClick={() => setMapStyle(styleKey)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-xs capitalize transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {TILE_LAYERS[styleKey].name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="inline-flex items-center justify-center w-7 h-7 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xs transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Floating Bottom-Right: Recenter on Active Well Button */}
      <div className="absolute bottom-6 right-3 z-[1000]">
        <button
          type="button"
          onClick={handleRecenter}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-slate-900/95 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 shadow-lg transition-colors cursor-pointer"
          title="Recenter map on active well"
        >
          <Crosshair className="w-3.5 h-3.5 text-blue-400" />
          <span>Recenter Well</span>
        </button>
      </div>

      {/* Loading Overlay: shown while filters are being re-applied so a refetch never looks like a frozen/broken map */}
      {loading && (
        <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-[#0b101b]/60 backdrop-blur-[1px] pointer-events-none">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-sm bg-slate-900/95 border border-slate-800 text-xs font-mono text-slate-200 shadow-lg">
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span>Loading nearby wells…</span>
          </div>
        </div>
      )}

      {/* Empty State: filters returned zero offset wells - avoids a bare map reading as broken */}
      {!loading && activeWell && wells.length === 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[900] pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-slate-900/95 border border-slate-800 text-xs font-mono text-slate-300 shadow-lg">
            <MapPinOff className="w-3.5 h-3.5 text-slate-500" />
            <span>No offset wells match the current filters</span>
          </div>
        </div>
      )}

      {/* Real Leaflet Map Container */}
      <MapContainer
        center={defaultCenter}
        zoom={11}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <ZoomControl position="bottomleft" />
        <MapResizeHandler isFullscreen={isFullscreen} />
        <MapController
          center={defaultCenter}
          targetTrigger={recenterTrigger}
          hasRealCenter={!!activeWell}
          currentRadius={currentRadius}
        />

        {/* Dynamic Tile Layer according to user selection */}
        <TileLayer
          key={mapStyle}
          url={currentTileLayer.url}
          attribution={currentTileLayer.attribution}
          maxZoom={currentTileLayer.maxZoom}
        />

        {/* Geographic Radius Circles centered on active well */}
        {activeWell && (
          <>
            {/* Active Query Radius Circle (e.g. 5km, 10km, 20km) */}
            <Circle
              center={[activeWell.lat, activeWell.lon]}
              radius={Number(currentRadius) * 1000}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#2563eb',
                fillOpacity: 0.08,
                weight: 2,
                dashArray: '4, 6',
              }}
            />

            {/* Reference Circles: 5km, 10km, 20km */}
            {[5000, 10000, 20000].map((rMeters) => {
              if (rMeters === Number(currentRadius) * 1000) return null;
              return (
                <Circle
                  key={rMeters}
                  center={[activeWell.lat, activeWell.lon]}
                  radius={rMeters}
                  pathOptions={{
                    color: '#475569',
                    fillOpacity: 0,
                    weight: 1,
                    dashArray: '3, 6',
                  }}
                />
              );
            })}
          </>
        )}

        {/* 1. Active Well Marker */}
        {activeWell && (
          <Marker
            position={[activeWell.lat, activeWell.lon]}
            icon={createWellIcon(activeWell)}
          >
            <Popup className="control-room-popup">
              <div className="p-3 w-64 text-xs font-sans text-slate-200">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700 mb-2">
                  <span className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {activeWell.id}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-xs bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-semibold">
                    {activeWell.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono bg-slate-950 p-2 rounded-sm border border-slate-800 mb-2.5">
                  <div>
                    <span className="text-[9px] text-slate-500 block">Current Depth</span>
                    <span className="font-bold text-slate-100">{activeWell.currentDepth} m</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Formation</span>
                    <span className="font-semibold text-slate-200 truncate block">{activeWell.formation}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Field</span>
                    <span className="font-semibold text-slate-200">{activeWell.field}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Reference</span>
                    <span className="text-blue-400 font-semibold">0.0 km</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/well-intelligence?wellId=${activeWell.id}`)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
                >
                  <span>View Well Intelligence</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 2. Nearby Offset Wells Markers */}
        {wells.map((well) => (
          <Marker
            key={well.id}
            position={[well.lat, well.lon]}
            icon={createWellIcon(well)}
          >
            <Popup className="control-room-popup">
              <div className="p-3 w-64 sm:w-72 text-xs font-sans text-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700 mb-2">
                  <div>
                    <span className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          well.riskLevel === 'HIGH'
                            ? 'bg-red-500'
                            : well.riskLevel === 'MEDIUM'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      ></span>
                      {well.id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Distance: {well.distanceKm} km
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-xs border text-[10px] font-mono font-semibold ${
                      well.riskLevel === 'HIGH'
                        ? 'bg-red-950/70 text-red-400 border-red-800'
                        : well.riskLevel === 'MEDIUM'
                        ? 'bg-amber-950/70 text-amber-400 border-amber-800'
                        : 'bg-emerald-950/70 text-emerald-400 border-emerald-800'
                    }`}
                  >
                    {well.status}
                  </span>
                </div>

                {/* Primary Data Grid */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono bg-slate-950 p-2 rounded-sm border border-slate-800 mb-2.5">
                  <div>
                    <span className="text-[9px] text-slate-500 block">Total Depth</span>
                    <span className="font-bold text-slate-100">{well.totalDepth} m</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Formation</span>
                    <span className="font-semibold text-slate-200 truncate block">{well.formation}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Risk Profile</span>
                    <span
                      className={`font-semibold ${
                        well.riskLevel === 'HIGH'
                          ? 'text-red-400'
                          : well.riskLevel === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {well.riskLevel} Risk
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Spud Year</span>
                    <span className="text-slate-300">{well.spudYear || '—'}</span>
                  </div>
                </div>

                {/* Historical Events List */}
                <div className="mb-2.5">
                  <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-slate-400">
                    <span className="uppercase font-semibold">Historical Events</span>
                    <span>{well.historicalEvents?.length || 0} logged</span>
                  </div>

                  {well.historicalEvents && well.historicalEvents.length > 0 ? (
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {well.historicalEvents.map((ev, idx) => (
                        <div
                          key={idx}
                          className="p-1 rounded-sm bg-slate-950 border border-slate-800 text-[10px]"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-mono font-bold px-1 py-0.2 rounded-xs border text-[9px] ${getSeverityBadge(
                                ev.severity
                              )}`}
                            >
                              {ev.severity} — {ev.type}
                            </span>
                            {ev.depth && (
                              <span className="text-slate-400 font-mono text-[9px]">
                                @{ev.depth}m
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 leading-tight mt-0.5 font-sans truncate">
                            {ev.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-sm bg-slate-950 text-[10px] text-slate-500 font-mono text-center">
                      No critical hazards logged.
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => navigate(`/well-intelligence?wellId=${well.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-sm bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
                  >
                    <span>View Well Intelligence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {onCompareWell && (
                    <button
                      type="button"
                      onClick={() => onCompareWell(well)}
                      className="inline-flex items-center justify-center px-2 py-1.5 rounded-sm bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs transition-colors"
                      title="Compare with Active Well"
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
