import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar, Plus } from 'lucide-react';

const EVENT_TYPES = {
  match: 'Partido', training: 'Entrenamiento', medical: 'Médico',
  travel: 'Viaje', media: 'Media', meeting: 'Reunión', other: 'Otro'
};

export default function DirectorCalendarTab({ director, canManage }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, [director.id]);

  const load = async () => {
    try {
      const data = await base44.entities.CalendarEvent.filter({ organization_id: director.organization_id, director_id: director.id }, 'start_date', 50);
      setEvents(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando calendario...</div>;

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.start_date) >= now);
  const past = events.filter(e => new Date(e.start_date) < now).reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{upcoming.length} próximos eventos</p>
        {canManage && <Button size="sm" onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800"><Plus className="w-3.5 h-3.5 mr-1" /> Agregar</Button>}
      </div>

      {events.length === 0 ? (
        <EmptyState icon={Calendar} title="Sin eventos" description="Agrega eventos al calendario del director." />
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Próximos</h3>
              <div className="space-y-2">
                {upcoming.map(e => <EventRow key={e.id} event={e} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Pasados</h3>
              <div className="space-y-2">
                {past.map(e => <EventRow key={e.id} event={e} past />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showNew && <EventDialog director={director} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function EventRow({ event, past }) {
  return (
    <div className={`border border-slate-200 rounded-lg p-3 flex items-start gap-3 ${past ? 'opacity-60' : ''}`}>
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-slate-700">{new Date(event.start_date).getDate()}</span>
        <span className="text-[9px] text-slate-400 uppercase">{new Date(event.start_date).toLocaleString('es', { month: 'short' })}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 text-sm">{event.title}</p>
        <p className="text-xs text-slate-400">{formatDateTime(event.start_date)} {event.location ? `· ${event.location}` : ''}</p>
        <Badge className="bg-slate-100 text-slate-600 border-slate-200 mt-1">{EVENT_TYPES[event.event_type] || event.event_type}</Badge>
      </div>
    </div>
  );
}

function EventDialog({ director, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', event_type: 'meeting', start_date: '', end_date: '', location: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.CalendarEvent.create({
        ...form, organization_id: director.organization_id, director_id: director.id, status: 'scheduled'
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Agregar evento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Título *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div className="space-y-1.5">
            <Label>Tipo de evento</Label>
            <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(EVENT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Inicio *</Label><Input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Fin</Label><Input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Ubicación</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Descripción</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}