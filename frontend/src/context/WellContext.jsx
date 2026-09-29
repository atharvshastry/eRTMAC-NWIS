import React, { createContext, useContext, useMemo, useState } from 'react';
import { DASHBOARD_WELLS } from '../data/mockWells';

const DEFAULT_WELL_ID = 'OIL-DEMO-001';
const SELECTED_WELL_STORAGE_KEY = 'nwis.selectedWellId';
const WellContext = createContext(null);

export function WellProvider({ children }) {
  const [selectedWellId, setSelectedWellId] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_WELL_ID;
    return window.localStorage.getItem(SELECTED_WELL_STORAGE_KEY) || DEFAULT_WELL_ID;
  });
  const selectedWell = useMemo(
    () => DASHBOARD_WELLS.find((well) => well.wellId === selectedWellId) || DASHBOARD_WELLS[0],
    [selectedWellId]
  );

  const updateSelectedWellId = (wellId) => {
    setSelectedWellId(wellId);
    window.localStorage.setItem(SELECTED_WELL_STORAGE_KEY, wellId);
  };

  return (
    <WellContext.Provider value={{ selectedWellId, setSelectedWellId: updateSelectedWellId, selectedWell, wells: DASHBOARD_WELLS }}>
      {children}
    </WellContext.Provider>
  );
}

export function useWellContext() {
  const context = useContext(WellContext);
  if (!context) throw new Error('useWellContext must be used within WellProvider');
  return context;
}
