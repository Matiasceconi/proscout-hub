import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, formatDateTime, daysUntil } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trophy, Activity, HeartPulse, Plane, Camera, Users, Calendar, ChevronLeft, ChevronRight, LayoutGrid, List, MapPin, Filter, X } from 'lucide-react';
import ApiFootballCalendarSection from '@/components/agency/shared/ApiFootballCalendarSection';

const EVENT_TYPES = {
  match: { label: 'Partido', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: Trophy },
  training: { label: 'Entrenamiento', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: Activity },
  medical: { label: 'Médico', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', icon: HeartPulse },
  travel: { label: 'Viaje', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500', icon: Plane },
  media: { label: 'Prensa', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Camera },
  meeting: { label: 'Reunión', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500', icon: Users },
  other: { label: 'Otro', color: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500', icon: Calendar },
  api_match: { label: 'Partido API', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', icon: Trophy }
};

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function PlayerCalendarTab({ player, permissions }) {
  const [matches, setMatches] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('agenda');
  const [showAdd, setShowAdd] = useState(false);
  const [apiCalendar, setApiCalendar] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState({ type: 'all', competition: 'all', season: 'all', date_from: '', date_to: '', time: 'all' });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => { loadData(); }, [player.id]);

  const loadData = async () => {
    try {
      const [m, e, apiRes] = await Promise.all([
        base44.entities.Match.filter({ organization_id: player.organization_id, player_id: player.id }, 'match_date', 100),
        base44.entities.CalendarEvent.filter({ organization_id: player.organization_id, player_id: player.id }, 'start_date', 100),
        base44.functions.invoke('getPersonCalendar', { person_type: 'player', person_id: player.id, organization_id: player.organization_id }).catch(() => null)
      ]);
      setMatches(m);
      setEvents(e);
      setApiCalendar(apiRes?.data || null);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const allItems = useMemo(() => {
    const matchItems = matches.map(m => ({ ...m, _type: 'match', _date: m.match_date, _title: `vs ${m.opponent}`, _etype: 'match', _comp: m.competition, _season: m.season }));
    const eventItems = events.map(e => ({ ...e, _type: 'event', _date: e.start_date, _title: e.title, _etype: e.event_type || 'other', _comp: '', _season: '' }));
    const apiItems = (apiCalendar?.all_fixtures || []).map(f => ({ ...f, id: f.id || `api-${f.provider_fixture_id}`, _type: 'api_fixture', _date: f.fixture_date, _title: `${f.home_team_name} vs ${f.away_team_name}`, _etype: 'api_match', _comp: f.competition_name, _season: f.season }));
    return [...matchItems, ...eventItems, ...apiItems];
  }, [matches, events, apiCalendar]);

  const competitions = [...new Set(matches.map(m => m.competition).filter(Boolean))].sort();
  const seasons = [...new Set(matches.map(m => m.season).filter(Boolean))].sort().reverse();

  const filtered = useMemo(() => {
    const now = new Date();
    return allItems.filter(item => {
      if (filters.type !== 'all' && item._etype !== filters.type) return false;
      if (filters.competition !== 'all' && item._comp !== filters.competition) return false;
      if (filters.season !== 'all' && item._season !== filters.season) return false;
      if (filters.date_from && new Date(item._date) < new Date(filters.date_from)) return false;
      if (filters.date_to && new Date(item._date) > new Date(filters.date_to + 'T23:59:59')) return false;
      if (filters.time === 'upcoming' && new Date(item._date) < now) return false;
      if (filters.time === 'past' && new Date(item._date) >= now) return false;
      return true;
    }).sort((a, b) => new Date(a._date) - new Date(b._date));
  }, [allItems, filters]);

  const now = new Date();
  const nextMatch = matches.filter(m => new Date(m.match_date) >= now).sort((a, b) => new Date(a.match_date) - new Date(b.match_date))[0];

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando calendario...</div>;

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && v !== 'all' && v !== '').length;
  const resetFilters = () => setFilters({ type: 'all', competition: 'all', season: 'all', date_from: '', date_to: '', time: 'all' });

  return (
    <div className="space-y-4">
      {apiCalendar && <ApiFootballCalendarSection calendarData={apiCalendar} canManage={permissions?.isOrgAdmin} />}
      {nextMatch && <NextMatchCard match={nextMatch} />}

      {/* Filters */}
      <div className="border border-slate-200 rounded-lg bg-slate-50/50">
        <div className="flex items-center justify-between p-3">
          <button onClick={() => setFiltersExpanded(!filtersExpanded)} className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Filter className="w-4 h-4" /> Filtros
            {activeFilterCount > 0 && <span className="bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs"><X className="w-3 h-3 mr-1" />Limpiar</Button>}
        </div>
        {filtersExpanded && (
          <div className="px-3 pb-3 border-t border-slate-200 pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={filters.type} onValueChange={v => setFilters(f => ({ ...f, type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(EVENT_TYPES).map(([k, t]) => <SelectItem key={k} value={k}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Campeonato</Label>
              <Select value={filters.competition} onValueChange={v => setFilters(f => ({ ...f, competition: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {competitions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Temporada</Label>
              <Select value={filters.season} onValueChange={v => setFilters(f => ({ ...f, season: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Próximos/Finalizados</Label>
              <Select value={filters.time} onValueChange={v => setFilters(f => ({ ...f, time: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="upcoming">Próximos</SelectItem>
                  <SelectItem value="past">Finalizados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Fecha desde</Label><Input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Fecha hasta</Label><Input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} className="h-8 text-xs" /></div>
          </div>
        )}
      </div>

      {/* View toggle + Add */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button onClick={() => setView('month')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium ${view === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><LayoutGrid className="w-3.5 h-3.5" /> Mes</button>
          <button onClick={() => setView('agenda')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium ${view === 'agenda' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><List className="w-3.5 h-3.5" /> Agenda</button>
        </div>
        {permissions.canEditStats && (
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-slate-900 hover:bg-slate-800"><Plus className="w-4 h-4 mr-1" /> Evento</Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Sin eventos para los filtros seleccionados</p>
      ) : view === 'month' ? (
        <MonthView items={filtered} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} onItemClick={setSelectedItem} />
      ) : (
        <AgendaView items={filtered} onItemClick={setSelectedItem} />
      )}

      {showAdd && <AddEventDialog player={player} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadData(); }} />}
      {selectedItem && <ItemDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
}

function NextMatchCard({ match }) {
  const days = daysUntil(match.match_date);
  const etype = EVENT_TYPES.match;
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 text-white">
      <div className="flex items-center gap-2 mb-3">
        <etype.icon className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">Próximo partido</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {match.opponent_logo_url ? (
            <img src={match.opponent_logo_url} alt="" className="w-14 h-14 object-contain" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center"><Trophy className="w-7 h-7 text-white/40" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold">vs {match.opponent}</p>
          <p className="text-sm text-slate-300">{match.competition || 'Sin competencia'}</p>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            {formatDateTime(match.match_date)}
            {match.home_away && <span>· {match.home_away === 'home' ? 'Local' : match.home_away === 'away' ? 'Visitante' : 'Neutral'}</span>}
            {match.venue && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{match.venue}</span>}
          </p>
        </div>
        <div className="text-center flex-shrink-0">
          <p className="text-2xl font-bold text-emerald-400">{days === 0 ? 'Hoy' : days}</p>
          <p className="text-xs text-slate-400">{days === 0 ? '' : 'días'}</p>
        </div>
      </div>
    </div>
  );
}

function MonthView({ items, currentMonth, setCurrentMonth, onItemClick }) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const itemsByDay = {};
  items.forEach(item => {
    const d = new Date(item._date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!itemsByDay[day]) itemsByDay[day] = [];
      itemsByDay[day].push(item);
    }
  });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-200">
        <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-semibold text-slate-700">{MONTH_NAMES[month]} {year}</h3>
        <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAY_NAMES.map(d => <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => (
          <div key={i} className={`min-h-[60px] sm:min-h-[80px] border-b border-r border-slate-100 p-1 ${day ? 'cursor-pointer hover:bg-slate-50' : ''}`} onClick={() => day && itemsByDay[day]?.[0] && onItemClick(itemsByDay[day][0])}>
            {day && (
              <>
                <p className="text-xs text-slate-400 mb-1">{day}</p>
                <div className="space-y-0.5">
                  {(itemsByDay[day] || []).slice(0, 3).map((item, j) => {
                    const etype = EVENT_TYPES[item._etype] || EVENT_TYPES.other;
                    return <div key={j} className={`text-[10px] px-1 py-0.5 rounded truncate ${etype.color} border`}>{etype.label}</div>;
                  })}
                  {(itemsByDay[day] || []).length > 3 && <p className="text-[10px] text-slate-400">+{itemsByDay[day].length - 3} más</p>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaView({ items, onItemClick }) {
  const now = new Date();
  const upcoming = items.filter(i => new Date(i._date) >= now);
  const past = items.filter(i => new Date(i._date) < now).reverse();

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Próximos</h3>
          <div className="space-y-2">{upcoming.map(item => <AgendaItem key={item.id || item._type + item._date} item={item} onClick={() => onItemClick(item)} />)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-2">Historial</h3>
          <div className="space-y-2">{past.map(item => <AgendaItem key={item.id || item._type + item._date} item={item} past onClick={() => onItemClick(item)} />)}</div>
        </div>
      )}
    </div>
  );
}

function AgendaItem({ item, past, onClick }) {
  const etype = EVENT_TYPES[item._etype] || EVENT_TYPES.other;
  const days = daysUntil(item._date);
  return (
    <div onClick={onClick} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${past ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200 bg-white'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${etype.color} border`}>
        <etype.icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 truncate">{item._title}</p>
        <p className="text-xs text-slate-400 truncate">
          {etype.label}
          {item._comp && ` · ${item._comp}`}
          {item.location && ` · ${item.location}`}
          {item.venue && ` · ${item.venue}`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-slate-500">{formatDate(item._date)}</p>
        {!past && days !== null && <Badge className="mt-1 bg-slate-100 text-slate-600 border-slate-200 text-xs">{days === 0 ? 'Hoy' : `${days}d`}</Badge>}
        {past && item._type === 'match' && item.status === 'finished' && <Badge className="mt-1 bg-slate-100 text-slate-600 border-slate-200 text-xs">{item.score || 'Final'}</Badge>}
      </div>
    </div>
  );
}

function ItemDetailDialog({ item, onClose }) {
  const isMatch = item._type === 'match';
  const isApiFixture = item._type === 'api_fixture';
  const etype = EVENT_TYPES[item._etype] || EVENT_TYPES.other;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <etype.icon className="w-5 h-5" /> {isMatch ? 'Detalle del partido' : 'Detalle del evento'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-800">{item._title}</p>
            <p className="text-xs text-slate-400">{formatDateTime(item._date)}</p>
          </div>
          {isMatch ? (
            <>
              {item.competition && <DetailRow label="Campeonato" value={item.competition} />}
              {item.season && <DetailRow label="Temporada" value={item.season} />}
              {item.home_away && <DetailRow label="Local/Visitante" value={item.home_away === 'home' ? 'Local' : item.home_away === 'away' ? 'Visitante' : 'Neutral'} />}
              {item.venue && <DetailRow label="Estadio" value={item.venue} />}
              {item.status === 'finished' && item.score && <DetailRow label="Resultado" value={item.score} />}
            </>
          ) : isApiFixture ? (
            <>
              {item.competition_name && <DetailRow label="Campeonato" value={item.competition_name} />}
              {item.season && <DetailRow label="Temporada" value={item.season} />}
              {item.role && <DetailRow label="Local/Visitante" value={item.role === 'local' ? 'Local' : 'Visitante'} />}
              {item.stadium && <DetailRow label="Estadio" value={item.stadium} />}
              {item.result && <DetailRow label="Resultado" value={item.result} />}
              {item.fixture_status && <DetailRow label="Estado" value={item.fixture_status} />}
            </>
          ) : (
            <>
              {item.location && <DetailRow label="Ubicación" value={item.location} />}
              {item.description && <div><p className="text-xs font-medium text-slate-400 mb-1">Descripción</p><p className="text-sm text-slate-600">{item.description}</p></div>}
            </>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }) {
  return <div className="flex justify-between text-sm"><span className="text-slate-400">{label}</span><span className="text-slate-700 font-medium">{value}</span></div>;
}

function AddEventDialog({ player, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.CalendarEvent.create({
        ...form,
        organization_id: player.organization_id,
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        status: 'scheduled'
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Crear evento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><Label>Título *</Label><Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div>
            <Label>Tipo de evento</Label>
            <Select value={form.event_type || 'other'} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPES).filter(([k]) => k !== 'match').map(([k, t]) => <SelectItem key={k} value={k}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Fecha y hora *</Label><Input type="datetime-local" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required /></div>
          <div><Label>Ubicación</Label><Input value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
          <div><Label>Descripción</Label><Input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}