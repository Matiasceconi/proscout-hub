// Unified calendar event layer — merges fixtures, manual events, documents, contracts, birthdays, follow-ups

export const EVENT_TYPE_LABELS = {
  match: 'Partido',
  training: 'Entrenamiento',
  medical: 'Control médico',
  travel: 'Viaje',
  media: 'Prensa',
  meeting: 'Reunión',
  signing: 'Firma',
  presentation: 'Presentación',
  press: 'Prensa',
  follow_up: 'Seguimiento',
  internal_task: 'Tarea interna',
  other: 'Otro',
  document_expiry: 'Vencimiento doc.',
  contract_expiry: 'Vence contrato',
  birthday: 'Cumpleaños',
};

export const EVENT_TYPE_COLORS = {
  match: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', dot: 'bg-green-500' },
  training: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
  medical: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', dot: 'bg-sky-500' },
  travel: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
  media: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-500' },
  meeting: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', dot: 'bg-green-500' },
  signing: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
  presentation: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  press: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-500' },
  follow_up: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', dot: 'bg-green-500' },
  internal_task: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', dot: 'bg-slate-500' },
  other: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', dot: 'bg-slate-500' },
  document_expiry: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
  contract_expiry: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', dot: 'bg-orange-500' },
  birthday: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
};

export const PRIORITY_LABELS = { low: 'Baja', medium: 'Media', high: 'Alta' };
export const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

export const STATUS_LABELS = {
  scheduled: 'Programado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Completado',
};
export const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-600',
};

// ─── Date helpers ───
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const WEEKDAYS_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const getWeekStart = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return d;
};

export const getWeekDays = (weekStart) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
};

export const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const da = new Date(a), db = new Date(b);
  return da.getDate() === db.getDate() && da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear();
};

export const isToday = (dateStr) => isSameDay(dateStr, new Date());

export const isFuture = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d >= now;
};

export const isWithinDays = (dateStr, days) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return d >= now && d <= future;
};

export const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
};

export const formatDateLong = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const formatDayNum = (date) => date.getDate();

export const formatWeekRange = (weekStart) => {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${weekStart.getDate()} - ${end.getDate()} de ${MONTHS[weekStart.getMonth()].toLowerCase()}`;
  }
  return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0, 3)}. - ${end.getDate()} ${MONTHS[end.getMonth()].slice(0, 3)}.`;
};

export const formatMonthLabel = (date) => `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

export const getMonthGrid = (monthDate) => {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDay = first.getDay();
  const offset = startDay === 0 ? 6 : startDay - 1;
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - offset);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
};

export const getDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getHourFromDate = (dateStr) => {
  if (!dateStr) return 8;
  return new Date(dateStr).getHours();
};

// ─── Unified event builder ───
// Merges all sources into a single list of calendar items
export const buildUnifiedEvents = ({
  fixtures, calendarEvents, participants, players, directors, documents, matchStats,
  clubsById, providerToClub, membersById,
}) => {
  const items = [];
  const playersById = {};
  for (const p of players) playersById[p.id] = p;
  const directorsById = {};
  for (const d of directors) directorsById[d.id] = d;

  // Helper: get represented people for a fixture via mapped_club_ids
  const getFixtureRepresented = (fixture) => {
    const represented = [];
    const clubIds = fixture.mapped_club_ids || [];
    for (const p of players) {
      if (p.current_club_id && clubIds.includes(p.current_club_id)) {
        represented.push({ type: 'player', id: p.id, first_name: p.first_name, last_name: p.last_name, photo_url: p.photo_url, club_id: p.current_club_id, position: p.position });
      }
    }
    for (const d of directors) {
      if (d.current_club_id && clubIds.includes(d.current_club_id)) {
        represented.push({ type: 'director', id: d.id, first_name: d.first_name, last_name: d.last_name, photo_url: d.photo_url, club_id: d.current_club_id, primary_role: d.primary_role });
      }
    }
    return represented;
  };

  // Helper: get responsible member name
  const getMemberName = (memberId) => {
    if (!memberId) return null;
    const m = membersById[memberId];
    return m ? m.full_name : null;
  };

  // 1. Fixtures → matches
  for (const f of fixtures) {
    const represented = getFixtureRepresented(f);
    const homeClubId = providerToClub[f.home_provider_team_id];
    const awayClubId = providerToClub[f.away_provider_team_id];
    items.push({
      id: `fixture-${f.id}`,
      source_type: 'fixture',
      source_id: f.id,
      _raw: f,
      title: `${f.home_team_name || ''} vs. ${f.away_team_name || ''}`,
      subtitle: f.competition_name || '',
      event_type: 'match',
      starts_at: f.fixture_date,
      ends_at: null,
      all_day: false,
      status: f.fixture_status === 'FT' ? 'completed' : 'scheduled',
      priority: 'high',
      location: f.stadium || f.fixture_city || '',
      represented,
      responsible: null,
      home_team_name: f.home_team_name,
      away_team_name: f.away_team_name,
      home_team_logo: f.home_team_logo || clubsById[homeClubId]?.internal_logo_url || clubsById[homeClubId]?.official_logo_url,
      away_team_logo: f.away_team_logo || clubsById[awayClubId]?.internal_logo_url || clubsById[awayClubId]?.official_logo_url,
      home_score: f.home_score,
      away_score: f.away_score,
      fixture_status: f.fixture_status,
      competition_name: f.competition_name,
      round: f.round,
      stadium: f.stadium,
    });
  }

  // 2. Manual calendar events
  const eventParticipantsMap = {};
  for (const p of participants) {
    if (!eventParticipantsMap[p.calendar_event_id]) eventParticipantsMap[p.calendar_event_id] = [];
    eventParticipantsMap[p.calendar_event_id].push(p);
  }

  for (const ev of calendarEvents) {
    if (ev.source_type && ev.source_type !== 'manual') continue; // skip auto-generated duplicates
    const evParts = eventParticipantsMap[ev.id] || [];
    const represented = [];
    // Also check legacy player_id/director_id fields
    if (ev.player_id && !evParts.some(p => p.person_type === 'player' && p.person_id === ev.player_id)) {
      const p = playersById[ev.player_id];
      if (p) represented.push({ type: 'player', id: p.id, first_name: p.first_name, last_name: p.last_name, photo_url: p.photo_url, club_id: p.current_club_id, position: p.position });
    }
    if (ev.director_id && !evParts.some(p => p.person_type === 'technical_director' && p.person_id === ev.director_id)) {
      const d = directorsById[ev.director_id];
      if (d) represented.push({ type: 'director', id: d.id, first_name: d.first_name, last_name: d.last_name, photo_url: d.photo_url, club_id: d.current_club_id, primary_role: d.primary_role });
    }
    for (const p of evParts) {
      if (p.person_type === 'player') {
        const pl = playersById[p.person_id];
        if (pl) represented.push({ type: 'player', id: pl.id, first_name: pl.first_name, last_name: pl.last_name, photo_url: pl.photo_url, club_id: pl.current_club_id, position: pl.position });
      } else {
        const td = directorsById[p.person_id];
        if (td) represented.push({ type: 'director', id: td.id, first_name: td.first_name, last_name: td.last_name, photo_url: td.photo_url, club_id: td.current_club_id, primary_role: td.primary_role });
      }
    }

    items.push({
      id: `event-${ev.id}`,
      source_type: 'manual',
      source_id: ev.id,
      _raw: ev,
      title: ev.title,
      subtitle: ev.description || '',
      event_type: ev.event_type,
      starts_at: ev.start_date,
      ends_at: ev.end_date,
      all_day: ev.all_day || false,
      status: ev.status,
      priority: ev.priority || 'medium',
      location: ev.location || '',
      represented,
      responsible: getMemberName(ev.responsible_member_id),
      responsible_member_id: ev.responsible_member_id,
      description: ev.description,
      reminder_at: ev.reminder_at,
    });
  }

  // 3. Document expiries
  for (const doc of documents) {
    if (!doc.expiry_date) continue;
    items.push({
      id: `document-${doc.id}`,
      source_type: 'document',
      source_id: doc.id,
      _raw: doc,
      title: `Vence: ${doc.title}`,
      subtitle: doc.player_name || '',
      event_type: 'document_expiry',
      starts_at: new Date(doc.expiry_date + 'T23:59:59').toISOString(),
      ends_at: null,
      all_day: true,
      status: 'scheduled',
      priority: 'high',
      location: '',
      represented: doc.player_id ? [{ type: 'player', id: doc.player_id, ...playersById[doc.player_id] }] : [],
      responsible: null,
    });
  }

  // 4. Contract expiries (Player.contract_end)
  for (const p of players) {
    if (!p.contract_end) continue;
    items.push({
      id: `contract-${p.id}`,
      source_type: 'contract',
      source_id: p.id,
      _raw: p,
      title: `Vence contrato: ${p.first_name} ${p.last_name}`,
      subtitle: '',
      event_type: 'contract_expiry',
      starts_at: new Date(p.contract_end + 'T23:59:59').toISOString(),
      ends_at: null,
      all_day: true,
      status: 'scheduled',
      priority: 'high',
      location: '',
      represented: [{ type: 'player', id: p.id, first_name: p.first_name, last_name: p.last_name, photo_url: p.photo_url, club_id: p.current_club_id }],
      responsible: null,
    });
  }

  // 5. Birthdays
  const today = new Date();
  for (const p of players) {
    if (!p.birth_date) continue;
    const b = new Date(p.birth_date);
    const birthdayThisYear = new Date(today.getFullYear(), b.getMonth(), b.getDate(), 9, 0);
    items.push({
      id: `birthday-p-${p.id}-${today.getFullYear()}`,
      source_type: 'birthday',
      source_id: p.id,
      _raw: p,
      title: `Cumpleaños de ${p.first_name} ${p.last_name}`,
      subtitle: '',
      event_type: 'birthday',
      starts_at: birthdayThisYear.toISOString(),
      ends_at: null,
      all_day: true,
      status: 'confirmed',
      priority: 'low',
      location: '',
      represented: [{ type: 'player', id: p.id, first_name: p.first_name, last_name: p.last_name, photo_url: p.photo_url, club_id: p.current_club_id }],
      responsible: null,
    });
  }
  for (const d of directors) {
    if (!d.birth_date) continue;
    const b = new Date(d.birth_date);
    const birthdayThisYear = new Date(today.getFullYear(), b.getMonth(), b.getDate(), 9, 0);
    items.push({
      id: `birthday-d-${d.id}-${today.getFullYear()}`,
      source_type: 'birthday',
      source_id: d.id,
      _raw: d,
      title: `Cumpleaños de ${d.first_name} ${d.last_name}`,
      subtitle: '',
      event_type: 'birthday',
      starts_at: birthdayThisYear.toISOString(),
      ends_at: null,
      all_day: true,
      status: 'confirmed',
      priority: 'low',
      location: '',
      represented: [{ type: 'director', id: d.id, first_name: d.first_name, last_name: d.last_name, photo_url: d.photo_url, club_id: d.current_club_id }],
      responsible: null,
    });
  }

  // 6. Follow-ups (pending PlayerMatchStats)
  for (const s of matchStats) {
    if (s.follow_up_status !== 'pending') continue;
    const player = playersById[s.player_id];
    if (!player) continue;
    const fixture = fixtures.find(f => f.id === s.club_fixture_id);
    items.push({
      id: `followup-${s.id}`,
      source_type: 'follow_up',
      source_id: s.id,
      _raw: s,
      title: `Seguimiento: ${player.first_name} ${player.last_name}`,
      subtitle: fixture ? `${fixture.home_team_name} vs. ${fixture.away_team_name}` : '',
      event_type: 'follow_up',
      starts_at: s.match_date ? new Date(s.match_date + 'T10:00').toISOString() : new Date().toISOString(),
      ends_at: null,
      all_day: false,
      status: 'scheduled',
      priority: 'medium',
      location: '',
      represented: [{ type: 'player', id: player.id, first_name: player.first_name, last_name: player.last_name, photo_url: player.photo_url, club_id: player.current_club_id }],
      responsible: s.responsible_agent || null,
    });
  }

  return items;
};

// ─── Mi agenda filter ───
export const filterMyAgenda = (items, userId, memberRecord) => {
  const myMemberId = memberRecord?.id;
  const myUserId = userId;
  return items.filter(item => {
    // Events where I'm responsible
    if (item.responsible_member_id && item.responsible_member_id === myMemberId) return true;
    // Events I created
    if (item._raw?.created_by_user_id === myUserId) return true;
    // Manual events assigned to me via player_id/director_id (legacy)
    if (item.source_type === 'manual' && item._raw?.responsible_member_id === myMemberId) return true;
    // Matches: filter by represented assigned to me
    if (item.source_type === 'fixture' && item.represented?.length > 0) return true; // will further filter by representative_id below
    // Follow-ups where I'm responsible
    if (item.source_type === 'follow_up' && item._raw?.responsible_agent) return true;
    // Default: include if no responsible set (unassigned)
    if (item.source_type === 'manual' && !item.responsible_member_id) return true;
    return false;
  });
};

// Filter matches by representative assignment
export const filterMatchesByRepresentative = (items, players, directors, representativeId) => {
  if (!representativeId) return items;
  const myPlayerIds = players.filter(p => p.representative_id === representativeId).map(p => p.id);
  const myDirectorIds = directors.filter(d => d.representative_id === representativeId).map(d => d.id);
  return items.map(item => {
    if (item.source_type !== 'fixture') return item;
    const myReps = item.represented.filter(r =>
      (r.type === 'player' && myPlayerIds.includes(r.id)) ||
      (r.type === 'director' && myDirectorIds.includes(r.id))
    );
    return { ...item, represented: myReps };
  }).filter(item => {
    if (item.source_type !== 'fixture') return true;
    return item.represented.length > 0;
  });
};