import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, isOrgAdmin, POSITION_LABELS } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Link2, BarChart3, Activity, Clock3, Target, Star, Trophy, Database, ChevronDown } from 'lucide-react';
import LinkPlayerDialog from '@/components/agency/player-tabs/stats/LinkPlayerDialog';
import ProfileAvatar from '@/components/shared/ProfileAvatar';

const SEASON = '2026';
const nf = new Intl.NumberFormat('es-AR');

export default function AgencyStats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const orgId = getUserOrgId(user);
  const isAdmin = isOrgAdmin(user);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [players, setPlayers] = useState([]);
  const [seasonStats, setSeasonStats] = useState([]);
  const [linkPlayer, setLinkPlayer] = useState(null);

  const loadData = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [coverageRes, pls, stats] = await Promise.all([
        base44.functions.invoke('getStatsCoverage', { organization_id: orgId }),
        base44.entities.Player.filter({ organization_id: orgId, status: { $ne: 'archived' } }, '-updated_date', 500),
        base44.entities.PlayerSeasonStatistic.filter({ organization_id: orgId, provider: 'api_football', season: SEASON }, '-synced_at', 500),
      ]);
      setCoverage(coverageRes.data || null);
      setPlayers(pls || []);
      setSeasonStats(stats || []);
    } catch (err) {
      console.error('Stats portfolio load error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [orgId]);

  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  const portfolioRows = useMemo(() => {
    const grouped = new Map();
    for (const s of seasonStats) {
      if (!s.player_id) continue;
      if (!grouped.has(s.player_id)) grouped.set(s.player_id, []);
      grouped.get(s.player_id).push(s);
    }

    const rows = [];
    for (const [playerId, stats] of grouped.entries()) {
      const player = playerById.get(playerId);
      if (!player) continue;
      const seen = new Set();
      let appearances = 0, lineups = 0, minutes = 0, goals = 0, assists = 0;
      let ratingWeighted = 0, ratingWeight = 0;
      const clubs = new Set();
      const competitions = new Set();
      let latestSync = null;

      for (const s of stats) {
        const key = `${s.provider_team_id || ''}_${s.league_id || ''}_${s.season || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const apps = Number(s.appearances || 0);
        appearances += apps;
        lineups += Number(s.lineups || 0);
        minutes += Number(s.minutes || 0);
        goals += Number(s.goals_total || 0);
        assists += Number(s.goals_assists || 0);
        if (s.rating_avg != null && apps > 0) {
          ratingWeighted += Number(s.rating_avg) * apps;
          ratingWeight += apps;
        }
        if (s.club_name) clubs.add(s.club_name);
        if (s.league_name) competitions.add(s.league_name);
        if (s.synced_at && (!latestSync || new Date(s.synced_at) > new Date(latestSync))) latestSync = s.synced_at;
      }

      rows.push({
        player,
        appearances,
        lineups,
        minutes,
        goals,
        assists,
        ga: goals + assists,
        rating: ratingWeight > 0 ? Number((ratingWeighted / ratingWeight).toFixed(2)) : null,
        clubs: Array.from(clubs),
        competitions: Array.from(competitions),
        latestSync,
      });
    }
    return rows.sort((a, b) => b.minutes - a.minutes || b.appearances - a.appearances);
  }, [seasonStats, playerById]);

  const summary = useMemo(() => {
    let minutes = 0, ga = 0, ratingWeighted = 0, ratingWeight = 0;
    const competitions = new Set();
    for (const row of portfolioRows) {
      minutes += row.minutes;
      ga += row.ga;
      if (row.rating != null && row.appearances > 0) {
        ratingWeighted += row.rating * row.appearances;
        ratingWeight += row.appearances;
      }
      row.competitions.forEach(c => competitions.add(c));
    }
    return {
      players: portfolioRows.length,
      minutes,
      ga,
      rating: ratingWeight > 0 ? (ratingWeighted / ratingWeight).toFixed(2) : '—',
      competitions: competitions.size,
    };
  }, [portfolioRows]);

  const latestSync = useMemo(() => {
    const dates = portfolioRows.map(r => r.latestSync).filter(Boolean).sort((a, b) => new Date(b) - new Date(a));
    return dates[0] || null;
  }, [portfolioRows]);

  const handleSync = async (scope) => {
    setSyncing(scope);
    try {
      await base44.functions.invoke('syncAllPlayersStats', { organization_id: orgId, season: SEASON, scope, trigger_reason: 'manual_admin' });
      await loadData();
    } catch (err) {
      console.error(err);
    }
    setSyncing(null);
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-slate-100 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}</div>
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Datos integrados · API-Football</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Rendimiento de la cartera</h1>
          <p className="text-sm text-slate-500 mt-1">Temporada {SEASON} · lectura consolidada de los representados con cobertura estadística.</p>
        </div>
        <div className="flex items-center gap-2">
          {latestSync && <span className="text-xs text-slate-400">Actualizado {new Date(latestSync).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => handleSync('all')} disabled={!!syncing}>
              {syncing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Actualizar datos
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric icon={Activity} label="Jugadores con datos" value={summary.players} />
        <Metric icon={Clock3} label="Minutos registrados" value={nf.format(summary.minutes)} />
        <Metric icon={Target} label="Goles + asistencias" value={summary.ga} />
        <Metric icon={Star} label="Rating promedio" value={summary.rating} />
        <Metric icon={Trophy} label="Competencias" value={summary.competitions} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 lg:px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Representados con actividad estadística</h2>
            <p className="text-xs text-slate-400 mt-0.5">Los valores provienen de la integración y se actualizan sin carga manual.</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{portfolioRows.length} perfiles</span>
        </div>

        {portfolioRows.length === 0 ? (
          <div className="p-10 text-center">
            <Database className="w-9 h-9 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">Todavía no hay estadísticas sincronizadas para {SEASON}</p>
            <p className="text-sm text-slate-400 mt-1">La estructura está lista; al vincular jugadores, los datos aparecen automáticamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr className="text-xs text-slate-500">
                  <th className="text-left font-medium px-4 py-3">Jugador</th>
                  <th className="text-left font-medium px-3 py-3 hidden lg:table-cell">Competencia</th>
                  <th className="text-right font-medium px-3 py-3">PJ</th>
                  <th className="text-right font-medium px-3 py-3">MIN</th>
                  <th className="text-right font-medium px-3 py-3">G</th>
                  <th className="text-right font-medium px-3 py-3">A</th>
                  <th className="text-right font-medium px-3 py-3">G+A</th>
                  <th className="text-right font-medium px-4 py-3">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolioRows.map(row => (
                  <tr key={row.player.id} onClick={() => navigate(`/agency/players/${row.player.id}`)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[210px]">
                        <ProfileAvatar photoUrl={row.player.photo_url} photoSourceUrl={row.player.photo_source_url} firstName={row.player.first_name} lastName={row.player.last_name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{row.player.first_name} {row.player.last_name}</p>
                          <p className="text-xs text-slate-400 truncate">{POSITION_LABELS[row.player.position] || row.player.position} · {row.clubs.join(' / ') || row.player.club || 'Sin club'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell text-slate-500 max-w-[240px] truncate">{row.competitions.join(' · ') || '—'}</td>
                    <Num value={row.appearances} />
                    <Num value={nf.format(row.minutes)} strong />
                    <Num value={row.goals} />
                    <Num value={row.assists} />
                    <Num value={row.ga} strong />
                    <td className="px-4 py-3 text-right"><span className="font-semibold text-slate-800">{row.rating ?? '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdmin && coverage && (
        <details className="group bg-white border border-slate-200 rounded-xl overflow-hidden">
          <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">Administración de cobertura</p>
                <p className="text-xs text-slate-400">Vinculación y sincronización de jugadores</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-100 p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <CoverageBox label="Cartera" value={coverage.coverage?.total_players || 0} />
              <CoverageBox label="Vinculados" value={coverage.coverage?.linked || 0} />
              <CoverageBox label="Pendientes" value={(coverage.coverage?.pending || 0) + (coverage.coverage?.unlinked || 0)} />
              <CoverageBox label="Ambiguos" value={coverage.coverage?.ambiguous || 0} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleSync('pending')} disabled={!!syncing}>
                {syncing === 'pending' ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                Sincronizar pendientes
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSync('all')} disabled={!!syncing}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing === 'all' ? 'animate-spin' : ''}`} />
                Actualizar cartera
              </Button>
            </div>
            {coverage.pending_players?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pendientes prioritarios</p>
                <div className="grid md:grid-cols-2 gap-2">
                  {coverage.pending_players.slice(0, 8).map(p => {
                    const playerData = playerById.get(p.player_id);
                    return (
                      <div key={`${p.player_id}-${p.reason}`} className="flex items-center gap-2 border border-slate-100 rounded-lg p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
                          <p className="text-xs text-slate-400 truncate">{p.club || 'Sin club'} · {p.reason === 'ambiguo' ? 'Revisar identidad' : 'Sin vincular'}</p>
                        </div>
                        {playerData && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setLinkPlayer(playerData)}><Link2 className="w-3 h-3 mr-1" />Vincular</Button>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </details>
      )}

      {linkPlayer && (
        <LinkPlayerDialog
          player={linkPlayer}
          organizationId={orgId}
          onClose={() => setLinkPlayer(null)}
          onLinked={() => { setLinkPlayer(null); loadData(); }}
        />
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400 mb-2"><Icon className="w-4 h-4" /><span className="text-xs font-medium">{label}</span></div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Num({ value, strong = false }) {
  return <td className={`px-3 py-3 text-right ${strong ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{value}</td>;
}

function CoverageBox({ label, value }) {
  return <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-bold text-slate-800">{value}</p><p className="text-[11px] text-slate-400">{label}</p></div>;
}
