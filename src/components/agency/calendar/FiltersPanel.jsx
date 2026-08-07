import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { EVENT_TYPE_LABELS } from './calendarUtils';
import { useIsMobile } from '@/hooks/use-mobile';

const FILTERABLE_TYPES = ['match', 'meeting', 'travel', 'medical', 'training', 'follow_up', 'signing', 'presentation', 'press', 'internal_task', 'other', 'document_expiry', 'contract_expiry', 'birthday'];

export default function FiltersPanel({ open, onClose, filters, setFilters, players, directors, clubs, members }) {
  const isMobile = useIsMobile();
  const update = (key, value) => setFilters({ ...filters, [key]: value });

  const allPeople = [
    ...players.map(p => ({ key: `player-${p.id}`, label: `${p.first_name} ${p.last_name}`, type: 'player' })),
    ...directors.map(d => ({ key: `director-${d.id}`, label: `${d.first_name} ${d.last_name}`, type: 'director' })),
  ];

  const clearAll = () => setFilters({ types: [], person: '', responsible: '', club: '', competition: '', status: '', priority: '', onlyPending: false });

  const toggleType = (type) => {
    const current = filters.types || [];
    update('types', current.includes(type) ? current.filter(t => t !== type) : [...current, type]);
  };

  const content = (
    <div className="space-y-5">
      {/* Event types */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Tipo de evento</p>
        <div className="flex flex-wrap gap-1.5">
          {FILTERABLE_TYPES.map(type => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${(filters.types || []).includes(type) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
            >
              {EVENT_TYPE_LABELS[type] || type}
            </button>
          ))}
        </div>
      </div>

      {/* Person */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">Representado</p>
        <select value={filters.person || ''} onChange={e => update('person', e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">Todos</option>
          {allPeople.map(p => <option key={p.key} value={p.key}>{p.label} ({p.type === 'player' ? 'Jugador' : 'DT'})</option>)}
        </select>
      </div>

      {/* Responsible */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">Agente responsable</p>
        <select value={filters.responsible || ''} onChange={e => update('responsible', e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">Todos</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.user_email}</option>)}
        </select>
      </div>

      {/* Club */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">Club</p>
        <select value={filters.club || ''} onChange={e => update('club', e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">Todos</option>
          {clubs.map(c => <option key={c.id} value={c.id}>{c.club_name}</option>)}
        </select>
      </div>

      {/* Status */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">Estado</p>
        <select value={filters.status || ''} onChange={e => update('status', e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">Todos</option>
          <option value="scheduled">Programado</option>
          <option value="confirmed">Confirmado</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      {/* Priority */}
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">Prioridad</p>
        <select value={filters.priority || ''} onChange={e => update('priority', e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="">Todas</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
      </div>

      {/* Only pending */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={filters.onlyPending || false} onChange={e => update('onlyPending', e.target.checked)} className="rounded" />
        <span className="text-sm text-slate-600">Solo eventos con pendientes</span>
      </label>

      {/* Clear */}
      <Button variant="outline" size="sm" onClick={clearAll} className="w-full">Limpiar filtros</Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[380px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}