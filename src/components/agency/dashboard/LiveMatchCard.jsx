import React from 'react';
import { Image } from '@/components/ui/image';
import { Star } from 'lucide-react';

function StatusBadge({ fixture }) {
  if (fixture.is_live) {
    return (
      <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
        <span className="w-1.5 h-1.5 bg-white rounded-full" />
        EN VIVO {fixture.minute || ''}'
      </span>
    );
  }
  if (fixture.is_finished) {
    return <span className="inline-flex items-center bg-slate-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">FINAL</span>;
  }
  const time = fixture.date ? new Date(fixture.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  return <span className="inline-flex items-center bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{time}</span>;
}

export default function LiveMatchCard({ fixture, onClick }) {
  const ourCount = fixture.our_players?.length || 0;
  const cardBorder = fixture.is_live ? 'border-green-400 shadow-md shadow-green-100' : 'border-slate-200';
  const cardSize = fixture.is_live ? 'p-4' : 'p-3';

  return (
    <button
      onClick={() => onClick?.(fixture)}
      className={`text-left bg-white rounded-xl border-2 ${cardBorder} ${cardSize} hover:shadow-lg transition-shadow w-full`}
    >
      <div className="flex items-center justify-between mb-2">
        <StatusBadge fixture={fixture} />
        {ourCount > 0 && (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            {ourCount} {ourCount === 1 ? 'representado' : 'representados'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Image src={fixture.home_team.logo} alt={fixture.home_team.name} className="w-8 h-8 object-contain flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-800 truncate">{fixture.home_team.name}</span>
        </div>
        <div className="text-center px-2">
          {fixture.is_live || fixture.is_finished ? (
            <span className="text-lg font-bold text-slate-900">{fixture.goals.home ?? 0} - {fixture.goals.away ?? 0}</span>
          ) : (
            <span className="text-xs text-slate-400">vs</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold text-slate-800 truncate text-right">{fixture.away_team.name}</span>
          <Image src={fixture.away_team.logo} alt={fixture.away_team.name} className="w-8 h-8 object-contain flex-shrink-0" />
        </div>
      </div>

      {ourCount > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
          {fixture.our_players.slice(0, 3).map((p, i) => (
            <span key={i} className="text-xs text-slate-600 bg-slate-50 rounded-full px-2 py-0.5">
              {p.name}{p.starter ? ' · titular' : ''}
            </span>
          ))}
          {ourCount > 3 && <span className="text-xs text-slate-500">+{ourCount - 3}</span>}
        </div>
      )}
    </button>
  );
}