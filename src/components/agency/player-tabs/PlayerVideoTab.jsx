import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, daysUntil } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Video, Play, Search, Eye, CheckCircle, FileText, Link2, Clock, X, Film, Trophy } from 'lucide-react';
import MatchFilters, { DEFAULT_FILTERS, applyMatchFilters } from '@/components/agency/player-tabs/MatchFilters';
import VideoMigrationPreview from '@/components/agency/player-tabs/VideoMigrationPreview';

const VIDEO_CATEGORIES = [
  { value: 'full_match', label: 'Partido completo' },
  { value: 'highlights', label: 'Highlights' },
  { value: 'individual_actions', label: 'Acciones individuales' },
  { value: 'technical_analysis', label: 'Análisis técnico' },
  { value: 'tactical_analysis', label: 'Análisis táctico' },
  { value: 'goals_assists', label: 'Goles y asistencias' },
  { value: 'defensive_actions', label: 'Acciones defensivas' },
  { value: 'training', label: 'Entrenamiento' },
  { value: 'other', label: 'Otro' }
];

export default function PlayerVideoTab({ player, permissions, initialSubtab = 'own' }) {
  const [subtab, setSubtab] = useState(initialSubtab);
  const [matches, setMatches] = useState([]);
  const [videos, setVideos] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, analysis: 'all', status: 'all' });
  const [showAddVideo, setShowAddVideo] = useState(null);
  const [showAddAnalysis, setShowAddAnalysis] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [showMigration, setShowMigration] = useState(null);

  useEffect(() => { loadData(); }, [player.id]);
  useEffect(() => { setSubtab(initialSubtab); }, [initialSubtab]);

  const loadData = async () => {
    try {
      const [m, v, a] = await Promise.all([
        base44.entities.Match.filter({ organization_id: player.organization_id, player_id: player.id }, 'match_date', 100),
        base44.entities.VideoContent.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 100),
        base44.entities.OpponentAnalysis.filter({ organization_id: player.organization_id, player_id: player.id }, '-created_date', 100)
      ]);
      setMatches(m);
      setVideos(v);
      setAnalyses(a);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const videosByMatch = useMemo(() => {
    const map = {};
    videos.forEach(v => {
      if (v.match_id) {
        if (!map[v.match_id]) map[v.match_id] = [];
        map[v.match_id].push(v);
      }
    });
    return map;
  }, [videos]);

  const analysesByMatch = useMemo(() => {
    const map = {};
    analyses.forEach(a => {
      if (a.match_id) {
        if (!map[a.match_id]) map[a.match_id] = [];
        map[a.match_id].push(a);
      }
    });
    return map;
  }, [analyses]);

  const unlinkedCount = subtab === 'own'
    ? videos.filter(v => !v.match_id).length
    : analyses.filter(a => !a.match_id).length;

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando videos...</div>;

  return (
    <div className="space-y-4">
      {/* Subtabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button onClick={() => setSubtab('own')} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium ${subtab === 'own' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
          <Video className="w-4 h-4" /> Análisis propio
        </button>
        <button onClick={() => setSubtab('opponent')} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium ${subtab === 'opponent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
          <Search className="w-4 h-4" /> Análisis rival
        </button>
      </div>

      {/* Migration preview button */}
      {permissions.canEditVideos && unlinkedCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Link2 className="w-4 h-4 text-amber-600" />
          <p className="text-sm text-amber-700 flex-1">{unlinkedCount} registro(s) sin partido vinculado</p>
          <Button size="sm" variant="outline" onClick={() => setShowMigration(subtab === 'own' ? 'video' : 'analysis')} className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
            Vincular
          </Button>
        </div>
      )}

      {subtab === 'own' ? (
        <OwnSubtab
          matches={matches}
          videosByMatch={videosByMatch}
          filters={filters}
          setFilters={setFilters}
          permissions={permissions}
          onPlay={setPlayingVideo}
          onAddVideo={setShowAddVideo}
        />
      ) : (
        <OpponentSubtab
          matches={matches}
          analysesByMatch={analysesByMatch}
          filters={filters}
          setFilters={setFilters}
          permissions={permissions}
          onAddAnalysis={setShowAddAnalysis}
        />
      )}

      {showAddVideo && <AddVideoDialog player={player} match={showAddVideo} onClose={() => setShowAddVideo(null)} onSaved={() => { setShowAddVideo(null); loadData(); }} />}
      {showAddAnalysis && <AddAnalysisDialog player={player} match={showAddAnalysis} onClose={() => setShowAddAnalysis(null)} onSaved={() => { setShowAddAnalysis(null); loadData(); }} />}
      {playingVideo && <VideoPlayerDialog video={playingVideo} onClose={() => setPlayingVideo(null)} />}
      {showMigration && <VideoMigrationPreview player={player} type={showMigration} onClose={() => setShowMigration(null)} onLinked={loadData} />}
    </div>
  );
}

function OwnSubtab({ matches, videosByMatch, filters, setFilters, permissions, onPlay, onAddVideo }) {
  const filtered = useMemo(() => {
    let result = applyMatchFilters(matches, filters);
    if (filters.analysis !== 'all') {
      result = result.filter(m => {
        const has = (videosByMatch[m.id] || []).length > 0;
        return filters.analysis === 'with' ? has : !has;
      });
    }
    if (filters.status !== 'all') {
      result = result.filter(m => (videosByMatch[m.id] || []).some(v => v.status === filters.status) || (filters.status === 'draft' && !(videosByMatch[m.id] || []).length));
    }
    const now = new Date();
    const upcoming = result.filter(m => new Date(m.match_date) >= now).sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
    const past = result.filter(m => new Date(m.match_date) < now).sort((a, b) => new Date(b.match_date) - new Date(a.match_date));
    return { upcoming, past };
  }, [matches, filters, videosByMatch]);

  return (
    <div className="space-y-4">
      <MatchFilters matches={matches} filters={filters} setFilters={setFilters} showAnalysisFilter showStatusFilter />

      {filtered.upcoming.length === 0 && filtered.past.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Sin partidos para los filtros seleccionados</p>
      ) : (
        <>
          {filtered.upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Próximos partidos</h3>
              <div className="space-y-3">{filtered.upcoming.map(m => <MatchVideoCard key={m.id} match={m} videos={videosByMatch[m.id] || []} permissions={permissions} onPlay={onPlay} onAddVideo={onAddVideo} />)}</div>
            </div>
          )}
          {filtered.past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Partidos anteriores</h3>
              <div className="space-y-3">{filtered.past.map(m => <MatchVideoCard key={m.id} match={m} videos={videosByMatch[m.id] || []} permissions={permissions} onPlay={onPlay} onAddVideo={onAddVideo} />)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OpponentSubtab({ matches, analysesByMatch, filters, setFilters, permissions, onAddAnalysis }) {
  const filtered = useMemo(() => {
    let result = applyMatchFilters(matches, filters);
    if (filters.analysis !== 'all') {
      result = result.filter(m => {
        const has = (analysesByMatch[m.id] || []).length > 0;
        return filters.analysis === 'with' ? has : !has;
      });
    }
    if (filters.status !== 'all') {
      result = result.filter(m => (analysesByMatch[m.id] || []).some(a => a.status === filters.status));
    }
    const now = new Date();
    const upcoming = result.filter(m => new Date(m.match_date) >= now).sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
    const past = result.filter(m => new Date(m.match_date) < now).sort((a, b) => new Date(b.match_date) - new Date(a.match_date));
    return { upcoming, past };
  }, [matches, filters, analysesByMatch]);

  return (
    <div className="space-y-4">
      <MatchFilters matches={matches} filters={filters} setFilters={setFilters} showAnalysisFilter showStatusFilter />

      {filtered.upcoming.length === 0 && filtered.past.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Sin partidos para los filtros seleccionados</p>
      ) : (
        <>
          {filtered.upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Próximos partidos</h3>
              <div className="space-y-3">{filtered.upcoming.map(m => <MatchAnalysisCard key={m.id} match={m} analyses={analysesByMatch[m.id] || []} permissions={permissions} onAddAnalysis={onAddAnalysis} />)}</div>
            </div>
          )}
          {filtered.past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Partidos anteriores</h3>
              <div className="space-y-3">{filtered.past.map(m => <MatchAnalysisCard key={m.id} match={m} analyses={analysesByMatch[m.id] || []} permissions={permissions} onAddAnalysis={onAddAnalysis} />)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MatchVideoCard({ match, videos, permissions, onPlay, onAddVideo }) {
  const days = daysUntil(match.match_date);
  const published = videos.filter(v => v.status === 'published');
  const drafts = videos.filter(v => v.status === 'draft');
  const hasContent = videos.length > 0;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3 bg-slate-50/50 border-b border-slate-100">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold">{new Date(match.match_date).getDate()}</span>
          <span className="text-[9px] uppercase">{new Date(match.match_date).toLocaleDateString('es-ES', { month: 'short' })}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 truncate">vs {match.opponent}</p>
          <p className="text-xs text-slate-400 truncate">
            {match.competition || 'Sin competencia'} {match.season ? `· ${match.season}` : ''}
            {match.home_away && ` · ${match.home_away === 'home' ? 'Local' : match.home_away === 'away' ? 'Visitante' : 'Neutral'}`}
            {match.status === 'finished' && match.score && ` · ${match.score}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!hasContent && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Análisis pendiente</Badge>}
          {hasContent && <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">{videos.length} video{videos.length > 1 ? 's' : ''}</Badge>}
          {days !== null && days >= 0 && <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">{days === 0 ? 'Hoy' : `${days}d`}</Badge>}
        </div>
      </div>

      {hasContent ? (
        <div className="p-3 space-y-2">
          {videos.map(v => (
            <div key={v.id} className="flex gap-3 p-2 rounded-lg hover:bg-slate-50">
              <div className="w-24 h-16 rounded bg-slate-900 relative flex-shrink-0 overflow-hidden">
                {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Video className="w-6 h-6 text-white/30 absolute inset-0 m-auto" />}
                <button onClick={() => onPlay(v)} className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40">
                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-4 h-4 text-slate-900 ml-0.5" /></div>
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{v.title}</p>
                <p className="text-xs text-slate-400">{VIDEO_CATEGORIES.find(c => c.value === v.category)?.label || v.category}</p>
                {v.status === 'draft' && <Badge className="mt-1 bg-amber-100 text-amber-700 border-amber-200 text-xs">Borrador</Badge>}
                {v.status === 'published' && <Badge className="mt-1 bg-green-100 text-green-700 border-green-200 text-xs">Publicado</Badge>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 text-center">
          <p className="text-xs text-slate-400 mb-2">Sin análisis propio cargado</p>
        </div>
      )}

      {permissions.canEditVideos && (
        <div className="p-3 pt-0 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => onAddVideo(match)} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> {hasContent ? 'Agregar otro' : 'Agregar análisis'}
          </Button>
        </div>
      )}
    </div>
  );
}

function MatchAnalysisCard({ match, analyses, permissions, onAddAnalysis }) {
  const hasContent = analyses.length > 0;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3 bg-slate-50/50 border-b border-slate-100">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold">{new Date(match.match_date).getDate()}</span>
          <span className="text-[9px] uppercase">{new Date(match.match_date).toLocaleDateString('es-ES', { month: 'short' })}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 truncate">vs {match.opponent}</p>
          <p className="text-xs text-slate-400 truncate">
            {match.competition || 'Sin competencia'} {match.season ? `· ${match.season}` : ''}
            {match.home_away && ` · ${match.home_away === 'home' ? 'Local' : match.home_away === 'away' ? 'Visitante' : 'Neutral'}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!hasContent && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Análisis pendiente</Badge>}
          {hasContent && <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">{analyses.length} análisis</Badge>}
        </div>
      </div>

      {hasContent ? (
        <div className="p-3 space-y-3">
          {analyses.map(a => (
            <div key={a.id} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.opponent_player_name}</p>
                  <p className="text-xs text-slate-400">{a.opponent_team} {a.opponent_player_position ? `· ${a.opponent_player_position}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  {a.status === 'draft' ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Borrador</Badge> : <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Publicado</Badge>}
                  {a.marked_as_seen && <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs"><Eye className="w-3 h-3 mr-0.5" />Visto</Badge>}
                </div>
              </div>
              {a.strengths && <div className="text-xs mb-1"><span className="font-medium text-green-600">Fortalezas: </span><span className="text-slate-600">{a.strengths}</span></div>}
              {a.weaknesses && <div className="text-xs mb-1"><span className="font-medium text-red-600">Debilidades: </span><span className="text-slate-600">{a.weaknesses}</span></div>}
              {a.recommendations && <div className="text-xs mb-1"><span className="font-medium text-blue-600">Recomendaciones: </span><span className="text-slate-600">{a.recommendations}</span></div>}
              {a.video_clips && a.video_clips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {a.video_clips.map((url, i) => <a key={i} href={url} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><FileText className="w-3 h-3" />Clip {i + 1}</a>)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 text-center"><p className="text-xs text-slate-400 mb-2">Sin análisis rival cargado</p></div>
      )}

      {permissions.canEditVideos && (
        <div className="p-3 pt-0 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => onAddAnalysis(match)} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> {hasContent ? 'Agregar otro' : 'Agregar análisis'}
          </Button>
        </div>
      )}
    </div>
  );
}

function VideoPlayerDialog({ video, onClose }) {
  const isEmbeddable = video.video_url && (video.video_url.includes('youtube.com') || video.video_url.includes('youtu.be') || video.video_url.includes('vimeo.com'));
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{video.title}</DialogTitle></DialogHeader>
        <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
          {isEmbeddable ? (
            <iframe src={video.video_url.replace('watch?v=', 'embed/')} className="w-full h-full" allowFullScreen />
          ) : video.video_url?.endsWith('.mp4') || video.video_url?.endsWith('.webm') ? (
            <video src={video.video_url} controls className="w-full h-full" />
          ) : (
            <a href={video.video_url} target="_blank" rel="noopener" className="text-white/70 hover:text-white flex flex-col items-center gap-2">
              <Play className="w-12 h-12" />
              <span className="text-sm">Abrir video</span>
            </a>
          )}
        </div>
        {video.description && <p className="text-sm text-slate-500">{video.description}</p>}
        <DialogFooter><Button variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddVideoDialog({ player, match, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', video_url: '', thumbnail_url: '', category: 'full_match', status: 'published' });
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
        match_id: match.id,
        match_date: match.match_date?.slice(0, 10),
        competition: match.competition,
        season: match.season,
        opponent: match.opponent,
        published_date: form.status === 'published' ? new Date().toISOString() : null
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Agregar análisis — vs {match.opponent}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div><Label>URL del video *</Label><Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://..." required /></div>
          <div><Label>URL de miniatura</Label><Input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} placeholder="https://..." /></div>
          <div>
            <Label>Categoría</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VIDEO_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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

function AddAnalysisDialog({ player, match, onClose, onSaved }) {
  const [form, setForm] = useState({ opponent_player_name: '', opponent_player_position: '', opponent_team: match.opponent || '', strengths: '', weaknesses: '', recommendations: '', video_clips: '', status: 'draft' });
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
        match_id: match.id,
        match_date: match.match_date?.slice(0, 10),
        competition: match.competition,
        season: match.season,
        opponent_team: form.opponent_team || match.opponent,
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
        <DialogHeader><DialogTitle>Análisis rival — vs {match.opponent}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Rival directo *</Label><Input value={form.opponent_player_name} onChange={e => setForm(f => ({ ...f, opponent_player_name: e.target.value }))} required /></div>
            <div><Label>Posición</Label><Input value={form.opponent_player_position} onChange={e => setForm(f => ({ ...f, opponent_player_position: e.target.value }))} /></div>
          </div>
          <div><Label>Equipo rival</Label><Input value={form.opponent_team} onChange={e => setForm(f => ({ ...f, opponent_team: e.target.value }))} /></div>
          <div><Label>Fortalezas</Label><Textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} rows={2} /></div>
          <div><Label>Debilidades</Label><Textarea value={form.weaknesses} onChange={e => setForm(f => ({ ...f, weaknesses: e.target.value }))} rows={2} /></div>
          <div><Label>Recomendaciones</Label><Textarea value={form.recommendations} onChange={e => setForm(f => ({ ...f, recommendations: e.target.value }))} rows={2} /></div>
          <div><Label>Clips de video (una URL por línea)</Label><Textarea value={form.video_clips} onChange={e => setForm(f => ({ ...f, video_clips: e.target.value }))} rows={2} /></div>
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