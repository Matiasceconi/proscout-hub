import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, BarChart3, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

export default function PlayerStatsTab({ player, permissions }) {
  const [stats, setStats] = useState([]);
  const [matchStats, setMatchStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadData(); }, [player.id]);

  const loadData = async () => {
    try {
      const [s, ms] = await Promise.all([
        base44.entities.PlayerSeasonStats.filter({ organization_id: player.organization_id, player_id: player.id }, '-season', 20),
        base44.entities.PlayerMatchStats.filter({ organization_id: player.organization_id, player_id: player.id }, '-match_date', 50)
      ]);
      setStats(s);
      setMatchStats(ms);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando estadísticas...</div>;

  const chartData = matchStats.slice(0, 10).reverse().map(m => ({
    date: formatDate(m.match_date).slice(0, 6),
    goles: m.goals,
    minutos: m.minutes_played,
    valoracion: m.rating || 0
  }));

  return (
    <div className="space-y-5">
      {permissions.canEditStats && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Cargar estadísticas
          </Button>
        </div>
      )}

      {stats.length === 0 && matchStats.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p>Sin estadísticas cargadas</p>
        </div>
      ) : (
        <>
          {/* Season totals */}
          {stats.map(s => (
            <div key={s.id} className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{s.season} · {s.competition || 'General'}</h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                <StatBox label="Partidos" value={s.matches} />
                <StatBox label="Titularidades" value={s.starts} />
                <StatBox label="Minutos" value={s.minutes} />
                <StatBox label="Goles" value={s.goals} />
                <StatBox label="Asistencias" value={s.assists} />
                <StatBox label="Convocatorias" value={s.call_ups} />
                <StatBox label="Amarillas" value={s.yellow_cards} />
                <StatBox label="Rojas" value={s.red_cards} />
                <StatBox label="Min/Parto" value={s.minutes_per_match} />
                <StatBox label="% Particip." value={`${s.participation_rate}%`} />
              </div>
            </div>
          ))}

          {/* Evolution chart */}
          {chartData.length > 1 && (
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Evolución (últimos partidos)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="minutos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent matches */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Últimos partidos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs">
                    <th className="text-left py-2 px-2">Fecha</th>
                    <th className="text-left py-2 px-2">Rival</th>
                    <th className="text-center py-2 px-2">Tit.</th>
                    <th className="text-center py-2 px-2">Min.</th>
                    <th className="text-center py-2 px-2">G</th>
                    <th className="text-center py-2 px-2">A</th>
                    <th className="text-center py-2 px-2">TA</th>
                    <th className="text-center py-2 px-2">TR</th>
                  </tr>
                </thead>
                <tbody>
                  {matchStats.slice(0, 15).map(m => (
                    <tr key={m.id} className="border-b border-slate-50">
                      <td className="py-2 px-2 text-slate-500">{formatDate(m.match_date)}</td>
                      <td className="py-2 px-2 text-slate-700">{m.opponent || '—'}</td>
                      <td className="py-2 px-2 text-center">{m.is_starter ? '✓' : '—'}</td>
                      <td className="py-2 px-2 text-center text-slate-600">{m.minutes_played}</td>
                      <td className="py-2 px-2 text-center font-medium text-slate-800">{m.goals || 0}</td>
                      <td className="py-2 px-2 text-center font-medium text-slate-800">{m.assists || 0}</td>
                      <td className="py-2 px-2 text-center">{m.yellow_cards || 0}</td>
                      <td className="py-2 px-2 text-center">{m.red_cards || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showAdd && <AddStatsDialog player={player} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadData(); }} />}
    </div>
  );
}

function AddStatsDialog({ player, onClose, onSaved }) {
  const [form, setForm] = useState({
    match_date: '', season: '', competition: '', opponent: '',
    is_starter: false, minutes_played: 0, goals: 0, assists: 0,
    yellow_cards: 0, red_cards: 0, called_up: true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.PlayerMatchStats.create({
        ...form,
        organization_id: player.organization_id,
        player_id: player.id
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cargar estadísticas de partido</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha *</Label><Input type="date" value={form.match_date} onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))} required /></div>
            <div><Label>Temporada</Label><Input value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} placeholder="2026" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Competencia</Label><Input value={form.competition} onChange={e => setForm(f => ({ ...f, competition: e.target.value }))} placeholder="Liga" /></div>
            <div><Label>Rival</Label><Input value={form.opponent} onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Minutos</Label><Input type="number" value={form.minutes_played} onChange={e => setForm(f => ({ ...f, minutes_played: +e.target.value }))} /></div>
            <div><Label>Goles</Label><Input type="number" value={form.goals} onChange={e => setForm(f => ({ ...f, goals: +e.target.value }))} /></div>
            <div><Label>Asistencias</Label><Input type="number" value={form.assists} onChange={e => setForm(f => ({ ...f, assists: +e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amarillas</Label><Input type="number" value={form.yellow_cards} onChange={e => setForm(f => ({ ...f, yellow_cards: +e.target.value }))} /></div>
            <div><Label>Rojas</Label><Input type="number" value={form.red_cards} onChange={e => setForm(f => ({ ...f, red_cards: +e.target.value }))} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_starter} onChange={e => setForm(f => ({ ...f, is_starter: e.target.checked }))} />
            Titular
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-lg">
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}