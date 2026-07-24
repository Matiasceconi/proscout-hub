import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Eye, CheckCircle, FileText } from 'lucide-react';

export default function PlayerAnalysisTab({ player, permissions }) {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadData(); }, [player.id]);

  const loadData = async () => {
    try {
      const data = await base44.entities.OpponentAnalysis.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 50);
      setAnalyses(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando análisis...</div>;

  return (
    <div className="space-y-4">
      {permissions.canEditVideos && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Crear análisis
          </Button>
        </div>
      )}

      {analyses.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Search className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p>Sin análisis de rivales</p>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map(a => (
            <div key={a.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-medium text-slate-800">{a.opponent_player_name}</p>
                  <p className="text-xs text-slate-400">
                    {a.opponent_team ? `${a.opponent_team} · ` : ''}
                    {a.match_date ? formatDate(a.match_date) : formatDate(a.created_date)}
                  </p>
                </div>
                <div className="flex gap-1">
                  {a.status === 'draft' ? (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">Borrador</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 border-green-200">Publicado</Badge>
                  )}
                  {a.marked_as_seen && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      <Eye className="w-3 h-3 mr-1" /> Visto
                    </Badge>
                  )}
                </div>
              </div>
              {a.strengths && (
                <div className="mt-2 text-sm">
                  <p className="text-xs font-medium text-green-600">Fortalezas</p>
                  <p className="text-slate-600">{a.strengths}</p>
                </div>
              )}
              {a.weaknesses && (
                <div className="mt-2 text-sm">
                  <p className="text-xs font-medium text-red-600">Debilidades</p>
                  <p className="text-slate-600">{a.weaknesses}</p>
                </div>
              )}
              {a.recommendations && (
                <div className="mt-2 text-sm">
                  <p className="text-xs font-medium text-blue-600">Recomendaciones</p>
                  <p className="text-slate-600">{a.recommendations}</p>
                </div>
              )}
              {a.video_clips && a.video_clips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {a.video_clips.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Clip {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddAnalysisDialog player={player} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadData(); }} />}
    </div>
  );
}

function AddAnalysisDialog({ player, onClose, onSaved }) {
  const [form, setForm] = useState({
    opponent_player_name: '', opponent_player_position: '', opponent_team: '',
    match_date: '', strengths: '', weaknesses: '', recommendations: '',
    video_clips: '', status: 'draft'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const clips = form.video_clips ? form.video_clips.split('\n').map(u => u.trim()).filter(Boolean) : [];
      await base44.entities.OpponentAnalysis.create({
        ...form,
        video_clips: clips,
        organization_id: player.organization_id,
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        marked_as_seen: false,
        published_date: form.status === 'published' ? new Date().toISOString() : null
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Análisis del próximo rival</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Rival directo *</Label><Input value={form.opponent_player_name} onChange={e => setForm(f => ({ ...f, opponent_player_name: e.target.value }))} required /></div>
            <div><Label>Posición del rival</Label><Input value={form.opponent_player_position} onChange={e => setForm(f => ({ ...f, opponent_player_position: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Equipo rival</Label><Input value={form.opponent_team} onChange={e => setForm(f => ({ ...f, opponent_team: e.target.value }))} /></div>
            <div><Label>Fecha del partido</Label><Input type="date" value={form.match_date} onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))} /></div>
          </div>
          <div><Label>Fortalezas</Label><Textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} rows={2} /></div>
          <div><Label>Debilidades</Label><Textarea value={form.weaknesses} onChange={e => setForm(f => ({ ...f, weaknesses: e.target.value }))} rows={2} /></div>
          <div><Label>Recomendaciones</Label><Textarea value={form.recommendations} onChange={e => setForm(f => ({ ...f, recommendations: e.target.value }))} rows={2} /></div>
          <div><Label>Clips de video (una URL por línea)</Label><Textarea value={form.video_clips} onChange={e => setForm(f => ({ ...f, video_clips: e.target.value }))} rows={2} /></div>
          <div>
            <Label>Estado</Label>
            <div className="flex gap-2">
              <Button type="button" variant={form.status === 'draft' ? 'default' : 'outline'} size="sm" onClick={() => setForm(f => ({ ...f, status: 'draft' }))}>Guardar borrador</Button>
              <Button type="button" variant={form.status === 'published' ? 'default' : 'outline'} size="sm" onClick={() => setForm(f => ({ ...f, status: 'published' }))}>Publicar al jugador</Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}