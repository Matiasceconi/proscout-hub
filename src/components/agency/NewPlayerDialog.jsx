import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { POSITION_LABELS, PLAYER_CATEGORIES } from '@/lib/roleUtils';

export default function NewPlayerDialog({ open, onClose, orgId, onCreated }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', birth_date: '', nationality: '',
    position: 'CM', preferred_foot: 'right', club: '', competition: '',
    category: 'primera_division', linked_user_email: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const player = await base44.entities.Player.create({
        ...form,
        organization_id: orgId,
        status: 'active',
        availability_status: 'available',
        portal_status: form.linked_user_email ? 'pending' : 'not_invited',
        linked_user_email: form.linked_user_email || null
      });

      if (form.linked_user_email) {
        await base44.entities.PlayerUserLink.create({
          organization_id: orgId,
          player_id: player.id,
          user_email: form.linked_user_email,
          status: 'pending'
        });
      }

      onCreated(player.id);
    } catch (err) {
      setError(err.message || 'Error al crear el jugador');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear nuevo jugador</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Apellido *</Label>
              <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nacionalidad</Label>
              <Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="Ej. Argentina" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Posición *</Label>
              <Select value={form.position} onValueChange={v => setForm(f => ({ ...f, position: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(POSITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PLAYER_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Club actual</Label>
              <Input value={form.club} onChange={e => setForm(f => ({ ...f, club: e.target.value }))} placeholder="Ej. River Plate" />
            </div>
            <div className="space-y-1.5">
              <Label>Competencia</Label>
              <Input value={form.competition} onChange={e => setForm(f => ({ ...f, competition: e.target.value }))} placeholder="Ej. Liga Profesional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Pierna hábil</Label>
            <Select value={form.preferred_foot} onValueChange={v => setForm(f => ({ ...f, preferred_foot: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="right">Derecha</SelectItem>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="both">Ambidiestro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Email del jugador (para invitar al portal)</Label>
            <Input type="email" value={form.linked_user_email} onChange={e => setForm(f => ({ ...f, linked_user_email: e.target.value }))} placeholder="jugador@email.com" />
            <p className="text-xs text-slate-400">El jugador recibirá acceso a su portal privado tras registrarse con este email.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Creando...' : 'Crear jugador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}