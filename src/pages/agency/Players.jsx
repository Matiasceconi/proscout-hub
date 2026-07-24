import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, isOrgAdmin, calculateAge, POSITION_LABELS, AVAILABILITY_LABELS, AVAILABILITY_COLORS, formatDate } from '@/lib/roleUtils';
import { PageHeader, Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Search, LayoutGrid, Table, Plus, Filter, X } from 'lucide-react';

export default function Players() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const orgId = getUserOrgId(user);
  const canManage = isOrgAdmin(user);

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('cards');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ position: 'all', status: 'all', nationality: 'all' });
  const [showNew, setShowNew] = useState(searchParams.get('action') === 'new');

  useEffect(() => {
    if (orgId) loadPlayers();
  }, [orgId]);

  const loadPlayers = async () => {
    try {
      const data = await base44.entities.Player.filter({ organization_id: orgId }, '-updated_date', 300);
      setPlayers(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const nationalities = useMemo(() => {
    const set = new Set(players.map(p => p.nationality).filter(Boolean));
    return Array.from(set).sort();
  }, [players]);

  const filtered = useMemo(() => {
    return players.filter(p => {
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        if (!fullName.includes(q) && !(p.club || '').toLowerCase().includes(q)) return false;
      }
      if (filters.position !== 'all' && p.position !== filters.position) return false;
      if (filters.status !== 'all' && p.availability_status !== filters.status) return false;
      if (filters.nationality !== 'all' && p.nationality !== filters.nationality) return false;
      return true;
    });
  }, [players, search, filters]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Jugadores"
        subtitle={`${filtered.length} de ${players.length} jugadores`}
        actions={canManage && (
          <Button onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-1" /> Nuevo jugador
          </Button>
        )}
      />

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o club..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filters.position} onValueChange={v => setFilters(f => ({ ...f, position: v }))}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Posición" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las posiciones</SelectItem>
              {Object.entries(POSITION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(AVAILABILITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.nationality} onValueChange={v => setFilters(f => ({ ...f, nationality: v }))}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Nacionalidad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {nationalities.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setView('cards')} className={`p-2.5 ${view === 'cards' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView('table')} className={`p-2.5 ${view === 'table' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin jugadores"
          description="No se encontraron jugadores con los filtros aplicados."
          action={canManage && <Button onClick={() => setShowNew(true)} className="bg-slate-900"><Plus className="w-4 h-4 mr-1" /> Crear jugador</Button>}
        />
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(player => (
            <PlayerCard key={player.id} player={player} onClick={() => navigate(`/agency/players/${player.id}`)} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Jugador</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Pos.</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Club</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Rep.</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(player => (
                <tr key={player.id} onClick={() => navigate(`/agency/players/${player.id}`)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                        {player.photo_url && <img src={player.photo_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{player.first_name} {player.last_name}</p>
                        <p className="text-xs text-slate-400">{calculateAge(player.birth_date)} años · {player.nationality || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">{POSITION_LABELS[player.position] || player.position}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{player.club || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">{player.representative_name || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={AVAILABILITY_COLORS[player.availability_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
                      {AVAILABILITY_LABELS[player.availability_status] || 'Disponible'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs">{formatDate(player.updated_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewPlayerDialog open={showNew} onClose={() => { setShowNew(false); setSearchParams({}); }} orgId={orgId} onCreated={(id) => { setShowNew(false); navigate(`/agency/players/${id}`); }} />}
    </div>
  );
}

function PlayerCard({ player, onClick }) {
  const age = calculateAge(player.birth_date);
  return (
    <div onClick={onClick} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
          {player.photo_url ? (
            <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Users className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">{player.first_name} {player.last_name}</p>
          <p className="text-xs text-slate-400">{age ? `${age} años` : ''} {player.nationality ? `· ${player.nationality}` : ''}</p>
          <p className="text-xs text-slate-500 mt-0.5">{POSITION_LABELS[player.position] || player.position}</p>
        </div>
        <Badge className={AVAILABILITY_COLORS[player.availability_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
          {AVAILABILITY_LABELS[player.availability_status] || 'Disponible'}
        </Badge>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {player.club_logo_url ? (
            <img src={player.club_logo_url} alt="" className="w-4 h-4 object-contain" />
          ) : null}
          <span className="text-slate-600 truncate">{player.club || 'Sin club'}</span>
        </div>
        <span className="text-slate-400">{player.representative_name || 'Sin representante'}</span>
      </div>
    </div>
  );
}

function NewPlayerDialog({ open, onClose, orgId, onCreated }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', birth_date: '', nationality: '',
    position: 'CM', preferred_foot: 'right', club: '', linked_user_email: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const player = await base44.entities.Player.create({
        ...form,
        organization_id: orgId,
        status: 'active',
        availability_status: 'available',
        portal_status: form.linked_user_email ? 'pending' : 'not_invited',
        linked_user_email: form.linked_user_email || null
      });

      if (form.linked_user_email) {
        await base44.entities.PlayerUserLink.create({
          organization_id: orgId,
          player_id: player.id,
          user_email: form.linked_user_email,
          status: 'pending'
        });
      }

      onCreated(player.id);
    } catch (err) {
      setError(err.message || 'Error al crear el jugador');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear nuevo jugador</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Apellido *</Label>
              <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nacionalidad</Label>
              <Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="Ej. Argentina" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Posición *</Label>
              <Select value={form.position} onValueChange={v => setForm(f => ({ ...f, position: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(POSITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pierna hábil</Label>
              <Select value={form.preferred_foot} onValueChange={v => setForm(f => ({ ...f, preferred_foot: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Derecha</SelectItem>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="both">Ambidiestro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Club actual</Label>
            <Input value={form.club} onChange={e => setForm(f => ({ ...f, club: e.target.value }))} placeholder="Ej. River Plate" />
          </div>
          <div className="space-y-1.5">
            <Label>Email del jugador (para invitar al portal)</Label>
            <Input type="email" value={form.linked_user_email} onChange={e => setForm(f => ({ ...f, linked_user_email: e.target.value }))} placeholder="jugador@email.com" />
            <p className="text-xs text-slate-400">El jugador recibirá acceso a su portal privado tras registrarse con este email.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Creando...' : 'Crear jugador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}