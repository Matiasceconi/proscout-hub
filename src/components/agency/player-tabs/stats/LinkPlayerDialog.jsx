import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Check, UserCheck } from 'lucide-react';

export default function LinkPlayerDialog({ player, organizationId, onClose, onLinked }) {
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [linking, setLinking] = useState(null);
  const [manualId, setManualId] = useState('');
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    setError(null);
    setSearched(true);
    try {
      const res = await base44.functions.invoke('suggestPlayerMatches', {
        player_id: player.id,
        organization_id: organizationId,
        season: '2026',
      });
      setSuggestions(res.data?.suggestions || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al buscar candidatos');
    }
    setSearching(false);
  };

  const handleLink = async (providerPlayerId, providerTeamId) => {
    setLinking(providerPlayerId);
    setError(null);
    try {
      await base44.functions.invoke('linkPlayerToProvider', {
        player_id: player.id,
        organization_id: organizationId,
        provider_player_id: providerPlayerId,
        provider_team_id: providerTeamId,
        verified_by: null,
      });
      onLinked();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al vincular jugador');
    }
    setLinking(null);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" /> Vincular {player.first_name} {player.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Buscá al jugador en API-Football para sincronizar sus estadísticas automáticamente.
          </p>

          <Button onClick={handleSearch} disabled={searching} className="w-full bg-slate-900">
            {searching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {searching ? 'Buscando...' : 'Buscar candidatos'}
          </Button>

          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

          {searched && !searching && suggestions.length === 0 && !error && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              No se encontraron candidatos. Verificá que el club del jugador esté mapeado a API-Football o ingresá el ID manualmente.
            </p>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600">Candidatos sugeridos</Label>
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                  {s.photo ? (
                    <img src={s.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-400">?</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">
                      {s.position || '—'} · {s.team_name || '—'} · {s.nationality || ''}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-green-600">{s.score}% match</span>
                      <span className="text-xs text-slate-400">{s.match_reasons.join(', ')}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLink(s.provider_player_id, null)}
                    disabled={linking === s.provider_player_id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {linking === s.provider_player_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                    Confirmar
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-3">
            <Label className="text-xs font-semibold text-slate-600">Vinculación manual por ID</Label>
            <p className="text-xs text-slate-400 mb-2">Si conocés el ID exacto del jugador en API-Football</p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Provider Player ID"
                value={manualId}
                onChange={e => setManualId(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => handleLink(manualId, null)}
                disabled={!manualId || linking === manualId}
                variant="outline"
              >
                {linking === manualId ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Vincular'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}