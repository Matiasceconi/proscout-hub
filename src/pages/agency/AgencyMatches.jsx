import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId } from '@/lib/roleUtils';
import { Input } from '@/components/ui/input';
import { Trophy, Search, Users, CalendarDays, ArrowUpRight } from 'lucide-react';
import { dedupeFixtureRecords } from '@/lib/fixtureRecords';

const finished = s => ['FT','AET','PEN'].includes(s);
const live = s => ['1H','HT','2H','ET','BT','P'].includes(s);

export default function AgencyMatches() {
  const { user } = useAuth();
  const orgId = getUserOrgId(user);
  const [loading,setLoading]=useState(true);
  const [fixtures,setFixtures]=useState([]);
  const [players,setPlayers]=useState([]);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');

  useEffect(()=>{
    if(!orgId)return;
    Promise.all([
      base44.entities.ClubFixture.filter({organization_id:orgId,provider:{$in:['api_football','manual']}},'-fixture_date',1000),
      base44.entities.Player.filter({organization_id:orgId,status:{$ne:'archived'}},'-updated_date',300),
    ]).then(([f,p])=>{setFixtures(dedupeFixtureRecords(f));setPlayers(p);}).catch(console.error).finally(()=>setLoading(false));
  },[orgId]);

  const rows=useMemo(()=>{
    const now=Date.now();
    return fixtures.map(f=>{
      const represented=players.filter(p=>f.linked_player_ids?.includes(p.id)||(p.current_club_id&&f.mapped_club_ids?.includes(p.current_club_id)));
      return {...f,represented};
    }).filter(f=>f.represented.length>0).filter(f=>{
      if(filter==='upcoming' && (finished(f.fixture_status)||new Date(f.fixture_date).getTime()<now)) return false;
      if(filter==='finished' && !finished(f.fixture_status)) return false;
      if(filter==='live' && !live(f.fixture_status)) return false;
      if(search){const q=search.toLowerCase();if(!`${f.home_team_name} ${f.away_team_name} ${f.competition_name||''} ${f.represented.map(p=>`${p.first_name} ${p.last_name}`).join(' ')}`.toLowerCase().includes(q))return false;}
      return true;
    }).sort((a,b)=>{
      if(filter==='upcoming') return new Date(a.fixture_date)-new Date(b.fixture_date);
      return new Date(b.fixture_date)-new Date(a.fixture_date);
    });
  },[fixtures,players,search,filter]);

  if(loading)return <div className="p-10 text-slate-500">Cargando partidos relacionados…</div>;

  return <div className="mx-auto max-w-[1500px] p-4 lg:p-6 space-y-5">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Partidos conectados</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Partidos</h1><p className="mt-2 text-sm text-slate-500">Cada encuentro reúne el contexto del partido, los representados involucrados y su seguimiento.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-[280px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input className="pl-9" placeholder="Buscar club, jugador o competencia…" value={search} onChange={e=>setSearch(e.target.value)}/></div><select className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos</option><option value="upcoming">Próximos</option><option value="live">En juego</option><option value="finished">Finalizados</option></select></div></div>

    <div className="grid gap-3">
      {rows.map(f=><Link key={f.id} to={`/agency/matches/${f.id}`} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
        <div className="grid gap-4 lg:grid-cols-[180px_1fr_220px] lg:items-center">
          <div><div className="flex items-center gap-2 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5"/>{new Date(f.fixture_date).toLocaleString('es-AR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div><p className="mt-2 text-xs font-medium text-slate-500">{f.competition_name||'Competencia sin registrar'}</p></div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><Team logo={f.home_team_logo} name={f.home_team_name} align="right"/><div className="min-w-[72px] text-center">{finished(f.fixture_status)?<p className="text-xl font-black text-slate-900">{f.home_score??'—'} - {f.away_score??'—'}</p>:<p className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${live(f.fixture_status)?'bg-rose-50 text-rose-700':'bg-slate-100 text-slate-500'}`}>{live(f.fixture_status)?'En juego':'Próximo'}</p>}</div><Team logo={f.away_team_logo} name={f.away_team_name}/></div>
          <div className="flex items-center justify-between gap-3 lg:justify-end"><div className="flex -space-x-2">{f.represented.slice(0,4).map(p=><div key={p.id} title={`${p.first_name} ${p.last_name}`} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-500">{p.photo_url?<img src={p.photo_url} alt="" className="h-full w-full object-cover"/>:`${p.first_name?.[0]||''}${p.last_name?.[0]||''}`}</div>)}</div><div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Users className="h-4 w-4 text-emerald-600"/>{f.represented.length}<ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600"/></div></div>
        </div>
      </Link>)}
    </div>
    {!rows.length&&<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Trophy className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 text-sm text-slate-500">No hay partidos relacionados con los filtros actuales.</p></div>}
  </div>;
}

function Team({logo,name,align}){return <div className={`flex items-center gap-2 ${align==='right'?'justify-end text-right':''}`}>{align==='right'&&<span className="truncate text-sm font-semibold text-slate-800">{name}</span>}{logo?<img src={logo} alt="" className="h-9 w-9 shrink-0 object-contain"/>:<div className="h-9 w-9 shrink-0 rounded-lg bg-slate-100"/>}{align!=='right'&&<span className="truncate text-sm font-semibold text-slate-800">{name}</span>}</div>}
