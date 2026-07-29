import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ClipboardList, Plus, Pencil, Trash2, Calendar, MapPin, Trophy } from 'lucide-react';

export default function DirectorCareerTab({ director, canManage }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, [director.id]);

  const load = async () => {
    try {
      const data = await base44.entities.DirectorCareer.filter({ organization_id: director.organization_id, director_id: director.id }, '-start_date', 100);
      setRecords(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro de trayectoria?')) return;
    try { await base44.entities.DirectorCareer.delete(id); await load(); } catch (err) { console.error(err); }
  };

  const sorted = [...records].sort((a, b) => {
    if (a.is_current && !b.is_current) return -1;
    if (!a.is_current && b.is_current) return 1;
    return new Date(b.start_date || 0) - new Date(a.start_date || 0);
  });

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando trayectoria...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{records.length} registros de trayectoria</p>
        {canManage && <Button size="sm" onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800"><Plus className="w-3.5 h-3.5 mr-1" /> Agregar</Button>}
      </div>

      {records.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Sin registros de trayectoria" description="Agrega los clubes donde el director ha trabajado." />
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
          <div className="space-y-4">
            {sorted.map(r => (
              <div key={r.id} className="relative pl-12">
                <div className={`absolute left-2 top-3 w-5 h-5 rounded-full border-2 border-white ${r.is_current ? 'bg-emerald-500' : 'bg-slate-300'} flex items-center justify-center`}>
                  {r.is_current && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.club_logo_url && <img src={r.club_logo_url} alt="" className="w-6 h-6 object-contain rounded" />}
                        <p className="font-semibold text-slate-800">{r.club}</p>
                        {r.is_current && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Actual</Badge>}
                        {r.role && <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">{r.role}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                        {r.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(r.start_date)} {r.end_date ? `— ${formatDate(r.end_date)}` : '— Actual'}</span>}
                        {r.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.country}</span>}
                        {r.competition && <span>{r.competition}</span>}
                        {r.category && <span>{r.category}</span>}
                        {r.season && <span>Temp: {r.season}</span>}
                      </div>
                      {(r.matches_managed || r.wins || r.draws || r.losses) && (
                        <div className="flex gap-4 mt-3 text-xs">
                          {r.matches_managed != null && <span><span className="font-semibold text-slate-700">{r.matches_managed}</span> <span className="text-slate-400">partidos</span></span>}
                          <span className="text-green-600"><span className="font-semibold">{r.wins || 0}</span> <span className="text-slate-400">G</span></span>
                          <span className="text-slate-500"><span className="font-semibold">{r.draws || 0}</span> <span className="text-slate-400">E</span></span>
                          <span className="text-red-600"><span className="font-semibold">{r.losses || 0}</span> <span className="text-slate-400">P</span></span>
                          {r.points_per_match != null && <span><span className="font-semibold text-slate-700">{r.points_per_match}</span> <span className="text-slate-400">pts/partido</span></span>}
                        </div>
                      )}
                      {r.tactical_system && <p className="text-xs text-slate-500 mt-2">Sistema: {r.tactical_system}</p>}
                      {r.achievements && <div className="flex items-start gap-1 mt-2 text-xs text-amber-700"><Trophy className="w-3 h-3 mt-0.5 flex-shrink-0" /><span>{r.achievements}</span></div>}
                    </div>
                    {canManage && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setEditing(r)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && <CareerDialog director={director} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
      {editing && <CareerDialog director={director} record={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function CareerDialog({ director, record, onClose, onSaved }) {
  const [form, setForm] = useState({
    club: record?.club || '', role: record?.role || '', country: record?.country || '',
    competition: record?.competition || '', start_date: record?.start_date || '',
    end_date: record?.end_date || '', matches_managed: record?.matches_managed || 0,
    wins: record?.wins || 0, draws: record?.draws || 0, losses: record?.losses || 0,
    achievements: record?.achievements || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, organization_id: director.organization_id, director_id: director.id };
      if (record) {
        await base44.entities.DirectorCareer.update(record.id, payload);
      } else {
        await base44.entities.DirectorCareer.create(payload);
      }
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{record ? 'Editar trayectoria' : 'Agregar trayectoria'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Club *</Label><Input value={form.club} onChange={e => setForm(f => ({ ...f, club: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Cargo</Label><Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Ej. Director Técnico" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>País</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Competencia</Label><Input value={form.competition} onChange={e => setForm(f => ({ ...f, competition: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha de inicio</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Fecha de fin</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5"><Label>Partidos</Label><Input type="number" value={form.matches_managed} onChange={e => setForm(f => ({ ...f, matches_managed: Number(e.target.value) || 0 }))} /></div>
            <div className="space-y-1.5"><Label>Victorias</Label><Input type="number" value={form.wins} onChange={e => setForm(f => ({ ...f, wins: Number(e.target.value) || 0 }))} /></div>
            <div className="space-y-1.5"><Label>Empates</Label><Input type="number" value={form.draws} onChange={e => setForm(f => ({ ...f, draws: Number(e.target.value) || 0 }))} /></div>
            <div className="space-y-1.5"><Label>Derrotas</Label><Input type="number" value={form.losses} onChange={e => setForm(f => ({ ...f, losses: Number(e.target.value) || 0 }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Logros</Label><Textarea value={form.achievements} onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}