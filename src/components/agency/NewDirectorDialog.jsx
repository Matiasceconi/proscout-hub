import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DIRECTOR_ROLE_LABELS, DIRECTOR_STATUS_LABELS } from '@/lib/roleUtils';

export default function NewDirectorDialog({ open, onClose, orgId, onCreated }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', birth_date: '', nationality: '',
    country_of_residence: '', email: '', phone: '', coaching_license: '',
    primary_role: 'director_tecnico', current_club: '', last_club: '',
    competition: '', professional_status: 'available', representative_name: '',
    joined_date: '', biography: '', game_model: '', preferred_tactical_system: '',
    languages: '', main_achievements: '', presentation_url: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const director = await base44.entities.TechnicalDirector.create({
        ...form,
        organization_id: orgId,
        portal_status: 'not_invited'
      });
      onCreated(director.id);
    } catch (err) { setError(err.message || 'Error al crear el director'); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Crear nuevo Director Técnico</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Nombre *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Apellido *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha de nacimiento</Label><Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Nacionalidad</Label><Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="Ej. Argentina" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>País de residencia</Label><Input value={form.country_of_residence} onChange={e => setForm(f => ({ ...f, country_of_residence: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Licencia de entrenador</Label><Input value={form.coaching_license} onChange={e => setForm(f => ({ ...f, coaching_license: e.target.value }))} placeholder="Ej. UEFA Pro" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rol principal *</Label>
              <Select value={form.primary_role} onValueChange={v => setForm(f => ({ ...f, primary_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(DIRECTOR_ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado profesional</Label>
              <Select value={form.professional_status} onValueChange={v => setForm(f => ({ ...f, professional_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(DIRECTOR_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Club actual</Label><Input value={form.current_club} onChange={e => setForm(f => ({ ...f, current_club: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Último club</Label><Input value={form.last_club} onChange={e => setForm(f => ({ ...f, last_club: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Competencia</Label><Input value={form.competition} onChange={e => setForm(f => ({ ...f, competition: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Fecha de incorporación</Label><Input type="date" value={form.joined_date} onChange={e => setForm(f => ({ ...f, joined_date: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Representante responsable</Label><Input value={form.representative_name} onChange={e => setForm(f => ({ ...f, representative_name: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Modelo de juego</Label><Textarea value={form.game_model} onChange={e => setForm(f => ({ ...f, game_model: e.target.value }))} rows={2} placeholder="Descripción del modelo de juego..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Sistema táctico preferido</Label><Input value={form.preferred_tactical_system} onChange={e => setForm(f => ({ ...f, preferred_tactical_system: e.target.value }))} placeholder="Ej. 4-3-3" /></div>
            <div className="space-y-1.5"><Label>Idiomas</Label><Input value={form.languages} onChange={e => setForm(f => ({ ...f, languages: e.target.value }))} placeholder="Ej. Español, Inglés" /></div>
          </div>
          <div className="space-y-1.5"><Label>Logros principales</Label><Textarea value={form.main_achievements} onChange={e => setForm(f => ({ ...f, main_achievements: e.target.value }))} rows={2} /></div>
          <div className="space-y-1.5"><Label>Biografía profesional</Label><Textarea value={form.biography} onChange={e => setForm(f => ({ ...f, biography: e.target.value }))} rows={3} /></div>
          <div className="space-y-1.5"><Label>Enlace a presentación / CV</Label><Input value={form.presentation_url} onChange={e => setForm(f => ({ ...f, presentation_url: e.target.value }))} placeholder="https://..." /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Creando...' : 'Crear director'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}