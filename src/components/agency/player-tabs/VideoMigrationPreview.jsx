import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/shared/UIBits';
import { CheckCircle, AlertTriangle, HelpCircle, Copy, Link2 } from 'lucide-react';

export default function VideoMigrationPreview({ player, type, onClose, onLinked }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [records, matches] = await Promise.all([
        type === 'video'
          ? base44.entities.VideoContent.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 100)
          : base44.entities.OpponentAnalysis.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 100),
        base44.entities.Match.filter({ organization_id: player.organization_id, player_id: player.id }, 'match_date', 100)
      ]);

      const unlinked = records.filter(r => !r.match_id);
      const result = { auto: [], doubtful: [], manual: [], duplicates: [] };

      for (const rec of unlinked) {
        const recDate = rec.match_date || rec.published_date || rec.created_date;
        const recDateOnly = recDate ? recDate.slice(0, 10) : null;
        const recOpp = (rec.opponent || rec.opponent_team || '').toLowerCase().trim();

        const candidates = matches.filter(m => {
          const mDate = m.match_date ? m.match_date.slice(0, 10) : null;
          const mOpp = (m.opponent || '').toLowerCase().trim();
          const dateMatch = recDateOnly && mDate && recDateOnly === mDate;
          const oppMatch = recOpp && mOpp && (mOpp.includes(recOpp) || recOpp.includes(mOpp));
          return dateMatch || oppMatch;
        });

        if (candidates.length === 0) {
          result.manual.push({ record: rec, reason: 'Sin coincidencia de fecha o rival' });
        } else if (candidates.length === 1) {
          const c = candidates[0];
          const dateMatch = recDateOnly && c.match_date && recDateOnly === c.match_date.slice(0, 10);
          const oppMatch = recOpp && c.opponent && (c.opponent.toLowerCase().includes(recOpp) || recOpp.includes(c.opponent.toLowerCase()));
          if (dateMatch && oppMatch) {
            result.auto.push({ record: rec, match: c });
          } else {
            result.doubtful.push({ record: rec, match: c, reason: dateMatch ? 'Solo fecha coincide' : 'Solo rival coincide' });
          }
        } else {
          result.duplicates.push({ record: rec, matches: candidates });
        }
      }

      setPreview({ ...result, total: unlinked.length, alreadyLinked: records.length - unlinked.length });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const linkRecord = async (recordId, matchId) => {
    setLinking(recordId);
    try {
      if (type === 'video') {
        await base44.entities.VideoContent.update(recordId, { match_id: matchId });
      } else {
        await base44.entities.OpponentAnalysis.update(recordId, { match_id: matchId });
      }
      onLinked();
      load();
    } catch (err) { console.error(err); }
    setLinking(null);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vinculación de {type === 'video' ? 'videos' : 'análisis de rivales'} con partidos</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Analizando registros...</div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox icon={CheckCircle} color="text-green-600" label="Auto" value={preview.auto.length} />
              <StatBox icon={AlertTriangle} color="text-amber-600" label="Dudosos" value={preview.doubtful.length} />
              <StatBox icon={HelpCircle} color="text-slate-500" label="Manual" value={preview.manual.length} />
              <StatBox icon={Copy} color="text-red-600" label="Duplicados" value={preview.duplicates.length} />
            </div>

            {preview.total === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Todos los registros ya están vinculados a un partido.</p>
            )}

            {preview.auto.length > 0 && (
              <Section title="Vinculación automática sugerida" icon={CheckCircle} color="text-green-600">
                {preview.auto.map(({ record, match }) => (
                  <LinkRow key={record.id} record={record} match={match} onLink={() => linkRecord(record.id, match.id)} linking={linking === record.id} />
                ))}
              </Section>
            )}

            {preview.doubtful.length > 0 && (
              <Section title="Coincidencia dudosa (revisar)" icon={AlertTriangle} color="text-amber-600">
                {preview.doubtful.map(({ record, match, reason }) => (
                  <LinkRow key={record.id} record={record} match={match} reason={reason} onLink={() => linkRecord(record.id, match.id)} linking={linking === record.id} />
                ))}
              </Section>
            )}

            {preview.manual.length > 0 && (
              <Section title="Sin coincidencia — selección manual" icon={HelpCircle} color="text-slate-500">
                {preview.manual.map(({ record, reason }) => (
                  <div key={record.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                    <div>
                      <p className="font-medium text-slate-700">{record.title || record.opponent_player_name}</p>
                      <p className="text-xs text-slate-400">{reason}</p>
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {preview.duplicates.length > 0 && (
              <Section title="Múltiples coincidencias — no se vinculan automáticamente" icon={Copy} color="text-red-600">
                {preview.duplicates.map(({ record, matches }) => (
                  <div key={record.id} className="p-2 bg-slate-50 rounded text-sm">
                    <p className="font-medium text-slate-700">{record.title || record.opponent_player_name}</p>
                    <p className="text-xs text-slate-400 mt-1">{matches.length} partidos posibles:</p>
                    <div className="mt-1 space-y-1">
                      {matches.map(m => (
                        <div key={m.id} className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">vs {m.opponent} — {m.match_date?.slice(0, 10)}</span>
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => linkRecord(record.id, m.id)} disabled={linking === record.id}>
                            <Link2 className="w-3 h-3 mr-1" /> Vincular
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </Section>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ icon: Icon, color, label, value }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-lg">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Section({ title, icon: Icon, color, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} /> {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function LinkRow({ record, match, reason, onLink, linking }) {
  return (
    <div className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-700 truncate">{record.title || record.opponent_player_name}</p>
        <p className="text-xs text-slate-400">→ vs {match.opponent} · {match.match_date?.slice(0, 10)}</p>
        {reason && <Badge className="mt-1 bg-amber-100 text-amber-700 border-amber-200 text-xs">{reason}</Badge>}
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs ml-2" onClick={onLink} disabled={linking}>
        <Link2 className="w-3 h-3 mr-1" /> {linking ? '...' : 'Vincular'}
      </Button>
    </div>
  );
}