import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { Goal, Repeat, Square, Star } from 'lucide-react';

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
  return player.photo_url ? (
    <img
      src={player.photo_url}
      alt={player.name}
      className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-sm"
    />
  ) : (
    <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-black text-slate-700 shadow-sm">
      {initials(player.name) || '—'}
    </span>
  );
}

function playerStatus(player) {
  const states = {
    starter: ['Titular', 'bg-emerald-100 text-emerald-800'],
    substitute: ['Suplente', 'bg-blue-100 text-blue-800'],
    pending_link: ['Vinculación pendiente', 'bg-amber-100 text-amber-800'],
    lineup_pending: ['Alineación pendiente', 'bg-slate-100 text-slate-600'],
    not_listed: ['Sin confirmar', 'bg-slate-100 text-slate-600'],
  };
  return states[player.participation_status] || states.not_listed;
}

function EventRow({ event }) {
  const isGoal = event.type === 'Goal';
  const isCard = event.type === 'Card';
  const isSubstitution = event.type === 'subst';
  const isRed = isCard && event.detail?.includes('Red');
  const isYellow = isCard && event.detail?.includes('Yellow');

  return (
    <div className="flex items-center gap-2 py-2 text-sm">
      <span className="w-11 flex-shrink-0 text-xs font-bold text-slate-500">
        {event.time}'{event.extra ? `+${event.extra}` : ''}
      </span>
      {isGoal && <Goal className="h-4 w-4 flex-shrink-0 text-emerald-600" />}
      {isYellow && <Square className="h-3.5 w-3.5 flex-shrink-0 border border-yellow-500 bg-yellow-400" />}
      {isRed && <Square className="h-3.5 w-3.5 flex-shrink-0 bg-red-500" />}
      {isSubstitution && <Repeat className="h-4 w-4 flex-shrink-0 text-blue-500" />}
      {!isGoal && !isCard && !isSubstitution && <span className="w-4 text-center text-slate-300">•</span>}
      <span className="min-w-0 flex-1 text-slate-700">
        <span className="font-semibold">{event.player}</span>
        {isGoal && <span className="ml-1 text-emerald-700">· {event.detail}</span>}
        {isCard && <span className="ml-1 text-slate-500">· {event.detail}</span>}
        {isSubstitution && <span className="ml-1 text-blue-600">· sale {event.assist}</span>}
      </span>
      {event.team_logo && <Image src={event.team_logo} alt="" className="h-5 w-5 flex-shrink-0 object-contain" />}
    </div>
  );
}

function LineupList({ lineup, ourPlayerIds }) {
  if (!lineup?.starters?.length) {
    return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-400">Alineación todavía no disponible</p>;
  }

  return (
    <div className="space-y-1">
      <p className="mb-2 text-xs font-semibold text-slate-500">Formación {lineup.formation || 'sin informar'}</p>
      {lineup.starters.map((player) => {
        const isOurs = ourPlayerIds.has(player.player_id);
        return (
          <div
            key={player.player_id || player.name}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${isOurs ? 'bg-amber-50' : ''}`}
          >
            <span className="w-6 text-xs text-slate-400">{player.number ?? ''}</span>
            <span className={`min-w-0 flex-1 truncate ${isOurs ? 'font-bold text-amber-900' : 'text-slate-700'}`}>
              {player.name}
            </span>
            {isOurs && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
            <span className="text-xs text-slate-400">{player.pos}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function LiveMatchDetailModal({ fixture, open, onClose, onViewPlayerStats }) {
  if (!fixture) return null;

  const represented = fixture.our_players || [];
  const ourPlayerIds = new Set(
    represented.map((player) => player.provider_player_id).filter(Boolean).map(String),
  );
  const homeLineup = fixture.lineups?.find((lineup) => String(lineup.team_id) === fixture.home_team.id);
  const awayLineup = fixture.lineups?.find((lineup) => String(lineup.team_id) === fixture.away_team.id);
  const events = fixture.events || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto p-0">
        <div className="bg-slate-950 p-5 text-white sm:p-6">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {fixture.home_team.name} contra {fixture.away_team.name}
            </DialogTitle>
          </DialogHeader>

          <div className="mb-3 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>{fixture.league?.name}</span>
            {fixture.league?.round && <span>· {fixture.league.round}</span>}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex min-w-0 flex-col items-center text-center">
              <Image src={fixture.home_team.logo} alt={fixture.home_team.name} className="mb-2 h-16 w-16 object-contain sm:h-20 sm:w-20" />
              <p className="font-black leading-tight">{fixture.home_team.name}</p>
            </div>

            <div className="text-center">
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                EN VIVO {fixture.minute ? `${fixture.minute}'` : ''}
              </span>
              <p className="whitespace-nowrap text-4xl font-black sm:text-5xl">
                {fixture.goals.home ?? 0}
                <span className="mx-2 text-white/30">–</span>
                {fixture.goals.away ?? 0}
              </p>
            </div>

            <div className="flex min-w-0 flex-col items-center text-center">
              <Image src={fixture.away_team.logo} alt={fixture.away_team.name} className="mb-2 h-16 w-16 object-contain sm:h-20 sm:w-20" />
              <p className="font-black leading-tight">{fixture.away_team.name}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <h3 className="font-black text-slate-900">Representados de Score Fútbol</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {represented.map((player) => {
                const [label, className] = playerStatus(player);
                return (
                  <div key={player.player_id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <PlayerAvatar player={player} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">{player.name}</p>
                      <p className="truncate text-xs text-slate-500">{player.team} · {player.position || 'Posición sin informar'}</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${className}`}>
                        {label}
                      </span>
                    </div>
                    {player.provider_linked && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs text-emerald-700"
                        onClick={() => onViewPlayerStats?.(player)}
                      >
                        Ver ficha
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {fixture.enrichment_status === 'partial' && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              El proveedor todavía no entregó toda la alineación o los eventos del partido.
            </p>
          )}

          <section className="grid gap-5 md:grid-cols-2">
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                <Image src={fixture.home_team.logo} alt="" className="h-6 w-6 object-contain" />
                {fixture.home_team.name}
              </h4>
              <LineupList lineup={homeLineup} ourPlayerIds={ourPlayerIds} />
            </div>
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                <Image src={fixture.away_team.logo} alt="" className="h-6 w-6 object-contain" />
                {fixture.away_team.name}
              </h4>
              <LineupList lineup={awayLineup} ourPlayerIds={ourPlayerIds} />
            </div>
          </section>

          <section>
            <h4 className="mb-2 font-bold text-slate-800">Eventos del partido</h4>
            {events.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-400">Sin eventos informados por el proveedor</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {events.map((event, index) => <EventRow key={`${event.time}-${event.player_id}-${index}`} event={event} />)}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
