import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const OBSERVATION_TYPES = {
  live: 'En vivo',
  video: 'Video',
  data: 'Datos / estadísticas',
  background: 'Antecedentes / referencias',
  meeting: 'Reunión / entrevista'
};

const RECOMMENDATIONS = {
  strong_yes: 'Prioridad alta',
  yes: 'Recomendable',
  monitor: 'Seguir observando',
  no: 'No avanzar'
};

function RatingField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value ? String(value) : 'none'} onValueChange={v => onChange(v === 'none' ? '' : Number(v))}>
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sin valorar</SelectItem>
          {[1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n}/10</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function NewScoutingObservationDialog({ open, onClose, onSaved, target, orgId, user, primaryColor }) {
  const [form, setForm] = useState({
    observation_date: new Date().toISOString().slice(0, 10),
    observation_type: 'live',
    competition: target?.competition || '',
    opponent: '',
    minutes_observed: '',
    technical_rating: '',
    tactical_rating: '',
    physical_rating: '',
    mentality_rating: '',
    recommendation: 'monitor',
    confidence: 'medium',
    summary: '',
    strengths: '',
    risks: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        organization_id: orgId,
        scouting_target_id: target.id,
        target_name: `${target.first_name || ''} ${target.last_name || ''}`.trim(),
        created_by_user_id: user?.id || '',
        created_by_name: user?.full_name || user?.email || ''
      };
      for (const key of ['minutes_observed','technical_rating','tactical_rating','physical_rating','mentality_rating']) {
        if (payload[key] === '') delete payload[key];
      }
      await base44.entities.ScoutingObservation.create(payload);
      await base44.entities.ScoutingTarget.update(target.id, { last_observed_at: form.observation_date });
      onSaved();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la observación.');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && !saving && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva observación · {target.first_name} {target.last_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Fecha *</Label><Input type="date" required value={form.observation_date} onChange={e => set('observation_date', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Tipo *</Label><Select value={form.observation_type} onValueChange={v => set('observation_type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(OBSERVATION_TYPES).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Minutos observados</Label><Input type="number" min="0" max="180" value={form.minutes_observed} onChange={e => set('minutes_observed', e.target.value ? Number(e.target.value) : '')} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Competencia</Label><Input value={form.competition} onChange={e => set('competition', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Rival / contexto</Label><Input value={form.opponent} onChange={e => set('opponent', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl bg-slate-50 p-3">
            <RatingField label="Técnico" value={form.technical_rating} onChange={v => set('technical_rating', v)} />
            <RatingField label="Táctico" value={form.tactical_rating} onChange={v => set('tactical_rating', v)} />
            <RatingField label="Físico" value={form.physical_rating} onChange={v => set('physical_rating', v)} />
            <RatingField label="Mentalidad" value={form.mentality_rating} onChange={v => set('mentality_rating', v)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Recomendación *</Label><Select value={form.recommendation} onValueChange={v => set('recommendation', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(RECOMMENDATIONS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Confianza de la observación</Label><Select value={form.confidence} onValueChange={v => set('confidence', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-1.5"><Label>Resumen</Label><Textarea rows={3} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Lectura general de la observación..." /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fortalezas observadas</Label><Textarea rows={3} value={form.strengths} onChange={e => set('strengths', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Riesgos / dudas</Label><Textarea rows={3} value={form.risks} onChange={e => set('risks', e.target.value)} /></div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} style={{ backgroundColor: primaryColor }} className="hover:opacity-90">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar observación'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
