import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Plus, Trophy, CalendarDays, AlertCircle } from 'lucide-react';
import DashboardHero from '@/components/agency/dashboard/DashboardHero';
import TodayMatchCard from '@/components/agency/dashboard/TodayMatchCard';
import UpcomingMatchRowNew from '@/components/agency/dashboard/UpcomingMatchRowNew';
import DayAgenda from '@/components/agency/dashboard/DayAgenda';
import PendingActions from '@/components/agency/dashboard/PendingActions';
import EmptyActivity from '@/components/agency/dashboard/EmptyActivity';
import DashboardSkeleton from '@/components/agency/dashboard/DashboardSkeleton';
import FollowUpModal from '@/components/agency/dashboard/FollowUpModal';
import ObservationModal from '@/components/agency/dashboard/ObservationModal';
import ManualFixtureDialog from '@/components/agency/dashboard/ManualFixtureDialog';
import LiveMatchesSection from '@/components/agency/dashboard/LiveMatchesSection';
import {
  isToday, isWithinDays, isFuture, isFixtureFinished, needsConfirmation,
  startOfToday, daysFromNow
} from '@/components/agency/dashboard/dashboardUtils';

export default function AgencyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const orgId = getUserOrgId(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [players, setPlayers] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [matchStats, setMatchStats] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [providerToClub, setProviderToClub] = useState({});
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [followUpState, setFollowUpState] = useState(null);
  const [observationState, setObservationState] = useState(null);

  const loadData = async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      setError(false);
      const past7 = daysFromNow(-7);
      const future7 = daysFromNow(7);
      const future7End = new Date(future7.getTime() + 24 * 60 * 60 * 1000 - 1);

      const [fixs, pls, dirs, stats, cls, mappings, events, org] = await Promise.all([
        base44.entities.ClubFixture.filter({
          organization_id: orgId,
          fixture_date: { $gte: past7.toISOString(), $lte: future7End.toISOString() }
        }, 'fixture_date', 1000),
        base44.entities.Player.filter({ organization_id: orgId, status: { $ne: 'archived' } }, '-updated_date', 300),
        base44.entities.TechnicalDirector.filter({ organization_id: orgId }, '-updated_date', 200),
        base44.entities.PlayerMatchStats.filter({ organization_id: orgId }, '-match_date', 500),
        base44.entities.Club.list('-club_name', 500),
        base44.entities.ClubProviderMapping.filter({ organization_id: orgId }),
        base44.entities.CalendarEvent.filter({
          organization_id: orgId,
          start_date: { $gte: startOfToday().toISOString(), $lte: future7End.toISOString() }
        }, 'start_date', 200),
        base44.entities.Organization.get(orgId),
      ]);

      setFixtures(fixs);
      setPlayers(pls);
      setDirectors(dirs);
      setMatchStats(stats);
      setClubs(cls);
      setCalendarEvents(events);
      setOrganization(org);

      const pMap = {};
      for (const m of mappings) {
        if (m.provider_team_id) pMap[m.provider_team_id] = m.club_id;
      }
      setProviderToClub(pMap);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  // Clubs lookup map
  const clubsById = useMemo(() => {
    const map = {};
    for (const c of clubs) map[c.id] = c;
    return map;
  }, [clubs]);

  // Unified represented list (players + directors)
  const representedAll = useMemo(() => {
    const playerList = players.map(p => ({
      id: p.id, type: 'player', _raw: p,
      first_name: p.first_name, last_name: p.last_name, photo_url: p.photo_url,
      current_club_id: p.current_club_id,
      clubName: clubsById[p.current_club_id]?.club_name || p.club || '',
      position: p.position, primary_role: null,
      contract_end: p.contract_end, birth_date: p.birth_date,
    }));
    const directorList = directors.map(d => ({
      id: d.id, type: 'director', _raw: d,
      first_name: d.first_name, last_name: d.last_name, photo_url: d.photo_url,
      current_club_id: d.current_club_id,
      clubName: clubsById[d.current_club_id]?.club_name || d.current_club || '',
      position: null, primary_role: d.primary_role,
      contract_end: null, birth_date: d.birth_date,
    }));
    return [...playerList, ...directorList];
  }, [players, directors, clubsById]);

  // Fixtures with represented people (players + directors) linked via current_club_id → mapped_club_ids
  const fixturesWithRepresented = useMemo(() => {
    return fixtures.map(f => {
      const represented = representedAll.filter(r =>
        r.current_club_id && f.mapped_club_ids?.includes(r.current_club_id)
      );
      const statsForFixture = matchStats.filter(s => s.club_fixture_id === f.id);
      return { ...f, represented, statsForFixture };
    });
  }, [fixtures, representedAll, matchStats]);

  // Only fixtures with at least one represented person
  const fixturesWithOurPeople = useMemo(() =>
    fixturesWithRepresented.filter(f => f.represented.length > 0),
    [fixturesWithRepresented]
  );

  // Today's matches
  const todayMatches = useMemo(() =>
    fixturesWithOurPeople
      .filter(f => isToday(f.fixture_date))
      .sort((a, b) => new Date(a.fixture_date) - new Date(b.fixture_date)),
    [fixturesWithOurPeople]
  );

  // Upcoming 7 days (not today)
  const upcomingMatches = useMemo(() =>
    fixturesWithOurPeople
      .filter(f => isFuture(f.fixture_date) && !isToday(f.fixture_date) && isWithinDays(f.fixture_date, 7))
      .sort((a, b) => new Date(a.fixture_date) - new Date(b.fixture_date)),
    [fixturesWithOurPeople]
  );

  // Today's represented set (from matches + events)
  const todayRepresentedIds = useMemo(() => {
    const ids = new Set();
    todayMatches.forEach(f => f.represented.forEach(r => ids.add(`${r.type}-${r.id}`)));
    return ids;
  }, [todayMatches]);

  // Today's non-match calendar events
  const todayEvents = useMemo(() => {
    return calendarEvents
      .filter(ev => isToday(ev.start_date) && ev.event_type !== 'match')
      .map(ev => {
        const person = ev.player_id
          ? representedAll.find(r => r.id === ev.player_id && r.type === 'player')
          : ev.director_id
            ? representedAll.find(r => r.id === ev.director_id && r.type === 'director')
            : null;
        return { ...ev, _person: person };
      });
  }, [calendarEvents, representedAll]);

  // Contract expirations within 7 days + birthdays today
  const extraAgenda = useMemo(() => {
    const items = [];
    const now = startOfToday();
    const in7 = daysFromNow(7);

    // Contract expirations
    representedAll.forEach(r => {
      if (!r.contract_end) return;
      const d = new Date(r.contract_end);
      if (d >= now && d <= in7) {
        items.push({
          id: `contract-${r.type}-${r.id}`,
          title: `Vencimiento de contrato · ${r.first_name} ${r.last_name}`,
          start_date: r.contract_end,
          event_type: 'meeting',
          status: 'scheduled',
          player_name: `${r.first_name} ${r.last_name}`,
          _isExpiring: true,
          _person: r,
        });
      }
    });

    // Birthdays today
    const today = new Date();
    representedAll.forEach(r => {
      if (!r.birth_date) return;
      const b = new Date(r.birth_date);
      if (b.getDate() === today.getDate() && b.getMonth() === today.getMonth()) {
        items.push({
          id: `birthday-${r.type}-${r.id}`,
          title: `Cumpleaños de ${r.first_name} ${r.last_name}`,
          start_date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString(),
          event_type: 'other',
          status: 'confirmed',
          player_name: `${r.first_name} ${r.last_name}`,
          _isBirthday: true,
          _person: r,
        });
      }
    });

    return items;
  }, [representedAll]);

  const todayAgenda = useMemo(() =>
    [...todayEvents, ...extraAgenda].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
    [todayEvents, extraAgenda]
  );

  // Pending actions summary
  const summary = useMemo(() => {
    const toConfirm = todayMatches.filter(f =>
      f.represented.some(r => {
        if (r.type !== 'player') return false;
        const s = f.statsForFixture.find(st => st.player_id === r.id);
        return !s || s.callup_status === 'unconfirmed' || needsConfirmation(f);
      })
    ).length;

    const pendingFollowUps = matchStats.filter(s =>
      s.follow_up_status === 'pending' &&
      fixturesWithRepresented.some(f => f.id === s.club_fixture_id && isFixtureFinished(f.fixture_status))
    ).length;

    const expiringSoon = extraAgenda.filter(e => e._isExpiring).length;

    return {
      todayFixtures: todayMatches.length,
      todayPlayers: todayRepresentedIds.size,
      toConfirm,
      pendingFollowUps,
      expiringSoon,
    };
  }, [todayMatches, matchStats, fixturesWithRepresented, todayRepresentedIds, extraAgenda]);

  // Next event for empty state
  const nextEvent = useMemo(() => {
    const upcoming = [...upcomingMatches, ...calendarEvents.filter(e => isFuture(e.start_date) && !isToday(e.start_date))];
    upcoming.sort((a, b) => new Date(a.fixture_date || a.start_date) - new Date(b.fixture_date || b.start_date));
    return upcoming[0] || null;
  }, [upcomingMatches, calendarEvents]);

  const hasActivityToday = todayMatches.length > 0 || todayAgenda.length > 0;

  // Actions
  const handleViewProfile = (person) => {
    if (person.type === 'director') navigate(`/agency/directors/${person.id}`);
    else navigate(`/agency/players/${person.id}`);
  };

  const handleViewMatch = (fixture) => {
    navigate(`/agency/matches`);
  };

  const handleFollowUp = (fixture, person, existingStats) => {
    const homeClubId = providerToClub[fixture.home_provider_team_id];
    const isHome = person.current_club_id === homeClubId;
    setFollowUpState({ fixture, player: person._raw || person, existingStats, isHome });
  };

  const handleObservation = (fixture, person, existingStats) => {
    setObservationState({ fixture, player: person._raw || person, existingStats });
  };

  const handleOpenMaps = (fixture) => {
    const query = encodeURIComponent((fixture.stadium || '') + ' ' + (fixture.fixture_city || ''));
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const handleModalSave = () => { loadData(); };

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">No se pudo cargar la información</p>
          <Button variant="outline" onClick={loadData} className="mt-3">Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Partidos en Vivo */}
      <LiveMatchesSection onNavigateToPlayer={(p) => navigate(`/agency/players/${p.player_id}`)} />

      {/* Hero */}
      <DashboardHero
        organization={organization}
        user={user}
        todayCount={todayMatches.length + todayAgenda.length}
        representedCount={todayRepresentedIds.size}
        onSeeCalendar={() => navigate('/agency/calendar')}
      />

      {/* Admin action bar */}
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowManual(true)}>
          <Plus className="w-4 h-4 mr-1" /> Cargar partido
        </Button>
      </div>

      {/* Main grid: activity (left) + sidebar (right) */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: Activity of today */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-slate-900">Actividad de hoy</h2>
            <span className="text-sm text-slate-400">({todayMatches.length} partidos)</span>
          </div>

          {!hasActivityToday ? (
            <EmptyActivity nextEvent={nextEvent} onSeeCalendar={() => navigate('/agency/calendar')} />
          ) : todayMatches.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No hay partidos de hoy con representados</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {todayMatches.map(f => (
                <TodayMatchCard
                  key={f.id}
                  fixture={f}
                  represented={f.represented}
                  statsMap={f.statsForFixture}
                  providerToClub={providerToClub}
                  clubsById={clubsById}
                  onFollowUp={handleFollowUp}
                  onViewProfile={handleViewProfile}
                  onOpenMaps={() => handleOpenMaps(f)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Agenda + Pending actions */}
        <div className="space-y-4">
          {/* Agenda */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-800">Agenda del día</h3>
            </div>
            <DayAgenda events={todayAgenda} onViewProfile={handleViewProfile} />
          </div>

          {/* Pending actions */}
          <PendingActions stats={summary} />
        </div>
      </div>

      {/* Upcoming matches */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-bold text-slate-900">Próximos partidos</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/agency/calendar')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-1.5 transition-colors"
              title="Contratos por vencer en los próximos 7 días"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Contratos por vencer (7 días)
              <span className="font-bold text-slate-800">{summary.expiringSoon}</span>
            </button>
            <button
              onClick={() => navigate('/agency/calendar')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todos →
            </button>
          </div>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">No hay próximos partidos con representados en los próximos 7 días</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {upcomingMatches.map(f => (
              <UpcomingMatchRowNew
                key={f.id}
                fixture={f}
                represented={f.represented}
                clubsById={clubsById}
                providerToClub={providerToClub}
                onViewProfile={handleViewProfile}
                onViewMatch={handleViewMatch}
              />
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