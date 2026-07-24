import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime } from '@/lib/roleUtils';
import { EmptyState } from '@/components/shared/UIBits';
import { History, FileText, Video, Search, HeartPulse, Activity, Gift } from 'lucide-react';

const ENTITY_ICONS = {
  PlayerMatchStats: BarChart3Icon,
  PhysicalAssessment: Activity,
  GPSActivity: Activity,
  InjuryRecord: HeartPulse,
  MedicalFollowUp: HeartPulse,
  VideoContent: Video,
  OpponentAnalysis: Search,
  PlayerBenefit: Gift,
  Document: FileText
};

function BarChart3Icon(props) {
  return <History {...props} />;
}

export default function PlayerActivityTab({ player }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [player.id]);

  const loadData = async () => {
    try {
      const [stats, physical, gps, injuries, videos, analyses, benefits, docs] = await Promise.all([
        base44.entities.PlayerMatchStats.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 10),
        base44.entities.PhysicalAssessment.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 10),
        base44.entities.GPSActivity.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 10),
        base44.entities.InjuryRecord.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 10),
        base44.entities.VideoContent.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 10),
        base44.entities.OpponentAnalysis.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 10),
        base44.entities.PlayerBenefit.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 10),
        base44.entities.Document.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 10)
      ]);

      const items = [
        ...stats.map(s => ({ date: s.created_date, type: 'PlayerMatchStats', title: `Estadísticas vs ${s.opponent || 'rival'}` })),
        ...physical.map(p => ({ date: p.created_date, type: 'PhysicalAssessment', title: 'Evaluación física' })),
        ...gps.map(g => ({ date: g.created_date, type: 'GPSActivity', title: 'Datos GPS cargados' })),
        ...injuries.map(i => ({ date: i.created_date, type: 'InjuryRecord', title: `Lesión: ${i.diagnosis}` })),
        ...videos.map(v => ({ date: v.created_date, type: 'VideoContent', title: `Video: ${v.title}` })),
        ...analyses.map(a => ({ date: a.created_date, type: 'OpponentAnalysis', title: `Análisis: ${a.opponent_player_name}` })),
        ...benefits.map(b => ({ date: b.created_date, type: 'PlayerBenefit', title: `Beneficio: ${b.benefit_name}` })),
        ...docs.map(d => ({ date: d.created_date, type: 'Document', title: `Documento: ${d.title}` }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);

      setActivity(items);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando actividad...</div>;

  if (activity.length === 0) {
    return <EmptyState icon={History} title="Sin actividad reciente" description="No se ha registrado actividad para este jugador." />;
  }

  return (
    <div className="space-y-2">
      {activity.map((item, i) => {
        const Icon = ENTITY_ICONS[item.type] || History;
        return (
          <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700 truncate">{item.title}</p>
              <p className="text-xs text-slate-400">{formatDateTime(item.date)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}