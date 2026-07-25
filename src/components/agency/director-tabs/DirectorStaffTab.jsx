import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { STAFF_ROLE_LABELS } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';

export default function DirectorStaffTab({ director, canManage }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, [director.id]);

  const load = async () => {
    try {
      const data = await base44.entities.TechnicalStaffMember.filter({ organization_id: director.organization_id, director_id: director.id }, '-created_date', 100);
      setMembers(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este miembro del cuerpo técnico?')) return;
    try { await base44.entities.TechnicalStaffMember.delete(id); await load(); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando cuerpo técnico...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{members.length} colaboradores</p>
        {canManage && <Button size="sm" onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800"><Plus className="w-3.5 h-3.5 mr-1" /> Agregar</Button>}
      </div>

      {members.length === 0 ? (
        <EmptyState icon={Users} title="Sin cuerpo técnico registrado" description="Agrega los colaboradores habituales del director." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {members.map(m => (
            <div key={m.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{m.full_name}</p>
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200 mt-1">{STAFF_ROLE_LABELS[m.role] || m.role}</Badge>
                  <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                    {m.nationality && <p>{m.nationality}</p>}
                    {m.email && <p>{m.email}</p>}
                    {m.phone && <p>{m.phone}</p>}
                    {m.notes && <p className="italic text-slate-400 mt-1">{m.notes}</p>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditing(m)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <StaffDialog director={director} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
      {editing && <StaffDialog director={director} record={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function StaffDialog({ director, record, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: record?.full_name || '', role: record?.role || 'ayudante_campo',
    nationality: record?.nationality || '', email: record?.email || '',
    phone: record?.phone || '', notes: record?.notes || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, organization_id: director.organization_id, director_id: director.id };
      if (record) { await base44.entities.TechnicalStaffMember.update(record.id, payload); }
      else { await base44.entities.TechnicalStaffMember.create(payload); }
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{record ? 'Editar colaborador' : 'Agregar colaborador'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Nombre completo *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
          <div className="space-y-1.5">
            <Label>Rol *</Label>
            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(STAFF_ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Nacionalidad</Label><Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}