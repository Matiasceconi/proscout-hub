import React from 'react';
import { trendIcon, trendLabel, POSITION_LABELS_FULL, POSITION_GROUPS } from './statsHelpers';

export default function StatsSummaryCards({ cards, position }) {
  const group = POSITION_GROUPS[position] || 'MF';
  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          Resumen · {POSITION_LABELS_FULL[position] || position}
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {cards.map((card, i) => {
          const trend = trendIcon(card.trend);
          return (
            <div
              key={i}
              className={`bg-white border rounded-lg p-3 ${
                card.isReduced ? 'border-amber-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-xl sm:text-2xl font-bold text-slate-800">
                  {card.value ?? '—'}
                </p>
                {card.trend && (
                  <span className={`text-xs ${trend.color}`} title={trendLabel(card.trend)}>
                    {trend.icon}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              {card.sub && <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>}
              {card.isReduced && (
                <p className="text-[10px] text-amber-600 mt-1">Muestra reducida</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}