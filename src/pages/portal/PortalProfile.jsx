import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getPlayerId, calculateAge, POSITION_LABELS, AVAILABILITY_LABELS, AVAILABILITY_COLORS, formatDate } from '@/lib/roleUtils';
import { PageHeader, Badge } from '@/components/shared/UIBits';
import ProfileAvatar from '@/components/shared/ProfileAvatar';
import { Loader2 } from 'lucide-react';

export default function PortalProfile() {
  const { user } = useAuth();
  const playerId = getPlayerId(user);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [playerId]);

  const load = async () => {
    try {
      const p = await base44.entities.Player.get(playerId);
      setPlayer(p);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;
  if (!player) return <p className="text-center text-slate-500">No se encontró tu perfil.</p>;

  const age = calculateAge(player.birth_date);
  const initials = (player.first_name?.[0] || '') + (player.last_name?.[0] || '');

  return (
    <div className="space-y-4">
      <PageHeader title="Mi perfil" />
      <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
        <ProfileAvatar
          photoUrl={player.photo_url}
          photoSourceUrl={player.photo_source_url}
          firstName={player.first_name}
          lastName={player.last_name}
          size="lg"
          shape="rounded-2xl"
          className="mx-auto mb-3"
        />
        <p className="text-lg font-bold text-slate-900">{player.first_name} {player.last_name}</p>
        <p className="text-sm text-slate-400">{age ? `${age} años` : ''} {player.nationality ? `· ${player.nationality}` : ''}</p>
        <div className="mt-2">
          <Badge className={AVAILABILITY_COLORS[player.availability_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
            {AVAILABILITY_LABELS[player.availability_status] || 'Disponible'}
          </Badge>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <InfoRow label="Club" value={player.club || '—'} />
        <InfoRow label="Posición" value={POSITION_LABELS[player.position] || player.position} />
        <InfoRow label="Pierna hábil" value={player.preferred_foot === 'left' ? 'Izquierda' : player.preferred_foot === 'right' ? 'Derecha' : 'Ambidiestro'} />
        <InfoRow label="Nacionalidad" value={player.nationality || '—'} />
        <InfoRow label="Fecha de nacimiento" value={player.birth_date ? formatDate(player.birth_date) : '—'} />
        <InfoRow label="Altura" value={player.height ? `${player.height} cm` : '—'} />
        <InfoRow label="Peso" value={player.weight ? `${player.weight} kg` : '—'} />
        <InfoRow label="Número" value={player.jersey_number ? `#${player.jersey_number}` : '—'} />
        <InfoRow label="Categoría" value={player.category || '—'} />
        <InfoRow label="Representante" value={player.representative_name || '—'} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Email de acceso</p>
        <p className="text-sm font-medium text-slate-800">{user?.email}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 text-sm border-b border-slate-50 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}