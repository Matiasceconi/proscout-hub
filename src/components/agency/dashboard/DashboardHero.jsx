import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import { getGreeting, formatDateFull } from './dashboardUtils';

export default function DashboardHero({ organization, user, todayCount, representedCount, onSeeCalendar }) {
  const cover = organization?.cover_image_url;
  const firstName = (user?.full_name || user?.email || '').split(' ')[0] || '';
  const hasActivity = todayCount > 0;

  return (
    <section className="relative flex min-h-[210px] items-end overflow-hidden rounded-2xl border border-slate-800 shadow-lg sm:min-h-[245px]">
      {cover ? (
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#071225] via-[#0f1f38] to-[#14354a]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-slate-900/25" />
      <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />

      <div className="relative z-10 w-full p-5 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              <Sparkles className="h-3 w-3" />
              Panel ejecutivo · Score Fútbol
            </p>
            <p className="text-sm font-medium text-white/65">{getGreeting()},</p>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{firstName}</h1>
            <p className="mt-1 text-sm capitalize text-white/75 sm:text-base">{formatDateFull()}</p>

            <div className="mt-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:text-sm">
                <span className={`h-2 w-2 rounded-full ${hasActivity ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                {hasActivity
                  ? `Hoy: ${todayCount} ${todayCount === 1 ? 'evento' : 'eventos'} · ${representedCount} representad${representedCount === 1 ? 'o' : 'os'} con actividad`
                  : 'Hoy no hay actividad programada'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onSeeCalendar}
            className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500/20"
          >
            <Calendar className="h-4 w-4 text-emerald-300" />
            Ver calendario
          </button>
        </div>
      </div>
    </section>
  );
}
