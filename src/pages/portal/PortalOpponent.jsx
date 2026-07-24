import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getPlayerId, formatDate } from '@/lib/roleUtils';
import { PageHeader, EmptyState, Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Eye, CheckCircle } from 'lucide-react';

export default function PortalOpponent() {
  const { user } = useAuth();
  const playerId = getPlayerId(user);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [playerId]);

  const load = async () => {
    try {
      const player = await base44.entities.Player.get(playerId);
      const data = await base44.entities.OpponentAnalysis.filter({ organization_id: player.organization_id, player_id: playerId, status: 'published' }, '-published_date', 20);
      setAnalyses(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const markAsSeen = async (id) => {
    try {
      await base44.entities.OpponentAnalysis.update(id, { marked_as_seen: true, viewed_by_player_date: new Date().toISOString() });
      setAnalyses(a => a.map(x => x.id === id ? { ...x, marked_as_seen: true } : x));
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-4">
      <PageHeader title="Mi próximo rival" />
      {analyses.length === 0 ? (
        <EmptyState icon={Search} title="Sin análisis" description="Tu agencia aún no publicó análisis de rivales." />
      ) : (
        <div className="space-y-3">
          {analyses.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-slate-800">{a.opponent_player_name}</p>
                  <p className="text-xs text-slate-400">{a.opponent_team} · {formatDate(a.published_date)}</p>
                </div>
                {a.marked_as_seen ? (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Eye className="w-3 h-3 mr-1" /> Visto</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => markAsSeen(a.id)}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Marcar visto
                  </Button>
                )}
              </div>
              {a.strengths && <div className="mt-2"><p className="text-xs font-medium text-green-600">Fortalezas</p><p className="text-sm text-slate-600">{a.strengths}</p></div>}
              {a.weaknesses && <div className="mt-2"><p className="text-xs font-medium text-red-600">Debilidades</p><p className="text-sm text-slate-600">{a.weaknesses}</p></div>}
              {a.recommendations && <div className="mt-2"><p className="text-xs font-medium text-blue-600">Recomendaciones</p><p className="text-sm text-slate-600">{a.recommendations}</p></div>}
              {a.video_clips && a.video_clips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {a.video_clips.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline">Clip {i + 1}</a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}