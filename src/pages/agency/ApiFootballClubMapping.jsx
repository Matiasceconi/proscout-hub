import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, isOrgAdmin } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/shared/UIBits';
import { ChevronLeft, Link2, Plus, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react';
import ClubCreateDialog from '@/components/agency/club-mapping/ClubCreateDialog';
import ApiTeamSearchDialog from '@/components/agency/club-mapping/ApiTeamSearchDialog';

export default function ApiFootballClubMapping() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = getUserOrgId(user);
  const urlParams = new URLSearchParams(window.location.search);
  const ctxClubId = urlParams.get('club_id');
  const ctxClubName = urlParams.get('club_name');
  const ctxPersonType = urlParams.get('person_type');
  const ctxPersonId = urlParams.get('person_id');
  const returnTo = urlParams.get('return_to');
  const action = urlParams.get('action');

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTarget, setSearchTarget] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { if (action === 'sync' && ctxClubId) handleSync(ctxClubId); }, []);

  const loadDashboard = async () => {
    try {
      const res = await base44.functions.invoke('getClubMappingDashboard', { organization_id: orgId });
      setDashboard(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSync = async (clubId) => {
    setSyncing(true); setSyncResult(null);
    try {
      const mappings = await base44.entities.ClubProviderMapping.filter({ organization_id: orgId, club_id: clubId, provider: 'api_football' });
      if (mappings.length === 0) { setSyncResult({ error: 'El club no tiene mapping' }); setSyncing(false); return; }
      const res = await base44.functions.invoke('syncClubFixtures', { organization_id: orgId, club_id: clubId, provider_team_id: mappings[0].provider_team_id, sync_type: 'manual' });
      setSyncResult(res.data);
      loadDashboard();
    } catch (err) { setSyncResult({ error: err.message }); }
    setSyncing(false);
  };

  const handleAssignClub = async (clubId) => {
    if (!ctxPersonType || !ctxPersonId) return;
    setAssigning(true);
    try {
      await base44.functions.invoke('resolveCurrentClub', { person_type: ctxPersonType, person_id: ctxPersonId, organization_id: orgId, manual_club_id: clubId });
      loadDashboard();
    } catch (err) { console.error(err); }
    setAssigning(false);
  };

  const handleCreated = (club) => {
    setShowCreate(false);
    if (ctxPersonType && ctxPersonId) handleAssignClub(club.id);
    setSearchTarget(club);
  };

  const handleBack = () => {
    if (returnTo) navigate(returnTo);
    else navigate('/agency/settings');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <button onClick={handleBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> Volver
      </button>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Vinculación API-Football</h1>
      <p className="text-sm text-slate-400 mb-6">Gestiona clubes, vínculos con API-Football y sincronización de fixtures</p>

      {/* Context panel */}
      {(ctxClubName || ctxClubId) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          {ctxClubName && !ctxClubId && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-700">La trayectoria indica &ldquo;{ctxClubName}&rdquo;, pero todavía no está vinculada con un club interno.</p>
                <p className="text-xs text-slate-400 mt-1">Busca un club existente o crea uno nuevo.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Crear club</Button>
              </div>
            </div>
          )}
          {ctxClubId && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-700">Club seleccionado. Vincula con API-Football o sincroniza fixtures.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  const allClubs = dashboard?.unlinked?.find(u => u.club.id === ctxClubId)?.club ||
                    dashboard?.linked?.find(l => l.club.id === ctxClubId)?.club;
                  if (allClubs) setSearchTarget(allClubs);
                  else base44.entities.Club.get(ctxClubId).then(c => setSearchTarget(c));
                }}><Link2 className="w-3.5 h-3.5 mr-1" /> Vincular</Button>
                <Button size="sm" onClick={() => handleSync(ctxClubId)} disabled={syncing}>
                  {syncing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />} Sincronizar
                </Button>
              </div>
            </div>
          )}
          {syncResult && (
            <div className={`mt-3 p-2 rounded text-sm ${syncResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {syncResult.error || `Importados: ${syncResult.fixtures_imported || 0} · Actualizados: ${syncResult.fixtures_updated || 0}`}
            </div>
          )}
        </div>
      )}

      {/* Pending */}
      {dashboard?.pending?.length > 0 && (
        <Section title="Pendientes de crear o conciliar" icon={AlertTriangle} color="text-amber-600">
          {dashboard.pending.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-3 border border-slate-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-800">{p.person_name}</p>
                <p className="text-xs text-slate-400">{p.club_name}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Buscar o crear
              </Button>
            </div>
          ))}
        </Section>
      )}

      {/* Unlinked */}
      {dashboard?.unlinked?.length > 0 && (
        <Section title="Clubes sin vincular con API-Football" icon={Link2} color="text-blue-600">
          {dashboard.unlinked.map(({ club, persons }) => (
            <div key={club.id} className="flex items-center justify-between gap-3 p-3 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                {club.internal_logo_url && <img src={club.internal_logo_url} alt="" className="w-8 h-8 object-contain" />}
                <div>
                  <p className="text-sm font-medium text-slate-800">{club.club_name}</p>
                  <p className="text-xs text-slate-400">{persons.length} persona(s) · {club.country} {club.city ? `· ${club.city}` : ''}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSearchTarget(club)}><Link2 className="w-3.5 h-3.5 mr-1" /> Vincular</Button>
            </div>
          ))}
        </Section>
      )}

      {/* Linked */}
      {dashboard?.linked?.length > 0 && (
        <Section title="Clubes vinculados" icon={CheckCircle2} color="text-green-600">
          {dashboard.linked.map(({ club, mapping, persons_count }) => (
            <div key={club.id} className="flex items-center justify-between gap-3 p-3 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                {club.internal_logo_url && <img src={club.internal_logo_url} alt="" className="w-8 h-8 object-contain" />}
                <div>
                  <p className="text-sm font-medium text-slate-800">{club.club_name}</p>
                  <p className="text-xs text-slate-400">{mapping.provider_team_name} · {persons_count} persona(s)</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleSync(club.id)} disabled={syncing}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sincronizar
              </Button>
            </div>
          ))}
        </Section>
      )}

      {/* Ambiguous */}
      {dashboard?.ambiguous?.length > 0 && (
        <Section title="Coincidencias ambiguas" icon={AlertTriangle} color="text-orange-600">
          {dashboard.ambiguous.map(({ club, mapping }) => (
            <div key={club.id} className="flex items-center justify-between gap-3 p-3 border border-slate-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-800">{club.club_name}</p>
                <p className="text-xs text-slate-400">{mapping.provider_team_name}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSearchTarget(club)}>Revisar</Button>
            </div>
          ))}
        </Section>
      )}

      {/* Errors */}
      {dashboard?.errors?.length > 0 && (
        <Section title="Errores de sincronización" icon={AlertTriangle} color="text-red-600">
          {dashboard.errors.map((log, i) => (
            <div key={i} className="p-3 border border-red-200 rounded-lg bg-red-50/50">
              <p className="text-sm font-medium text-slate-800">{log.club_name || 'Club'}</p>
              <p className="text-xs text-red-600">{log.errors?.join(', ') || 'Error desconocido'}</p>
              <p className="text-xs text-slate-400 mt-1">{new Date(log.sync_date).toLocaleString('es-AR')}</p>
            </div>
          ))}
        </Section>
      )}

      {showCreate && <ClubCreateDialog initialName={ctxClubName} onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {searchTarget && <ApiTeamSearchDialog club={searchTarget} organization_id={orgId} user={user} onClose={() => { setSearchTarget(null); loadDashboard(); }} onLinked={() => loadDashboard()} />}
    </div>
  );
}

function Section({ title, icon: Icon, color, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} /> {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}