import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Clock3, Radio, RefreshCw, ShieldCheck } from 'lucide-react';
import LiveMatchCard from '@/components/agency/dashboard/LiveMatchCard';
import LiveMatchDetailModal from '@/components/agency/dashboard/LiveMatchDetailModal';

const LIVE_REFRESH_MS = 60_000;
const IDLE_REFRESH_MS = 120_000;

function formatUpdatedAt(value) {
  if (!value) return 'Sin actualizar';
  return new Date(value).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export default function LiveMatchesSection({ onNavigateToPlayer }) {
  const { user } = useAuth();
  const orgId = getUserOrgId(user);
  const [fixtures, setFixtures] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadFixtures = useCallback(async (silent = false) => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(false);
      const response = await base44.functions.invoke('getLiveFixtures', {
        organization_id: orgId,
      });
      const data = response.data || {};
      setFixtures((data.fixtures || []).filter((fixture) => fixture.is_live));
      setMeta(data);
    } catch (requestError) {
      console.error('Live fixtures error:', requestError);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  useEffect(() => {
    const delay = fixtures.length > 0 ? LIVE_REFRESH_MS : IDLE_REFRESH_MS;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadFixtures(true);
    }, delay);
    return () => window.clearInterval(interval);
  }, [fixtures.length, loadFixtures]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadFixtures(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadFixtures]);

  if (loading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-xl bg-emerald-500/20" />
          <div className="space-y-2">
            <div className="h-4 w-44 animate-pulse rounded bg-white/15" />
            <div className="h-3 w-64 max-w-[70vw] animate-pulse rounded bg-white/10" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-red-900">No pudimos consultar los partidos en vivo</p>
          <p className="text-sm text-red-700">La información almacenada de Score Fútbol no fue modificada.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadFixtures()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
        </Button>
      </section>
    );
  }

  if (fixtures.length === 0) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <Radio className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Representados en vivo</h2>
            <p className="text-sm text-slate-500">No hay jugadores de Score Fútbol disputando un partido ahora.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-14 text-xs text-slate-400 sm:pl-0">
          <Clock3 className="h-3.5 w-3.5" />
          Actualizado {formatUpdatedAt(meta?.updated_at)}
          <button
            type="button"
            onClick={() => loadFixtures(true)}
            disabled={refreshing}
            className="ml-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            aria-label="Actualizar partidos en vivo"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl shadow-slate-900/10">
      <div className="h-1 bg-emerald-500" />
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black tracking-wide text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              EN VIVO
            </span>
            <div>
              <h2 className="text-lg font-black text-white">Representados jugando ahora</h2>
              <p className="text-xs text-slate-400">
                {fixtures.length} {fixtures.length === 1 ? 'partido' : 'partidos'} · {meta?.represented_players || 0} representados
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Solo cartera de Score Fútbol
            </span>
            <button
              type="button"
              onClick={() => loadFixtures(true)}
              disabled={refreshing}
              className="rounded-lg border border-white/10 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              aria-label="Actualizar partidos en vivo"
              title={`Actualizado ${formatUpdatedAt(meta?.updated_at)}`}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {fixtures.map((fixture) => (
            <LiveMatchCard
              key={fixture.fixture_id}
              fixture={fixture}
              onClick={setSelectedFixture}
            />
          ))}
        </div>

        <p className="mt-3 text-right text-[11px] text-slate-500">
          API-Football · actualización automática cada minuto · {formatUpdatedAt(meta?.updated_at)}
        </p>
      </div>

      <LiveMatchDetailModal
        fixture={selectedFixture}
        open={Boolean(selectedFixture)}
        onClose={() => setSelectedFixture(null)}
        onViewPlayerStats={(player) => {
          setSelectedFixture(null);
          onNavigateToPlayer?.(player);
        }}
      />
    </section>
  );
}
