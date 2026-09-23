import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId } from '@/lib/roleUtils';
import { Input } from '@/components/ui/input';
import { Building2, Search, Users, Trophy, MapPin, ArrowUpRight } from 'lucide-react';

const isFinished = (status) => ['FT', 'AET', 'PEN'].includes(status);

export default function Clubs() {
  const { user } = useAuth();
  const orgId = getUserOrgId(user);
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      base44.entities.Club.list('club_name', 500),
      base44.entities.Player.filter({ organization_id: orgId, status: { $ne: 'archived' } }, '-updated_date', 300),
      base44.entities.ClubFixture.filter({ organization_id: orgId, provider: { $in: ['api_football', 'manual'] } }, '-fixture_date', 1000),
      base44.entities.ClubProviderMapping.filter({ organization_id: orgId, mapping_status: 'verified' }, '-updated_date', 500),
    ]).then(([clubRows, playerRows, fixtureRows, mappingRows]) => {
      setClubs(clubRows);
      setPlayers(playerRows);
      setFixtures(fixtureRows);
      setMappings(mappingRows);
    }).catch(console.error).finally(() => setLoading(false));
  }, [orgId]);

  const rows = useMemo(() => {
    const relevantIds = new Set();
    players.forEach(p => {
      if (p.current_club_id) relevantIds.add(p.current_club_id);
      if (p.loan_from_club_id) relevantIds.add(p.loan_from_club_id);
    });
    mappings.forEach(m => m.club_id && relevantIds.add(m.club_id));

    const now = Date.now();
    return clubs
      .filter(c => relevantIds.has(c.id))
      .map(club => {
        const clubPlayers = players.filter(p => p.current_club_id === club.id);
        const clubFixtures = fixtures.filter(f => f.mapped_club_ids?.includes(club.id));
        const next = clubFixtures
          .filter(f => new Date(f.fixture_date).getTime() >= now && !isFinished(f.fixture_status))
          .sort((a, b) => new Date(a.fixture_date) - new Date(b.fixture_date))[0] || null;
        const last = clubFixtures
          .filter(f => new Date(f.fixture_date).getTime() < now || isFinished(f.fixture_status))
          .sort((a, b) => new Date(b.fixture_date) - new Date(a.fixture_date))[0] || null;
        return { club, clubPlayers, next, last, fixturesCount: clubFixtures.length };
      })
      .filter(row => {
        if (!search) return true;
        const q = search.toLowerCase();
        return `${row.club.club_name} ${row.club.country || ''} ${row.club.city || ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.clubPlayers.length - a.clubPlayers.length || a.club.club_name.localeCompare(b.club.club_name));
  }, [clubs, players, fixtures, mappings, search]);

  if (loading) return <div className="p-10 text-slate-500">Cargando clubes relacionados…</div>;

  return (
    <div className="mx-auto max-w-[1500px] p-4 lg:p-6 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Red de relaciones</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Clubes</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Clubes conectados con representados, partidos y futuras oportunidades de mercado.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} className="pl-9" placeholder="Buscar club, ciudad o país…" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ club, clubPlayers, next, last, fixturesCount }) => (
          <Link key={club.id} to={`/agency/clubs/${club.id}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                {(club.internal_logo_url || club.official_logo_url) ? <img src={club.internal_logo_url || club.official_logo_url} alt="" className="h-11 w-11 object-contain" /> : <Building2 className="h-6 w-6 text-slate-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="truncate text-lg font-bold text-slate-900 group-hover:text-emerald-700">{club.club_name}</h2>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{[club.city, club.country].filter(Boolean).join(', ') || 'Ubicación sin registrar'}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <MiniStat icon={Users} value={clubPlayers.length} label="Representados" />
              <MiniStat icon={Trophy} value={fixturesCount} label="Partidos" />
              <MiniStat value={next ? 'Sí' : '—'} label="Próximo" />
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              {next ? <FixtureLine label="Próximo" fixture={next} /> : last ? <FixtureLine label="Último" fixture={last} /> : <p className="text-xs text-slate-400">Sin partidos vinculados todavía.</p>}
            </div>
          </Link>
        ))}
      </div>

      {!rows.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No hay clubes relacionados con los filtros actuales.</div>}
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"><div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">{Icon && <Icon className="h-3.5 w-3.5 text-emerald-600" />}{value}</div><p className="mt-0.5 text-[10px] text-slate-500">{label}</p></div>;
}

function FixtureLine({ label, fixture }) {
  return <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{fixture.home_team_name} vs {fixture.away_team_name}</p></div><p className="shrink-0 text-xs text-slate-500">{new Date(fixture.fixture_date).toLocaleDateString('es-AR',{day:'2-digit',month:'short'})}</p></div>;
}