import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getPlayerId, formatDate, AVAILABILITY_LABELS, AVAILABILITY_COLORS } from '@/lib/roleUtils';
import { PageHeader, Badge, EmptyState } from '@/components/shared/UIBits';
import { HeartPulse, Loader2 } from 'lucide-react';

export default function PortalMedical() {
  const { user } = useAuth();
  const playerId = getPlayerId(user);
  const [player, setPlayer] = useState(null);
  const [injuries, setInjuries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [playerId]);

  const load = async () => {
    try {
      const p = await base44.entities.Player.get(playerId);
      setPlayer(p);
      const data = await base44.entities.InjuryRecord.filter({ organization_id: p.organization_id, player_id: playerId, shared_with_player: true }, '-injury_date', 20);
      setInjuries(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Mi estado médico" />
      {player && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-2">Estado de disponibilidad actual</p>
          <Badge className={AVAILABILITY_COLORS[player.availability_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
            {AVAILABILITY_LABELS[player.availability_status] || 'Disponible'}
          </Badge>
        </div>
      )}
      {injuries.length === 0 ? (
        <EmptyState icon={HeartPulse} title="Sin historial" description="No hay información médica compartida contigo." />
      ) : (
        <div className="space-y-3">
          {injuries.map(inj => (
            <div key={inj.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="font-medium text-slate-800">{inj.diagnosis}</p>
              <p className="text-xs text-slate-400">{formatDate(inj.injury_date)} · {inj.professional || '—'}</p>
              {inj.estimated_return_date && <p className="text-xs text-amber-600 mt-1">Retorno estimado: {formatDate(inj.estimated_return_date)}</p>}
              {inj.restrictions && <p className="text-sm text-slate-500 mt-2"><strong>Restricciones:</strong> {inj.restrictions}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}