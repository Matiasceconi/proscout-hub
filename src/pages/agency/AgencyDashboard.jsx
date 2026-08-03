import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Plus, Trophy } from 'lucide-react';
import DashboardSummary from '@/components/agency/dashboard/DashboardSummary';
import DashboardFilters from '@/components/agency/dashboard/DashboardFilters';
import MatchCard from '@/components/agency/dashboard/MatchCard';
import UpcomingMatchRow from '@/components/agency/dashboard/UpcomingMatchRow';
import FollowUpModal from '@/components/agency/dashboard/FollowUpModal';
import ObservationModal from '@/components/agency/dashboard/ObservationModal';
import ManualFixtureDialog from '@/components/agency/dashboard/ManualFixtureDialog';
import {
  getFixtureStatus, isToday, isFuture, isWithinDays,
  isFixtureFinished, needsConfirmation, formatDateLong, getDateKey
} from '@/components/agency/dashboard/dashboardUtils';

export default function AgencyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const orgId = getUserOrgId(user);

  const [loading, setLoading] = useState(true);
  const [fixtures, setFixtures] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matchStats, setMatchStats] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [providerToClub, setProviderToClub] = useState({});
  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', playerId: '', clubId: '', category: '',
    competition: '', agent: '', matchStatus: '', followUpStatus: '', homeAway: ''
  });
  const [rangeDays, setRangeDays] = useState(7);
  const [showManual, setShowManual] = useState(false);
  const [followUpState, setFollowUpState] = useState(null);
  const [observationState, setObservationState] = useState(null);

  const loadData = async () => {
    try {
      const now = new Date();
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const future60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      const [fixs, pls, stats, cls, mappings] = await Promise.all([
        base44.entities.ClubFixture.filter({
          organization_id: orgId,
          fixture_date: { $gte: past30.toISOString(), $lte: future60.toISOString() }
        }, 'fixture_date', 1000),
        base44.entities.Player.filter({ organization_id: orgId, status: { $ne: 'archived' } }, '-updated_date', 300),
        base44.entities.PlayerMatchStats.filter({ organization_id: orgId }, '-match_date', 500),
        base44.entities.Club.list('-club_name', 500),
        base44.entities.ClubProviderMapping.filter({ organization_id: orgId }),
      ]);

      setFixtures(fixs);
      setPlayers(pls);
      setMatchStats(stats);
      setClubs(cls);

      const pMap = {};
      for (const m of mappings) {
        if (m.provider_team_id) pMap[m.provider_team_id] = m.club_id;
      }
      setProviderToClub(pMap);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (orgId) loadData();
  }, [orgId]);

  // Build fixtures with represented players and their stats
  const fixturesWithPlayers = useMemo(() => {
    return fixtures.map(f => {
      const representedPlayers = players.filter(p =>
        p.current_club_id && f.mapped_club_ids?.includes(p.current_club_id)
      );
      const statsForFixture = matchStats.filter(s => s.club_fixture_id === f.id);
      return { ...f, representedPlayers, statsForFixture };
    });
  }, [fixtures, players, matchStats]);

  // Summary stats
  const summary = useMemo(() => {
    const todayFixs = fixturesWithPlayers.filter(f => isToday(f.fixture_date) && f.representedPlayers.length > 0);
    const todayPlayerIds = new Set(todayFixs.flatMap(f => f.representedPlayers.map(p => p.id)));
    const upcoming7 = fixturesWithPlayers.filter(f => isWithinDays(f.fixture_date, 7) && f.representedPlayers.length > 0);
    const toConfirm = fixturesWithPlayers.filter(f => needsConfirmation(f) && f.representedPlayers.length > 0);
    const pendingFollowUps = matchStats.filter(s =>
      s.follow_up_status === 'pending' &&
      fixtures.some(f => f.id === s.club_fixture_id && isFixtureFinished(f.fixture_status))
    );
    return {
      todayFixtures: todayFixs.length,
      todayPlayers: todayPlayerIds.size,
      upcoming7: upcoming7.length,
      toConfirm: toConfirm.length,
      pendingFollowUps: pendingFollowUps.length,
    };
  }, [fixturesWithPlayers, matchStats, fixtures]);

  // Apply filters
  const filteredFixtures = useMemo(() => {
    return fixturesWithPlayers.filter(f => {
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(f.fixture_date) < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59);
        if (new Date(f.fixture_date) > to) return false;
      }
      if (filters.playerId && !f.representedPlayers.some(p => p.id === filters.playerId)) return false;
      if (filters.clubId && !f.mapped_club_ids?.includes(filters.clubId)) return false;
      if (filters.category && !f.representedPlayers.some(p => p.category === filters.category)) return false;
      if (filters.competition && f.competition_name !== filters.competition) return false;
      if (filters.agent && !f.statsForFixture.some(s => s.responsible_agent === filters.agent)) return false;
      if (filters.matchStatus) {
        const status = getFixtureStatus(f.fixture_status);
        if (status.group !== filters.matchStatus) return false;
      }
      if (filters.followUpStatus && !f.statsForFixture.some(s => s.follow_up_status === filters.followUpStatus)) return false;
      if (filters.homeAway) {
        const homeClubId = providerToClub[f.home_provider_team_id];
        const awayClubId = providerToClub[f.away_provider_team_id];
        const hasHome = f.representedPlayers.some(p => p.current_club_id === homeClubId);
        const hasAway = f.representedPlayers.some(p => p.current_club_id === awayClubId);
        if (filters.homeAway === 'home' && !hasHome) return false;
        if (filters.homeAway === 'away' && !hasAway) return false;
      }
      return true;
    });
  }, [fixturesWithPlayers, filters, providerToClub]);

  // Split into today and upcoming
  const todayMatches = useMemo(() =>
    filteredFixtures.filter(f => isToday(f.fixture_date)).sort((a, b) => new Date(a.fixture_date) - new Date(b.fixture_date)),
    [filteredFixtures]
  );

  const upcomingMatches = useMemo(() =>
    filteredFixtures.filter(f => isFuture(f.fixture_date) && !isToday(f.fixture_date)).sort((a, b) => new Date(a.fixture_date) - new Date(b.fixture_date)),
    [filteredFixtures]
  );

  // Group upcoming by date within range
  const upcomingGrouped = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const maxDate = new Date(now.getTime() + rangeDays * 24 * 60 * 60 * 1000);
    const filtered = upcomingMatches.filter(f => new Date(f.fixture_date) <= maxDate);
    const groups = {};
    for (const f of filtered) {
      const key = getDateKey(f.fixture_date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [upcomingMatches, rangeDays]);

  // Available competitions and agents for filters
  const competitions = useMemo(() => {
    const set = new Set(fixtures.map(f => f.competition_name).filter(Boolean));
    return Array.from(set).sort();
  }, [fixtures]);

  const agents = useMemo(() => {
    const set = new Set(matchStats.map(s => s.responsible_agent).filter(Boolean));
    return Array.from(set).sort();
  }, [matchStats]);

  // Filter click from summary cards
  const handleSummaryFilter = (filterKey) => {
    if (filterKey === 'today') {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      setFilters({ ...filters, dateFrom: todayStr, dateTo: todayStr });
    } else if (filterKey === 'upcoming7') {
      const today = new Date();
      const future = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      setFilters({ ...filters, dateFrom: today.toISOString().slice(0, 10), dateTo: future.toISOString().slice(0, 10) });
    } else if (filterKey === 'pendingFollowUp') {
      setFilters({ ...filters, followUpStatus: 'pending' });
    }
  };

  // Actions
  const handleFollowUp = (fixture, player, existingStats) => {
    const homeClubId = providerToClub[fixture.home_provider_team_id];
    const isHome = player.current_club_id === homeClubId;
    setFollowUpState({ fixture, player, existingStats, isHome });
  };

  const handleObservation = (fixture, player, existingStats) => {
    setObservationState({ fixture, player, existingStats });
  };

  const handleViewProfile = (playerId) => {
    navigate(`/agency/players/${playerId}`);
  };

  const handleCreateTask = async (fixture, player) => {
    try {
      await base44.entities.CalendarEvent.create({
        organization_id: orgId,
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        title: `Seguimiento: ${fixture.home_team_name} vs ${fixture.away_team_name}`,
        event_type: 'meeting',
        start_date: fixture.fixture_date,
        status: 'scheduled',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleModalSave = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tablero Operativo</h1>
          <p className="text-sm text-slate-400">Centro de control diario de la agencia</p>
        </div>
        <Button onClick={() => setShowManual(true)}>
          <Plus className="w-4 h-4 mr-1" /> Cargar Partido
        </Button>
      </div>

      {/* Summary */}
      <DashboardSummary stats={summary} onFilterClick={handleSummaryFilter} />

      {/* Filters */}
      <DashboardFilters
        filters={filters}
        setFilters={setFilters}
        players={players}
        clubs={clubs}
        competitions={competitions}
        agents={agents}
      />

      {/* Today's matches */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Partidos de Hoy</h2>
          <span className="text-sm text-slate-400">({todayMatches.length})</span>
        </div>
        {todayMatches.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No hay partidos de hoy con jugadores representados</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {todayMatches.map(f => (
              <MatchCard
                key={f.id}
                fixture={f}
                players={players}
                statsMap={f.statsForFixture}
                providerToClub={providerToClub}
                onFollowUp={handleFollowUp}
                onObservation={handleObservation}
                onViewProfile={handleViewProfile}
                onCreateTask={handleCreateTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming matches */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Próximos Partidos</h2>
            <span className="text-sm text-slate-400">({upcomingMatches.length})</span>
          </div>
          <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
            {[7, 15, 30].map(d => (
              <button
                key={d}
                onClick={() => setRangeDays(d)}
                className={`px-3 py-1 text-xs rounded-md ${rangeDays === d ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {d} días
              </button>
            ))}
          </div>
        </div>
        {upcomingGrouped.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500 text-sm">No hay próximos partidos en este rango</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingGrouped.map(([dateKey, dayFixtures]) => (
              <div key={dateKey}>
                <h3 className="text-sm font-medium text-slate-600 mb-2">{formatDateLong(dayFixtures[0].fixture_date)}</h3>
                <div className="space-y-2">
                  {dayFixtures.map(f => (
                    <UpcomingMatchRow
                      key={f.id}
                      fixture={f}
                      players={players}
                      statsMap={f.statsForFixture}
                      providerToClub={providerToClub}
                      onViewProfile={handleViewProfile}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {followUpState && (
        <FollowUpModal
          open={true}
          onClose={() => setFollowUpState(null)}
          fixture={followUpState.fixture}
          player={followUpState.player}
          existingStats={followUpState.existingStats}
          orgId={orgId}
          isHome={followUpState.isHome}
          onSave={handleModalSave}
        />
      )}
      {observationState && (
        <ObservationModal
          open={true}
          onClose={() => setObservationState(null)}
          fixture={observationState.fixture}
          player={observationState.player}
          existingStats={observationState.existingStats}
          orgId={orgId}
          onSave={handleModalSave}
        />
      )}
      <ManualFixtureDialog
        open={showManual}
        onClose={() => setShowManual(false)}
        orgId={orgId}
        players={players}
        clubs={clubs}
        onSave={handleModalSave}
      />
    </div>
  );
}