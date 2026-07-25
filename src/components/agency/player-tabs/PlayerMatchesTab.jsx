import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDateTime, daysUntil } from '@/lib/roleUtils';
import { Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trophy, Plus, MapPin } from 'lucide-react';

export default function PlayerMatchesTab({ player, permissions }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { load(); }, [player.id]);

  const load = async () => {
    try {
      const data = await base44.entities.Match.filter({ organization_id: player.organization_id, player_id: player.id }, 'match_date', 50);
      setMatches(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Cargando partidos...</div>;

  const now = new Date();
  const upcoming = matches.filter(m => new Date(m.match_date) >= now);
  const past = matches.filter(m => new Date(m.match_date) < now).reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{matches.length} partidos</p>
        {permissions.canEditStats && (
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-3.5 h-3.5 mr-1" /> Cargar partido
          </Button>
        )}
      </div>

      {matches.length === 0 ? (
        <EmptyState icon={Trophy} title="Sin partidos" description="Carga los partidos del jugador para llevar el historial." />
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Próximos</h3>
              <div className="space-y-2">
                {upcoming.map(m => <MatchRow key={m.id} match={m} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2">Historial</h3>
              <div className="space-y-2">
                {past.map(m => <MatchRow key={m.id} match={m} past />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && <AddMatchDialog player={player} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function MatchRow({ match, past }) {
  const days = daysUntil(match.match_date);
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${past ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold">{new Date(match.match_date).getDate()}</span>
        <span className="text-[10px] uppercase">{new Date(match.match_date).toLocaleDateString('es-ES', { month: 'short' })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 truncate">vs {match.opponent}</p>
        <p className="text-xs text-slate-400 truncate">
          {match.competition || 'Sin competencia'}
          {match.home_away && ` · ${match.home_away === 'home' ? 'Local' : match.home_away === 'away' ? 'Visitante' : 'Neutral'}`}
          {match.venue && ` · ${match.venue}`}
        </p>
      </div>
      {!past && days !== null && (
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">
          {days === 0 ? 'Hoy' : `${days}d`}
        </Badge>
      )}
      {past && match.status === 'finished' && (
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{match.score || 'Finalizado'}</Badge>
      )}
    </div>
  );
}

function AddMatchDialog({ player, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Match.create({
        ...form,
        organization_id: player.organization_id,
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        status: 'scheduled'
      });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cargar partido</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}