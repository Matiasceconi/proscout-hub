import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, isOrgAdmin } from '@/lib/roleUtils';
import { Loader2, AlertCircle, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

import CalendarHeader from '@/components/agency/calendar/CalendarHeader';
import WeekView from '@/components/agency/calendar/WeekView';
import AgendaView from '@/components/agency/calendar/AgendaView';
import MonthView from '@/components/agency/calendar/MonthView';
import EventDetailPanel from '@/components/agency/calendar/EventDetailPanel';
import NewEventDialog from '@/components/agency/calendar/NewEventDialog';
import FiltersPanel from '@/components/agency/calendar/FiltersPanel';
import AttentionPanel from '@/components/agency/calendar/AttentionPanel';
import {
  buildUnifiedEvents, getWeekStart, getWeekDays, formatWeekRange, formatMonthLabel,
} from '@/components/agency/calendar/calendarUtils';
import { useIsMobile } from '@/hooks/use-mobile';

const VIEW_STORAGE_KEY = 'proscout_calendar_view';

export default function AgencyCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const orgId = getUserOrgId(user);
  const isMobile = useIsMobile();
  const canEdit = isOrgAdmin(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [players, setPlayers] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [matchStats, setMatchStats] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [members, setMembers] = useState([]);

  // View state
  const [view, setView] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(VIEW_STORAGE_KEY) : null;
    return saved || (isMobile ? 'agenda' : 'week');
  });
  const [scope, setScope] = useState('mine');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState({ types: [], person: '', responsible: '', club: '', competition: '', status: '', priority: '', onlyPending: false });

  // Persist view
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  // Period ranges
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const periodStart = useMemo(() => {
    const d = new Date(weekStart);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekStart]);
  const periodEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    d.setMilliseconds(-1);
    return d;
  }, [weekStart]);

  // For month view, use wider range
  const monthStart = useMemo(() => {
    if (view !== 'month') return periodStart;
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDay = first.getDay();
    const offset = startDay === 0 ? 6 : startDay - 1;
    const d = new Date(first);
    d.setDate(d.getDate() - offset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate, view]);

  const monthEnd = useMemo(() => {
    if (view !== 'month') return periodEnd;
    const d = new Date(monthStart);
    d.setDate(d.getDate() + 42);
    d.setMilliseconds(-1);
    return d;
  }, [monthStart, view]);

  const loadData = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      setError(false);
      const rangeStart = view === 'month' ? monthStart : periodStart;
      const rangeEnd = view === 'month' ? monthEnd : periodEnd;

      const [fixs, evs, parts, pls, dirs, docs, stats, cls, mp, mem, org] = await Promise.all([
        base44.entities.ClubFixture.filter({
          organization_id: orgId,
          fixture_date: { $gte: rangeStart.toISOString(), $lte: rangeEnd.toISOString() },
        }, 'fixture_date', 500),
        base44.entities.CalendarEvent.filter({ organization_id: orgId }, 'start_date', 500),
        base44.entities.CalendarEventParticipant.filter({ organization_id: orgId }, undefined, 500),
        base44.entities.Player.filter({ organization_id: orgId, status: { $ne: 'archived' } }, '-updated_date', 300),
        base44.entities.TechnicalDirector.filter({ organization_id: orgId }, '-updated_date', 200),
        base44.entities.Document.filter({ organization_id: orgId }, undefined, 500),
        base44.entities.PlayerMatchStats.filter({ organization_id: orgId }, '-match_date', 500),
        base44.entities.Club.list('-club_name', 500),
        base44.entities.ClubProviderMapping.filter({ organization_id: orgId }, undefined, 500),
        base44.entities.OrganizationMember.filter({ organization_id: orgId }, undefined, 200),
        base44.entities.Organization.get(orgId),
      ]);

      setFixtures(fixs);
      setCalendarEvents(evs);
      setParticipants(parts);
      setPlayers(pls);
      setDirectors(dirs);
      setDocuments(docs);
      setMatchStats(stats);
      setClubs(cls);
      setMappings(mp);
      setMembers(mem);
      setOrganization(org);
    } catch (err) {
      console.error('Calendar load error:', err);
      setError(true);
    }
    setLoading(false);
  }, [orgId, periodStart, periodEnd, monthStart, monthEnd, view]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build lookup maps
  const clubsById = useMemo(() => {
    const map = {};
    for (const c of clubs) map[c.id] = c;
    return map;
  }, [clubs]);

  const providerToClub = useMemo(() => {
    const map = {};
    for (const m of mappings) if (m.provider_team_id) map[m.provider_team_id] = m.club_id;
    return map;
  }, [mappings]);

  const membersById = useMemo(() => {
    const map = {};
    for (const m of members) map[m.id] = m;
    return map;
  }, [members]);

  // My member record
  const myMember = useMemo(() => members.find(m => m.user_id === user?.id || m.user_email === user?.email), [members, user]);

  // Build unified events
  const allItems = useMemo(() => buildUnifiedEvents({
    fixtures, calendarEvents, participants, players, directors, documents, matchStats,
    clubsById, providerToClub, membersById,
  }), [fixtures, calendarEvents, participants, players, directors, documents, matchStats, clubsById, providerToClub, membersById]);

  // Apply scope filter
  const scopedItems = useMemo(() => {
    if (scope === 'all') {
      // Check if user has access
      if (canEdit || myMember?.has_full_squad_access) return allItems;
      // Non-authorized user: still show only their items
      return allItems.filter(item => {
        if (item.source_type === 'fixture') {
          // Only matches with my represented
          const myPlayerIds = players.filter(p => p.representative_id === myMember?.id).map(p => p.id);
          const myDirectorIds = directors.filter(d => d.representative_id === myMember?.id).map(d => d.id);
          return item.represented?.some(r =>
            (r.type === 'player' && myPlayerIds.includes(r.id)) ||
            (r.type === 'director' && myDirectorIds.includes(r.id))
          );
        }
        if (item.source_type === 'manual') {
          return item.responsible_member_id === myMember?.id || !item.responsible_member_id;
        }
        return true;
      });
    }
    // Mi agenda
    const myPlayerIds = players.filter(p => p.representative_id === myMember?.id).map(p => p.id);
    const myDirectorIds = directors.filter(d => d.representative_id === myMember?.id).map(d => d.id);
    return allItems.filter(item => {
      if (item.source_type === 'fixture') {
        return item.represented?.some(r =>
          (r.type === 'player' && myPlayerIds.includes(r.id)) ||
          (r.type === 'director' && myDirectorIds.includes(r.id))
        );
      }
      if (item.source_type === 'manual') {
        return item.responsible_member_id === myMember?.id || item._raw?.created_by_user_id === user?.id;
      }
      if (item.source_type === 'follow_up') {
        return true; // show all pending follow-ups in my agenda
      }
      // Birthdays, contracts, documents: only for my represented
      if (item.source_type === 'birthday' || item.source_type === 'contract') {
        return item.represented?.some(r =>
          (r.type === 'player' && myPlayerIds.includes(r.id)) ||
          (r.type === 'director' && myDirectorIds.includes(r.id))
        );
      }
      return false;
    });
  }, [allItems, scope, canEdit, myMember, players, directors, user]);

  // Apply filters
  const filteredItems = useMemo(() => {
    let result = scopedItems;

    // Type filter
    if (filters.types?.length > 0) {
      result = result.filter(i => filters.types.includes(i.event_type));
    }
    // Person filter
    if (filters.person) {
      const [ptype, pid] = filters.person.split('-');
      result = result.filter(i => i.represented?.some(r => r.id === pid));
    }
    // Responsible filter
    if (filters.responsible) {
      result = result.filter(i => i.responsible_member_id === filters.responsible);
    }
    // Club filter
    if (filters.club) {
      result = result.filter(i => {
        if (i.source_type === 'fixture') {
          const homeClubId = providerToClub[i._raw.home_provider_team_id];
          const awayClubId = providerToClub[i._raw.away_provider_team_id];
          return homeClubId === filters.club || awayClubId === filters.club;
        }
        return i.represented?.some(r => r.club_id === filters.club);
      });
    }
    // Status filter
    if (filters.status) {
      result = result.filter(i => i.status === filters.status);
    }
    // Priority filter
    if (filters.priority) {
      result = result.filter(i => i.priority === filters.priority);
    }
    // Only pending
    if (filters.onlyPending) {
      result = result.filter(i => i.source_type === 'follow_up' || i.source_type === 'document' || i.source_type === 'contract' || !i.responsible);
    }

    return result;
  }, [scopedItems, filters, providerToClub]);

  // Period label
  const periodLabel = useMemo(() => {
    if (view === 'month') return formatMonthLabel(currentDate);
    return formatWeekRange(weekStart);
  }, [view, currentDate, weekStart]);

  // Navigation
  const handlePrev = () => {
    if (view === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    else { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setCurrentDate(d); }
  };
  const handleNext = () => {
    if (view === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    else { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setCurrentDate(d); }
  };
  const handleToday = () => setCurrentDate(new Date());

  // Actions
  const handleViewProfile = (person) => {
    if (person.type === 'director') navigate(`/agency/directors/${person.id}`);
    else navigate(`/agency/players/${person.id}`);
  };

  const handleViewMatch = () => navigate('/agency/matches');

  const handleDelete = async (item) => {
    if (item.source_type !== 'manual') return;
    try {
      await base44.entities.CalendarEvent.delete(item.source_id);
      setSelectedItem(null);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleComplete = async (item) => {
    if (item.source_type !== 'manual') return;
    try {
      await base44.entities.CalendarEvent.update(item.source_id, { status: 'completed' });
      setSelectedItem(null);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleEventSaved = () => { loadData(); };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.types?.length > 0) count++;
    if (filters.person) count++;
    if (filters.responsible) count++;
    if (filters.club) count++;
    if (filters.status) count++;
    if (filters.priority) count++;
    if (filters.onlyPending) count++;
    return count;
  }, [filters]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">No se pudo cargar el calendario</p>
          <Button variant="outline" onClick={loadData} className="mt-3">Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <CalendarHeader
        view={view}
        setView={setView}
        periodLabel={periodLabel}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        scope={scope}
        setScope={setScope}
        onOpenFilters={() => setShowFilters(true)}
        activeFilterCount={activeFilterCount}
        onNewEvent={() => setShowNewEvent(true)}
      />

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.types?.length > 0 && (
            <button onClick={() => setFilters({ ...filters, types: [] })} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-slate-200">
              Tipos: {filters.types.length} ✕
            </button>
          )}
          {filters.person && (
            <button onClick={() => setFilters({ ...filters, person: '' })} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-slate-200">
              Representado ✕
            </button>
          )}
          {filters.responsible && (
            <button onClick={() => setFilters({ ...filters, responsible: '' })} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-slate-200">
              Responsable ✕
            </button>
          )}
          {filters.club && (
            <button onClick={() => setFilters({ ...filters, club: '' })} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-slate-200">
              Club ✕
            </button>
          )}
          {filters.status && (
            <button onClick={() => setFilters({ ...filters, status: '' })} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-slate-200">
              Estado ✕
            </button>
          )}
          {filters.priority && (
            <button onClick={() => setFilters({ ...filters, priority: '' })} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-slate-200">
              Prioridad ✕
            </button>
          )}
          {filters.onlyPending && (
            <button onClick={() => setFilters({ ...filters, onlyPending: false })} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-slate-200">
              Solo pendientes ✕
            </button>
          )}
        </div>
      )}

      {/* Main layout: calendar + sidebar */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Calendar view */}
        <div className="lg:col-span-2">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-3">
                {activeFilterCount > 0 ? 'No se encontraron eventos con estos filtros' : view === 'week' ? 'No hay actividad para esta semana' : 'No tenés eventos programados'}
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Button size="sm" onClick={() => setShowNewEvent(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-1" /> Crear evento
                </Button>
                {activeFilterCount > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setFilters({ types: [], person: '', responsible: '', club: '', competition: '', status: '', priority: '', onlyPending: false })}>
                    Limpiar filtros
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleToday}>Ir a hoy</Button>
              </div>
            </div>
          ) : view === 'week' ? (
            <WeekView weekDays={weekDays} items={filteredItems} onItemClick={setSelectedItem} />
          ) : view === 'agenda' ? (
            <AgendaView items={filteredItems} onItemClick={setSelectedItem} emptyMessage="No hay eventos para mostrar" />
          ) : (
            <MonthView monthDate={currentDate} items={filteredItems} onItemClick={setSelectedItem} />
          )}
        </div>

        {/* Right sidebar: attention panel (desktop only) */}
        <div className="hidden lg:block">
          <AttentionPanel
            items={filteredItems}
            fixtures={fixtures}
            documents={documents}
            players={players}
            matchStats={matchStats}
            onItemClick={setSelectedItem}
          />
        </div>
      </div>

      {/* Mobile FAB */}
      {isMobile && (
        <button
          onClick={() => setShowNewEvent(true)}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center z-40 hover:bg-green-700"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Modals & panels */}
      <EventDetailPanel
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
        onComplete={handleComplete}
        onViewProfile={handleViewProfile}
        onViewMatch={handleViewMatch}
        canEdit={canEdit}
      />
      <NewEventDialog
        open={showNewEvent}
        onClose={() => setShowNewEvent(false)}
        orgId={orgId}
        players={players}
        directors={directors}
        members={members}
        userId={user?.id}
        onSave={handleEventSaved}
      />
      <FiltersPanel
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
        players={players}
        directors={directors}
        clubs={clubs}
        members={members}
      />
    </div>
  );
}