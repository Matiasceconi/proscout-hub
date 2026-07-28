import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, BarChart3, TrendingUp, Filter, X, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

export default function PlayerStatsTab({ player, permissions }) {
  const [matches, setMatches] = useState([]);
  const [matchStats, setMatchStats] = useState([]);
  const [seasonStats, setSeasonStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filters, setFilters] = useState({ competition: 'all', season: 'all', club: 'all', opponent: 'all', date_from: '', date_to: '', home_away: 'all' });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => { loadData(); }, [player.id]);

  const loadData = async () => {
    try {
      const [m, ms, ss] = await Promise.all([
        base44.entities.Match.filter({ organization_id: player.organization_id, player_id: player.id }, 'match_date', 100),
        base44.entities.PlayerMatchStats.filter({ organization_id: player.organization_id, player_id: player.id }, '-match_date', 100),
        base44.entities.PlayerSeasonStats.filter({ organization_id: player.organization_id, player_id: player.id }, '-season', 20)
      ]);
      setMatches(m);
      setMatchStats(ms);
      setSeasonStats(ss);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const competitions = [...new Set(matches.map(m => m.competition).filter(Boolean))].sort();
  const seasons = [...new Set(matches.map(m => m.season).filter(Boolean))].sort().reverse();
  const opponents = [...new Set(matches.map(m => m.opponent).filter(Boolean))].sort();
  const clubs = [...new Set(matches.map(m => player.club).filter(Boolean))].sort();

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (filters.competition !== 'all' && m.competition !== filters.competition) return false;
      if (filters.season !== 'all' && m.season !== filters.season) return false;
      if (filters.opponent !== 'all' && m.opponent !== filters.opponent) return false;
      if (filters.home_away !== 'all' && m.home_away !== filters.home_away) return false;
      if (filters.date_from && new Date(m.match_date) < new Date(filters.date_from)) return false;
      if (filters.date_to && new Date(m.match_date) > new Date(filters.date_to + 'T23:59:59')) return false;
      return true;
    });
  }, [matches, filters]);

  const filteredMatchIds = new Set(filteredMatches.map(m => m.id));
  const filteredMatchStats = matchStats.filter(ms => filteredMatchIds.has(ms.match_id));

  const totals = useMemo(() => {
    const ms = filteredMatchStats;
    return {
      matches: ms.length,
      starts: ms.filter(m => m.is_starter).length,
      minutes: ms.reduce((s, m) => s + (m.minutes_played || 0), 0),
      goals: ms.reduce((s, m) => s + (m.goals || 0), 0),
      assists: ms.reduce((s, m) => s + (m.assists || 0), 0),
      call_ups: ms.filter(m => m.called_up).length,
      yellow: ms.reduce((s, m) => s + (m.yellow_cards || 0), 0),
      red: ms.reduce((s, m) => s + (m.red_cards || 0), 0),
      avgRating: ms.length > 0 ? (ms.reduce((s, m) => s + (m.rating || 0), 0) / ms.length).toFixed(1) : 0
    };
  }, [filteredMatchStats]);

  const chartData = useMemo(() => {
    return [...filteredMatchStats].sort((a, b) => new Date(a.match_date) - new Date(b.match_date)).map(m => ({
      date: formatDate(m.match_date).slice(0, 6),
      goles: m.goals || 0,
      minutos: m.minutes_played || 0,
      valoracion: m.rating || 0
    }));
  }, [filteredMatchStats]);

  const filteredSeasonStats = seasonStats.filter(s => {
    if (filters.competition !== 'all' && s.competition !== filters.competition) return false;
    if (filters.season !== 'all' && s.season !== filters.season) return false;
    return true;
  });

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando estadísticas...</div>;

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && v !== 'all' && v !== '').length;
  const resetFilters = () => setFilters({ competition: 'all', season: 'all', club: 'all', opponent: 'all', date_from: '', date_to: '', home_away: 'all' });

  return (
    <div className="space-y-4">
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
              <Label className="text-xs">Campeonato</Label>
              <Select value={filters.competition} onValueChange={v => setFilters(f => ({ ...f, competition: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{competitions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Temporada</Label>
              <Select value={filters.season} onValueChange={v => setFilters(f => ({ ...f, season: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todas</SelectItem>{seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Rival</Label>
              <Select value={filters.opponent} onValueChange={v => setFilters(f => ({ ...f, opponent: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{opponents.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Local/Visitante</Label>
              <Select value={filters.home_away} onValueChange={v => setFilters(f => ({ ...f, home_away: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="home">Local</SelectItem>
                  <SelectItem value="away">Visitante</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Fecha desde</Label><Input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Fecha hasta</Label><Input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} className="h-8 text-xs" /></div>
          </div>
        )}
      </div>

      {permissions.canEditStats && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-slate-900"><Plus className="w-4 h-4 mr-1" /> Cargar estadísticas</Button>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p>Sin partidos cargados</p>
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Totales filtrados</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              <StatBox label="Partidos" value={totals.matches} />
              <StatBox label="Titular" value={totals.starts} />
              <StatBox label="Minutos" value={totals.minutes} />
              <StatBox label="Goles" value={totals.goals} />
              <StatBox label="Asist." value={totals.assists} />
              <StatBox label="Convoc." value={totals.call_ups} />
              <StatBox label="Amarillas" value={totals.yellow} />
              <StatBox label="Rojas" value={totals.red} />
              <StatBox label="Prom." value={totals.avgRating} />
            </div>
          </div>

          {/* Season totals */}
          {filteredSeasonStats.length > 0 && (
            <div className="space-y-3">
              {filteredSeasonStats.map(s => (
                <div key={s.id} className="border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">{s.season} · {s.competition || 'General'}</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    <StatBox label="Partidos" value={s.matches} />
                    <StatBox label="Titularidades" value={s.starts} />
                    <StatBox label="Minutos" value={s.minutes} />
                    <StatBox label="Goles" value={s.goals} />
                    <StatBox label="Asistencias" value={s.assists} />
                    <StatBox label="Convocatorias" value={s.call_ups} />
                    <StatBox label="Amarillas" value={s.yellow_cards} />
                    <StatBox label="Rojas" value={s.red_cards} />
                    <StatBox label="Min/Parto" value={s.minutes_per_match} />
                    <StatBox label="% Particip." value={`${s.participation_rate}%`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Evolution chart */}
          {chartData.length > 1 && (
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Evolución</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="minutos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Match-by-match table */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Partido por partido ({filteredMatches.length})</h3>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs">
                    <th className="text-left py-2 px-2">Fecha</th>
                    <th className="text-left py-2 px-2">Rival</th>
                    <th className="text-left py-2 px-2">Camp.</th>
                    <th className="text-center py-2 px-2">Tit.</th>
                    <th className="text-center py-2 px-2">Min.</th>
                    <th className="text-center py-2 px-2">G</th>
                    <th className="text-center py-2 px-2">A</th>
                    <th className="text-center py-2 px-2">TA</th>
                    <th className="text-center py-2 px-2">TR</th>
                    <th className="text-center py-2 px-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map(m => {
                    const stats = matchStats.find(ms => ms.match_id === m.id);
                    return (
                      <tr key={m.id} className="border-b border-slate-50">
                        <td className="py-2 px-2 text-slate-500 whitespace-nowrap">{formatDate(m.match_date)}</td>
                        <td className="py-2 px-2 text-slate-700">{m.opponent}</td>
                        <td className="py-2 px-2 text-slate-400 text-xs">{m.competition || '—'}</td>
                        {stats ? (
                          <>
                            <td className="py-2 px-2 text-center">{stats.is_starter ? '✓' : '—'}</td>
                            <td className="py-2 px-2 text-center text-slate-600">{stats.minutes_played}</td>
                            <td className="py-2 px-2 text-center font-medium text-slate-800">{stats.goals || 0}</td>
                            <td className="py-2 px-2 text-center font-medium text-slate-800">{stats.assists || 0}</td>
                            <td className="py-2 px-2 text-center">{stats.yellow_cards || 0}</td>
                            <td className="py-2 px-2 text-center">{stats.red_cards || 0}</td>
                            <td className="py-2 px-2 text-center"><span className="text-xs text-green-600">Cargado</span></td>
                          </>
                        ) : (
                          <>
                            <td colSpan={7} className="py-2 px-2 text-center"><span className="text-xs text-amber-500 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Estadísticas pendientes</span></td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showAdd && <AddStatsDialog player={player} matches={matches} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadData(); }} />}
    </div>
  );
}

function AddStatsDialog({ player, matches, onClose, onSaved }) {
  const [form, setForm] = useState({ match_id: '', is_starter: false, minutes_played: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, called_up: true });
  const [saving, setSaving] = useState(false);

  const selectedMatch = matches.find(m => m.id === form.match_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.PlayerMatchStats.create({
        ...form,
        organization_id: player.organization_id,
        player_id: player.id,
        match_date: selectedMatch?.match_date?.slice(0, 10) || null,
        season: selectedMatch?.season || '',
        competition: selectedMatch?.competition || '',
        opponent: selectedMatch?.opponent || ''
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cargar estadísticas de partido</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Partido *</Label>
            <Select value={form.match_id} onValueChange={v => setForm(f => ({ ...f, match_id: v }))} required>
              <SelectTrigger><SelectValue placeholder="Seleccionar partido" /></SelectTrigger>
              <SelectContent>
                {matches.map(m => <SelectItem key={m.id} value={m.id}>{formatDate(m.match_date)} vs {m.opponent}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Minutos</Label><Input type="number" value={form.minutes_played} onChange={e => setForm(f => ({ ...f, minutes_played: +e.target.value }))} /></div>
            <div><Label>Goles</Label><Input type="number" value={form.goals} onChange={e => setForm(f => ({ ...f, goals: +e.target.value }))} /></div>
            <div><Label>Asistencias</Label><Input type="number" value={form.assists} onChange={e => setForm(f => ({ ...f, assists: +e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amarillas</Label><Input type="number" value={form.yellow_cards} onChange={e => setForm(f => ({ ...f, yellow_cards: +e.target.value }))} /></div>
            <div><Label>Rojas</Label><Input type="number" value={form.red_cards} onChange={e => setForm(f => ({ ...f, red_cards: +e.target.value }))} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_starter} onChange={e => setForm(f => ({ ...f, is_starter: e.target.checked }))} /> Titular
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.match_id} className="bg-slate-900">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-lg">
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}