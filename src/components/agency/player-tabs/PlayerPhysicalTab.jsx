import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Activity, Zap, Gauge } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

export default function PlayerPhysicalTab({ player, permissions }) {
  const [assessments, setAssessments] = useState([]);
  const [gps, setGps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState('assessment');

  useEffect(() => { loadData(); }, [player.id]);

  const loadData = async () => {
    try {
      const [a, g] = await Promise.all([
        base44.entities.PhysicalAssessment.filter({ organization_id: player.organization_id, player_id: player.id }, '-assessment_date', 50),
        base44.entities.GPSActivity.filter({ organization_id: player.organization_id, player_id: player.id }, '-activity_date', 50)
      ]);
      setAssessments(a);
      setGps(g);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando rendimiento físico...</div>;

  const latest = assessments[0];
  const radarData = latest ? [
    { metric: 'CMJ', value: latest.cmj || 0, max: 50 },
    { metric: 'Sprint 10m', value: latest.sprint_10m ? 100 - latest.sprint_10m * 10 : 0, max: 100 },
    { metric: 'Sprint 30m', value: latest.sprint_30m ? 100 - latest.sprint_30m * 2 : 0, max: 100 },
    { metric: 'Yo-Yo IR1', value: latest.yo_yo_ir1 || 0, max: 2000 },
    { metric: 'NordBord', value: latest.nordbord || 0, max: 500 },
    { metric: 'Fuerza Iso.', value: latest.isometric_strength || 0, max: 500 },
  ] : [];

  return (
    <div className="space-y-5">
      {permissions.canEditPhysical && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => { setAddType('gps'); setShowAdd(true); }}>
            <Zap className="w-4 h-4 mr-1" /> Cargar GPS
          </Button>
          <Button size="sm" onClick={() => { setAddType('assessment'); setShowAdd(true); }} className="bg-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Nueva evaluación
          </Button>
        </div>
      )}

      {assessments.length === 0 && gps.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Activity className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p>Sin datos de rendimiento físico</p>
        </div>
      ) : (
        <>
          {/* Radar */}
          {latest && radarData.some(d => d.value > 0) && (
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Gauge className="w-4 h-4" /> Radar físico - {formatDate(latest.assessment_date)}
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} stroke="#cbd5e1" />
                  <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Latest assessment */}
          {latest && (
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Última evaluación - {formatDate(latest.assessment_date)}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {latest.cmj != null && <StatBox label="CMJ" value={latest.cmj} unit="cm" />}
                {latest.sprint_10m != null && <StatBox label="Sprint 10m" value={latest.sprint_10m} unit="s" />}
                {latest.sprint_20m != null && <StatBox label="Sprint 20m" value={latest.sprint_20m} unit="s" />}
                {latest.sprint_30m != null && <StatBox label="Sprint 30m" value={latest.sprint_30m} unit="s" />}
                {latest.yo_yo_ir1 != null && <StatBox label="Yo-Yo IR1" value={latest.yo_yo_ir1} unit="m" />}
                {latest.nordbord != null && <StatBox label="NordBord" value={latest.nordbord} unit="N" />}
                {latest.isometric_strength != null && <StatBox label="Fuerza Iso." value={latest.isometric_strength} unit="N" />}
                {latest.adductor_strength != null && <StatBox label="Aductores" value={latest.adductor_strength} unit="N" />}
              </div>
              {latest.notes && <p className="text-sm text-slate-500 mt-3">{latest.notes}</p>}
            </div>
          )}

          {/* GPS data */}
          {gps.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Datos GPS recientes
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs">
                      <th className="text-left py-2 px-2">Fecha</th>
                      <th className="text-center py-2 px-2">Dist. (m)</th>
                      <th className="text-center py-2 px-2">m/min</th>
                      <th className="text-center py-2 px-2">Sprints</th>
                      <th className="text-center py-2 px-2">Vel. Max</th>
                      <th className="text-center py-2 px-2">Player Load</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gps.slice(0, 10).map(g => (
                      <tr key={g.id} className="border-b border-slate-50">
                        <td className="py-2 px-2 text-slate-500">{formatDate(g.activity_date)}</td>
                        <td className="py-2 px-2 text-center text-slate-600">{g.total_distance || '—'}</td>
                        <td className="py-2 px-2 text-center text-slate-600">{g.meters_per_min || '—'}</td>
                        <td className="py-2 px-2 text-center text-slate-600">{g.sprints || '—'}</td>
                        <td className="py-2 px-2 text-center text-slate-600">{g.max_speed ? `${g.max_speed} km/h` : '—'}</td>
                        <td className="py-2 px-2 text-center text-slate-600">{g.player_load || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* History */}
          {assessments.length > 1 && (
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Historial de evaluaciones</h3>
              <div className="space-y-2">
                {assessments.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                    <span className="text-slate-600">{formatDate(a.assessment_date)}</span>
                    <span className="text-slate-400 text-xs capitalize">{a.assessment_type}</span>
                    <span className="text-slate-500 text-xs">{a.performed_by || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showAdd && <AddPhysicalDialog player={player} type={addType} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadData(); }} />}
    </div>
  );
}

function AddPhysicalDialog({ player, type, onClose, onSaved }) {
  const isGPS = type === 'gps';
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isGPS) {
        await base44.entities.GPSActivity.create({
          ...form,
          organization_id: player.organization_id,
          player_id: player.id,
          provider: form.provider || 'manual'
        });
      } else {
        await base44.entities.PhysicalAssessment.create({
          ...form,
          organization_id: player.organization_id,
          player_id: player.id
        });
      }
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const fields = isGPS
    ? [
      { key: 'total_distance', label: 'Distancia total (m)', type: 'number' },
      { key: 'meters_per_min', label: 'Metros por minuto', type: 'number' },
      { key: 'high_speed_distance', label: 'Dist. alta velocidad (m)', type: 'number' },
      { key: 'sprints', label: 'Sprints', type: 'number' },
      { key: 'accelerations', label: 'Aceleraciones', type: 'number' },
      { key: 'decelerations', label: 'Desaceleraciones', type: 'number' },
      { key: 'player_load', label: 'Player Load', type: 'number' },
      { key: 'max_speed', label: 'Velocidad máxima (km/h)', type: 'number' },
      { key: 'minutes', label: 'Minutos', type: 'number' }
    ]
    : [
      { key: 'assessment_date', label: 'Fecha *', type: 'date', required: true },
      { key: 'cmj', label: 'CMJ (cm)', type: 'number' },
      { key: 'sprint_10m', label: 'Sprint 10m (s)', type: 'number' },
      { key: 'sprint_20m', label: 'Sprint 20m (s)', type: 'number' },
      { key: 'sprint_30m', label: 'Sprint 30m (s)', type: 'number' },
      { key: 'yo_yo_ir1', label: 'Yo-Yo IR1 (m)', type: 'number' },
      { key: 'isometric_strength', label: 'Fuerza isométrica (N)', type: 'number' },
      { key: 'nordbord', label: 'NordBord (N)', type: 'number' },
      { key: 'adductor_strength', label: 'Aductores (N)', type: 'number' }
    ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isGPS ? 'Cargar datos GPS' : 'Nueva evaluación física'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {isGPS && (
            <div>
              <Label>Fecha *</Label>
              <Input type="date" value={form.activity_date || ''} onChange={e => setForm(f => ({ ...f, activity_date: e.target.value }))} required />
            </div>
          )}
          {fields.map(f => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <Input
                type={f.type}
                value={form[f.key] || ''}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: f.type === 'number' ? +e.target.value : e.target.value }))}
                required={f.required}
              />
            </div>
          ))}
          {!isGPS && (
            <div>
              <Label>Notas</Label>
              <Input value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, unit }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-lg">
      <p className="text-lg font-bold text-slate-800">{value}{unit && <span className="text-xs text-slate-400 ml-0.5">{unit}</span>}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}