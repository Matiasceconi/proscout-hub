import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, formatDateTime, daysUntil } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Calendar, Trophy, MapPin } from 'lucide-react';

export default function PlayerCalendarTab({ player, permissions }) {
  const [events, setEvents] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadData(); }, [player.id]);

  const loadData = async () => {
    try {
      const [e, m] = await Promise.all([
        base44.entities.CalendarEvent.filter({ organization_id: player.organization_id, player_id: player.id }, 'start_date', 50),
        base44.entities.Match.filter({ organization_id: player.organization_id, player_id: player.id }, 'match_date', 50)
      ]);
      setEvents(e);
      setMatches(m);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando calendario...</div>;

  const allItems = [
    ...matches.map(m => ({ ...m, _type: 'match', _date: m.match_date, _title: `vs ${m.opponent}` })),
    ...events.map(e => ({ ...e, _type: 'event', _date: e.start_date, _title: e.title }))
  ].sort((a, b) => new Date(a._date) - new Date(b._date));

  const upcoming = allItems.filter(i => new Date(i._date) >= new Date());
  const past = allItems.filter(i => new Date(i._date) < new Date()).reverse();

  return (
    <div className="space-y-4">
      {permissions.canEditStats && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAdd('event')}><Plus className="w-4 h-4 mr-1" /> Evento</Button>
          <Button size="sm" onClick={() => setShowAdd('match')} className="bg-slate-900"><Plus className="w-4 h-4 mr-1" /> Partido</Button>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Próximos eventos</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sin eventos próximos</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(item => <CalendarItem key={item.id} item={item} />)}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Historial</h3>
          <div className="space-y-2">
            {past.slice(0, 15).map(item => <CalendarItem key={item.id} item={item} past />)}
          </div>
        </div>
      )}

      {showAdd && <AddDialog type={showAdd} player={player} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadData(); }} />}
    </div>
  );
}

function CalendarItem({ item, past }) {
  const days = daysUntil(item._date);
  const isMatch = item._type === 'match';
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${past ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200 bg-white'}`}>
      <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${isMatch ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
        <span className="text-xs font-bold">{new Date(item._date).getDate()}</span>
        <span className="text-[10px] uppercase">{new Date(item._date).toLocaleDateString('es-ES', { month: 'short' })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 truncate">{item._title}</p>
        <p className="text-xs text-slate-400 truncate">
          {isMatch ? item.competition || 'Sin competencia' : item.event_type || 'Evento'}
          {item.location && ` · ${item.location}`}
        </p>
      </div>
      {!past && days !== null && (
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">
          {days === 0 ? 'Hoy' : `${days}d`}
        </Badge>
      )}
      {isMatch && item.status === 'finished' && (
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{item.score || 'Finalizado'}</Badge>
      )}
    </div>
  );
}

function AddDialog({ type, player, onClose, onSaved }) {
  const isMatch = type === 'match';
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isMatch) {
        await base44.entities.Match.create({
          ...form,
          organization_id: player.organization_id,
          player_id: player.id,
          player_name: `${player.first_name} ${player.last_name}`,
          status: 'scheduled'
        });
      } else {
        await base44.entities.CalendarEvent.create({
          ...form,
          organization_id: player.organization_id,
          player_id: player.id,
          player_name: `${player.first_name} ${player.last_name}`,
          status: 'scheduled'
        });
      }
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isMatch ? 'Cargar partido' : 'Crear evento'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {isMatch ? (
            <>
              <div><Label>Rival *</Label><Input value={form.opponent || ''} onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Competencia</Label><Input value={form.competition || ''} onChange={e => setForm(f => ({ ...f, competition: e.target.value }))} /></div>
                <div><Label>Temporada</Label><Input value={form.season || ''} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} /></div>
              </div>
              <div><Label>Fecha y hora *</Label><Input type="datetime-local" value={form.match_date || ''} onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Local/Visitante</Label>
                  <Select value={form.home_away || 'home'} onValueChange={v => setForm(f => ({ ...f, home_away: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Local</SelectItem>
                      <SelectItem value="away">Visitante</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Estadio</Label><Input value={form.venue || ''} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} /></div>
              </div>
            </>
          ) : (
            <>
              <div><Label>Título *</Label><Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
              <div>
                <Label>Tipo de evento</Label>
                <Select value={form.event_type || 'other'} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['match','training','medical','travel','media','meeting','other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Fecha y hora *</Label><Input type="datetime-local" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required /></div>
              <div><Label>Ubicación</Label><Input value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div><Label>Descripción</Label><Input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}