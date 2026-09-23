import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, POSITION_LABELS } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Trophy, Users, MapPin, CalendarDays, BarChart3, ClipboardList, ArrowUpRight } from 'lucide-react';

const finished = s => ['FT','AET','PEN'].includes(s);
const live = s => ['1H','HT','2H','ET','BT','P'].includes(s);
const dateTime = value => value ? new Date(value).toLocaleString('es-AR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

export default function MatchProfile(){
  const {id}=useParams(); const navigate=useNavigate(); const {user}=useAuth(); const orgId=getUserOrgId(user);
  const [loading,setLoading]=useState(true); const [fixture,setFixture]=useState(null); const [players,setPlayers]=useState([]); const [stats,setStats]=useState([]); const [providerStats,setProviderStats]=useState([]); const [clubs,setClubs]=useState([]);

  useEffect(()=>{ if(!orgId||!id)return; Promise.all([
    base44.entities.ClubFixture.get(id),
    base44.entities.Player.filter({organization_id:orgId,status:{$ne:'archived'}},'-updated_date',300),
    base44.entities.PlayerMatchStats.filter({organization_id:orgId,club_fixture_id:id},'-match_date',300),
    base44.entities.Club.list('club_name',500),
  ]).then(async([f,p,s,c])=>{setFixture(f);setPlayers(p);setStats(s);setClubs(c);if(f.provider_fixture_id){try{const ps=await base44.entities.PlayerMatchStatistic.filter({organization_id:orgId,provider_fixture_id:String(f.provider_fixture_id)},'-fixture_date',300);setProviderStats(ps);}catch{setProviderStats([]);}}}).catch(console.error).finally(()=>setLoading(false)); },[orgId,id]);

  const represented=useMemo(()=>fixture?players.filter(p=>fixture.linked_player_ids?.includes(p.id)||(p.current_club_id&&fixture.mapped_club_ids?.includes(p.current_club_id))):[],[fixture,players]);
  const statsByPlayer=useMemo(()=>Object.fromEntries(stats.map(s=>[s.player_id,s])),[stats]);
  const providerByPlayer=useMemo(()=>{const out={};providerStats.forEach(s=>{if(!out[s.player_id]||Number(s.minutes||0)>Number(out[s.player_id].minutes||0))out[s.player_id]=s;});return out;},[providerStats]);
  const clubsById=useMemo(()=>Object.fromEntries(clubs.map(c=>[c.id,c])),[clubs]);

  if(loading)return <div className="p-10 text-slate-500">Cargando ficha del partido…</div>;
  if(!fixture)return <div className="p-8"><p className="text-slate-500">Partido no encontrado.</p><Button className="mt-4" onClick={()=>navigate('/agency/matches')}>Volver</Button></div>;

  const matchState=finished(fixture.fixture_status)?'Finalizado':live(fixture.fixture_status)?'En juego':'Próximo';
  return <div className="mx-auto max-w-7xl p-4 lg:p-6 space-y-5">
    <button onClick={()=>navigate('/agency/matches')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ChevronLeft className="h-4 w-4"/>Volver a partidos</button>

    <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white md:p-8">
      <div className="flex flex-col gap-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">{fixture.competition_name||'Partido'}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><CalendarDays className="h-4 w-4"/>{dateTime(fixture.fixture_date)}{fixture.stadium&&<><span>·</span><MapPin className="h-4 w-4"/>{fixture.stadium}</>}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${live(fixture.fixture_status)?'bg-rose-500 text-white':'bg-white/10 text-slate-200'}`}>{matchState}</span></div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-8"><Team logo={fixture.home_team_logo} name={fixture.home_team_name} align="right"/><div className="text-center">{finished(fixture.fixture_status)?<p className="text-4xl font-black md:text-5xl">{fixture.home_score??'—'} <span className="text-slate-500">-</span> {fixture.away_score??'—'}</p>:<p className="text-lg font-black tracking-wider text-emerald-300">VS</p>}<p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">{fixture.round||fixture.fixture_status_long||''}</p></div><Team logo={fixture.away_team_logo} name={fixture.away_team_name}/></div></div>
    </section>

    <div className="grid gap-5 lg:grid-cols-3"><div className="space-y-5 lg:col-span-2">
      <Section title="Representados vinculados" icon={Users} count={represented.length}>
        {represented.length?<div className="space-y-3">{represented.map(p=>{const manual=statsByPlayer[p.id];const api=providerByPlayer[p.id];const minutes=api?.minutes??manual?.minutes_played;const goals=api?.goals??manual?.goals;const assists=api?.assists??manual?.assists;const rating=api?.rating??manual?.rating;return <Link key={p.id} to={`/agency/players/${p.id}`} className="group grid gap-4 rounded-2xl border border-slate-200 p-4 hover:border-emerald-200 hover:bg-emerald-50/30 md:grid-cols-[1fr_auto] md:items-center"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-slate-100 font-bold text-slate-500">{p.photo_url?<img src={p.photo_url} alt="" className="h-full w-full object-cover"/>:`${p.first_name?.[0]||''}${p.last_name?.[0]||''}`}</div><div><p className="font-semibold text-slate-900 group-hover:text-emerald-700">{p.first_name} {p.last_name}</p><p className="mt-1 text-xs text-slate-500">{POSITION_LABELS[p.position]||p.position} · {clubsById[p.current_club_id]?.club_name||p.club||'Club sin registrar'}</p></div></div><div className="grid grid-cols-4 gap-2"><Stat value={minutes??'—'} label="Min"/><Stat value={goals??0} label="Goles"/><Stat value={assists??0} label="Asist."/><Stat value={rating!=null?Number(rating).toFixed(1):'—'} label="Rating"/></div>{manual?.agent_observations&&<p className="md:col-span-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><span className="font-semibold">Observación:</span> {manual.agent_observations}</p>}</Link>})}</div>:<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No hay representados vinculados a este encuentro.</p>}
      </Section>

      {providerStats.length>0&&<Section title="Datos integrados del partido" icon={BarChart3} count={providerStats.length}><p className="text-sm text-slate-500">Las estadísticas individuales integradas se muestran arriba por jugador. Esta ficha usa el mismo partido como referencia única para evitar duplicados.</p></Section>}
    </div>

    <div className="space-y-5"><Section title="Contexto" icon={Trophy}><div className="space-y-3 text-sm"><Row label="Competencia" value={fixture.competition_name||'—'}/><Row label="Temporada" value={fixture.season||'—'}/><Row label="Ronda" value={fixture.round||'—'}/><Row label="Estadio" value={fixture.stadium||'—'}/><Row label="Ciudad" value={fixture.fixture_city||'—'}/></div></Section>
      <Section title="Seguimiento" icon={ClipboardList}><div className="space-y-2"><SmallStat value={stats.filter(s=>s.follow_up_status==='pending').length} label="Pendientes"/><SmallStat value={stats.filter(s=>s.follow_up_status==='completed').length} label="Completados"/></div></Section>
      <Section title="Clubes relacionados" icon={Users}><div className="space-y-2">{fixture.mapped_club_ids?.map(cid=>{const c=clubsById[cid];return c?<Link key={cid} to={`/agency/clubs/${cid}`} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-800 hover:bg-emerald-50 hover:text-emerald-700"><span>{c.club_name}</span><ArrowUpRight className="h-4 w-4"/></Link>:null})}</div></Section>
    </div></div>
  </div>;
}

function Section({title,icon:Icon,count,children}){return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Icon className="h-4 w-4 text-emerald-700"/><h2 className="font-bold text-slate-900">{title}</h2>{count!=null&&<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{count}</span>}</div>{children}</section>}
function Team({logo,name,align}){return <div className={`flex items-center gap-3 ${align==='right'?'justify-end text-right':''}`}>{align==='right'&&<p className="text-lg font-black md:text-2xl">{name}</p>}{logo?<img src={logo} alt="" className="h-14 w-14 object-contain md:h-20 md:w-20"/>:<div className="h-14 w-14 rounded-2xl bg-white/10 md:h-20 md:w-20"/>}{align!=='right'&&<p className="text-lg font-black md:text-2xl">{name}</p>}</div>}
function Stat({value,label}){return <div className="min-w-[58px] rounded-xl bg-slate-50 p-2 text-center"><p className="text-sm font-bold text-slate-900">{value}</p><p className="text-[9px] text-slate-500">{label}</p></div>}
function Row({label,value}){return <div className="flex justify-between gap-4 border-b border-slate-50 py-2 last:border-0"><span className="text-slate-400">{label}</span><span className="text-right font-medium text-slate-800">{value}</span></div>}
function SmallStat({value,label}){return <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-sm text-slate-600">{label}</span><span className="text-sm font-bold text-slate-900">{value}</span></div>}
