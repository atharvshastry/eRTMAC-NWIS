import React from 'react';
import { Database, MapPin, Layers, Gauge, Clock, Compass } from 'lucide-react';

export default function WellOverview({ well }) {
  if (!well) return null;

  const cards = [
    {
      label: 'Well Identifier',
      value: well.id,
      subtext: well.name,
      icon: Database,
    },
    {
      label: 'Operational Field',
      value: well.field || 'Demo Field',
      subtext: 'Assam-Arakan Basin',
      icon: MapPin,
    },
    {
      label: 'Target Formation',
      value: well.formation,
      subtext: 'Primary Pay Zone',
      icon: Layers,
    },
    {
      label: 'Total Depth (TD)',
      value: `${well.totalDepth?.toLocaleString() || well.totalDepth} m`,
      subtext: 'Measured Depth',
      icon: Gauge,
    },
    {
      label: 'Drilling Duration',
      value: well.drillingDuration || '46 days',
      subtext: `Spudded: ${well.spudYear || '2019'}`,
      icon: Clock,
    },
    {
      label: 'Offset Distance',
      value: `${well.distanceKm} km`,
      subtext: 'From OIL-DEMO-001',
      icon: Compass,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="p-3 rounded-sm bg-slate-900 border border-slate-800 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[10px] font-mono uppercase truncate">
                {card.label}
              </span>
              <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            </div>
            <div>
              <div className="text-sm font-bold font-mono text-slate-100 truncate">
                {card.value}
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                {card.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
