import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getPlayerId, formatDate } from '@/lib/roleUtils';
import { PageHeader, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

export default function PortalStats() {
  const { user } = useAuth();
  const playerId = getPlayerId(user);
  const [stats, setStats] = useState([]);
  const [matchStats, setMatchStats] = useState([]);
  const [organizationId, setOrganizationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => { load(); }, [playerId]);

  const load = async () => {
    try {
      const player = await base44.entities.Player.get(playerId);
      setOrganizationId(player.organization_id);
      const [s, ms] = await Promise.all([
        base44.entities.PlayerSeasonStats.filter({ organization_id: player.organization_id, player_id: playerId }, '-season', 10),
        base44.entities.PlayerMatchStats.filter({ organization_id: player.organization_id, player_id: playerId }, '-match_date', 20)
      ]);
      setStats(s);
      setMatchStats(ms);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleExport = async () => {
    if (!organizationId || exporting) return;
    setExporting(true);
    setExportError('');
    try {
      const season = String(stats[0]?.season || new Date().getFullYear());
      const response = await base44.functions.invoke('exportPlayerStatsPdf', {
        player_id: playerId,
        organization_id: organizationId,
        season
      });
      const result = response?.data || response;
      if (!result?.pdf_base64) throw new Error(result?.error || 'No se pudo generar el informe.');

      const binary = window.atob(result.pdf_base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename || 'informe_rendimiento.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error?.response?.data?.error || error?.message || 'No se pudo descargar el informe.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;

  const chartData = matchStats.slice(0, 10).reverse().map(m => ({
    date: formatDate(m.match_date).slice(0, 6),
    goles: m.goals,
    minutos: m.minutes_played
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mis estadísticas"
        subtitle="Consultá tu rendimiento y descargá un informe profesional."
        actions={
          <Button onClick={handleExport} disabled={exporting || !organizationId} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {exporting ? 'Generando...' : 'Descargar informe'}
          </Button>
        }
      />
      {exportError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{exportError}</div>}
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