import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ApiTeamSearchDialog({ club, organization_id, user, onClose, onLinked }) {
  const [query, setQuery] = useState(club?.club_name || '');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setError(''); setResults(null);
    try {
      const res = await base44.functions.invoke('searchApiFootballTeams', { search: query, organization_id });
      setResults(res.data);
    } catch (err) { setError(err.message || 'Error en la búsqueda'); }
    setSearching(false);
  };

  const handleLink = async (team) => {
    setLinking(team.provider_team_id); setError('');
    try {
      await base44.functions.invoke('verifyClubMapping', {
        organization_id, club_id: club.id, club_name: club.club_name, club_key: club.club_key,
        provider_team_id: team.provider_team_id, provider_team_name: team.provider_team_name,
        provider_team_logo: team.logo, verified_by: user?.email || 'admin'
      });
      const syncRes = await base44.functions.invoke('syncClubFixtures', {
        organization_id, club_id: club.id, provider_team_id: team.provider_team_id, sync_type: 'manual'
      });
      setSyncResult(syncRes.data);
      onLinked(syncRes.data);
    } catch (err) { setError(err.message || 'Error al vincular'); }
    setLinking(null);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Vincular con API-Football</DialogTitle></DialogHeader>
        {syncResult ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <p className="text-sm font-medium">Vinculación exitosa</p>
            </div>
            <p className="text-sm text-slate-600">
              Fixtures importados: {syncResult.fixtures_imported || 0} · Actualizados: {syncResult.fixtures_updated || 0}
            </p>
            {syncResult.queries_remaining != null && <p className="text-xs text-slate-400">Consultas restantes: {syncResult.queries_remaining}</p>}
            <DialogFooter><Button onClick={onClose} className="bg-slate-900">Cerrar</Button></DialogFooter>
          </div>
        ) : (
          <>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar equipo..." />
              <Button type="submit" disabled={searching} size="sm">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </form>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {results && (
              <div className="space-y-2">
                {results.ambiguous && (
                  <div className="flex items-center gap-2 text-amber-700 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" /> Múltiples resultados — confirme el equipo exacto
                  </div>
                )}
                {results.teams?.map(t => (
                  <div key={t.provider_team_id} className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg">
                    {t.logo && <img src={t.logo} alt="" className="w-10 h-10 object-contain" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{t.provider_team_name}</p>
                      <p className="text-xs text-slate-400">{t.country}{t.city ? ` · ${t.city}` : ''}{t.venue ? ` · ${t.venue}` : ''}</p>
                    </div>
                    <Button size="sm" disabled={linking === t.provider_team_id} onClick={() => handleLink(t)} className="bg-slate-900">
                      {linking === t.provider_team_id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vincular'}
                    </Button>
                  </div>
                ))}
                {results.teams?.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sin resultados</p>}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}