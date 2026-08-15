import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { isOrgAdmin } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Download, Link2, AlertCircle, CheckCircle2, Clock, Clock4 } from 'lucide-react';
import LinkPlayerDialog from './stats/LinkPlayerDialog';
import StatsSummaryCards from './stats/StatsSummaryCards';
import StatsCharts from './stats/StatsCharts';
import StatsMatchTable from './stats/StatsMatchTable';
import StatsPositionTable from './stats/StatsPositionTable';
import StatsSkeleton from './stats/StatsSkeleton';
import PlayerTransferStatus from './PlayerTransferStatus';
import { getSummaryCards, getPositionMetrics, getKeyInsights, getCoverageStatus, POSITION_LABELS_FULL } from './stats/statsHelpers';

export default function PlayerStatsTab({ player, permissions }) {
  const { user } = useAuth();
  const [identity, setIdentity] = useState(null);
  const [matchStats, setMatchStats] = useState([]);
  const [seasonStats, setSeasonStats] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [clubData, setClubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLink, setShowLink] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [season, setSeason] = useState('2026');
  const [clubFilter, setClubFilter] = useState('all');
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [period, setPeriod] = useState('season');
  const [viewMode, setViewMode] = useState('totals');
  const [minutesPeriod, setMinutesPeriod] = useState('10');
  const [exporting, setExporting] = useState(false);

  const orgId = player.organization_id;
  const isAdmin = isOrgAdmin(user);

  useEffect(() => { loadData(); }, [player.id, season]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [identsRaw, msRaw, ssRaw] = await Promise.all([
        base44.entities.PlayerExternalIdentity.filter({ organization_id: orgId, player_id: player.id }),
        base44.entities.PlayerMatchStatistic.filter({ organization_id: orgId, player_id: player.id }, '-fixture_date', 100),
        base44.entities.PlayerSeasonStatistic.filter({ organization_id: orgId, player_id: player.id }),
      ]);
      const ident = (identsRaw || []).find(i => i.provider === 'api_football') || identsRaw?.[0] || null;
      const ms = (msRaw || []).filter(m => m.season === season && m.provider === 'api_football');
      const ss = (ssRaw || []).filter(s => s.season === season && s.provider === 'api_football');
      setIdentity(ident);
      setMatchStats(ms);
      setSeasonStats(ss);
      setLastSync(ss[0]?.synced_at || ms[0]?.synced_at || null);

      // Cargar club del jugador
      if (player.current_club_id) {
        try {
          const club = await base44.entities.Club.get(player.current_club_id);
          setClubData(club);
        } catch (e) { /* ignore */ }
      }

      if (ms.length > 0) {
        const fixtureIds = [...new Set(ms.map(m => m.provider_fixture_id).filter(Boolean))];
        if (fixtureIds.length > 0) {
          const fx = await base44.entities.ClubFixture.filter({ organization_id: orgId, provider_fixture_id: { $in: fixtureIds } });
          setFixtures(fx || []);
        }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('syncPlayerSeasonStats', { player_id: player.id, organization_id: orgId, season });
      await loadData();
    } catch (err) { console.error(err); }
    setSyncing(false);
  };

  const handleSyncTransfers = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('syncTransferData', { organization_id: orgId });
      await loadData();
    } catch (err) { console.error(err); }
    setSyncing(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await base44.functions.invoke('exportPlayerStatsPdf', { player_id: player.id, organization_id: orgId, season, league_id: leagueFilter === 'all' ? null : leagueFilter });
      if (res.data?.pdf_base64) {
        const byteChars = atob(res.data.pdf_base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.data.filename || 'informe_estadisticas.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) { console.error(err); }
    setExporting(false);
  };

  const leagues = useMemo(() => [...new Set(seasonStats.map(s => s.league_id).filter(Boolean))].map(lid => {
    const s = seasonStats.find(x => x.league_id === lid);
    return { id: lid, name: s?.league_name || lid };
  }), [seasonStats]);

  const clubs = useMemo(() => [...new Set(seasonStats.map(s => s.club_name).filter(Boolean))], [seasonStats]);

  const filteredSeasonStats = useMemo(() => seasonStats.filter(s => {
    if (leagueFilter !== 'all' && s.league_id !== leagueFilter) return false;
    if (clubFilter !== 'all' && s.club_name !== clubFilter) return false;
    return true;
  }), [seasonStats, leagueFilter, clubFilter]);

  const currentSeasonStat = useMemo(() => filteredSeasonStats[0] || seasonStats[0] || {}, [filteredSeasonStats, seasonStats]);

  const filteredMatchStats = useMemo(() => {
    let ms = matchStats;
    if (leagueFilter !== 'all') ms = ms.filter(m => String(m.provider_league_id) === leagueFilter);
    if (clubFilter !== 'all') {
      // Filtrar por club: buscar fixtures donde el club es home o away
      const clubFixIds = fixtures.filter(f => f.home_team_name === clubFilter || f.away_team_name === clubFilter).map(f => f.provider_fixture_id);
      ms = ms.filter(m => clubFixIds.includes(m.provider_fixture_id));
    }
    if (period === '5') ms = ms.slice(0, 5);
    if (period === '10') ms = ms.slice(0, 10);
    return ms;
  }, [matchStats, leagueFilter, clubFilter, period, fixtures]);

  const summaryCards = useMemo(() => getSummaryCards(filteredMatchStats, filteredSeasonStats, player.position), [filteredMatchStats, filteredSeasonStats, player.position]);
  const positionMetrics = useMemo(() => getPositionMetrics(player.position, filteredSeasonStats, filteredMatchStats), [player.position, filteredSeasonStats, filteredMatchStats]);
  const keyInsights = useMemo(() => getKeyInsights(filteredMatchStats, filteredSeasonStats, player.position), [filteredMatchStats, filteredSeasonStats, player.position]);
  const coverage = useMemo(() => getCoverageStatus(identity, seasonStats, matchStats, syncing), [identity, seasonStats, matchStats, syncing]);

  if (loading) return <StatsSkeleton />;

  // UNLINKED STATE
  if (!identity || identity.status !== 'verified') {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-lg bg-slate-50">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
          <p className="text-sm font-medium text-slate-700 mb-1">Este jugador no está vinculado al proveedor de datos</p>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            {player.provider_player_id
              ? 'La vinculación está pendiente de verificación. Las estadísticas se cargarán automáticamente una vez confirmada.'
              : 'Vinculá el jugador con API-Football para sincronizar estadísticas automáticamente.'}
          </p>
          {isAdmin && (
            <Button onClick={() => setShowLink(true)} className="bg-slate-900">
              <Link2 className="w-4 h-4 mr-2" /> Vincular jugador
            </Button>
          )}
        </div>
        {showLink && <LinkPlayerDialog player={player} organizationId={orgId} onClose={() => setShowLink(false)} onLinked={() => { setShowLink(false); loadData(); }} />}
      </div>
    );
  }

  const coverageColors = {
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    blue: 'text-blue-600 bg-blue-50',
  };
  const coverageIcons = { green: CheckCircle2, amber: Clock, red: AlertCircle, blue: Loader2 };
  const CoverageIcon = coverageIcons[coverage.color];
  const currentClubName = clubData?.club_name || player.club || 'Sin club';
  const currentLeague = currentSeasonStat?.league_name || (leagues.length > 0 ? leagues[0].name : '—');

  return (
    <div className="space-y-4">
      {/* HEADER con estado de cobertura */}
      <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-slate-400">Club:</span>
            <span className="font-medium text-slate-700">{currentClubName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-slate-400">Comp.:</span>
            <span className="font-medium text-slate-700">{currentLeague}</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${coverageColors[coverage.color]}`}>
              <CoverageIcon className={`w-3 h-3 ${coverage.color === 'blue' ? 'animate-spin' : ''}`} /> {coverage.label}
            </span>
            {lastSync && (
              <span className="text-xs text-slate-400 hidden sm:inline">
                {new Date(lastSync).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtros */}
          <Select value={leagueFilter} onValueChange={setLeagueFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las comp.</SelectItem>
              {leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {clubs.length > 1 && (
            <Select value={clubFilter} onValueChange={setClubFilter}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clubes</SelectItem>
                {clubs.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 mr-0.5">Período:</span>
            {['5', '10', 'season'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-2 py-1 rounded ${period === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {p === '5' ? 'Últ. 5' : p === '10' ? 'Últ. 10' : 'Temporada'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 mr-0.5">Vista:</span>
            {['totals', 'per90'].map(v => (
              <button key={v} onClick={() => setViewMode(v)} className={`px-2 py-1 rounded ${viewMode === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {v === 'totals' ? 'Totales' : 'Por 90'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="h-8 text-xs">
                {syncing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Actualizar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting} className="h-8 text-xs">
              {exporting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />} Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* BLOCK 1: Summary cards */}
      <StatsSummaryCards cards={summaryCards} position={player.position} />

      {/* BLOCK 2: Sección de préstamo y club */}
      <PlayerTransferStatus player={player} clubData={clubData} />

      {/* BLOCK 3: Charts */}
      <StatsCharts
        matchStats={filteredMatchStats}
        seasonStats={filteredSeasonStats}
        position={player.position}
        minutesPeriod={minutesPeriod}
        onMinutesPeriodChange={setMinutesPeriod}
      />

      {/* BLOCK 4: Position metrics table */}
      <div className="border border-slate-200 rounded-lg p-4">
        <StatsPositionTable metrics={positionMetrics} position={player.position} viewMode={viewMode} />
      </div>

      {/* BLOCK 5: Key insights */}
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Claves para la representación</h3>
        <div className="space-y-2">
          {keyInsights.length > 0 ? keyInsights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
              <span className="text-sm text-slate-700 flex-1">{ins.text}</span>
              <span className="text-xs text-slate-400 whitespace-nowrap">{ins.sample}</span>
            </div>
          )) : <p className="text-sm text-slate-400">Sin datos suficientes para generar conclusiones</p>}
        </div>
      </div>

      {/* BLOCK 6: Match table */}
      <StatsMatchTable matchStats={filteredMatchStats} fixtures={fixtures} position={player.position} />

      {/* BLOCK 7: Coverage footer */}
      <div className="border-t pt-3 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5">
          <Clock4 className="w-3 h-3" />
          <span>
            Proveedor: API-Football v3 {player.sofascore_id ? '+ Sofascore' : ''} · Última sync: {lastSync ? new Date(lastSync).toLocaleString('es-AR') : '—'} · Temporada: {season}
          </span>
        </div>
        <p>
          Estado: {coverage.label} · Partidos con datos: {matchStats.length} · Partidos sin datos: {Math.max(0, (fixtures.length) - matchStats.length)}
        </p>
        <p className="text-slate-300 italic">Los datos dependen de la cobertura proporcionada por la competencia y el proveedor.</p>
      </div>

      {showLink && <LinkPlayerDialog player={player} organizationId={orgId} onClose={() => setShowLink(false)} onLinked={() => { setShowLink(false); loadData(); }} />}
    </div>
  );
}