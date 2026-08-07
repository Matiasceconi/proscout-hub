import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatTime, formatDayShort, getFixtureStatus } from './dashboardUtils';

export default function UpcomingMatchRow({ fixture, represented, clubsById, providerToClub, onViewProfile, onViewMatch }) {
  const status = getFixtureStatus(fixture.fixture_status);
  const homeClubId = providerToClub[fixture.home_provider_team_id];
  const awayClubId = providerToClub[fixture.away_provider_team_id];
  const homeLogo = fixture.home_team_logo || clubsById[homeClubId]?.internal_logo_url || clubsById[homeClubId]?.official_logo_url;
  const awayLogo = fixture.away_team_logo || clubsById[awayClubId]?.internal_logo_url || clubsById[awayClubId]?.official_logo_url;

  return (
    <button
      onClick={() => onViewMatch(fixture)}
      className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all text-left"
    >
      {/* Date/time */}
      <div className="flex-shrink-0 w-16 text-center">
        <p className="text-xs text-slate-400">{formatDayShort(fixture.fixture_date)}</p>
        <p className="text-sm font-bold text-green-600">{formatTime(fixture.fixture_date)}</p>
      </div>

      {/* Competition + teams */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 truncate mb-1">{fixture.competition_name || '—'}{fixture.round ? ` · ${fixture.round}` : ''}</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {homeLogo ? (
              <img src={homeLogo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-slate-400">{fixture.home_team_name?.[0]}</span>
              </div>
            )}
            <span className="text-sm font-medium text-slate-700 truncate">{fixture.home_team_name}</span>
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0">vs</span>
          <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
            <span className="text-sm font-medium text-slate-700 truncate text-right">{fixture.away_team_name}</span>
            {awayLogo ? (
              <img src={awayLogo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-slate-400">{fixture.away_team_name?.[0]}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Represented */}
      <div className="hidden md:flex flex-col items-end gap-1 flex-shrink-0 max-w-[220px]">
        <span className="text-xs text-slate-400">{represented.length} representad{represented.length === 1 ? 'o' : 'os'}</span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {represented.slice(0, 3).map(p => (
            <div key={`${p.type}-${p.id}`} className="flex items-center gap-1">
              {p.photo_url ? (
                <img src={p.photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-slate-500">{p.first_name?.[0]}</span>
                </div>
              )}
              <span className="text-xs text-slate-600 truncate max-w-[80px]">{p.first_name} {p.last_name?.[0]}.</span>
            </div>
          ))}
          {represented.length > 3 && (
            <span className="text-xs text-slate-400">+{represented.length - 3}</span>
          )}
        </div>
      </div>

      {/* Mobile represented count */}
      <div className="flex md:hidden flex-shrink-0">
        <span className="text-xs text-slate-400">{represented.length} repr.</span>
      </div>

      <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color} flex-shrink-0`}>{status.label}</span>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </button>
  );
}