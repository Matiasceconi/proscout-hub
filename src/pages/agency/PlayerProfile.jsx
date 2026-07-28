import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, calculateAge, POSITION_LABELS, AVAILABILITY_LABELS, AVAILABILITY_COLORS, formatDate, isOrgAdmin, canEditMedical, canEditPhysical, canEditVideos, canEditStats } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Users, BarChart3, Calendar, Video } from 'lucide-react';
import PlayerSummary from '@/components/agency/player-tabs/PlayerSummary';
import PlayerStatsTab from '@/components/agency/player-tabs/PlayerStatsTab';
import PlayerCalendarTab from '@/components/agency/player-tabs/PlayerCalendarTab';
import PlayerVideoTab from '@/components/agency/player-tabs/PlayerVideoTab';

const TABS = [
  { id: 'summary', label: 'Resumen', icon: Users },
  { id: 'calendar', label: 'Calendario', icon: Calendar },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  { id: 'video', label: 'Video', icon: Video }
];

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [videoSubtab, setVideoSubtab] = useState('own');

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
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleTabChange = (tab, subtab) => {
    setActiveTab(tab);
    if (subtab) setVideoSubtab(subtab);
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

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <button onClick={() => navigate('/agency/players')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> Volver a jugadores
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0">
            {player.photo_url ? (
              <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <Users className="w-10 h-10" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{player.first_name} {player.last_name}</h1>
                <p className="text-sm text-slate-400">
                  {age ? `${age} años` : ''} {player.nationality ? `· ${player.nationality}` : ''} · {POSITION_LABELS[player.position] || player.position}
                </p>
                <p className="text-sm text-slate-500 mt-1">{player.club || 'Sin club'} {player.jersey_number ? `· #${player.jersey_number}` : ''}</p>
              </div>
              <Badge className={AVAILABILITY_COLORS[player.availability_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
                {AVAILABILITY_LABELS[player.availability_status] || 'Disponible'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">
              {player.preferred_foot && <span>Pierna: {player.preferred_foot === 'left' ? 'Izquierda' : player.preferred_foot === 'right' ? 'Derecha' : 'Ambidiestro'}</span>}
              {player.height && <span>Altura: {player.height}cm</span>}
              {player.weight && <span>Peso: {player.weight}kg</span>}
              {player.representative_name && <span>Representante: {player.representative_name}</span>}
            </div>
          </div>
        </div>
      </div>

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
          {activeTab === 'summary' && <PlayerSummary player={player} onTabChange={handleTabChange} permissions={permissions} />}
          {activeTab === 'calendar' && <PlayerCalendarTab player={player} permissions={permissions} />}
          {activeTab === 'stats' && <PlayerStatsTab player={player} permissions={permissions} />}
          {activeTab === 'video' && <PlayerVideoTab player={player} permissions={permissions} initialSubtab={videoSubtab} />}
        </div>
      </div>
    </div>
  );
}