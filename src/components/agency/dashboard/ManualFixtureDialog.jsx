import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { PLAYER_CATEGORIES } from '@/lib/roleUtils';

const selectClass = "mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export default function ManualFixtureDialog({ open, onClose, orgId, players, clubs, onSave }) {
  const [form, setForm] = useState({});
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        fixture_date: '', home_team_name: '', away_team_name: '',
        home_team_logo: '', away_team_logo: '', competition_name: '',
        stadium: '', fixture_city: '', category: '',
      });
      setSelectedPlayers([]);
    }
  }, [open]);

  const update = (key, value) => setForm({ ...form, [key]: value });

  const togglePlayer = (playerId) => {
    setSelectedPlayers(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
  };

  const handleClubSelect = (side, clubId) => {
    const club = clubs.find(c => c.id === clubId);
    if (club) {
      update(side === 'home' ? 'home_team_name' : 'away_team_name', club.club_name);
      update(side === 'home' ? 'home_team_logo' : 'away_team_logo', club.internal_logo_url || club.official_logo_url || '');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const mapped_club_ids = selectedPlayers
        .map(pid => players.find(p => p.id === pid)?.current_club_id)
        .filter(Boolean);
      const unique_club_ids = [...new Set(mapped_club_ids)];

      const fixtureData = {
        organization_id: orgId,
        provider: 'manual',
        provider_fixture_id: `manual-${Date.now()}`,
        fixture_date: form.fixture_date ? new Date(form.fixture_date).toISOString() : new Date().toISOString(),
        home_team_name: form.home_team_name,
        away_team_name: form.away_team_name,
        home_team_logo: form.home_team_logo || '',
        away_team_logo: form.away_team_logo || '',
        competition_name: form.competition_name || '',
        stadium: form.stadium || null,
        fixture_city: form.fixture_city || null,
        fixture_status: 'TBD',
        mapped_club_ids: unique_club_ids,
        season: new Date().getFullYear().toString(),
      };

      await base44.entities.ClubFixture.create(fixtureData);
      onSave?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cargar Partido Manual</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label className="text-xs">Fecha y hora</Label>
            <Input type="datetime-local" value={form.fixture_date} onChange={e => update('fixture_date', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Equipo local (club existente)</Label>
            <select onChange={e => handleClubSelect('home', e.target.value)} className={selectClass}>
              <option value="">Seleccionar club</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.club_name}</option>)}
            </select>
            <Input value={form.home_team_name} onChange={e => update('home_team_name', e.target.value)} className="mt-1" placeholder="O escribir nombre" />
          </div>
          <div>
            <Label className="text-xs">Equipo visitante (club existente)</Label>
            <select onChange={e => handleClubSelect('away', e.target.value)} className={selectClass}>
              <option value="">Seleccionar club</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.club_name}</option>)}
            </select>
            <Input value={form.away_team_name} onChange={e => update('away_team_name', e.target.value)} className="mt-1" placeholder="O escribir nombre" />
          </div>
          <div>
            <Label className="text-xs">Competencia</Label>
            <Input value={form.competition_name} onChange={e => update('competition_name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Categoría</Label>
            <select value={form.category} onChange={e => update('category', e.target.value)} className={selectClass}>
              <option value="">Sin categoría</option>
              {Object.entries(PLAYER_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Cancha/Estadio</Label>
            <Input value={form.stadium} onChange={e => update('stadium', e.target.value)} className="mt-1" placeholder="A confirmar" />
          </div>
          <div>
            <Label className="text-xs">Ciudad</Label>
            <Input value={form.fixture_city} onChange={e => update('fixture_city', e.target.value)} className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Jugadores a vincular</Label>
            <div className="mt-1 max-h-40 overflow-y-auto border border-input rounded-md p-2 space-y-0.5">
              {players.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                  <input type="checkbox" checked={selectedPlayers.includes(p.id)} onChange={() => togglePlayer(p.id)} className="rounded" />
                  <span>{p.first_name} {p.last_name}</span>
                  <span className="text-xs text-slate-400">· {p.club || 'Sin club'}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.home_team_name || !form.away_team_name || !form.fixture_date}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Crear Partido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}