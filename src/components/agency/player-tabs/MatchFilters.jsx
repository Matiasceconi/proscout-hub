import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

const HOME_AWAY_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'home', label: 'Local' },
  { value: 'away', label: 'Visitante' },
  { value: 'neutral', label: 'Neutral' }
];

const TIME_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'past', label: 'Finalizados' }
];

const ANALYSIS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'with', label: 'Con análisis' },
  { value: 'without', label: 'Sin análisis' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicado' }
];

export const DEFAULT_FILTERS = {
  competition: 'all',
  season: 'all',
  opponent: 'all',
  club: 'all',
  home_away: 'all',
  time: 'all',
  analysis: 'all',
  status: 'all',
  date_from: '',
  date_to: ''
};

export default function MatchFilters({ matches, filters, setFilters, showAnalysisFilter = false, showStatusFilter = false }) {
  const [expanded, setExpanded] = useState(false);

  const competitions = [...new Set(matches.map(m => m.competition).filter(Boolean))].sort();
  const seasons = [...new Set(matches.map(m => m.season).filter(Boolean))].sort().reverse();
  const opponents = [...new Set(matches.map(m => m.opponent).filter(Boolean))].sort();
  const clubs = [...new Set(matches.map(m => m.player_name).filter(Boolean))].sort();

  const activeCount = Object.entries(filters).filter(([k, v]) => v && v !== 'all' && v !== '').length;

  const reset = () => setFilters({ ...DEFAULT_FILTERS });

  const set = (key, value) => setFilters(f => ({ ...f, [key]: value }));

  const FilterContent = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <div>
        <Label className="text-xs">Campeonato</Label>
        <Select value={filters.competition} onValueChange={v => set('competition', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {competitions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Temporada</Label>
        <Select value={filters.season} onValueChange={v => set('season', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Rival</Label>
        <Select value={filters.opponent} onValueChange={v => set('opponent', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {opponents.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Local/Visitante</Label>
        <Select value={filters.home_away} onValueChange={v => set('home_away', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {HOME_AWAY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Fecha desde</Label>
        <Input type="date" value={filters.date_from} onChange={e => set('date_from', e.target.value)} className="h-8 text-xs" />
      </div>
      <div>
        <Label className="text-xs">Fecha hasta</Label>
        <Input type="date" value={filters.date_to} onChange={e => set('date_to', e.target.value)} className="h-8 text-xs" />
      </div>
      <div>
        <Label className="text-xs">Próximos/Finalizados</Label>
        <Select value={filters.time} onValueChange={v => set('time', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {showAnalysisFilter && (
        <div>
          <Label className="text-xs">Análisis</Label>
          <Select value={filters.analysis} onValueChange={v => set('analysis', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ANALYSIS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {showStatusFilter && (
        <div>
          <Label className="text-xs">Estado contenido</Label>
          <Select value={filters.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50/50">
      <div className="flex items-center justify-between p-3">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Filter className="w-4 h-4" />
          Filtros
          {activeCount > 0 && (
            <span className="bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded-full">{activeCount}</span>
          )}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
            <X className="w-3 h-3 mr-1" /> Limpiar
          </Button>
        )}
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-200 pt-3">
          <FilterContent />
        </div>
      )}
    </div>
  );
}

export function applyMatchFilters(matches, filters) {
  const now = new Date();
  return matches.filter(m => {
    if (filters.competition !== 'all' && m.competition !== filters.competition) return false;
    if (filters.season !== 'all' && m.season !== filters.season) return false;
    if (filters.opponent !== 'all' && m.opponent !== filters.opponent) return false;
    if (filters.home_away !== 'all' && m.home_away !== filters.home_away) return false;
    if (filters.date_from && new Date(m.match_date) < new Date(filters.date_from)) return false;
    if (filters.date_to && new Date(m.match_date) > new Date(filters.date_to + 'T23:59:59')) return false;
    if (filters.time === 'upcoming' && new Date(m.match_date) < now) return false;
    if (filters.time === 'past' && new Date(m.match_date) >= now) return false;
    return true;
  });
}