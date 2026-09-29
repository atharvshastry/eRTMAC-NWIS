import React from 'react';
import { useWellContext } from '../../context/WellContext';

export default function WellSelector() {
  const { selectedWellId, setSelectedWellId, wells } = useWellContext();

  return (
    <label className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
      <span>Select Well:</span>
      <select
        value={selectedWellId}
        onChange={(event) => setSelectedWellId(event.target.value)}
        className="bg-[#111114] border border-white/[0.12] rounded-lg px-3 py-2 text-white font-mono text-xs outline-none focus:border-white/[0.3]"
        aria-label="Select well"
      >
        {wells.map((well) => <option key={well.wellId} value={well.wellId}>{well.wellId}</option>)}
      </select>
    </label>
  );
}
