import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getPlayerId, formatDate } from '@/lib/roleUtils';
import { PageHeader, EmptyState } from '@/components/shared/UIBits';
import { BarChart3, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

export default function PortalStats() {
  const { user } = useAuth();
  const playerId = getPlayerId(user);
  const [stats, setStats] = useState([]);
  const [matchStats, setMatchStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [playerId]);

  const load = async () => {
    try {
      const player = await base44.entities.Player.get(playerId);
      const [s, ms] = await Promise.all([
        base44.entities.PlayerSeasonStats.filter({ organization_id: player.organization_id, player_id: playerId }, '-season', 10),
        base44.entities.PlayerMatchStats.filter({ organization_id: player.organization_id, player_id: playerId }, '-match_date', 20)
      ]);
      setStats(s);
      setMatchStats(ms);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;

  const chartData = matchStats.slice(0, 10).reverse().map(m => ({
    date: formatDate(m.match_date).slice(0, 6),
    goles: m.goals,
    minutos: m.minutes_played
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Mis estadísticas" />
      {stats.length === 0 && matchStats.length === 0 ? (
        <EmptyState icon={BarChart3} title="Sin estadísticas" description="Tu agencia aún no cargó estadísticas." />
      ) : (
        <>
          {stats.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">{s.season} · {s.competition || 'General'}</p>
              <div className="grid grid-cols-3 gap-2">
                <StatBox label="Partidos" value={s.matches} />
                <StatBox label="Goles" value={s.goals} />
                <StatBox label="Asist." value={s.assists} />
                <StatBox label="Minutos" value={s.minutes} />
                <StatBox label="Titular" value={s.starts} />
                <StatBox label="Amarillas" value={s.yellow_cards} />
              </div>
            </div>
          ))}
          {chartData.length > 1 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Evolución de minutos</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="minutos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-lg">
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}