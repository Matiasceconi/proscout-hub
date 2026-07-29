import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, POSITION_LABELS, CAREER_OPERATION_LABELS, CAREER_OPERATION_COLORS } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, ClipboardList, Trophy, MapPin, Calendar } from 'lucide-react';

export default function PlayerCareerTab({ player, permissions }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const canManage = permissions?.isOrgAdmin;

  useEffect(() => { load(); }, [player.id]);

  const load = async () => {
    try {
      const data = await base44.entities.PlayerCareerEntry.filter(
        { organization_id: player.organization_id, player_id: player.id },
        '-start_date', 100
      );
      setEntries(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta etapa de la trayectoria?')) return;
    try { await base44.entities.PlayerCareerEntry.delete(id); await load(); } catch (err) { console.error(err); }
  };

  const sorted = [...entries].sort((a, b) => {
    if (a.is_current && !b.is_current) return -1;
    if (!a.is_current && b.is_current) return 1;
    return new Date(b.start_date || 0) - new Date(a.start_date || 0);
  });

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando trayectoria...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{entries.length} etapas registradas</p>
        {canManage && <Button size="sm" onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800"><Plus className="w-3.5 h-3.5 mr-1" /> Agregar etapa</Button>}
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Sin trayectoria registrada" description="Agrega las etapas profesionales del jugador en orden cronológico." />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
          <div className="space-y-4">
            {sorted.map((entry, idx) => (
              <div key={entry.id} className="relative pl-12">
                {/* Timeline dot */}
                <div className={`absolute left-2 top-3 w-5 h-5 rounded-full border-2 border-white ${entry.is_current ? 'bg-emerald-500' : 'bg-slate-300'} flex items-center justify-center`}>
                  {entry.is_current && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.club_logo_url && <img src={entry.club_logo_url} alt="" className="w-6 h-6 object-contain rounded" />}
                        <p className="font-semibold text-slate-800">{entry.club}</p>
                        {entry.is_current && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Actual</Badge>}
                        {entry.operation_type && <Badge className={`${CAREER_OPERATION_COLORS[entry.operation_type] || 'bg-slate-100 text-slate-600 border-slate-200'} text-xs`}>{CAREER_OPERATION_LABELS[entry.operation_type] || entry.operation_type}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                        {entry.start_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(entry.start_date)} {entry.end_date ? `— ${formatDate(entry.end_date)}` : '— Actual'}</span>}
                        {entry.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{entry.country}</span>}
                        {entry.competition && <span>{entry.competition}</span>}
                        {entry.category && <span>{entry.category}</span>}
                        {entry.season && <span>Temp: {entry.season}</span>}
                      </div>
                      {(entry.matches || entry.goals || entry.assists) && (
                        <div className="flex gap-4 mt-3 text-xs">
                          {entry.matches != null && <span><span className="font-semibold text-slate-700">{entry.matches}</span> <span className="text-slate-400">partidos</span></span>}
                          {entry.minutes != null && <span><span className="font-semibold text-slate-700">{entry.minutes}</span> <span className="text-slate-400">min</span></span>}
                          {entry.goals != null && <span><span className="font-semibold text-slate-700">{entry.goals}</span> <span className="text-slate-400">goles</span></span>}
                          {entry.assists != null && <span><span className="font-semibold text-slate-700">{entry.assists}</span> <span className="text-slate-400">asis.</span></span>}
                        </div>
                      )}
                      {entry.achievements && <div className="flex items-start gap-1 mt-2 text-xs text-amber-700"><Trophy className="w-3 h-3 mt-0.5 flex-shrink-0" /><span>{entry.achievements}</span></div>}
                      {entry.notes && <p className="text-xs text-slate-400 italic mt-2">{entry.notes}</p>}
                    </div>
                    {canManage && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setEditing(entry)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && <CareerDialog player={player} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
      {editing && <CareerDialog player={player} record={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function CareerDialog({ player, record, onClose, onSaved }) {
  const [form, setForm] = useState({
    club: record?.club || '',
    club_logo_url: record?.club_logo_url || '',
    country: record?.country || '',
    competition: record?.competition || '',
    category: record?.category || '',
    start_date: record?.start_date || '',
    end_date: record?.end_date || '',
    season: record?.season || '',
    operation_type: record?.operation_type || 'formacion',
    matches: record?.matches ?? 0,
    minutes: record?.minutes ?? 0,
    goals: record?.goals ?? 0,
    assists: record?.assists ?? 0,
    achievements: record?.achievements || '',
    notes: record?.notes || '',
    is_current: record?.is_current || false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, organization_id: player.organization_id, player_id: player.id };
      if (record) { await base44.entities.PlayerCareerEntry.update(record.id, payload); }
      else { await base44.entities.PlayerCareerEntry.create(payload); }
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{record ? 'Editar etapa' : 'Agregar etapa'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Club *</Label><Input value={form.club} onChange={e => setForm(f => ({ ...f, club: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>País</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Competencia</Label><Input value={form.competition} onChange={e => setForm(f => ({ ...f, competition: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Categoría</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha de inicio</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Fecha de fin</Label><Input type="date" value={form.end_date} disabled={form.is_current} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Temporada</Label><Input value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} placeholder="Ej: 2024-2025" /></div>
            <div className="space-y-1.5">
              <Label>Tipo de operación</Label>
              <Select value={form.operation_type} onValueChange={v => setForm(f => ({ ...f, operation_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CAREER_OPERATION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5"><Label>Partidos</Label><Input type="number" value={form.matches} onChange={e => setForm(f => ({ ...f, matches: parseInt(e.target.value) || 0 }))} /></div>
            <div className="space-y-1.5"><Label>Minutos</Label><Input type="number" value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: parseInt(e.target.value) || 0 }))} /></div>
            <div className="space-y-1.5"><Label>Goles</Label><Input type="number" value={form.goals} onChange={e => setForm(f => ({ ...f, goals: parseInt(e.target.value) || 0 }))} /></div>
            <div className="space-y-1.5"><Label>Asistencias</Label><Input type="number" value={form.assists} onChange={e => setForm(f => ({ ...f, assists: parseInt(e.target.value) || 0 }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Logros</Label><Textarea value={form.achievements} onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))} rows={2} placeholder="Títulos, distinciones, ascensos..." /></div>
          <div className="space-y-1.5"><Label>Observaciones</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.is_current} onChange={e => setForm(f => ({ ...f, is_current: e.target.checked, end_date: e.target.checked ? '' : f.end_date }))} className="rounded" />
            Etapa actual
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}