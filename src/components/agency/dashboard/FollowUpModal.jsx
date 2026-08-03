import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CALLUP_OPTIONS = [
  { value: 'starter', label: 'Titular' },
  { value: 'substitute', label: 'Suplente' },
  { value: 'called_up', label: 'Convocado' },
  { value: 'not_called', label: 'No convocado' },
  { value: 'unconfirmed', label: 'Sin confirmar' },
];

const FOLLOW_UP_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'completed', label: 'Completado' },
  { value: 'not_required', label: 'No requerido' },
];

const selectClass = "mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export default function FollowUpModal({ open, onClose, fixture, player, existingStats, orgId, isHome, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingStats) {
      setForm({
        callup_status: existingStats.callup_status || 'unconfirmed',
        match_position: existingStats.match_position || '',
        minutes_played: existingStats.minutes_played || 0,
        goals: existingStats.goals || 0,
        assists: existingStats.assists || 0,
        yellow_cards: existingStats.yellow_cards || 0,
        red_cards: existingStats.red_cards || 0,
        rating: existingStats.rating || '',
        injury_or_incident: existingStats.injury_or_incident || '',
        agent_observations: existingStats.agent_observations || '',
        next_action: existingStats.next_action || '',
        follow_up_status: existingStats.follow_up_status || 'pending',
        responsible_agent: existingStats.responsible_agent || '',
      });
    } else {
      setForm({
        callup_status: 'unconfirmed', match_position: '', minutes_played: 0, goals: 0,
        assists: 0, yellow_cards: 0, red_cards: 0, rating: '', injury_or_incident: '',
        agent_observations: '', next_action: '', follow_up_status: 'pending', responsible_agent: '',
      });
    }
  }, [existingStats, open]);

  const update = (key, value) => setForm({ ...form, [key]: value });

  const handleSave = async () => {
    setSaving(true);
    try {
      const opponent = isHome ? fixture.away_team_name : fixture.home_team_name;
      const data = {
        organization_id: orgId,
        player_id: player.id,
        club_fixture_id: fixture.id,
        match_date: fixture.fixture_date?.slice(0, 10),
        season: fixture.season,
        competition: fixture.competition_name,
        opponent,
        is_starter: form.callup_status === 'starter',
        called_up: form.callup_status !== 'not_called',
        callup_status: form.callup_status,
        match_position: form.match_position,
        minutes_played: Number(form.minutes_played) || 0,
        goals: Number(form.goals) || 0,
        assists: Number(form.assists) || 0,
        yellow_cards: Number(form.yellow_cards) || 0,
        red_cards: Number(form.red_cards) || 0,
        rating: form.rating ? Number(form.rating) : null,
        injury_or_incident: form.injury_or_incident,
        agent_observations: form.agent_observations,
        follow_up_status: form.follow_up_status,
        next_action: form.next_action,
        responsible_agent: form.responsible_agent,
      };

      if (existingStats?.id) {
        await base44.entities.PlayerMatchStats.update(existingStats.id, data);
      } else {
        await base44.entities.PlayerMatchStats.create(data);
      }
      onSave?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  if (!fixture || !player) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seguimiento Post-Partido</DialogTitle>
          <p className="text-sm text-slate-500">{player.first_name} {player.last_name} · {fixture.home_team_name} vs {fixture.away_team_name}</p>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <Label className="text-xs">Convocatoria</Label>
            <select value={form.callup_status} onChange={e => update('callup_status', e.target.value)} className={selectClass}>
              {CALLUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Posición en el partido</Label>
            <Input value={form.match_position} onChange={e => update('match_position', e.target.value)} className="mt-1" placeholder="Ej: Mediocampista" />
          </div>
          <div>
            <Label className="text-xs">Minutos jugados</Label>
            <Input type="number" value={form.minutes_played} onChange={e => update('minutes_played', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Evaluación (1-10)</Label>
            <Input type="number" step="0.1" min="0" max="10" value={form.rating} onChange={e => update('rating', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Goles</Label>
            <Input type="number" value={form.goals} onChange={e => update('goals', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Asistencias</Label>
            <Input type="number" value={form.assists} onChange={e => update('assists', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Tarjetas amarillas</Label>
            <Input type="number" value={form.yellow_cards} onChange={e => update('yellow_cards', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Tarjetas rojas</Label>
            <Input type="number" value={form.red_cards} onChange={e => update('red_cards', e.target.value)} className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Lesiones o molestias</Label>
            <Input value={form.injury_or_incident} onChange={e => update('injury_or_incident', e.target.value)} className="mt-1" placeholder="Sin novedad" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Observaciones del agente</Label>
            <Textarea value={form.agent_observations} onChange={e => update('agent_observations', e.target.value)} className="mt-1" rows={3} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Próxima acción de la agencia</Label>
            <Input value={form.next_action} onChange={e => update('next_action', e.target.value)} className="mt-1" placeholder="Ej: Contactar al club" />
          </div>
          <div>
            <Label className="text-xs">Estado del seguimiento</Label>
            <select value={form.follow_up_status} onChange={e => update('follow_up_status', e.target.value)} className={selectClass}>
              {FOLLOW_UP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Agente responsable</Label>
            <Input value={form.responsible_agent} onChange={e => update('responsible_agent', e.target.value)} className="mt-1" placeholder="Nombre del agente" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}