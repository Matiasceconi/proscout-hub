import React from 'react';
import { AlertCircle } from 'lucide-react';
import { getFixtureStatus, formatTime, needsConfirmation } from './dashboardUtils';

export default function UpcomingMatchRow({ fixture, players, statsMap, providerToClub, onViewProfile }) {
  const status = getFixtureStatus(fixture.fixture_status);
  const needsConfirm = needsConfirmation(fixture);

  const representedPlayers = players.filter(p =>
    p.current_club_id && fixture.mapped_club_ids?.includes(p.current_club_id)
  );

  const responsibleAgent = statsMap.find(s => s.responsible_agent)?.responsible_agent;

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-200">
      <span className="text-sm font-bold text-slate-700 w-12 flex-shrink-0">{formatTime(fixture.fixture_date)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {fixture.home_team_name} vs {fixture.away_team_name}
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          <span className="truncate">{fixture.competition_name || '—'}</span>
          {fixture.stadium && <span className="truncate">· {fixture.stadium}</span>}
          {needsConfirm && <span className="flex items-center gap-0.5 text-amber-600"><AlertCircle className="w-3 h-3" /> A confirmar</span>}
        </div>
      </div>
      <div className="flex -space-x-2 flex-shrink-0">
        {representedPlayers.slice(0, 3).map(p => (
          <button key={p.id} onClick={() => onViewProfile(p.id)} className="relative" title={`${p.first_name} ${p.last_name}`}>
            {p.photo_url ? (
              <img src={p.photo_url} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-white" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-500">{p.first_name?.[0]}</span>
              </div>
            )}
          </button>
        ))}
        {representedPlayers.length > 3 && (
          <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
            <span className="text-[10px] font-bold text-slate-500">+{representedPlayers.length - 3}</span>
          </div>
        )}
      </div>
      {responsibleAgent && (
        <span className="text-xs text-slate-500 hidden md:block max-w-[100px] truncate flex-shrink-0">{responsibleAgent}</span>
      )}
      <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color} flex-shrink-0`}>{status.label}</span>
    </div>
  );
}