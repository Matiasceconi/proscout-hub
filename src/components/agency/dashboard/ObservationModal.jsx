import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ObservationModal({ open, onClose, fixture, player, existingStats, orgId, onSave }) {
  const [observations, setObservations] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [responsible, setResponsible] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingStats) {
      setObservations(existingStats.agent_observations || '');
      setNextAction(existingStats.next_action || '');
      setResponsible(existingStats.responsible_agent || '');
    } else {
      setObservations('');
      setNextAction('');
      setResponsible('');
    }
  }, [existingStats, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        organization_id: orgId,
        player_id: player.id,
        club_fixture_id: fixture.id,
        match_date: fixture.fixture_date?.slice(0, 10),
        competition: fixture.competition_name,
        agent_observations: observations,
        next_action: nextAction,
        responsible_agent: responsible,
        follow_up_status: existingStats?.follow_up_status || 'pending',
        callup_status: existingStats?.callup_status || 'unconfirmed',
        called_up: existingStats?.called_up ?? true,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Observación</DialogTitle>
          <p className="text-sm text-slate-500">{player.first_name} {player.last_name} · {fixture.home_team_name} vs {fixture.away_team_name}</p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Observación</Label>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} className="mt-1" rows={4} placeholder="Observación del agente..." />
          </div>
          <div>
            <Label className="text-xs">Próxima acción</Label>
            <Input value={nextAction} onChange={e => setNextAction(e.target.value)} className="mt-1" placeholder="Ej: Llamar al club" />
          </div>
          <div>
            <Label className="text-xs">Agente responsable</Label>
            <Input value={responsible} onChange={e => setResponsible(e.target.value)} className="mt-1" />
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