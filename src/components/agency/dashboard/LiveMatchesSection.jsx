import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId } from '@/lib/roleUtils';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { Radio, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import LiveMatchCard from '@/components/agency/dashboard/LiveMatchCard';
import LiveMatchDetailModal from '@/components/agency/dashboard/LiveMatchDetailModal';

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function LiveMatchesSection({ onNavigateToPlayer }) {
  const { user } = useAuth();
  const orgId = getUserOrgId(user);

  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadFixtures = useCallback(async (silent = false) => {
    if (!orgId) { setLoading(false); return; }
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(false);
      const res = await base44.functions.invoke('getLiveFixtures', { organization_id: orgId });
      setFixtures(res.fixtures || []);
    } catch (err) {
      console.error('Live fixtures error:', err);
      if (!silent) setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  const hasLive = fixtures.some(f => f.is_live);

  // Auto-refresh only when there are live matches
  useEffect(() => {
    if (!hasLive) return;
    const interval = setInterval(() => {
      loadFixtures(true);
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [hasLive, loadFixtures]);

  const liveFixtures = fixtures.filter(f => f.is_live);
  const otherFixtures = fixtures.filter(f => !f.is_live);
  const sortedFixtures = [...liveFixtures, ...otherFixtures];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-5 h-5 text-green-600 animate-pulse" />
          <h2 className="text-base font-bold text-slate-900">Partidos en Vivo · Liga Profesional</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Radio className="w-5 h-5 text-green-600" />
          <h2 className="text-base font-bold text-slate-900">Partidos en Vivo · Liga Profesional</h2>
        </div>
        <p className="text-sm text-slate-500 mb-2">No se pudieron cargar los partidos.</p>
        <Button variant="outline" size="sm" onClick={() => loadFixtures()}>Reintentar</Button>
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Radio className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-900">Partidos en Vivo · Liga Profesional</h2>
        </div>
        <p className="text-sm text-slate-500">No hay partidos en vivo ahora mismo.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-white rounded-xl border-2 border-green-200 p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Image
            src="https://api-sports.io/logos/leagues/128.png"
            alt="Liga Profesional"
            className="w-8 h-8 object-contain"
          />
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {hasLive ? (
                <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" /> EN VIVO
                </span>
              ) : null}
              Partidos de Hoy · Liga Profesional
            </h2>
            <p className="text-xs text-slate-500">
              {liveFixtures.length} en vivo · {otherFixtures.length} {hasLive ? 'resto' : 'del día'}
              {hasLive && ' · actualización automática cada 30s'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadFixtures(true)}
            disabled={refreshing}
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {!hasLive && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? 'Ocultar' : 'Ver partidos del día'}
            </Button>
          )}
        </div>
      </div>

      {hasLive ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedFixtures.map(f => (
            <LiveMatchCard key={f.fixture_id} fixture={f} onClick={setSelectedFixture} />
          ))}
        </div>
      ) : expanded ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedFixtures.map(f => (
            <LiveMatchCard key={f.fixture_id} fixture={f} onClick={setSelectedFixture} />
          ))}
        </div>
      ) : null}

      <LiveMatchDetailModal
        fixture={selectedFixture}
        open={!!selectedFixture}
        onClose={() => setSelectedFixture(null)}
        onViewPlayerStats={(p) => {
          setSelectedFixture(null);
          onNavigateToPlayer?.(p);
        }}
      />
    </div>
  );
}