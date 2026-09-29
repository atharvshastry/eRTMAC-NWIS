import React from 'react';

export default function KnowledgeFilters({ filters, setFilters }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-2 bg-slate-900 border border-slate-800 rounded">
      {/* Well -- all 9 demo well ids (was previously missing 004-009) */}
      <select name="well" value={filters.well} onChange={handleChange} className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1">
        <option value="">All Wells</option>
        {['OIL-DEMO-001', 'OIL-DEMO-002', 'OIL-DEMO-003', 'OIL-DEMO-004', 'OIL-DEMO-005', 'OIL-DEMO-006', 'OIL-DEMO-007', 'OIL-DEMO-008', 'OIL-DEMO-009'].map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </select>
      {/* Formation -- real dataset names (Barail/Girujan/Lakwa/Nahorkatiya Sand/Tipam) plus the
          demo-fallback names, so this matches whichever mode (mock vs. real backend) is active. */}
      <select name="formation" value={filters.formation} onChange={handleChange} className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1">
        <option value="">All Formations</option>
        <option value="Barail">Barail</option>
        <option value="Girujan">Girujan</option>
        <option value="Lakwa">Lakwa</option>
        <option value="Nahorkatiya Sand">Nahorkatiya Sand</option>
        <option value="Tipam">Tipam</option>
        <option value="Demo Formation">Demo Formation</option>
        <option value="Barail Sandstone">Barail Sandstone</option>
        <option value="Tipam Sandstone">Tipam Sandstone</option>
        <option value="Girujan Clay">Girujan Clay</option>
      </select>
      {/* Event Type */}
      <select name="eventType" value={filters.eventType} onChange={handleChange} className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1">
        <option value="">All Event Types</option>
        <option value="Mud Loss">Mud Loss</option>
        <option value="Stuck Pipe">Stuck Pipe</option>
        <option value="Kick">Kick</option>
        <option value="NPT">NPT</option>
        <option value="Cementing">Cementing</option>
        <option value="Fishing">Fishing</option>
        <option value="Overpressure">Overpressure</option>
      </select>
      {/* Depth Range */}
      <div className="flex space-x-2 items-center">
        <input
          type="number"
          name="depthMin"
          placeholder="Depth Min (m)"
          value={filters.depthMin}
          onChange={handleChange}
          className="w-1/2 bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1"
        />
        <input
          type="number"
          name="depthMax"
          placeholder="Depth Max (m)"
          value={filters.depthMax}
          onChange={handleChange}
          className="w-1/2 bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1"
        />
      </div>
      {/* Severity */}
      <select name="severity" value={filters.severity} onChange={handleChange} className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1">
        <option value="">All Severities</option>
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
      </select>
      {/* Document Type */}
      <select name="documentType" value={filters.documentType} onChange={handleChange} className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1">
        <option value="">All Docs</option>
        <option value="WCR">WCR</option>
        <option value="DDR">DDR</option>
        <option value="Mud Logging Report">Mud Logging Report</option>
        <option value="Drilling Report">Drilling Report</option>
        <option value="Completion Report">Completion Report</option>
        <option value="Incident Report">Incident Report</option>
      </select>
    </div>
  );
}
