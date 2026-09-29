import React from 'react';
import PageHeader from '../components/layout/PageHeader';

export default function Analytics() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        subtitle="Drilling performance benchmarking, non-productive time (NPT) analysis, and bit wear correlation metrics."
      />

      <div className="p-4 rounded-sm bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
        <span className="text-blue-400 font-semibold uppercase tracking-wider block mb-1">
          STATUS: READY
        </span>
        <p className="font-sans text-slate-300">
          ROP benchmarking curves, drilling KPI analytics, and cost-per-meter trends will be integrated here.
        </p>
      </div>
    </div>
  );
}
