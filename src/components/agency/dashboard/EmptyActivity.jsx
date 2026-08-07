import React from 'react';
import { CalendarPlus, ArrowRight } from 'lucide-react';
import { formatDayShort, formatTime } from './dashboardUtils';

export default function EmptyActivity({ nextEvent, onSeeCalendar }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <CalendarPlus className="w-7 h-7 text-slate-400" />
      </div>
      <p className="text-slate-700 font-medium">Hoy no hay actividad programada</p>
      {nextEvent ? (
        <p className="text-sm text-slate-400 mt-1">
          Próximo evento: {formatDayShort(nextEvent.fixture_date || nextEvent.start_date)} · {formatTime(nextEvent.fixture_date || nextEvent.start_date)}
        </p>
      ) : (
        <p className="text-sm text-slate-400 mt-1">No hay eventos próximos registrados</p>
      )}
      <button
        onClick={onSeeCalendar}
        className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
      >
        Ver calendario <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}