import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { EmptyState } from '@/components/shared/UIBits';
import { BarChart3 } from 'lucide-react';

export default function DirectorStatsTab({ director }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [director.id]);

  const load = async () => {
    try {
      const data = await base44.entities.DirectorCareer.filter({ organization_id: director.organization_id, director_id: director.id }, '-start_date', 100);
      setRecords(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando estadísticas...</div>;

  const totals = records.reduce((acc, r) => ({
    matches: acc.matches + (r.matches_managed || 0),
    wins: acc.wins + (r.wins || 0),
    draws: acc.draws + (r.draws || 0),
    losses: acc.losses + (r.losses || 0)
  }), { matches: 0, wins: 0, draws: 0, losses: 0 });

  const winRate = totals.matches > 0 ? ((totals.wins / totals.matches) * 100).toFixed(1) : '0.0';

  if (records.length === 0) {
    return <EmptyState icon={BarChart3} title="Sin estadísticas" description="Agrega registros de trayectoria para ver las estadísticas agregadas." />;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Partidos dirigidos" value={totals.matches} />
        <StatBox label="Victorias" value={totals.wins} color="text-green-600" />
        <StatBox label="Empates" value={totals.draws} color="text-slate-600" />
        <StatBox label="Derrotas" value={totals.losses} color="text-red-600" />
      </div>

      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Efectividad general</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex">
            {totals.matches > 0 && (
              <>
                <div className="bg-green-500" style={{ width: `${(totals.wins / totals.matches) * 100}%` }} />
                <div className="bg-slate-300" style={{ width: `${(totals.draws / totals.matches) * 100}%` }} />
                <div className="bg-red-400" style={{ width: `${(totals.losses / totals.matches) * 100}%` }} />
              </>
            )}
          </div>
          <span className="text-sm font-bold text-slate-800">{winRate}%</span>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Victorias</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Empates</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> Derrotas</span>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Detalle por club</h3>
        <div className="space-y-2">
          {records.map(r => {
            const total = (r.matches_managed || 0);
            const rate = total > 0 ? ((r.wins || 0) / total * 100).toFixed(0) : '—';
            return (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{r.club}</p>
                  <p className="text-xs text-slate-400">{r.start_date || ''} — {r.end_date || 'Presente'}</p>
                </div>
                <div className="flex gap-3 text-xs text-slate-500">
                  <span>{r.matches_managed || 0} PJ</span>
                  <span className="text-green-600">{r.wins || 0}G</span>
                  <span>{r.draws || 0}E</span>
                  <span className="text-red-600">{r.losses || 0}P</span>
                  <span className="font-medium text-slate-700">{rate}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color = 'text-slate-800' }) {
  return (
    <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}