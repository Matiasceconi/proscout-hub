import React from 'react';
import { Image } from '@/components/ui/image';
import { ChevronRight, Star } from 'lucide-react';

function initials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function PlayerAvatar({ player }) {
  if (player.photo_url) {
    return (
      <img
        src={player.photo_url}
        alt={player.name}
        className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm"
      />
    );
  }

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-black text-slate-700 shadow-sm">
      {initials(player.name) || '—'}
    </span>
  );
}

function participation(player) {
  const states = {
    starter: { label: 'Titular', className: 'bg-emerald-100 text-emerald-800' },
    substitute: { label: 'Suplente', className: 'bg-blue-100 text-blue-800' },
    pending_link: { label: 'Vinculación pendiente', className: 'bg-amber-100 text-amber-800' },
    lineup_pending: { label: 'Alineación pendiente', className: 'bg-slate-100 text-slate-600' },
    not_listed: { label: 'Sin confirmar', className: 'bg-slate-100 text-slate-600' },
  };
  return states[player.participation_status] || states.not_listed;
}

function Team({ team }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100 sm:h-[72px] sm:w-[72px]">
        <Image src={team.logo} alt={team.name} className="h-full w-full object-contain" />
      </div>
      <p className="min-h-10 text-sm font-black leading-tight text-slate-900 sm:text-base">
        {team.name}
      </p>
    </div>
  );
}

export default function LiveMatchCard({ fixture, onClick }) {
  const represented = fixture.our_players || [];
  const leagueContext = [fixture.league?.name, fixture.league?.round].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={() => onClick?.(fixture)}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:p-5"
      aria-label={`Abrir ${fixture.home_team.name} contra ${fixture.away_team.name}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-500">
            {leagueContext || 'Competencia'}
          </p>
          {(fixture.stadium || fixture.city) && (
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {[fixture.stadium, fixture.city].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          {fixture.minute ? `${fixture.minute}'` : fixture.status_long || 'EN VIVO'}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <Team team={fixture.home_team} />

        <div className="pt-5 text-center sm:pt-6">
          <p className="whitespace-nowrap text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {fixture.goals.home ?? 0}
            <span className="mx-2 text-slate-300">–</span>
            {fixture.goals.away ?? 0}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">En juego</p>
        </div>

        <Team team={fixture.away_team} />
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            {represented.length} {represented.length === 1 ? 'representado' : 'representados'}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            Ver detalle <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {represented.map((player) => {
            const status = participation(player);
            return (
              <div key={player.player_id} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
                <PlayerAvatar player={player} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-900">{player.name}</p>
                  <p className="truncate text-[10px] text-slate-500">{player.team}</p>
                </div>
                <span className={`max-w-[104px] rounded-full px-2 py-1 text-center text-[9px] font-bold leading-tight ${status.className}`}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </button>
  );
}
