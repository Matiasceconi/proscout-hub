import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, formatDateTime, POSITION_LABELS, AVAILABILITY_LABELS, AVAILABILITY_COLORS, daysUntil } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Trophy, Activity, HeartPulse, Video, FileText, Calendar, Search, BarChart3 } from 'lucide-react';

export default function PlayerSummary({ player, onTabChange, permissions }) {
  const [data, setData] = useState({
    nextMatch: null,
    lastMatch: null,
    seasonStats: null,
    lastAssessment: null,
    latestInjury: null,
    pendingVideos: 0,
    pendingAnalysis: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [player.id]);

  const loadData = async () => {
    try {
      const [matches, stats, assessments, injuries, videos, analyses] = await Promise.all([
        base44.entities.Match.filter({ organization_id: player.organization_id, player_id: player.id }, 'match_date', 50),
        base44.entities.PlayerSeasonStats.filter({ organization_id: player.organization_id, player_id: player.id }, '-season', 10),
        base44.entities.PhysicalAssessment.filter({ organization_id: player.organization_id, player_id: player.id }, '-assessment_date', 5),
        base44.entities.InjuryRecord.filter({ organization_id: player.organization_id, player_id: player.id, shared_with_player: true }, '-injury_date', 5),
        base44.entities.VideoContent.filter({ organization_id: player.organization_id, player_id: player.id, status: 'published' }, '-published_date', 10),
        base44.entities.OpponentAnalysis.filter({ organization_id: player.organization_id, player_id: player.id, status: 'published' }, '-published_date', 10)
      ]);

      const now = new Date();
      const upcoming = matches.filter(m => new Date(m.match_date) >= now);
      const past = matches.filter(m => new Date(m.match_date) < now);

      setData({
        nextMatch: upcoming[0] || null,
        lastMatch: past[past.length - 1] || null,
        seasonStats: stats[0] || null,
        lastAssessment: assessments[0] || null,
        latestInjury: injuries[0] || null,
        pendingVideos: videos.length,
        pendingAnalysis: analyses.length
      });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando resumen...</div>;

  return (
    <div className="space-y-5">
      {/* Personal info */}
      <div className="grid sm:grid-cols-2 gap-4">
        <InfoCard title="Datos personales">
          <InfoRow label="Nombre completo" value={`${player.first_name} ${player.last_name}`} />
          <InfoRow label="Fecha de nacimiento" value={player.birth_date ? formatDate(player.birth_date) : '—'} />
          <InfoRow label="Nacionalidad" value={player.nationality || '—'} />
          <InfoRow label="Posición" value={POSITION_LABELS[player.position] || player.position} />
          <InfoRow label="Pierna hábil" value={player.preferred_foot === 'left' ? 'Izquierda' : player.preferred_foot === 'right' ? 'Derecha' : 'Ambidiestro'} />
        </InfoCard>
        <InfoCard title="Club y representación">
          <InfoRow label="Club actual" value={player.club || '—'} />
          <InfoRow label="Número de camiseta" value={player.jersey_number ? `#${player.jersey_number}` : '—'} />
          <InfoRow label="Categoría" value={player.category || '—'} />
          <InfoRow label="Representante" value={player.representative_name || '—'} />
          <InfoRow label="Altura / Peso" value={`${player.height || '—'}cm / ${player.weight || '—'}kg`} />
        </InfoCard>
      </div>

      {/* Status + next match */}
      <div className="grid sm:grid-cols-2 gap-4">
        <InfoCard title="Estado actual">
          <div className="flex items-center gap-2 mb-3">
            <Badge className={AVAILABILITY_COLORS[player.availability_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
              {AVAILABILITY_LABELS[player.availability_status] || 'Disponible'}
            </Badge>
          </div>
          {data.latestInjury && (
            <div className="text-sm text-slate-500">
              <p className="font-medium text-slate-700">{data.latestInjury.diagnosis}</p>
              <p className="text-xs mt-1">Desde {formatDate(data.latestInjury.injury_date)}</p>
              {data.latestInjury.estimated_return_date && (
                <p className="text-xs">Retorno estimado: {formatDate(data.latestInjury.estimated_return_date)}</p>
              )}
            </div>
          )}
        </InfoCard>
        <InfoCard title="Próximo partido" action={data.nextMatch ? undefined : 'Sin partidos programados'}>
          {data.nextMatch ? (
            <div>
              <p className="font-medium text-slate-800">vs {data.nextMatch.opponent}</p>
              <p className="text-sm text-slate-500">{data.nextMatch.competition || 'Sin competencia'}</p>
              <p className="text-xs text-slate-400 mt-1">{formatDateTime(data.nextMatch.match_date)}</p>
              <Badge className="mt-2 bg-slate-100 text-slate-600 border-slate-200 capitalize">{data.nextMatch.home_away === 'home' ? 'Local' : 'Visitante'}</Badge>
            </div>
          ) : null}
        </InfoCard>
      </div>

      {/* Season stats summary */}
      {data.seasonStats && (
        <InfoCard title={`Estadísticas ${data.seasonStats.season} - ${data.seasonStats.competition || ''}`}>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <StatBox label="Partidos" value={data.seasonStats.matches} />
            <StatBox label="Titular" value={data.seasonStats.starts} />
            <StatBox label="Minutos" value={data.seasonStats.minutes} />
            <StatBox label="Goles" value={data.seasonStats.goals} />
            <StatBox label="Asist." value={data.seasonStats.assists} />
            <StatBox label="Amarillas" value={data.seasonStats.yellow_cards} />
          </div>
        </InfoCard>
      )}

      {/* Last physical assessment */}
      {data.lastAssessment && (
        <InfoCard title={`Última evaluación física - ${formatDate(data.lastAssessment.assessment_date)}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.lastAssessment.cmj != null && <StatBox label="CMJ" value={data.lastAssessment.cmj} unit="cm" />}
            {data.lastAssessment.sprint_10m != null && <StatBox label="Sprint 10m" value={data.lastAssessment.sprint_10m} unit="s" />}
            {data.lastAssessment.sprint_30m != null && <StatBox label="Sprint 30m" value={data.lastAssessment.sprint_30m} unit="s" />}
            {data.lastAssessment.yo_yo_ir1 != null && <StatBox label="Yo-Yo IR1" value={data.lastAssessment.yo_yo_ir1} unit="m" />}
          </div>
        </InfoCard>
      )}

      {/* Pending content */}
      <InfoCard title="Contenidos pendientes">
        <div className="flex flex-wrap gap-3">
          <ContentPill icon={Video} label="Videos publicados" value={data.pendingVideos} onClick={() => onTabChange('video', 'own')} />
          <ContentPill icon={Search} label="Análisis publicados" value={data.pendingAnalysis} onClick={() => onTabChange('video', 'opponent')} />
        </div>
      </InfoCard>
    </div>
  );
}

function InfoCard({ title, children, action }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {action && <span className="text-xs text-slate-400">{action}</span>}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-slate-50 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}

function StatBox({ label, value, unit }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-lg">
      <p className="text-lg font-bold text-slate-800">{value}{unit && <span className="text-xs text-slate-400 ml-0.5">{unit}</span>}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function ContentPill({ icon: Icon, label, value, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
      <Icon className="w-4 h-4 text-slate-500" />
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </button>
  );
}