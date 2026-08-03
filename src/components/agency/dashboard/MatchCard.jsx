import React from 'react';
import { MapPin, Eye, User, ClipboardList, Plus } from 'lucide-react';
import { getFixtureStatus, CALLUP_STATUS_MAP, formatTime, isFixtureFinished, needsConfirmation } from './dashboardUtils';
import { POSITION_LABELS, AVAILABILITY_LABELS, AVAILABILITY_COLORS, PLAYER_CATEGORY_COLORS, PLAYER_CATEGORIES } from '@/lib/roleUtils';

export default function MatchCard({ fixture, players, statsMap, providerToClub, onFollowUp, onObservation, onViewProfile, onCreateTask }) {
  const status = getFixtureStatus(fixture.fixture_status);
  const homeClubId = providerToClub[fixture.home_provider_team_id];
  const awayClubId = providerToClub[fixture.away_provider_team_id];

  const representedPlayers = players.filter(p =>
    p.current_club_id && fixture.mapped_club_ids?.includes(p.current_club_id)
  );

  const hasScore = fixture.home_score != null && fixture.away_score != null;
  const needsConfirm = needsConfirmation(fixture);
  const hasPendingFollowUp = statsMap.some(s => s.follow_up_status === 'pending');
  const finished = isFixtureFinished(fixture.fixture_status);

  const getPlayerStats = (playerId) => statsMap.find(s => s.player_id === playerId);
  const getPlayerSide = (player) => {
    if (player.current_club_id === homeClubId) return 'home';
    if (player.current_club_id === awayClubId) return 'away';
    return null;
  };

  const openMaps = () => {
    const query = encodeURIComponent((fixture.stadium || '') + ' ' + (fixture.fixture_city || ''));
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-bold text-slate-900">{formatTime(fixture.fixture_date)}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
          {needsConfirm && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200">A Confirmar</span>
          )}
          {finished && hasPendingFollowUp && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-200">Seguimiento Pendiente</span>
          )}
        </div>
        <div className="text-right min-w-0">
          <p className="text-xs font-medium text-slate-600 truncate max-w-[180px]">{fixture.competition_name || '—'}</p>
          {fixture.round && <p className="text-xs text-slate-400 truncate max-w-[180px]">{fixture.round}</p>}
        </div>
      </div>

      {/* Body - Teams */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {fixture.home_team_logo ? (
              <img src={fixture.home_team_logo} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-slate-400">{fixture.home_team_name?.[0] || '?'}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{fixture.home_team_name || '—'}</p>
              <span className="text-xs text-slate-400">Local</span>
            </div>
          </div>

          <div className="text-center px-1 sm:px-2 flex-shrink-0">
            {hasScore ? (
              <p className="text-lg font-bold text-slate-900">{fixture.home_score} - {fixture.away_score}</p>
            ) : (
              <p className="text-sm text-slate-400">vs</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-sm font-medium text-slate-800 truncate">{fixture.away_team_name || '—'}</p>
              <span className="text-xs text-slate-400">Visitante</span>
            </div>
            {fixture.away_team_logo ? (
              <img src={fixture.away_team_logo} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-slate-400">{fixture.away_team_name?.[0] || '?'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{fixture.stadium || 'A confirmar'}</span>
          {fixture.fixture_city && <span className="truncate">· {fixture.fixture_city}</span>}
        </div>
      </div>

      {/* Players */}
      {representedPlayers.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Jugadores Representados</p>
          <div className="space-y-2">
            {representedPlayers.map(player => {
              const pStats = getPlayerStats(player.id);
              const side = getPlayerSide(player);
              const callup = pStats?.callup_status ? CALLUP_STATUS_MAP[pStats.callup_status] : null;
              return (
                <div key={player.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100">
                  {player.photo_url ? (
                    <img src={player.photo_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-slate-500">{player.first_name?.[0]}{player.last_name?.[0]}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{player.first_name} {player.last_name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-400">{POSITION_LABELS[player.position] || player.position}</span>
                      {side && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${side === 'home' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {side === 'home' ? 'LOCAL' : 'VISITANTE'}
                        </span>
                      )}
                      {player.category && (
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${PLAYER_CATEGORY_COLORS[player.category] || ''}`}>
                          {PLAYER_CATEGORIES[player.category] || player.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {callup && (
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${callup.color}`}>{callup.label}</span>
                    )}
                    {player.availability_status && player.availability_status !== 'available' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${AVAILABILITY_COLORS[player.availability_status] || ''}`}>
                        {AVAILABILITY_LABELS[player.availability_status] || player.availability_status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => onViewProfile(player.id)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500" title="Ver perfil">
                      <User className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onObservation(fixture, player, pStats)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500" title="Observación">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onFollowUp(fixture, player, pStats)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500" title="Seguimiento">
                      <ClipboardList className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onCreateTask(fixture, player)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500" title="Crear tarea">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match-level actions */}
      <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-2 mt-auto">
        <button onClick={openMaps} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100">
          <MapPin className="w-3.5 h-3.5" /> Ubicación
        </button>
        {finished && representedPlayers.length > 0 && (
          <button
            onClick={() => onFollowUp(fixture, representedPlayers[0], getPlayerStats(representedPlayers[0].id))}
            className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 px-2 py-1 rounded-md hover:bg-orange-50 ml-auto"
          >
            <ClipboardList className="w-3.5 h-3.5" /> Completar Seguimiento
          </button>
        )}
      </div>
    </div>
  );
}