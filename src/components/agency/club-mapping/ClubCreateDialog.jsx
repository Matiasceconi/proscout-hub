import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

const TEAM_TYPES = { primera: 'Primera', reserva: 'Reserva', juvenil: 'Juvenil', femenino: 'Femenino', otro: 'Otro' };

export default function ClubCreateDialog({ initialName, onClose, onCreated }) {
  const [form, setForm] = useState({ club_name: initialName || '', short_name: '', country: '', city: '', team_type: 'primera', official_logo_url: '', official_site: '' });
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState(null);
  const [error, setError] = useState('');

  const checkDuplicates = async () => {
    const allClubs = await base44.entities.Club.list();
    const norm = form.club_name.toLowerCase().trim();
    return allClubs.filter(c => c.club_name?.toLowerCase().includes(norm) || norm.includes(c.club_name?.toLowerCase() || ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setDuplicates(null);
    try {
      const dups = await checkDuplicates();
      if (dups.length > 0) { setDuplicates(dups); setSaving(false); return; }
      await doCreate();
    } catch (err) { setError(err.message || 'Error'); setSaving(false); }
  };

  const doCreate = async () => {
    const club_key = `manual-${form.club_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)}-${Date.now().toString(36)}`;
    const club = await base44.entities.Club.create({ ...form, club_key, verification_status: 'pending' });
    onCreated(club);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Crear club</DialogTitle></DialogHeader>
        {duplicates ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-sm font-medium">Posibles duplicados encontrados:</p>
            </div>
            {duplicates.map(d => (
              <div key={d.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg">
                {d.internal_logo_url && <img src={d.internal_logo_url} alt="" className="w-8 h-8 object-contain" />}
                <div className="flex-1">
                  <p className="text-sm text-slate-700">{d.club_name}</p>
                  <p className="text-xs text-slate-400">{d.country || ''} {d.city ? `· ${d.city}` : ''}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onCreated(d)}>Usar este</Button>
              </div>
            ))}
            <Button size="sm" onClick={doCreate} className="w-full">Crear &ldquo;{form.club_name}&rdquo; de todos modos</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Nombre oficial *</Label><Input value={form.club_name} onChange={e => setForm(f => ({ ...f, club_name: e.target.value }))} required /></div>
            <div><Label>Nombre corto</Label><Input value={form.short_name} onChange={e => setForm(f => ({ ...f, short_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>País</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
              <div><Label>Ciudad</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Tipo de equipo</Label>
              <Select value={form.team_type} onValueChange={v => setForm(f => ({ ...f, team_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TEAM_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>URL del escudo</Label><Input value={form.official_logo_url} onChange={e => setForm(f => ({ ...f, official_logo_url: e.target.value }))} /></div>
            <div><Label>Sitio oficial</Label><Input value={form.official_site} onChange={e => setForm(f => ({ ...f, official_site: e.target.value }))} /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-slate-900">{saving ? 'Verificando...' : 'Crear club'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}