import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { POSITION_LABELS, PLAYER_CATEGORIES } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const SCOUTING_STATUS = {
  monitoring: 'Monitoreo',
  contacted: 'Contactado',
  interest: 'Con interés',
  negotiation: 'En negociación',
  signed: 'Firmado',
  rejected: 'Descartado',
  archived: 'Archivado'
};

const SOURCE_OPTIONS = {
  recommendation: 'Recomendación',
  tournament: 'Torneo / Partido',
  platform: 'Plataforma',
  agency_referral: 'Referencia de agencia',
  social_media: 'Redes sociales',
  direct_observation: 'Observación directa',
  other: 'Otro'
};

export default function NewScoutingTargetDialog({ open, onClose, onSaved, orgId, primaryColor, target }) {
  const isEdit = !!target;
  const [form, setForm] = useState({
    first_name: target?.first_name || '',
    last_name: target?.last_name || '',
    birth_date: target?.birth_date || '',
    nationality: target?.nationality || '',
    position: target?.position || 'CM',
    secondary_position: target?.secondary_position || '',
    preferred_foot: target?.preferred_foot || 'right',
    current_club: target?.current_club || '',
    competition: target?.competition || '',
    category: target?.category || 'primera_division',
    photo_url: target?.photo_url || '',
    scouting_status: target?.scouting_status || 'monitoring',
    priority: target?.priority || 'medium',
    source: target?.source || 'recommendation',
    scout_name: target?.scout_name || '',
    estimated_value: target?.estimated_value || '',
    contract_end: target?.contract_end || '',
    height: target?.height || '',
    weight: target?.weight || '',
    strengths: target?.strengths || '',
    weaknesses: target?.weaknesses || '',
    video_url: target?.video_url || '',
    next_action: target?.next_action || '',
    next_action_date: target?.next_action_date || '',
    notes: target?.notes || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, organization_id: orgId };
      // Limpiar campos vacíos numéricos
      if (payload.height === '') delete payload.height;
      if (payload.weight === '') delete payload.weight;
      if (payload.secondary_position === '') delete payload.secondary_position;

      if (isEdit) {
        await base44.entities.ScoutingTarget.update(target.id, payload);
      } else {
        await base44.entities.ScoutingTarget.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Error al guardar el objetivo de captación');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar objetivo de captación' : 'Nuevo objetivo de captación'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Nombre *</Label><Input value={form.first_name} onChange={e => set('first_name', e.target.value)} required /></div>
            <div className="space-y-1.5"><Label>Apellido *</Label><Input value={form.last_name} onChange={e => set('last_name', e.target.value)} required /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Fecha nacimiento</Label><Input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Nacionalidad</Label><Input value={form.nationality} onChange={e => set('nationality', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Pierna hábil</Label>
              <Select value={form.preferred_foot} onValueChange={v => set('preferred_foot', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Derecha</SelectItem>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="both">Ambidiestro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Posición *</Label>
              <Select value={form.position} onValueChange={v => set('position', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(POSITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Posición alternativa</Label>
              <Select value={form.secondary_position || 'none'} onValueChange={v => set('secondary_position', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Sin especificar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {Object.entries(POSITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Club actual</Label><Input value={form.current_club} onChange={e => set('current_club', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Competencia</Label><Input value={form.competition} onChange={e => set('competition', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Categoría</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PLAYER_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Altura (cm)</Label><Input type="number" value={form.height} onChange={e => set('height', e.target.value ? Number(e.target.value) : '')} /></div>
            <div className="space-y-1.5"><Label>Peso (kg)</Label><Input type="number" value={form.weight} onChange={e => set('weight', e.target.value ? Number(e.target.value) : '')} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Estado</Label>
              <Select value={form.scouting_status} onValueChange={v => set('scouting_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(SCOUTING_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Prioridad</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Origen</Label>
              <Select value={form.source} onValueChange={v => set('source', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(SOURCE_OPTIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Detectado por</Label><Input value={form.scout_name} onChange={e => set('scout_name', e.target.value)} placeholder="Quién recomendó al jugador" /></div>
            <div className="space-y-1.5"><Label>Valor estimado</Label><Input value={form.estimated_value} onChange={e => set('estimated_value', e.target.value)} placeholder="Ej: USD 500K" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Vencimiento contrato</Label><Input type="date" value={form.contract_end} onChange={e => set('contract_end', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Video / Highlights</Label><Input value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://..." /></div>
          </div>
          <div className="space-y-1.5"><Label>Fortalezas</Label><Input value={form.strengths} onChange={e => set('strengths', e.target.value)} placeholder="Atributos destacados del jugador" /></div>
          <div className="space-y-1.5"><Label>Aspectos a mejorar / Riesgos</Label><Input value={form.weaknesses} onChange={e => set('weaknesses', e.target.value)} placeholder="Puntos débiles o riesgos detectados" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Próxima acción</Label><Input value={form.next_action} onChange={e => set('next_action', e.target.value)} placeholder="Ej: Ver en vivo el sábado" /></div>
            <div className="space-y-1.5"><Label>Fecha próxima acción</Label><Input type="date" value={form.next_action_date} onChange={e => set('next_action_date', e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Notas</Label><Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observaciones generales" /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} style={{ backgroundColor: primaryColor }} className="hover:opacity-90">
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar a captación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}