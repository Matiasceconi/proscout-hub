import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { STAFF_ROLE_LABELS, STAFF_STATUS_LABELS, STAFF_STATUS_COLORS, formatDate } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Plus, Pencil, Trash2, Link2, Search } from 'lucide-react';
import ProfileAvatar from '@/components/shared/ProfileAvatar';

export default function DirectorStaffTab({ director, canManage }) {
  const [members, setMembers] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, [director.id]);

  const load = async () => {
    try {
      const [m, d] = await Promise.all([
        base44.entities.TechnicalStaffMember.filter({ organization_id: director.organization_id, director_id: director.id }, '-created_date', 100),
        base44.entities.TechnicalDirector.filter({ organization_id: director.organization_id }, 'last_name', 100)
      ]);
      setMembers(m);
      setDirectors(d.filter(x => x.id !== director.id));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Desvincular este integrante del cuerpo técnico?')) return;
    try { await base44.entities.TechnicalStaffMember.delete(id); await load(); } catch (err) { console.error(err); }
  };

  const activeMembers = members.filter(m => m.status === 'active');
  const historicalMembers = members.filter(m => m.status !== 'active');

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando cuerpo técnico...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{activeMembers.length} activos · {historicalMembers.length} históricos</p>
        {canManage && <Button size="sm" onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800"><Plus className="w-3.5 h-3.5 mr-1" /> Agregar integrante</Button>}
      </div>

      {members.length === 0 ? (
        <EmptyState icon={Users} title="Sin cuerpo técnico registrado" description="Agrega los colaboradores del director: ayudantes, preparador físico, médico, etc." />
      ) : (
        <>
          {activeMembers.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeMembers.map(m => <StaffCard key={m.id} member={m} canManage={canManage} onEdit={() => setEditing(m)} onDelete={() => handleDelete(m.id)} />)}
            </div>
          )}
          {historicalMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2 mt-4">Integrantes históricos</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {historicalMembers.map(m => <StaffCard key={m.id} member={m} canManage={canManage} onEdit={() => setEditing(m)} onDelete={() => handleDelete(m.id)} />)}
              </div>
            </div>
          )}
        </>
      )}

      {showNew && <StaffDialog director={director} directors={directors} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
      {editing && <StaffDialog director={director} directors={directors} record={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function StaffCard({ member, canManage, onEdit, onDelete }) {
  const linkedDirector = member.linked_technical_director_id;
  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <ProfileAvatar
          photoUrl={member.photo_url}
          firstName={member.full_name?.split(' ')[0] || ''}
          lastName={member.full_name?.split(' ').slice(1).join(' ') || ''}
          size="md"
          shape="rounded-xl"
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{member.full_name}</p>
              <Badge className="bg-slate-100 text-slate-600 border-slate-200 mt-1 text-xs">{STAFF_ROLE_LABELS[member.role] || member.role}</Badge>
            </div>
            {canManage && (
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={onEdit} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-slate-500">
            {member.club && <p>{member.club}</p>}
            {linkedDirector && <p className="flex items-center gap-1 text-blue-600"><Link2 className="w-3 h-3" /> Vinculado como DT</p>}
            {member.start_date && <p>{formatDate(member.start_date)} {member.end_date ? `— ${formatDate(member.end_date)}` : '— Actual'}</p>}
            {member.nationality && <p>{member.nationality}</p>}
            {member.notes && <p className="italic text-slate-400 mt-1">{member.notes}</p>}
          </div>
          {member.status !== 'active' && <Badge className={`${STAFF_STATUS_COLORS[member.status] || ''} mt-2 text-xs`}>{STAFF_STATUS_LABELS[member.status] || member.status}</Badge>}
        </div>
      </div>
    </div>
  );
}

function StaffDialog({ director, directors, record, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: record?.full_name || '',
    linked_technical_director_id: record?.linked_technical_director_id || '',
    photo_url: record?.photo_url || '',
    role: record?.role || 'ayudante_campo',
    club: record?.club || '',
    start_date: record?.start_date || '',
    end_date: record?.end_date || '',
    status: record?.status || 'active',
    nationality: record?.nationality || '',
    email: record?.email || '',
    phone: record?.phone || '',
    notes: record?.notes || ''
  });
  const [saving, setSaving] = useState(false);
  const [linkMode, setLinkMode] = useState(!!record?.linked_technical_director_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        linked_technical_director_id: linkMode ? form.linked_technical_director_id : '',
        organization_id: director.organization_id,
        director_id: director.id
      };
      if (record) { await base44.entities.TechnicalStaffMember.update(record.id, payload); }
      else { await base44.entities.TechnicalStaffMember.create(payload); }
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{record ? 'Editar integrante' : 'Agregar integrante'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link mode toggle */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button type="button" onClick={() => setLinkMode(false)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium ${!linkMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              <Users className="w-4 h-4" /> Crear nuevo
            </button>
            <button type="button" onClick={() => setLinkMode(true)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium ${linkMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              <Link2 className="w-4 h-4" /> Vincular DT existente
            </button>
          </div>

          {linkMode ? (
            <div className="space-y-1.5">
              <Label>Director técnico existente *</Label>
              <Select value={form.linked_technical_director_id} onValueChange={v => {
                const d = directors.find(x => x.id === v);
                setForm(f => ({ ...f, linked_technical_director_id: v, full_name: d ? `${d.first_name} ${d.last_name}` : f.full_name, photo_url: d?.photo_url || f.photo_url }));
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar DT..." /></SelectTrigger>
                <SelectContent>
                  {directors.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">El DT se agregará como integrante sin convertirlo en representado.</p>
            </div>
          ) : (
            <div className="space-y-1.5"><Label>Nombre completo *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rol *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STAFF_ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STAFF_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Club</Label><Input value={form.club} onChange={e => setForm(f => ({ ...f, club: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Nacionalidad</Label><Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha de inicio</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Fecha de fin</Label><Input type="date" value={form.end_date} disabled={form.status === 'active'} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>URL de foto</Label><Input value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="https://..." /></div>
          <div className="space-y-1.5"><Label>Notas internas</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}