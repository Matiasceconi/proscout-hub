import React, { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PLAYER_CATEGORIES } from '@/lib/roleUtils';

const MATCH_STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Próximo' },
  { value: 'live', label: 'En juego' },
  { value: 'finished', label: 'Finalizado' },
  { value: 'suspended', label: 'Suspendido' },
];

const FOLLOW_UP_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'completed', label: 'Completado' },
  { value: 'not_required', label: 'No requerido' },
];

const HOME_AWAY_OPTIONS = [
  { value: 'home', label: 'Local' },
  { value: 'away', label: 'Visitante' },
];

const selectClass = "h-8 text-sm w-full rounded-md border border-input bg-transparent px-2";

function FilterContent({ filters, setFilters, players, clubs, competitions, agents }) {
  const update = (key, value) => setFilters({ ...filters, [key]: value });
  const clearAll = () => setFilters({
    dateFrom: '', dateTo: '', playerId: '', clubId: '', category: '',
    competition: '', agent: '', matchStatus: '', followUpStatus: '', homeAway: ''
  });
  const activeCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Desde</label>
          <Input type="date" value={filters.dateFrom} onChange={e => update('dateFrom', e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
          <Input type="date" value={filters.dateTo} onChange={e => update('dateTo', e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Jugador</label>
          <select value={filters.playerId} onChange={e => update('playerId', e.target.value)} className={selectClass}>
            <option value="">Todos</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Club</label>
          <select value={filters.clubId} onChange={e => update('clubId', e.target.value)} className={selectClass}>
            <option value="">Todos</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.club_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
          <select value={filters.category} onChange={e => update('category', e.target.value)} className={selectClass}>
            <option value="">Todas</option>
            {Object.entries(PLAYER_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Competencia</label>
          <select value={filters.competition} onChange={e => update('competition', e.target.value)} className={selectClass}>
            <option value="">Todas</option>
            {competitions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Agente responsable</label>
          <select value={filters.agent} onChange={e => update('agent', e.target.value)} className={selectClass}>
            <option value="">Todos</option>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Estado del partido</label>
          <select value={filters.matchStatus} onChange={e => update('matchStatus', e.target.value)} className={selectClass}>
            <option value="">Todos</option>
            {MATCH_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Estado de seguimiento</label>
          <select value={filters.followUpStatus} onChange={e => update('followUpStatus', e.target.value)} className={selectClass}>
            <option value="">Todos</option>
            {FOLLOW_UP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Local/Visitante</label>
          <select value={filters.homeAway} onChange={e => update('homeAway', e.target.value)} className={selectClass}>
            <option value="">Ambos</option>
            {HOME_AWAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      {activeCount > 0 && (
        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
            <X className="w-3 h-3 mr-1" /> Limpiar filtros ({activeCount})
          </Button>
        </div>
      )}
    </>
  );
}

export default function DashboardFilters({ filters, setFilters, players, clubs, competitions, agents }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="hidden lg:block">
        <FilterContent filters={filters} setFilters={setFilters} players={players} clubs={clubs} competitions={competitions} agents={agents} />
      </div>
      <div className="lg:hidden">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter className="w-4 h-4" />
          Filtros
          {activeCount > 0 && <span className="bg-slate-800 text-white text-xs px-1.5 rounded-full">{activeCount}</span>}
          <ChevronDown className={`w-4 h-4 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>
        {mobileOpen && (
          <div className="mt-3">
            <FilterContent filters={filters} setFilters={setFilters} players={players} clubs={clubs} competitions={competitions} agents={agents} />
          </div>
        )}
      </div>
    </div>
  );
}