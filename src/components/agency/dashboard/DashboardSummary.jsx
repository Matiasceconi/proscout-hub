import React from 'react';
import { Calendar, Users, CalendarDays, AlertCircle, ClipboardList } from 'lucide-react';

const SUMMARY_CARDS = [
  { key: 'todayFixtures', icon: Calendar, label: 'Partidos de Hoy', color: 'bg-blue-50 text-blue-700', filterKey: 'today' },
  { key: 'todayPlayers', icon: Users, label: 'Jugadores con Partido Hoy', color: 'bg-green-50 text-green-700', filterKey: null },
  { key: 'upcoming7', icon: CalendarDays, label: 'Próximos 7 días', color: 'bg-purple-50 text-purple-700', filterKey: 'upcoming7' },
  { key: 'toConfirm', icon: AlertCircle, label: 'A Confirmar', color: 'bg-amber-50 text-amber-700', filterKey: null },
  { key: 'pendingFollowUps', icon: ClipboardList, label: 'Seguimientos Pendientes', color: 'bg-orange-50 text-orange-700', filterKey: 'pendingFollowUp' },
];

export default function DashboardSummary({ stats, onFilterClick }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {SUMMARY_CARDS.map(card => {
        const Icon = card.icon;
        const clickable = card.filterKey && onFilterClick;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => clickable && onFilterClick(card.filterKey)}
            className={`bg-white rounded-xl border border-slate-200 p-4 text-left transition-shadow ${clickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats[card.key] || 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
          </button>
        );
      })}
    </div>
  );
}