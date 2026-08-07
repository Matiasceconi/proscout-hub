import React from 'react';
import { Calendar, Users, AlertCircle, ClipboardList, FileWarning } from 'lucide-react';

export default function PendingActions({ stats }) {
  const items = [
    { icon: Calendar, label: 'Partidos de hoy', value: stats.todayFixtures, color: 'text-green-600' },
    { icon: Users, label: 'Representados con actividad', value: stats.todayPlayers, color: 'text-slate-700' },
    { icon: AlertCircle, label: 'Convocatorias por confirmar', value: stats.toConfirm, color: 'text-amber-600', highlight: stats.toConfirm > 0 },
    { icon: ClipboardList, label: 'Seguimientos pendientes', value: stats.pendingFollowUps, color: 'text-orange-600', highlight: stats.pendingFollowUps > 0 },
    { icon: FileWarning, label: 'Vencimientos próximos', value: stats.expiringSoon, color: 'text-red-600', highlight: stats.expiringSoon > 0 },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Resumen de acciones</h3>
      <div className="space-y-2.5">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <span className="text-sm text-slate-600 flex-1 truncate">{item.label}</span>
              <span className={`text-sm font-bold ${item.highlight ? item.color : 'text-slate-800'}`}>{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}