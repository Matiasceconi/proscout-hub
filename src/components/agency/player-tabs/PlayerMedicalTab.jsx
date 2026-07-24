import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, AVAILABILITY_LABELS, AVAILABILITY_COLORS, canEditMedical } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, HeartPulse, Lock, Eye, Shield } from 'lucide-react';

export default function PlayerMedicalTab({ player, permissions }) {
  const [injuries, setInjuries] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedInjury, setSelectedInjury] = useState(null);

  useEffect(() => { loadData(); }, [player.id]);

  const loadData = async () => {
    try {
      const [i, f] = await Promise.all([
        base44.entities.InjuryRecord.filter({ organization_id: player.organization_id, player_id: player.id }, '-injury_date', 50),
        base44.entities.MedicalFollowUp.filter({ organization_id: player.organization_id, player_id: player.id }, '-follow_up_date', 50)
      ]);
      setInjuries(i);
      setFollowUps(f);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando historial médico...</div>;

  const canEdit = permissions.canEditMedical;
  const visibilityLabels = { general: 'Estado general', rehab: 'Rehabilitación', clinical: 'Clínico restringido' };
  const visibilityIcons = { general: Eye, rehab: Shield, clinical: Lock };
  const visibilityColors = {
    general: 'bg-green-100 text-green-700 border-green-200',
    rehab: 'bg-amber-100 text-amber-700 border-amber-200',
    clinical: 'bg-red-100 text-red-700 border-red-200'
  };

  return (
    <div className="space-y-4">
      {/* Access level notice */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Niveles de acceso médico</p>
          <p className="text-xs text-blue-600 mt-0.5">
            {canEdit
              ? 'Tienes acceso completo al historial clínico. Todos los accesos quedan registrados.'
              : 'Puedes ver el estado general de disponibilidad. El contenido clínico está restringido al área médica.'}
          </p>
        </div>
      </div>

      {/* Current status */}
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Estado de disponibilidad actual</h3>
        <Badge className={AVAILABILITY_COLORS[player.availability_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
          {AVAILABILITY_LABELS[player.availability_status] || 'Disponible'}
        </Badge>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Registrar lesión
          </Button>
        </div>
      )}

      {/* Injury history */}
      {injuries.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <HeartPulse className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p>Sin lesiones registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {injuries.map(inj => {
            const VisIcon = visibilityIcons[inj.visibility] || Eye;
            const injuryFollowUps = followUps.filter(f => f.injury_id === inj.id);
            return (
              <div key={inj.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-slate-800">{inj.diagnosis}</p>
                    <p className="text-xs text-slate-400">{formatDate(inj.injury_date)} · {inj.professional || 'Sin profesional'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={AVAILABILITY_COLORS[inj.status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
                      {AVAILABILITY_LABELS[inj.status] || inj.status}
                    </Badge>
                    <Badge className={visibilityColors[inj.visibility] || 'bg-slate-100 text-slate-600 border-slate-200'}>
                      <VisIcon className="w-3 h-3 mr-1" /> {visibilityLabels[inj.visibility]}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500 mt-2">
                  {inj.body_zone && <span>Zona: <strong className="text-slate-700">{inj.body_zone}</strong></span>}
                  {inj.side && <span>Lado: <strong className="text-slate-700">{inj.side}</strong></span>}
                  {inj.injury_type && <span>Tipo: <strong className="text-slate-700">{inj.injury_type}</strong></span>}
                  {inj.grade && <span>Grado: <strong className="text-slate-700">{inj.grade}</strong></span>}
                </div>
                {inj.estimated_return_date && (
                  <p className="text-xs text-amber-600 mt-2">Retorno estimado: {formatDate(inj.estimated_return_date)}</p>
                )}
                {inj.restrictions && (
                  <p className="text-xs text-slate-500 mt-2"><strong>Restricciones:</strong> {inj.restrictions}</p>
                )}
                {injuryFollowUps.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-1">Seguimientos ({injuryFollowUps.length})</p>
                    {injuryFollowUps.map(f => (
                      <div key={f.id} className="text-xs text-slate-500 py-1">
                        <span className="text-slate-400">{formatDate(f.follow_up_date)}</span> · {f.notes}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddInjuryDialog player={player} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadData(); }} />}
    </div>
  );
}

function AddInjuryDialog({ player, onClose, onSaved }) {
  const [form, setForm] = useState({
    injury_date: '', diagnosis: '', body_zone: '', side: '', injury_type: '',
    mechanism: '', grade: '', context: '', professional: '', estimated_return_date: '',
    restrictions: '', notes: '', visibility: 'general', shared_with_player: true,
    status: 'rehabilitation'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.InjuryRecord.create({
        ...form,
        organization_id: player.organization_id,
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`
      });
      await base44.entities.Player.update(player.id, { availability_status: form.status });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrar lesión</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha de lesión *</Label><Input type="date" value={form.injury_date} onChange={e => setForm(f => ({ ...f, injury_date: e.target.value }))} required /></div>
            <div><Label>Profesional responsable</Label><Input value={form.professional} onChange={e => setForm(f => ({ ...f, professional: e.target.value }))} /></div>
          </div>
          <div><Label>Diagnóstico *</Label><Input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Zona corporal</Label>
              <Select value={form.body_zone} onValueChange={v => setForm(f => ({ ...f, body_zone: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {['head','neck','shoulder','arm','elbow','wrist','hand','chest','back','abdomen','hip','groin','thigh','knee','calf','ankle','foot','other'].map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lado</Label>
              <Select value={form.side} onValueChange={v => setForm(f => ({ ...f, side: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Izquierdo</SelectItem>
                  <SelectItem value="right">Derecho</SelectItem>
                  <SelectItem value="bilateral">Bilateral</SelectItem>
                  <SelectItem value="n/a">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo de lesión</Label>
              <Select value={form.injury_type} onValueChange={v => setForm(f => ({ ...f, injury_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['muscular','ligament','tendon','bone','joint','concussion','laceration','other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mecanismo</Label>
              <Select value={form.mechanism} onValueChange={v => setForm(f => ({ ...f, mechanism: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['contact','non_contact','overuse','gradual','sudden','other'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AVAILABILITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nivel de visibilidad</Label>
              <Select value={form.visibility} onValueChange={v => setForm(f => ({ ...f, visibility: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Estado general (todos)</SelectItem>
                  <SelectItem value="rehab">Rehabilitación (staff)</SelectItem>
                  <SelectItem value="clinical">Clínico restringido (médico)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Fecha estimada de regreso</Label><Input type="date" value={form.estimated_return_date} onChange={e => setForm(f => ({ ...f, estimated_return_date: e.target.value }))} /></div>
          <div><Label>Restricciones</Label><Input value={form.restrictions} onChange={e => setForm(f => ({ ...f, restrictions: e.target.value }))} placeholder="Ej. Sin trabajo de fuerza en miembro inferior" /></div>
          <div><Label>Observaciones</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.shared_with_player} onChange={e => setForm(f => ({ ...f, shared_with_player: e.target.checked }))} />
            Compartir con el jugador en su portal
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900">{saving ? 'Guardando...' : 'Registrar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}