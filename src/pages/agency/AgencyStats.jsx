import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, isOrgAdmin } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Link2, CheckCircle2, BarChart3 } from 'lucide-react';
import LinkPlayerDialog from '@/components/agency/player-tabs/stats/LinkPlayerDialog';

export default function AgencyStats() {
  const { user } = useAuth();
  const orgId = getUserOrgId(user);
  const isAdmin = isOrgAdmin(user);
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [linkPlayer, setLinkPlayer] = useState(null);
  const [players, setPlayers] = useState([]);

  const loadCoverage = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getStatsCoverage', { organization_id: orgId });
      setCoverage(res.data);
      if (res.data?.pending_players?.length > 0) {
        const pIds = res.data.pending_players.map(p => p.player_id);
        const pls = await base44.entities.Player.filter({ id: { $in: pIds } });
        setPlayers(pls);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { if (orgId) loadCoverage(); }, [orgId]);

  const handleSync = async (scope) => {
    setSyncing(scope);
    try {
      await base44.functions.invoke('syncAllPlayersStats', { organization_id: orgId, season: '2026', scope, trigger_reason: 'manual_admin' });
      await loadCoverage();
    } catch (err) { console.error(err); }
    setSyncing(null);
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!coverage) return <div className="p-6 text-center text-slate-400">Sin datos de cobertura</div>;

  const c = coverage.coverage;
  const lastRun = coverage.last_sync?.last_run;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-slate-700" />
        <h1 className="text-lg font-semibold text-slate-800">Estadísticas</h1>
      </div>

      {/* Coverage cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-2xl font-bold text-slate-800">{c.total_players}</p>
          <p className="text-xs text-slate-500">Total jugadores</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-2xl font-bold text-green-700">{c.linked}</p>
          <p className="text-xs text-green-600">Vinculados</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-2xl font-bold text-amber-700">{c.pending + c.unlinked}</p>
          <p className="text-xs text-amber-600">Pendientes</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-2xl font-bold text-amber-700">{c.ambiguous}</p>
          <p className="text-xs text-amber-600">Ambiguos</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-2xl font-bold text-red-700">{c.error}</p>
          <p className="text-xs text-red-600">Errores</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-2xl font-bold text-slate-800">{coverage.match_stats_count + coverage.season_stats_count}</p>
          <p className="text-xs text-slate-500">Registros</p>
        </div>
      </div>

      {/* Last sync info */}
      {lastRun && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-medium text-slate-600">Última sincronización:</span>
          <span className="text-slate-500">{new Date(lastRun.started_at).toLocaleString('es-AR')}</span>
          <span className={`px-2 py-0.5 rounded-full ${lastRun.status === 'completed' ? 'bg-green-50 text-green-600' : lastRun.status === 'partial' ? 'bg-amber-50 text-amber-600' : lastRun.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
            {lastRun.status === 'completed' ? 'Completada' : lastRun.status === 'partial' ? 'Parcial' : lastRun.status === 'failed' ? 'Fallida' : 'En curso'}
          </span>
          <span className="text-slate-400">Jugadores: {lastRun.players_processed}</span>
          <span className="text-slate-400">Partidos: {lastRun.fixtures_processed}</span>
          <span className="text-slate-400">Requests: {lastRun.api_requests_used}</span>
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleSync('pending')} disabled={!!syncing} variant="outline" size="sm">
            {syncing === 'pending' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Sincronizar pendientes
          </Button>
          <Button onClick={() => handleSync('all')} disabled={!!syncing} className="bg-slate-900" size="sm">
            {syncing === 'all' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Actualizar cartera completa
          </Button>
        </div>
      )}

      {/* Pending players list */}
      {coverage.pending_players?.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <h3 className="text-sm font-semibold text-slate-700 p-3 border-b border-slate-100">Jugadores pendientes de vinculación</h3>
          <div className="divide-y divide-slate-50">
            {coverage.pending_players.map((p, i) => {
              const playerData = players.find(pl => pl.id === p.player_id);
              const reasonLabel = { sin_vincular: 'Sin vincular', ambiguo: 'Ambiguo', error: 'Error' }[p.reason] || p.reason;
              const reasonColor = { sin_vincular: 'text-amber-600 bg-amber-50', ambiguo: 'text-amber-600 bg-amber-50', error: 'text-red-600 bg-red-50' }[p.reason];
              return (
                <div key={i} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.club || 'Sin club'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${reasonColor}`}>{reasonLabel}</span>
                  {isAdmin && playerData && (
                    <Button size="sm" variant="outline" onClick={() => setLinkPlayer(playerData)} className="h-7 text-xs">
                      <Link2 className="w-3 h-3 mr-1" /> Vincular
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {coverage.pending_players?.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm">Todos los jugadores están vinculados</p>
        </div>
      )}

      {linkPlayer && (
        <LinkPlayerDialog
          player={linkPlayer}
          organizationId={orgId}
          onClose={() => setLinkPlayer(null)}
          onLinked={() => { setLinkPlayer(null); loadCoverage(); }}
        />
      )}
    </div>
  );
}