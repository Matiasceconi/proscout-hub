import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, getUserRole, calculateAge, POSITION_LABELS, PLAYER_CATEGORIES } from '@/lib/roleUtils';
import { PageHeader, Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Radar, Search, Plus, X, Loader2, Trash2, Pencil, ArrowRight, Lightbulb, Target, TrendingUp, Eye, Calendar, ClipboardCheck } from 'lucide-react';
import NewScoutingTargetDialog from '@/components/agency/NewScoutingTargetDialog';
import NewScoutingObservationDialog from '@/components/agency/NewScoutingObservationDialog';
import ProfileAvatar from '@/components/shared/ProfileAvatar';

const SCOUTING_STATUS_LABELS = {
  monitoring: 'Monitoreo',
  contacted: 'Contactado',
  interest: 'Con interés',
  negotiation: 'En negociación',
  signed: 'Firmado',
  rejected: 'Descartado',
  archived: 'Archivado'
};

const SCOUTING_STATUS_COLORS = {
  monitoring: 'bg-slate-100 text-slate-600 border-slate-200',
  contacted: 'bg-blue-100 text-blue-700 border-blue-200',
  interest: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  negotiation: 'bg-amber-100 text-amber-700 border-amber-200',
  signed: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  archived: 'bg-gray-100 text-gray-500 border-gray-200'
};

const PRIORITY_COLORS = {
  high: 'bg-rose-50 text-rose-700 border-rose-100',
  medium: 'bg-amber-50 text-amber-800 border-amber-100',
  low: 'bg-slate-50 text-slate-600 border-slate-200'
};

const PRIORITY_LABELS = { high: 'Alta', medium: 'Media', low: 'Baja' };
const RECOMMENDATION_LABELS = { strong_yes: 'Prioridad alta', yes: 'Recomendable', monitor: 'Seguir observando', no: 'No avanzar' };
const RECOMMENDATION_COLORS = {
  strong_yes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  yes: 'bg-green-50 text-green-700 border-green-200',
  monitor: 'bg-amber-50 text-amber-700 border-amber-200',
  no: 'bg-red-50 text-red-700 border-red-200'
};

const IMPROVEMENTS = [
  { icon: Target, title: 'Matching con necesidades de clubes', desc: 'Cruzar objetivos de captación con las necesidades reales de clubes registrados en la mesa de mercado, mostrando coincidencias por posición y categoría.' },
  { icon: TrendingUp, title: 'Conversión a jugador representado', desc: 'Al marcar un objetivo como "Firmado", crear automáticamente la ficha de jugador con los datos ya cargados y vincularlo mediante converted_player_id.' },
  { icon: Calendar, title: 'Seguimiento con calendario', desc: 'Agendar la próxima acción de cada objetivo directamente en el calendario operativo, con recordatorios y responsable asignado.' },
  { icon: Eye, title: 'Integración con API-Football', desc: 'Vincular objetivos con perfiles de API-Football para importar estadísticas y partidos automáticamente, igual que con jugadores representados.' },
  { icon: Radar, title: 'Informes de scouting exportables', desc: 'Generar PDFs de captación con foto, datos, fortalezas/debilidades y video highlights para compartir con socios o clubes interesados.' }
];

export default function Scouting() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const orgId = getUserOrgId(user);
  const role = getUserRole(user);
  const canManage = ['organization_owner', 'organization_admin', 'representative'].includes(role);

  const [targets, setTargets] = useState([]);
  const [observations, setObservations] = useState([]);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', position: 'all', category: 'all' });
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [observationTarget, setObservationTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const primaryColor = org?.primary_color || '#0F172A';

  useEffect(() => {
    if (orgId) {
      loadTargets();
      loadObservations();
      base44.entities.Organization.get(orgId).then(setOrg).catch(() => {});
    }
  }, [orgId]);

  const loadTargets = async () => {
    try {
      const data = await base44.entities.ScoutingTarget.filter({ organization_id: orgId }, '-updated_date', 300);
      setTargets(data.filter(t => t.scouting_status !== 'archived'));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadObservations = async () => {
    try {
      const data = await base44.entities.ScoutingObservation.filter({ organization_id: orgId }, '-observation_date', 500);
      setObservations(data);
    } catch (err) {
      console.error(err);
      setObservations([]);
    }
  };

  const filtered = useMemo(() => {
    return targets.filter(t => {
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${t.first_name} ${t.last_name}`.toLowerCase();
        if (!fullName.includes(q) && !(t.current_club || '').toLowerCase().includes(q)) return false;
      }
      if (filters.status !== 'all' && t.scouting_status !== filters.status) return false;
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (filters.position !== 'all' && t.position !== filters.position) return false;
      if (filters.category !== 'all' && t.category !== filters.category) return false;
      return true;
    });
  }, [targets, search, filters]);

  const hasActiveFilters = search || Object.values(filters).some(v => v !== 'all');
  const clearFilters = () => { setSearch(''); setFilters({ status: 'all', priority: 'all', position: 'all', category: 'all' }); };

  const observationCountByTarget = useMemo(() => {
    const counts = {};
    observations.forEach(o => { counts[o.scouting_target_id] = (counts[o.scouting_target_id] || 0) + 1; });
    return counts;
  }, [observations]);

  const latestObservations = useMemo(() => observations.slice(0, 8), [observations]);

  const stats = useMemo(() => ({
    total: targets.length,
    monitoring: targets.filter(t => t.scouting_status === 'monitoring').length,
    contacted: targets.filter(t => ['contacted', 'interest', 'negotiation'].includes(t.scouting_status)).length,
    signed: targets.filter(t => t.scouting_status === 'signed').length,
    highPriority: targets.filter(t => t.priority === 'high').length,
    observations: observations.length
  }), [targets, observations]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const relatedObservations = await base44.entities.ScoutingObservation.filter({ organization_id: orgId, scouting_target_id: deleteTarget.id }, '-created_date', 500).catch(() => []);
      for (const observation of relatedObservations) await base44.entities.ScoutingObservation.delete(observation.id);
      await base44.entities.ScoutingTarget.delete(deleteTarget.id);
      setDeleteTarget(null);
      await Promise.all([loadTargets(), loadObservations()]);
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  const handleConvert = async (target) => {
    if (!confirm(`¿Crear ficha de jugador representado para ${target.first_name} ${target.last_name}?`)) return;
    setActionLoading(true);
    try {
      const playerData = {
        organization_id: orgId,
        first_name: target.first_name,
        last_name: target.last_name,
        birth_date: target.birth_date || '',
        nationality: target.nationality || '',
        position: target.position,
        secondary_position: target.secondary_position || undefined,
        preferred_foot: target.preferred_foot || 'right',
        club: target.current_club || '',
        competition: target.competition || '',
        category: target.category || 'primera_division',
        photo_url: target.photo_url || '',
        height: target.height || undefined,
        weight: target.weight || undefined,
        status: 'active',
        availability_status: 'available',
        portal_status: 'not_invited'
      };
      const player = await base44.entities.Player.create(playerData);
      await base44.entities.ScoutingTarget.update(target.id, { scouting_status: 'signed', converted_player_id: player.id });
      await loadTargets();
      navigate(`/agency/players/${player.id}`);
    } catch (err) {
      alert('Error al convertir el objetivo: ' + (err.message || ''));
    }
    setActionLoading(false);
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Captación"
        subtitle={`${filtered.length} de ${targets.length} objetivos de scouting`}
        actions={canManage ? (
          <Button onClick={() => setShowNew(true)} style={{ backgroundColor: primaryColor }} className="hover:opacity-90">
            <Plus className="w-4 h-4 mr-1" /> Nuevo objetivo
          </Button>
        ) : undefined}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        {[
          { label: 'Total objetivos', value: stats.total, color: 'text-slate-800' },
          { label: 'En monitoreo', value: stats.monitoring, color: 'text-slate-600' },
          { label: 'En gestión', value: stats.contacted, color: 'text-blue-600' },
          { label: 'Observaciones', value: stats.observations, color: 'text-violet-600' },
          { label: 'Firmados', value: stats.signed, color: 'text-green-600' },
          { label: 'Prioridad alta', value: stats.highPriority, color: 'text-rose-600' }
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o club..." className="pl-9" />
          </div>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="text-xs"><X className="w-3.5 h-3.5 mr-1" /> Limpiar</Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={filters.status} onChange={v => setFilters(f => ({ ...f, status: v }))} placeholder="Estado" options={SCOUTING_STATUS_LABELS} />
          <FilterSelect value={filters.priority} onChange={v => setFilters(f => ({ ...f, priority: v }))} placeholder="Prioridad" options={PRIORITY_LABELS} />
          <FilterSelect value={filters.position} onChange={v => setFilters(f => ({ ...f, position: v }))} placeholder="Posición" options={POSITION_LABELS} />
          <FilterSelect value={filters.category} onChange={v => setFilters(f => ({ ...f, category: v }))} placeholder="Categoría" options={PLAYER_CATEGORIES} />
        </div>
      </div>

      {actionLoading && (
        <div className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg px-4 py-2 border border-slate-200 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> Procesando...
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse"><div className="h-32 bg-slate-100 rounded mb-3" /><div className="h-4 bg-slate-100 rounded w-2/3 mb-2" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div>)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Radar}
          title={targets.length === 0 ? "Todavía no cargaste objetivos de captación." : "Sin resultados"}
          description={targets.length === 0 ? "Registrá jugadores a seguir, contactar o evaluar para sumar a tu cartera." : "No se encontraron objetivos con los filtros aplicados."}
          action={canManage && targets.length === 0 && (
            <Button onClick={() => setShowNew(true)} style={{ backgroundColor: primaryColor }} className="hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" /> Agregar primer objetivo
            </Button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(target => (
            <ScoutingCard
              key={target.id}
              target={target}
              canManage={canManage}
              primaryColor={primaryColor}
              observationCount={observationCountByTarget[target.id] || 0}
              onObserve={() => setObservationTarget(target)}
              onEdit={() => setEditTarget(target)}
              onDelete={() => setDeleteTarget(target)}
              onConvert={() => handleConvert(target)}
            />
          ))}
        </div>
      )}

      {/* Historial reciente de observaciones */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-violet-600" /><h2 className="text-lg font-bold text-slate-900">Observaciones recientes</h2></div>
            <p className="mt-1 text-sm text-slate-500">Historial de evaluaciones antes de incorporar un jugador a la cartera.</p>
          </div>
        </div>
        {latestObservations.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {latestObservations.map(observation => (
              <article key={observation.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{observation.target_name || 'Prospecto'}</p>
                    <p className="mt-1 text-xs text-slate-500">{observation.observation_date ? new Date(observation.observation_date + 'T12:00:00').toLocaleDateString('es-AR') : 'Sin fecha'} · {observation.observation_type || 'observación'}</p>
                  </div>
                  <Badge className={RECOMMENDATION_COLORS[observation.recommendation] || RECOMMENDATION_COLORS.monitor}>
                    {RECOMMENDATION_LABELS[observation.recommendation] || 'Seguir observando'}
                  </Badge>
                </div>
                {(observation.technical_rating || observation.tactical_rating || observation.physical_rating || observation.mentality_rating) && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {[['Téc',observation.technical_rating],['Tác',observation.tactical_rating],['Fís',observation.physical_rating],['Men',observation.mentality_rating]].map(([label,value]) => (
                      <div key={label} className="rounded-lg bg-slate-50 px-2 py-2 text-center"><p className="text-[10px] uppercase text-slate-400">{label}</p><p className="text-sm font-bold text-slate-800">{value ?? '—'}</p></div>
                    ))}
                  </div>
                )}
                {observation.summary && <p className="mt-3 text-xs leading-5 text-slate-600 line-clamp-3">{observation.summary}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Todavía no hay observaciones registradas. Abrí un prospecto y cargá la primera evaluación.</div>
        )}
      </div>

      {/* Propuestas de mejora */}
      <div className="mt-8 rounded-2xl bg-slate-900 text-white p-6">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold">Propuestas de mejora para el módulo</h2>
        </div>
        <p className="text-sm text-slate-300 mb-5">Evoluciones planificadas para potenciar la captación, conectándola con el resto de la plataforma.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {IMPROVEMENTS.map((item, i) => (
            <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <item.icon className="w-4.5 h-4.5 text-emerald-400" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-5">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNew && <NewScoutingTargetDialog open={showNew} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); loadTargets(); }} orgId={orgId} primaryColor={primaryColor} />}
      {editTarget && <NewScoutingTargetDialog open={!!editTarget} target={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); loadTargets(); }} orgId={orgId} primaryColor={primaryColor} />}
      {observationTarget && <NewScoutingObservationDialog open target={observationTarget} orgId={orgId} user={user} primaryColor={primaryColor} onClose={() => setObservationTarget(null)} onSaved={() => { setObservationTarget(null); Promise.all([loadTargets(), loadObservations()]); }} />}
      {deleteTarget && (
        <Dialog open onOpenChange={() => !actionLoading && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Eliminar objetivo</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600">¿Seguro que querés eliminar a <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong> del módulo de captación? Esta acción no se puede deshacer.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={actionLoading}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        {Object.entries(options).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ScoutingCard({ target, canManage, primaryColor, observationCount, onObserve, onEdit, onDelete, onConvert }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const age = calculateAge(target.birth_date);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="relative p-4 pb-3">
        <div className="flex items-start gap-3">
          <ProfileAvatar
            photoUrl={target.photo_url}
            firstName={target.first_name}
            lastName={target.last_name}
            size="md"
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-900 truncate">{target.first_name} {target.last_name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {age ? `${age} años · ` : ''}{POSITION_LABELS[target.position] || target.position}
            </p>
            {target.current_club && <p className="text-xs text-slate-400 mt-0.5 truncate">{target.current_club}</p>}
          </div>
          {canManage && (
            <div className="relative">
              <button onClick={() => setMenuOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1">
                    <button onClick={() => { setMenuOpen(false); onObserve(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-violet-700 hover:bg-violet-50"><ClipboardCheck className="w-4 h-4" /> Nueva observación</button>
                    <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-50"><Pencil className="w-4 h-4" /> Editar</button>
                    {target.scouting_status !== 'signed' && (
                      <button onClick={() => { setMenuOpen(false); onConvert(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-emerald-700 hover:bg-emerald-50"><ArrowRight className="w-4 h-4" /> Convertir en jugador</button>
                    )}
                    <button onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /> Eliminar</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        <Badge className={SCOUTING_STATUS_COLORS[target.scouting_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
          {SCOUTING_STATUS_LABELS[target.scouting_status] || 'Monitoreo'}
        </Badge>
        <Badge className={PRIORITY_COLORS[target.priority] || PRIORITY_COLORS.medium}>
          {PRIORITY_LABELS[target.priority] || 'Media'}
        </Badge>
        {target.category && <Badge className="bg-slate-100 text-slate-500 border-slate-200">{PLAYER_CATEGORIES[target.category] || target.category}</Badge>}
        <Badge className="bg-violet-50 text-violet-700 border-violet-200">{observationCount || 0} obs.</Badge>
      </div>

      {(target.strengths || target.next_action || target.contract_end || target.estimated_value) && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
          {target.strengths && <p className="flex gap-1.5"><span className="font-semibold text-slate-400">F:</span><span className="line-clamp-2">{target.strengths}</span></p>}
          {target.next_action && <p className="flex gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" /><span className="line-clamp-1">{target.next_action}</span></p>}
          {target.contract_end && <p><span className="text-slate-400">Contrato:</span> {new Date(target.contract_end + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
          {target.estimated_value && <p><span className="text-slate-400">Valor:</span> {target.estimated_value}</p>}
        </div>
      )}

      {target.video_url && (
        <div className="px-4 pb-3">
          <a href={target.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 font-medium hover:underline">Ver video de highlights →</a>
        </div>
      )}
    </div>
  );
}