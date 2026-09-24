import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, calculateAge, POSITION_LABELS, AVAILABILITY_LABELS, AVAILABILITY_COLORS, PLAYER_CATEGORIES, PORTAL_STATUS_LABELS, PORTAL_STATUS_COLORS, formatDate, isOrgAdmin, canEditMedical, canEditPhysical, canEditVideos, canEditStats } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Users, BarChart3, Calendar, Video, ClipboardList, Pencil, UserPlus, Share2, Building2, Trophy, ArrowUpRight, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PlayerSummary from '@/components/agency/player-tabs/PlayerSummary';
import PlayerCareerTab from '@/components/agency/player-tabs/PlayerCareerTab';
import PlayerStatsTab from '@/components/agency/player-tabs/PlayerStatsTab';
import PlayerCalendarTab from '@/components/agency/player-tabs/PlayerCalendarTab';
import PlayerVideoTab from '@/components/agency/player-tabs/PlayerVideoTab';
import ProfileCoverHeader from '@/components/shared/ProfileCoverHeader';
import PlayerPortalAccessSection from '@/components/agency/PlayerPortalAccessSection';
import InvitePlayerDialog from '@/components/agency/InvitePlayerDialog';

const TABS = [
  { id: 'summary', label: 'Resumen', icon: Users },
  { id: 'career', label: 'Trayectoria', icon: ClipboardList },
  { id: 'calendar', label: 'Actividad', icon: Calendar },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  { id: 'video', label: 'Videos', icon: Video }
];

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [player, setPlayer] = useState(null);
  const [clubData, setClubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [videoSubtab, setVideoSubtab] = useState('own');
  const [showInvite, setShowInvite] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) loadPlayer();
  }, [id]);

  const loadPlayer = async () => {
    try {
      const data = await base44.entities.Player.get(id);
      const orgId = getUserOrgId(user);
      if (orgId && data.organization_id && data.organization_id !== orgId) {
        setPlayer(null);
      } else {
        setPlayer(data);
        if (data.current_club_id) {
          base44.entities.Club.get(data.current_club_id)
            .then(setClubData)
            .catch(() => setClubData(null));
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSavePhoto = async (file_url) => {
    await base44.entities.Player.update(player.id, { photo_url: file_url, photo_status: 'ok' });
    setPlayer(p => ({ ...p, photo_url: file_url, photo_status: 'ok' }));
  };

  const handleRemovePhoto = async () => {
    await base44.entities.Player.update(player.id, { photo_url: '', photo_status: 'pending' });
    setPlayer(p => ({ ...p, photo_url: '', photo_status: 'pending' }));
  };

  const handleTabChange = (tab, subtab) => {
    setActiveTab(tab);
    if (subtab) setVideoSubtab(subtab);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${player.first_name} ${player.last_name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Enlace copiado al portapapeles');
    }
  };

  const handleDelete = async () => {
    const fullName = `${player.first_name || ''} ${player.last_name || ''}`.trim();
    if (deleteConfirmation !== fullName) {
      setDeleteError(`Escribí exactamente “${fullName}” para confirmar.`);
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      const response = await base44.functions.invoke('deleteAgencyPlayer', {
        organization_id: getUserOrgId(user),
        player_id: player.id,
        confirmation: deleteConfirmation
      });
      const data = response.data || {};
      if (!data.success) throw new Error(data.error || 'No se pudo eliminar el jugador.');
      navigate('/agency/players');
    } catch (err) {
      setDeleteError(err.response?.data?.error || err.message || 'No se pudo eliminar el jugador.');
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Jugador no encontrado.</p>
        <Button onClick={() => navigate('/agency/players')} className="mt-4">Volver a jugadores</Button>
      </div>
    );
  }

  const age = calculateAge(player.birth_date);
  const permissions = {
    canEditStats: canEditStats(user),
    canEditPhysical: canEditPhysical(user),
    canEditMedical: canEditMedical(user),
    canEditVideos: canEditVideos(user),
    isOrgAdmin: isOrgAdmin(user)
  };
  const canManage = isOrgAdmin(user);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <button onClick={() => navigate('/agency/players')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> Volver a jugadores
      </button>

      {/* Header con portada */}
      <ProfileCoverHeader
        photoUrl={player.photo_url}
        photoSourceUrl={player.photo_source_url}
        firstName={player.first_name}
        lastName={player.last_name}
        clubLogoUrl={clubData?.internal_logo_url || clubData?.official_logo_url || player.club_logo_url}
        clubName={clubData?.club_name || player.club || 'Sin club'}
        subtitle={`${age ? `${age} años` : ''} ${player.nationality ? `· ${player.nationality}` : ''} · ${POSITION_LABELS[player.position] || player.position}${player.secondary_position ? ` / ${POSITION_LABELS[player.secondary_position] || player.secondary_position}` : ''}${player.jersey_number ? ` · #${player.jersey_number}` : ''}${player.competition ? ` · ${player.competition}` : ''}`}
        badges={
          <>
            <Badge className={AVAILABILITY_COLORS[player.availability_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
              {AVAILABILITY_LABELS[player.availability_status] || 'Disponible'}
            </Badge>
            <Badge className={PORTAL_STATUS_COLORS[player.portal_status] || 'bg-slate-100 text-slate-500 border-slate-200'}>
              {PORTAL_STATUS_LABELS[player.portal_status] || 'Sin invitar'}
            </Badge>
          </>
        }
        actions={canManage ? (
          <>
            <Button size="sm" variant="outline" onClick={() => navigate(`/agency/players/${player.id}?edit=1`)}><Pencil className="w-3.5 h-3.5 mr-1" /> Editar</Button>
            {(player.portal_status === 'not_invited' || player.portal_status === 'pending') && (
              <Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
                <UserPlus className="w-3.5 h-3.5 mr-1" /> {player.portal_status === 'pending' ? 'Reenviar' : 'Invitar'}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleShare}><Share2 className="w-3.5 h-3.5 mr-1" /> Compartir perfil</Button>
            <Button size="sm" variant="outline" onClick={() => { setDeleteConfirmation(''); setDeleteError(''); setShowDelete(true); }} className="text-red-600 hover:bg-red-50 border-red-200"><Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar</Button>
          </>
        ) : undefined}
        canEditPhoto={canManage}
        onSavePhoto={handleSavePhoto}
        onRemovePhoto={handleRemovePhoto}
      >
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
          {player.preferred_foot && <span>Pierna: {player.preferred_foot === 'left' ? 'Izquierda' : player.preferred_foot === 'right' ? 'Derecha' : 'Ambidiestro'}</span>}
          {player.height && <span>Altura: {player.height}cm</span>}
          {player.weight && <span>Peso: {player.weight}kg</span>}
          {player.category && <span>Categoría: {PLAYER_CATEGORIES[player.category] || player.category}</span>}
          {player.contract_end && <span>Contrato hasta: {formatDate(player.contract_end)}</span>}
          {player.market_value && <span>Valor: {player.market_value}</span>}
          {player.representative_name && <span>Representante: {player.representative_name}</span>}
        </div>
      </ProfileCoverHeader>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {clubData ? (
          <Link to={`/agency/clubs/${clubData.id}`} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-200 hover:bg-emerald-50/30">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">{(clubData.internal_logo_url || clubData.official_logo_url) ? <img src={clubData.internal_logo_url || clubData.official_logo_url} alt="" className="h-8 w-8 object-contain" /> : <Building2 className="h-5 w-5 text-slate-500" />}</div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Club actual</p><p className="mt-1 text-sm font-semibold text-slate-900">{clubData.club_name}</p></div></div><ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600" />
          </Link>
        ) : <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Club actual</p><p className="mt-2 text-sm font-semibold text-slate-700">{player.club || 'Sin club vinculado'}</p></div>}
        <Link to="/agency/matches" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-200"><Trophy className="h-5 w-5 text-emerald-700"/><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contexto</p><p className="mt-1 text-sm font-semibold text-slate-900">Partidos</p></div></Link>
        <button onClick={() => setActiveTab('stats')} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-emerald-200"><BarChart3 className="h-5 w-5 text-emerald-700"/><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rendimiento</p><p className="mt-1 text-sm font-semibold text-slate-900">Estadísticas</p></div></button>
        <Link to="/agency/intelligence" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-200"><ClipboardList className="h-5 w-5 text-emerald-700"/><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gestión</p><p className="mt-1 text-sm font-semibold text-slate-900">Seguimiento</p></div></Link>
      </div>

      {canManage && (
        <div className="mt-4">
          <PlayerPortalAccessSection player={player} onUpdated={loadPlayer} />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-thin">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900 font-medium'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 lg:p-5">
          {activeTab === 'summary' && <PlayerSummary player={player} onTabChange={handleTabChange} permissions={permissions} clubData={clubData} />}
          {activeTab === 'career' && <PlayerCareerTab player={player} permissions={permissions} />}
          {activeTab === 'calendar' && <PlayerCalendarTab player={player} permissions={permissions} />}
          {activeTab === 'stats' && <PlayerStatsTab player={player} permissions={permissions} />}
          {activeTab === 'video' && <PlayerVideoTab player={player} permissions={permissions} initialSubtab={videoSubtab} />}
        </div>
      </div>

      {showInvite && (
        <InvitePlayerDialog
          player={player}
          onClose={() => setShowInvite(false)}
          onDone={() => { setShowInvite(false); loadPlayer(); }}
        />
      )}

      {showDelete && (
        <Dialog open onOpenChange={(o) => { if (!o && !deleting) { setShowDelete(false); setDeleteConfirmation(''); setDeleteError(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Eliminar jugador definitivamente</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Se eliminarán la ficha de <strong>{player.first_name} {player.last_name}</strong> y sus datos asociados del sistema. El acceso del portal quedará desvinculado. <strong>Esta acción no se puede deshacer.</strong>
              </div>
              <div className="space-y-1.5">
                <Label>Para confirmar, escribí exactamente:</Label>
                <p className="rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800">{player.first_name} {player.last_name}</p>
                <Input value={deleteConfirmation} onChange={e => { setDeleteConfirmation(e.target.value); setDeleteError(''); }} placeholder="Nombre y apellido" autoComplete="off" />
              </div>
              {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDelete(false); setDeleteConfirmation(''); setDeleteError(''); }} disabled={deleting}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting || deleteConfirmation !== `${player.first_name || ''} ${player.last_name || ''}`.trim()}>
                {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                Eliminar definitivamente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}