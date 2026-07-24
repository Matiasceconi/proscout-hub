import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Video, Play } from 'lucide-react';

export default function PlayerVideosTab({ player, permissions }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadData(); }, [player.id]);

  const loadData = async () => {
    try {
      const data = await base44.entities.VideoContent.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 50);
      setVideos(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando videos...</div>;

  return (
    <div className="space-y-4">
      {permissions.canEditVideos && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Agregar video
          </Button>
        </div>
      )}

      {videos.length === 0 ? (
        <EmptyState icon={Video} title="Sin videos" description="No se han cargado videos para este jugador." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {videos.map(v => (
            <div key={v.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="aspect-video bg-slate-900 relative flex items-center justify-center">
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Video className="w-10 h-10 text-white/30" />
                )}
                <a href={v.video_url} target="_blank" rel="noopener" className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-slate-900 ml-0.5" />
                  </div>
                </a>
                {v.status === 'draft' && (
                  <div className="absolute top-2 left-2"><Badge className="bg-amber-100 text-amber-700 border-amber-200">Borrador</Badge></div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-slate-800 truncate">{v.title}</p>
                <p className="text-xs text-slate-400">{formatDate(v.published_date || v.created_date)} · {v.category}</p>
                {v.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{v.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddVideoDialog player={player} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadData(); }} />}
    </div>
  );
}

function AddVideoDialog({ player, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', video_url: '', thumbnail_url: '', category: 'individual', status: 'published' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.VideoContent.create({
        ...form,
        organization_id: player.organization_id,
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        published_date: form.status === 'published' ? new Date().toISOString() : null
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Agregar video</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div><Label>URL del video *</Label><Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://..." required /></div>
          <div><Label>URL de miniatura</Label><Input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} placeholder="https://..." /></div>
          <div>
            <Label>Categoría</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['match_highlight','training','technical_analysis','tactical','individual','other'].map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Descripción</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
          <div>
            <Label>Estado</Label>
            <div className="flex gap-2">
              <Button type="button" variant={form.status === 'draft' ? 'default' : 'outline'} size="sm" onClick={() => setForm(f => ({ ...f, status: 'draft' }))}>Borrador</Button>
              <Button type="button" variant={form.status === 'published' ? 'default' : 'outline'} size="sm" onClick={() => setForm(f => ({ ...f, status: 'published' }))}>Publicar</Button>
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