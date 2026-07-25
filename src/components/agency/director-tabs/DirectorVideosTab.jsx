import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Video, Plus, ExternalLink } from 'lucide-react';

const VIDEO_CATEGORIES = {
  match_highlight: 'Resumen de partido', training: 'Entrenamiento', technical_analysis: 'Análisis técnico',
  tactical: 'Táctico', individual: 'Individual', presentation: 'Presentación', other: 'Otro'
};

export default function DirectorVideosTab({ director, canManage }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, [director.id]);

  const load = async () => {
    try {
      const data = await base44.entities.VideoContent.filter({ organization_id: director.organization_id, director_id: director.id }, '-published_date', 50);
      setVideos(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando videos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{videos.length} videos</p>
        {canManage && <Button size="sm" onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800"><Plus className="w-3.5 h-3.5 mr-1" /> Agregar</Button>}
      </div>

      {videos.length === 0 ? (
        <EmptyState icon={Video} title="Sin videos" description="Agrega videos o presentaciones del director." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {videos.map(v => (
            <div key={v.id} className="border border-slate-200 rounded-lg overflow-hidden">
              {v.thumbnail_url && <div className="aspect-video bg-slate-100"><img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" /></div>}
              <div className="p-3">
                <p className="font-medium text-slate-800 text-sm truncate">{v.title}</p>
                <Badge className="bg-slate-100 text-slate-600 border-slate-200 mt-1">{VIDEO_CATEGORIES[v.category] || v.category}</Badge>
                {v.description && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{v.description}</p>}
                <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                  <ExternalLink className="w-3 h-3" /> Ver video
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <VideoDialog director={director} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function VideoDialog({ director, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', video_url: '', thumbnail_url: '', category: 'presentation' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.VideoContent.create({
        ...form, organization_id: director.organization_id, director_id: director.id,
        status: 'published', published_date: new Date().toISOString(), visibility: 'staff_only'
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Agregar video</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Título *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div className="space-y-1.5"><Label>URL del video *</Label><Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://..." required /></div>
          <div className="space-y-1.5"><Label>URL de miniatura</Label><Input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} /></div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(VIDEO_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Descripción</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}