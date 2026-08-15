import React from 'react';
import { trendIcon, trendLabel, POSITION_LABELS_FULL } from './statsHelpers';
import { Calculator } from 'lucide-react';

export default function StatsPositionTable({ metrics, position, viewMode }) {
  if (!metrics || metrics.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">Sin métricas disponibles</p>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        Métricas detalladas · {POSITION_LABELS_FULL[position] || position}
      </h3>
      {/* Desktop: tabla */}
      <div className="hidden sm:block border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                <th className="text-left p-2 font-medium">Métrica</th>
                <th className="text-center p-2 font-medium">Total</th>
                {viewMode === 'per90' && (
                  <th className="text-center p-2 font-medium">Por 90 min</th>
                )}
                <th className="text-center p-2 font-medium">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => {
                const trend = trendIcon(m.trend);
                const displayValue = viewMode === 'per90' && m.per90Value !== null
                  ? m.per90Value.toFixed(2)
                  : m.value ?? '—';
                return (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="p-2 text-slate-600 flex items-center gap-1">
                      {m.calculated && <Calculator className="w-3 h-3 text-slate-400" />}
                      {m.label}
                    </td>
                    <td className="p-2 text-center font-medium text-slate-800">
                      {m.value ?? '—'}
                    </td>
                    {viewMode === 'per90' && (
                      <td className="p-2 text-center text-slate-600">
                        {m.per90Value !== null ? m.per90Value.toFixed(2) : '—'}
                      </td>
                    )}
                    <td className="p-2 text-center">
                      {m.trend ? (
                        <span className={trend.color} title={trendLabel(m.trend)}>
                          {trend.icon}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: tarjetas */}
      <div className="sm:hidden grid grid-cols-2 gap-2">
        {metrics.map((m, i) => {
          const trend = trendIcon(m.trend);
          const displayValue = viewMode === 'per90' && m.per90Value !== null
            ? m.per90Value.toFixed(2)
            : m.value ?? '—';
          return (
            <div key={i} className="bg-slate-50 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-500 flex items-center gap-0.5">
                  {m.calculated && <Calculator className="w-2.5 h-2.5 text-slate-400" />}
                  {m.label}
                </p>
                {m.trend && <span className={`text-[10px] ${trend.color}`}>{trend.icon}</span>}
              </div>
              <p className="text-base font-bold text-slate-800 mt-0.5">{displayValue}</p>
              {viewMode === 'per90' && m.per90Value !== null && (
                <p className="text-[10px] text-slate-400">Total: {m.value ?? '—'}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}