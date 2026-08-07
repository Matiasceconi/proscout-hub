import React from 'react';
import { Calendar } from 'lucide-react';
import { getGreeting, formatDateFull } from './dashboardUtils';

export default function DashboardHero({ organization, user, todayCount, representedCount, onSeeCalendar }) {
  const cover = organization?.cover_image_url;
  const firstName = (user?.full_name || user?.email || '').split(' ')[0] || '';
  const hasActivity = todayCount > 0;

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-sm min-h-[200px] sm:min-h-[240px] flex items-end">
      {/* Cover image */}
      {cover ? (
        <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700" />
      )}
      {/* Navy gradient overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-slate-900/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-5 sm:p-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-white/70 text-sm font-medium">{getGreeting()},</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{firstName}</h1>
            <p className="text-white/80 text-sm sm:text-base mt-0.5 capitalize">{formatDateFull()}</p>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full border border-white/15">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {hasActivity
                  ? `Hoy: ${todayCount} ${todayCount === 1 ? 'evento' : 'eventos'} · ${representedCount} representad${representedCount === 1 ? 'o' : 'os'} con actividad`
                  : 'Hoy no hay actividad programada'}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={onSeeCalendar}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <Calendar className="w-4 h-4" /> Ver calendario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}