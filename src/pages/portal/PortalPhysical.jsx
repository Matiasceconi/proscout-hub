import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getPlayerId, formatDate } from '@/lib/roleUtils';
import { PageHeader, EmptyState } from '@/components/shared/UIBits';
import { Activity, Loader2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

export default function PortalPhysical() {
  const { user } = useAuth();
  const playerId = getPlayerId(user);
  const [assessments, setAssessments] = useState([]);
  const [gps, setGps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [playerId]);

  const load = async () => {
    try {
      const player = await base44.entities.Player.get(playerId);
      const [a, g] = await Promise.all([
        base44.entities.PhysicalAssessment.filter({ organization_id: player.organization_id, player_id: playerId }, '-assessment_date', 20),
        base44.entities.GPSActivity.filter({ organization_id: player.organization_id, player_id: playerId }, '-activity_date', 20)
      ]);
      setAssessments(a);
      setGps(g);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;

  const latest = assessments[0];
  const radarData = latest ? [
    { metric: 'CMJ', value: latest.cmj || 0, max: 50 },
    { metric: 'Sprint 10m', value: latest.sprint_10m ? 100 - latest.sprint_10m * 10 : 0, max: 100 },
    { metric: 'Sprint 30m', value: latest.sprint_30m ? 100 - latest.sprint_30m * 2 : 0, max: 100 },
    { metric: 'Yo-Yo', value: latest.yo_yo_ir1 || 0, max: 2000 },
    { metric: 'NordBord', value: latest.nordbord || 0, max: 500 },
    { metric: 'Fuerza', value: latest.isometric_strength || 0, max: 500 },
  ] : [];

  return (
    <div className="space-y-4">
      <PageHeader title="Mi rendimiento" />
      {assessments.length === 0 && gps.length === 0 ? (
        <EmptyState icon={Activity} title="Sin datos" description="Tu agencia aún no cargó datos de rendimiento." />
      ) : (
        <>
          {latest && (
            <>
              {radarData.some(d => d.value > 0) && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Radar físico</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <PolarRadiusAxis tick={{ fontSize: 8 }} stroke="#cbd5e1" />
                      <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-700 mb-3">Última evaluación - {formatDate(latest.assessment_date)}</p>
                <div className="grid grid-cols-2 gap-2">
                  {latest.cmj != null && <StatBox label="CMJ" value={`${latest.cmj} cm`} />}
                  {latest.sprint_10m != null && <StatBox label="Sprint 10m" value={`${latest.sprint_10m}s`} />}
                  {latest.sprint_30m != null && <StatBox label="Sprint 30m" value={`${latest.sprint_30m}s`} />}
                  {latest.yo_yo_ir1 != null && <StatBox label="Yo-Yo IR1" value={`${latest.yo_yo_ir1}m`} />}
                </div>
              </div>
            </>
          )}
          {gps.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">Datos GPS recientes</p>
              <div className="space-y-2">
                {gps.slice(0, 5).map(g => (
                  <div key={g.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-sm">
                    <span className="text-slate-500">{formatDate(g.activity_date)}</span>
                    <div className="flex gap-3 text-xs text-slate-600">
                      {g.total_distance && <span>{g.total_distance}m</span>}
                      {g.max_speed && <span>{g.max_speed}km/h</span>}
                      {g.sprints != null && <span>{g.sprints} sprints</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-lg">
      <p className="text-base font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}