import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const selectClass = "mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

const EVENT_TYPES = [
  { value: 'meeting', label: 'Reunión' },
  { value: 'travel', label: 'Viaje' },
  { value: 'medical', label: 'Control médico' },
  { value: 'signing', label: 'Firma' },
  { value: 'presentation', label: 'Presentación' },
  { value: 'press', label: 'Prensa' },
  { value: 'follow_up', label: 'Seguimiento' },
  { value: 'training', label: 'Entrenamiento' },
  { value: 'internal_task', label: 'Tarea interna' },
  { value: 'other', label: 'Otro' },
];

export default function NewEventDialog({ open, onClose, orgId, players, directors, members, userId, onSave }) {
  const [form, setForm] = useState({});
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        title: '', description: '', event_type: 'meeting',
        start_date: '', end_date: '', all_day: false,
        location: '', status: 'scheduled', priority: 'medium',
        responsible_member_id: '',
      });
      setSelectedPeople([]);
    }
  }, [open]);

  const update = (key, value) => setForm({ ...form, [key]: value });

  const togglePerson = (type, id) => {
    const key = `${type}-${id}`;
    setSelectedPeople(prev =>
      prev.some(p => p.key === key)
        ? prev.filter(p => p.key !== key)
        : [...prev, { key, type, id }]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const startDate = form.all_day
        ? new Date(form.start_date + 'T09:00').toISOString()
        : new Date(form.start_date).toISOString();
      const endDate = form.end_date
        ? (form.all_day ? new Date(form.end_date + 'T18:00').toISOString() : new Date(form.end_date).toISOString())
        : null;

      const eventData = {
        organization_id: orgId,
        title: form.title,
        description: form.description || null,
        event_type: form.event_type,
        start_date: startDate,
        end_date: endDate,
        all_day: form.all_day,
        location: form.location || null,
        status: form.status,
        priority: form.priority,
        responsible_member_id: form.responsible_member_id || null,
        source_type: 'manual',
        created_by_user_id: userId,
        // Legacy fields for first person
        player_id: selectedPeople.find(p => p.type === 'player')?.id || null,
        director_id: selectedPeople.find(p => p.type === 'technical_director')?.id || null,
        player_name: selectedPeople.find(p => p.type === 'player')
          ? (() => { const pl = players.find(pp => pp.id === selectedPeople.find(p => p.type === 'player').id); return pl ? `${pl.first_name} ${pl.last_name}` : null; })()
          : null,
      };

      const created = await base44.entities.CalendarEvent.create(eventData);

      // Create participants
      if (selectedPeople.length > 0) {
        await base44.entities.CalendarEventParticipant.bulkCreate(
          selectedPeople.map(p => ({
            organization_id: orgId,
            calendar_event_id: created.id,
            person_type: p.type,
            person_id: p.id,
          }))
        );
      }

      onSave?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const allPeople = [
    ...players.map(p => ({ key: `player-${p.id}`, type: 'player', id: p.id, label: `${p.first_name} ${p.last_name}`, sub: 'Jugador' })),
    ...directors.map(d => ({ key: `technical_director-${d.id}`, type: 'technical_director', id: d.id, label: `${d.first_name} ${d.last_name}`, sub: 'DT' })),
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo evento</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="col-span-full">
            <Label className="text-xs">Título *</Label>
            <Input value={form.title} onChange={e => update('title', e.target.value)} className="mt-1" placeholder="Ej: Reunión con cuerpo técnico" />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <select value={form.event_type} onChange={e => update('event_type', e.target.value)} className={selectClass}>
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Estado</Label>
            <select value={form.status} onChange={e => update('status', e.target.value)} className={selectClass}>
              <option value="scheduled">Programado</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Prioridad</Label>
            <select value={form.priority} onChange={e => update('priority', e.target.value)} className={selectClass}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Agente responsable</Label>
            <select value={form.responsible_member_id} onChange={e => update('responsible_member_id', e.target.value)} className={selectClass}>
              <option value="">Sin responsable</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.user_email}</option>)}
            </select>
          </div>
          <div className="col-span-full flex items-center gap-2">
            <input type="checkbox" id="all_day" checked={form.all_day} onChange={e => update('all_day', e.target.checked)} className="rounded" />
            <Label htmlFor="all_day" className="text-xs cursor-pointer">Todo el día</Label>
          </div>
          <div>
            <Label className="text-xs">{form.all_day ? 'Fecha' : 'Inicio *'}</Label>
            <Input
              type={form.all_day ? 'date' : 'datetime-local'}
              value={form.start_date}
              onChange={e => update('start_date', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">{form.all_day ? 'Fin (opcional)' : 'Fin (opcional)'}</Label>
            <Input
              type={form.all_day ? 'date' : 'datetime-local'}
              value={form.end_date}
              onChange={e => update('end_date', e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="col-span-full">
            <Label className="text-xs">Ubicación o enlace virtual</Label>
            <Input value={form.location} onChange={e => update('location', e.target.value)} className="mt-1" placeholder="Ej: Oficina, Zoom, Estadio..." />
          </div>
          <div className="col-span-full">
            <Label className="text-xs">Descripción / Notas</Label>
            <Textarea value={form.description} onChange={e => update('description', e.target.value)} className="mt-1" rows={2} />
          </div>
          <div className="col-span-full">
            <Label className="text-xs">Representados (jugadores y DT)</Label>
            <div className="mt-1 max-h-40 overflow-y-auto border border-input rounded-md p-2 space-y-0.5">
              {allPeople.map(person => (
                <label key={person.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedPeople.some(p => p.key === person.key)}
                    onChange={() => togglePerson(person.type, person.id)}
                    className="rounded"
                  />
                  <span>{person.label}</span>
                  <span className="text-xs text-slate-400">· {person.sub}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.title || !form.start_date} className="bg-green-600 hover:bg-green-700">
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Crear evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}