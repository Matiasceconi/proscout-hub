import React from 'react';
import { trendIcon } from './statsHelpers';

export default function StatsSummaryCards({ cards, isReduced }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Resumen para representantes</h3>
        {isReduced && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Muestra reducida</span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cards.map((card, i) => {
          const trend = trendIcon(card.trend);
          return (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <p className="text-2xl font-bold text-slate-800">{card.value ?? '—'}</p>
                {card.trend && <span className={`text-xs ${trend.color}`}>{trend.icon}</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              {card.sub && <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}