import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, isOrgAdmin, calculateAge, POSITION_LABELS, PLAYER_CATEGORIES, SPORTING_STATUS_LABELS, SPORTING_STATUS_COLORS, PORTAL_STATUS_LABELS, PORTAL_STATUS_COLORS, formatDate } from '@/lib/roleUtils';
import { PageHeader, Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Search, LayoutGrid, Table as TableIcon, Plus, Filter, X, Loader2, Download } from 'lucide-react';
import PlayerCard from '@/components/agency/PlayerCard';
import NewPlayerDialog from '@/components/agency/NewPlayerDialog';
import ProfileAvatar from '@/components/shared/ProfileAvatar';

const SPORTING_STATUS_OPTIONS = ['available', 'injured', 'rehabilitation', 'on_loan', 'transferred', 'no_club', 'inactive', 'available_with_restrictions', 'differentiated_training', 'partial_reintegration', 'medical_discharge', 'sport_discharge'];

export default function Players() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const orgId = getUserOrgId(user);
  const canManage = isOrgAdmin(user);

  const [players, setPlayers] = useState([]);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem('playersView') || 'cards');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    category: 'all', position: 'all', club: 'all', competition: 'all',
    status: 'all', representative: 'all', portal: 'all'
  });
  const [showNew, setShowNew] = useState(searchParams.get('action') === 'new');
  const [editPlayer, setEditPlayer] = useState(null);
  const [statusPlayer, setStatusPlayer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statsData, setStatsData] = useState({ players: {}, season_display: '' });

  const primaryColor = org?.primary_color || '#0F172A';

  useEffect(() => {
    if (orgId) {
      loadPlayers();
      loadStats();
      base44.entities.Organization.get(orgId).then(setOrg).catch(() => {});
    }
  }, [orgId]);

  const loadPlayers = async () => {
    try {
      const data = await base44.entities.Player.filter({ organization_id: orgId }, '-updated_date', 300);
      setPlayers(data.filter(p => p.status !== 'archived'));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const response = await base44.functions.invoke('getPlayerCardsStats', { organization_id: orgId });
      setStatsData(response.data || { players: {}, season_display: '' });
    } catch (err) { console.error(err); }
  };

  const clubs = useMemo(() => Array.from(new Set(players.map(p => p.club).filter(Boolean))).sort(), [players]);
  const competitions = useMemo(() => Array.from(new Set(players.map(p => p.competition).filter(Boolean))).sort(), [players]);
  const representatives = useMemo(() => Array.from(new Set(players.map(p => p.representative_name).filter(Boolean))).sort(), [players]);

  const filtered = useMemo(() => {
    return players.filter(p => {
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        if (!fullName.includes(q)) return false;
      }
      if (filters.category !== 'all' && p.category !== filters.category) return false;
      if (filters.position !== 'all' && p.position !== filters.position) return false;
      if (filters.club !== 'all' && p.club !== filters.club) return false;
      if (filters.competition !== 'all' && p.competition !== filters.competition) return false;
      if (filters.status !== 'all' && p.availability_status !== filters.status) return false;
      if (filters.representative !== 'all' && p.representative_name !== filters.representative) return false;
      if (filters.portal !== 'all' && p.portal_status !== filters.portal) return false;
      return true;
    });
  }, [players, search, filters]);

  const hasActiveFilters = search || Object.values(filters).some(v => v !== 'all');

  const clearFilters = () => {
    setSearch('');
    setFilters({ category: 'all', position: 'all', club: 'all', competition: 'all', status: 'all', representative: 'all', portal: 'all' });
  };

  const toggleView = (v) => {
    setView(v);
    localStorage.setItem('playersView', v);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportPlayersCsv', { organization_id: orgId });
      const csv = response.data?.csv || '';
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jugadores_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
    setExporting(false);
  };

  const handleAction = async (action, player) => {
    if (action === 'view') { navigate(`/agency/players/${player.id}`); return; }
    if (action === 'edit') { setEditPlayer(player); return; }
    if (action === 'status') { setStatusPlayer(player); return; }

    setActionLoading(true);
    try {
      if (['invite', 'resend', 'suspend', 'reactivate'].includes(action)) {
        await base44.functions.invoke('managePlayerPortalAccess', { action, player_id: player.id });
      } else if (action === 'archive') {
        await base44.entities.Player.update(player.id, { status: 'archived' });
      }
      await loadPlayers();
      loadStats();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Jugadores"
        subtitle={`${filtered.length} de ${players.length} jugadores encontrados`}
        actions={(
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={exporting || players.length === 0}>
              {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
            {canManage && (
              <Button onClick={() => setShowNew(true)} style={{ backgroundColor: primaryColor }} className="hover:opacity-90">
                <Plus className="w-4 h-4 mr-1" /> Agregar jugador
              </Button>
            )}
          </div>
        )}
      />

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o apellido..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="text-xs">
                <X className="w-3.5 h-3.5 mr-1" /> Limpiar filtros
              </Button>
            )}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => toggleView('cards')} className={`p-2.5 ${view === 'cards' ? 'text-white' : 'text-slate-400 hover:bg-slate-100'}`} style={view === 'cards' ? { backgroundColor: primaryColor } : {}}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => toggleView('table')} className={`p-2.5 ${view === 'table' ? 'text-white' : 'text-slate-400 hover:bg-slate-100'}`} style={view === 'table' ? { backgroundColor: primaryColor } : {}}>
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterSelect value={filters.category} onChange={v => setFilters(f => ({ ...f, category: v }))} placeholder="Categoría" options={PLAYER_CATEGORIES} />
          <FilterSelect value={filters.position} onChange={v => setFilters(f => ({ ...f, position: v }))} placeholder="Posición" options={POSITION_LABELS} />
          <FilterSelect value={filters.status} onChange={v => setFilters(f => ({ ...f, status: v }))} placeholder="Estado deportivo" options={SPORTING_STATUS_LABELS} />
          <FilterSelect value={filters.portal} onChange={v => setFilters(f => ({ ...f, portal: v }))} placeholder="Estado del portal" options={PORTAL_STATUS_LABELS} />
          {clubs.length > 0 && <FilterSelect value={filters.club} onChange={v => setFilters(f => ({ ...f, club: v }))} placeholder="Club" options={Object.fromEntries(clubs.map(c => [c, c]))} />}
          {competitions.length > 0 && <FilterSelect value={filters.competition} onChange={v => setFilters(f => ({ ...f, competition: v }))} placeholder="Competencia" options={Object.fromEntries(competitions.map(c => [c, c]))} />}
          {representatives.length > 0 && <FilterSelect value={filters.representative} onChange={v => setFilters(f => ({ ...f, representative: v }))} placeholder="Representante" options={Object.fromEntries(representatives.map(r => [r, r]))} />}
        </div>
      </div>

      {/* Content */}
      {actionLoading && (
        <div className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg px-4 py-2 border border-slate-200 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> Procesando...
        </div>
      )}

      {loading ? (
        <PlayerSkeleton view={view} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={players.length === 0 ? "Todavía no agregaste jugadores a esta agencia." : "Sin resultados"}
          description={players.length === 0 ? "Comienza registrando tu primer jugador representado." : "No se encontraron jugadores con los filtros aplicados."}
          action={canManage && players.length === 0 && (
            <Button onClick={() => setShowNew(true)} style={{ backgroundColor: primaryColor }} className="hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" /> Agregar primer jugador
            </Button>
          )}
        />
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filtered.map(player => (
            <PlayerCard key={player.id} player={player} primaryColor={primaryColor} canManage={canManage} onAction={handleAction} statsData={statsData.players[player.id]} seasonDisplay={statsData.season_display} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Jugador</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Pos.</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Club</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden xl:table-cell">Competencia</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Portal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(player => (
                <tr key={player.id} onClick={() => navigate(`/agency/players/${player.id}`)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProfileAvatar
                        photoUrl={player.photo_url}
                        photoSourceUrl={player.photo_source_url}
                        firstName={player.first_name}
                        lastName={player.last_name}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div>
                        <p className="font-medium text-slate-800">{player.first_name} {player.last_name}</p>
                        <p className="text-xs text-slate-400">{calculateAge(player.birth_date)} años · {player.nationality || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">{PLAYER_CATEGORIES[player.category] || '—'}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">{POSITION_LABELS[player.position] || player.position}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{player.club || '—'}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-slate-600">{player.competition || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={SPORTING_STATUS_COLORS[player.availability_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
                      {SPORTING_STATUS_LABELS[player.availability_status] || 'Disponible'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Badge className={PORTAL_STATUS_COLORS[player.portal_status] || 'bg-slate-100 text-slate-500 border-slate-200'}>
                      {PORTAL_STATUS_LABELS[player.portal_status] || 'Sin invitar'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewPlayerDialog open={showNew} onClose={() => { setShowNew(false); setSearchParams({}); }} orgId={orgId} onCreated={(id) => { setShowNew(false); navigate(`/agency/players/${id}`); }} />}
      {editPlayer && <EditPlayerDialog player={editPlayer} orgId={orgId} primaryColor={primaryColor} onClose={() => setEditPlayer(null)} onSaved={() => { setEditPlayer(null); loadPlayers(); }} />}
      {statusPlayer && <StatusDialog player={statusPlayer} orgId={orgId} primaryColor={primaryColor} onClose={() => setStatusPlayer(null)} onSaved={() => { setStatusPlayer(null); loadPlayers(); }} />}
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

function PlayerSkeleton({ view }) {
  if (view === 'table') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {[...Array(6)].map((_, i) => <div key={i} className="h-14 border-b border-slate-100 animate-pulse bg-slate-50" />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
            <div className="h-8 bg-slate-100 rounded animate-pulse mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EditPlayerDialog({ player, orgId, primaryColor, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: player.first_name || '', last_name: player.last_name || '',
    birth_date: player.birth_date || '', nationality: player.nationality || '',
    position: player.position || 'CM', preferred_foot: player.preferred_foot || 'right',
    club: player.club || '', competition: player.competition || '',
    category: player.category || 'primera_division', club_logo_url: player.club_logo_url || '',
    photo_url: player.photo_url || '', representative_name: player.representative_name || '',
    height: player.height || '', weight: player.weight || '', jersey_number: player.jersey_number || '',
    linked_user_email: player.linked_user_email || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await base44.entities.Player.update(player.id, { ...form, organization_id: orgId });
      onSaved();
    } catch (err) { setError(err.message || 'Error al guardar'); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar jugador</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Nombre *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Apellido *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha de nacimiento</Label><Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Nacionalidad</Label><Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Posición *</Label>
              <Select value={form.position} onValueChange={v => setForm(f => ({ ...f, position: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(POSITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PLAYER_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Club actual</Label><Input value={form.club} onChange={e => setForm(f => ({ ...f, club: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Competencia</Label><Input value={form.competition} onChange={e => setForm(f => ({ ...f, competition: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Altura (cm)</Label><Input type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: Number(e.target.value) || '' }))} /></div>
            <div className="space-y-1.5"><Label>Peso (kg)</Label><Input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) || '' }))} /></div>
            <div className="space-y-1.5"><Label>N° camiseta</Label><Input type="number" value={form.jersey_number} onChange={e => setForm(f => ({ ...f, jersey_number: Number(e.target.value) || '' }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Representante responsable</Label><Input value={form.representative_name} onChange={e => setForm(f => ({ ...f, representative_name: e.target.value }))} /></div>
          <div className="space-y-1.5">
            <Label>Email del jugador (portal)</Label>
            <Input type="email" value={form.linked_user_email} onChange={e => setForm(f => ({ ...f, linked_user_email: e.target.value }))} />
            {player.portal_status === 'active' && form.linked_user_email !== (player.linked_user_email || '') && (
              <p className="text-xs text-amber-600 font-medium">⚠ El acceso está activo. Cambiar el email puede romper la vinculación. Usá "Cambiar usuario de acceso" desde la ficha para un cambio seguro.</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} style={{ backgroundColor: primaryColor }} className="hover:opacity-90">{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusDialog({ player, orgId, primaryColor, onClose, onSaved }) {
  const [status, setStatus] = useState(player.availability_status || 'available');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Player.update(player.id, { availability_status: status });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Cambiar estado deportivo</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPORTING_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{SPORTING_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} style={{ backgroundColor: primaryColor }} className="hover:opacity-90">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}