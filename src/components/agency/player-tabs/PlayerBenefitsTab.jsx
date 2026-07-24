import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, daysUntil } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Gift, Calendar } from 'lucide-react';

export default function PlayerBenefitsTab({ player, permissions }) {
  const [benefits, setBenefits] = useState([]);
  const [allBenefits, setAllBenefits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => { loadData(); }, [player.id]);

  const loadData = async () => {
    try {
      const [pb, ab] = await Promise.all([
        base44.entities.PlayerBenefit.filter({ organization_id: player.organization_id, player_id: player.id }, '-assigned_date', 50),
        base44.entities.Benefit.filter({ organization_id: player.organization_id, status: 'active' }, 'name', 100)
      ]);
      setBenefits(pb);
      setAllBenefits(ab);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando beneficios...</div>;

  return (
    <div className="space-y-4">
      {permissions.isOrgAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowAssign(true)} className="bg-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Asignar beneficio
          </Button>
        </div>
      )}

      {benefits.length === 0 ? (
        <EmptyState icon={Gift} title="Sin beneficios asignados" description="Este jugador no tiene beneficios asignados." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {benefits.map(b => {
            const days = b.expiry_date ? daysUntil(b.expiry_date) : null;
            return (
              <div key={b.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{b.benefit_name}</p>
                      <p className="text-xs text-slate-400">Asignado: {formatDate(b.assigned_date)}</p>
                    </div>
                  </div>
                  <Badge className={b.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                    {b.status === 'active' ? 'Activo' : b.status === 'expired' ? 'Vencido' : 'Revocado'}
                  </Badge>
                </div>
                {b.expiry_date && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                    <Calendar className="w-3 h-3" /> Vence: {formatDate(b.expiry_date)}
                    {days !== null && days <= 30 && days >= 0 && <span className="text-amber-600 ml-1">({days}d)</span>}
                  </p>
                )}
                {b.notes && <p className="text-xs text-slate-500 mt-1">{b.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {showAssign && <AssignBenefitDialog player={player} benefits={allBenefits} onClose={() => setShowAssign(false)} onSaved={() => { setShowAssign(false); loadData(); }} />}
    </div>
  );
}

function AssignBenefitDialog({ player, benefits, onClose, onSaved }) {
  const [form, setForm] = useState({ benefit_id: '', expiry_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const benefit = benefits.find(b => b.id === form.benefit_id);
      await base44.entities.PlayerBenefit.create({
        organization_id: player.organization_id,
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        benefit_id: form.benefit_id,
        benefit_name: benefit?.name || '',
        assigned_date: new Date().toISOString().slice(0, 10),
        expiry_date: form.expiry_date || null,
        status: 'active',
        notes: form.notes
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Asignar beneficio</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Beneficio *</Label>
            <Select value={form.benefit_id} onValueChange={v => setForm(f => ({ ...f, benefit_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {benefits.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Fecha de vencimiento</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
          <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900">{saving ? 'Asignando...' : 'Asignar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}