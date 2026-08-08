import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { Star, Goal, Square, Repeat } from 'lucide-react';

function EventRow({ event }) {
  const isGoal = event.type === 'Goal';
  const isCard = event.type === 'Card';
  const isSub = event.type === 'subst';
  const isRed = isCard && event.detail?.includes('Red');
  const isYellow = isCard && event.detail?.includes('Yellow');

  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="text-xs font-bold text-slate-500 w-10 flex-shrink-0">{event.time}'{event.extra ? `+${event.extra}` : ''}</span>
      {isGoal && <Goal className="w-4 h-4 text-green-600 flex-shrink-0" />}
      {isYellow && <Square className="w-3.5 h-3.5 bg-yellow-400 border border-yellow-500 flex-shrink-0" />}
      {isRed && <Square className="w-3.5 h-3.5 bg-red-500 flex-shrink-0" />}
      {isSub && <Repeat className="w-4 h-4 text-blue-500 flex-shrink-0" />}
      {!isGoal && !isCard && !isSub && <span className="w-4 flex-shrink-0 text-center text-slate-300">•</span>}
      <span className="text-slate-700 flex-1 min-w-0">
        <span className="font-medium">{event.player}</span>
        {isGoal && <span className="text-green-600 ml-1">⚽ {event.detail}</span>}
        {isYellow && <span className="text-yellow-700 ml-1">🟨 {event.detail}</span>}
        {isRed && <span className="text-red-700 ml-1">🟥 {event.detail}</span>}
        {isSub && <span className="text-blue-600 ml-1">🔄 sale {event.assist}</span>}
      </span>
      <Image src={event.team_logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
    </div>
  );
}

function LineupList({ lineup, ourPlayerIds }) {
  if (!lineup?.starters?.length) return <p className="text-sm text-slate-400">Sin alineación</p>;
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-slate-500 mb-1">Formación: {lineup.formation || '—'}</div>
      {lineup.starters.map((p, i) => {
        const isOurs = ourPlayerIds.has(p.player_id);
        return (
          <div key={i} className={`flex items-center gap-2 text-sm py-0.5 ${isOurs ? 'bg-amber-50 rounded px-1' : ''}`}>
            <span className="text-xs text-slate-400 w-6">{p.number ?? ''}</span>
            <span className={`flex-1 ${isOurs ? 'font-semibold text-amber-800' : 'text-slate-700'}`}>{p.name}</span>
            {isOurs && <Star className="w-3 h-3 fill-amber-500 text-amber-500" />}
            <span className="text-xs text-slate-400">{p.pos}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function LiveMatchDetailModal({ fixture, open, onClose, onViewPlayerStats }) {
  if (!fixture) return null;
  const ourPlayerIds = new Set((fixture.our_players || []).map(p => p.provider_player_id));
  const homeLineup = fixture.lineups?.find(l => String(l.team_id) === fixture.home_team.id);
  const awayLineup = fixture.lineups?.find(l => String(l.team_id) === fixture.away_team.id);
  const events = fixture.events || [];
  const ourPlayers = fixture.our_players || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 flex-wrap pr-6">
            <span className="flex items-center gap-2">
              <Image src={fixture.home_team.logo} alt="" className="w-6 h-6 object-contain" />
              {fixture.home_team.name}
              <span className="text-lg font-bold mx-2">{fixture.goals.home ?? 0} - {fixture.goals.away ?? 0}</span>
              {fixture.away_team.name}
              <Image src={fixture.away_team.logo} alt="" className="w-6 h-6 object-contain" />
            </span>
            {fixture.is_live && (
              <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                EN VIVO {fixture.minute || ''}'
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {ourPlayers.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Nuestros representados
            </div>
            <div className="flex flex-wrap gap-2">
              {ourPlayers.map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-full px-2 py-1 text-xs">
                  <span className="font-medium text-slate-800">{p.name}</span>
                  <span className="text-slate-400">{p.team}</span>
                  <span className={`px-1.5 py-0.5 rounded-full ${p.starter ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {p.starter ? 'Titular' : 'Suplente'}
                  </span>
                  {fixture.is_finished && (
                    <Button size="sm" variant="ghost" className="h-5 px-2 text-xs" onClick={() => onViewPlayerStats?.(p)}>
                      Ver estadísticas
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Image src={fixture.home_team.logo} alt="" className="w-5 h-5 object-contain" />
              {fixture.home_team.name}
            </h4>
            <LineupList lineup={homeLineup} ourPlayerIds={ourPlayerIds} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Image src={fixture.away_team.logo} alt="" className="w-5 h-5 object-contain" />
              {fixture.away_team.name}
            </h4>
            <LineupList lineup={awayLineup} ourPlayerIds={ourPlayerIds} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-800 mb-2">Eventos del partido</h4>
          {events.length === 0 ? (
            <p className="text-sm text-slate-400">Sin eventos registrados</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {events.map((ev, i) => <EventRow key={i} event={ev} />)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}