import React from 'react';
import { MapPin } from 'lucide-react';
import { getFixtureStatus, formatTime, isFixtureFinished, needsConfirmation } from './dashboardUtils';
import RepresentedPersonRow from './RepresentedPersonRow';

export default function TodayMatchCard({ fixture, represented, statsMap, providerToClub, clubsById, onFollowUp, onViewProfile, onOpenMaps }) {
  const status = getFixtureStatus(fixture.fixture_status);
  const homeClubId = providerToClub[fixture.home_provider_team_id];
  const awayClubId = providerToClub[fixture.away_provider_team_id];

  const hasScore = fixture.home_score != null && fixture.away_score != null;
  const needsConfirm = needsConfirmation(fixture);
  const finished = isFixtureFinished(fixture.fixture_status);

  const getPersonStats = (personId) => statsMap.find(s => s.player_id === personId);
  const getPersonSide = (person) => {
    if (person.current_club_id === homeClubId) return true;
    if (person.current_club_id === awayClubId) return false;
    return null;
  };

  const homeLogo = fixture.home_team_logo || clubsById[homeClubId]?.internal_logo_url || clubsById[homeClubId]?.official_logo_url;
  const awayLogo = fixture.away_team_logo || clubsById[awayClubId]?.internal_logo_url || clubsById[awayClubId]?.official_logo_url;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-bold text-green-600">{formatTime(fixture.fixture_date)}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
          {needsConfirm && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200">A confirmar</span>
          )}
        </div>
        <div className="text-right min-w-0">
          <p className="text-xs font-medium text-slate-600 truncate max-w-[160px]">{fixture.competition_name || '—'}</p>
          {fixture.round && <p className="text-xs text-slate-400 truncate max-w-[160px]">{fixture.round}</p>}
        </div>
      </div>

      {/* Teams */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {homeLogo ? (
              <img src={homeLogo} alt="" className="w-11 h-11 object-contain flex-shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-400">{fixture.home_team_name?.[0] || '?'}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{fixture.home_team_name || '—'}</p>
              <span className="text-xs text-slate-400">Local</span>
            </div>
          </div>

          <div className="text-center px-1 sm:px-2 flex-shrink-0">
            {hasScore ? (
              <p className="text-xl font-bold text-slate-900">{fixture.home_score} <span className="text-slate-300">-</span> {fixture.away_score}</p>
            ) : (
              <p className="text-sm text-slate-400 font-medium">vs</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-sm font-semibold text-slate-800 truncate">{fixture.away_team_name || '—'}</p>
              <span className="text-xs text-slate-400">Visitante</span>
            </div>
            {awayLogo ? (
              <img src={awayLogo} alt="" className="w-11 h-11 object-contain flex-shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-400">{fixture.away_team_name?.[0] || '?'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <button onClick={onOpenMaps} className="truncate hover:text-slate-700 text-left">
            {fixture.stadium || 'A confirmar'}{fixture.fixture_city ? ` · ${fixture.fixture_city}` : ''}
          </button>
        </div>
      </div>

      {/* Represented */}
      {represented.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40 flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Nuestros representados ({represented.length})
          </p>
          <div className="space-y-2">
            {represented.map(person => (
              <RepresentedPersonRow
                key={`${person.type}-${person.id}`}
                person={person}
                fixture={fixture}
                stats={getPersonStats(person.id)}
                isHome={getPersonSide(person)}
                onFollowUp={onFollowUp}
                onViewProfile={onViewProfile}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}