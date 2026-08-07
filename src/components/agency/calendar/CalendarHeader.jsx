import React from 'react';
import { ChevronLeft, ChevronRight, Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatWeekRange, formatMonthLabel } from './calendarUtils';

export default function CalendarHeader({
  view, setView,
  periodLabel,
  onPrev, onNext, onToday,
  scope, setScope,
  onOpenFilters, activeFilterCount,
  onNewEvent,
}) {
  const viewTabs = [
    { key: 'week', label: 'Semana' },
    { key: 'agenda', label: 'Agenda' },
    { key: 'month', label: 'Mes' },
  ];

  return (
    <div className="space-y-3">
      {/* Title row */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendario</h1>
          <p className="text-sm text-slate-500 mt-0.5">Agenda operativa</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenFilters} className="relative">
            <SlidersHorizontal className="w-4 h-4 mr-1" /> Filtros
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-green-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>
            )}
          </Button>
          <Button size="sm" onClick={onNewEvent} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-1" /> Nuevo evento
          </Button>
        </div>
      </div>

      {/* Navigation + tabs row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Period navigation */}
        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-800 min-w-[140px] text-center">{periodLabel}</span>
          <button onClick={onNext} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
            <ChevronRight className="w-4 h-4" />
          </button>
          <Button variant="outline" size="sm" onClick={onToday} className="ml-1 h-7 text-xs px-2">Hoy</Button>
        </div>

        {/* Scope + view tabs */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Scope toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setScope('mine')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${scope === 'mine' ? 'bg-green-600 text-white' : 'text-slate-600'}`}
            >
              Mi agenda
            </button>
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${scope === 'all' ? 'bg-green-600 text-white' : 'text-slate-600'}`}
            >
              Toda la agencia
            </button>
          </div>

          {/* View tabs */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {viewTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${view === t.key ? 'bg-green-600 text-white' : 'text-slate-600'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}