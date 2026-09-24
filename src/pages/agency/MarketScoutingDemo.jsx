import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, getUserRole } from '@/lib/roleUtils';
import { buildDemoMarketPlayers, DEMO_CLUBS, DEMO_OPPORTUNITIES, POSITION_LABELS_MARKET, formatMarketValue } from '@/lib/marketDemoData';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, SlidersHorizontal, Radar, Users, Building2, Trophy, Bookmark, GitCompareArrows, BriefcaseBusiness, Plus, X, ArrowUpRight, TrendingUp, Clock3, Flame, Check, ChevronRight, Table2, LayoutGrid, Database, Sparkles, ListFilter, CircleDollarSign } from 'lucide-react';

const TABS = [
  ['radar','Radar',Radar],['explorer','Explorador',Search],['shortlists','Shortlists',Bookmark],['compare','Comparador',GitCompareArrows],['opportunities','Oportunidades',BriefcaseBusiness]
];
const STATUS = { untracked:'No evaluado', captacion:'En Captación', shortlist:'Shortlist' };
const STATUS_CLASS = { untracked:'bg-slate-100 text-slate-600 border-slate-200', captacion:'bg-violet-50 text-violet-700 border-violet-200', shortlist:'bg-amber-50 text-amber-700 border-amber-200' };
const FOOT = { right:'Derecha', left:'Izquierda', both:'Ambidiestro' };
const LS_KEY = 'score-market-demo-v1';

export default function MarketScoutingDemo() {
  const { user } = useAuth();
  const orgId = getUserOrgId(user);
  const role = getUserRole(user);
  const canOperate = ['organization_owner','organization_admin','representative'].includes(role);
  const players = useMemo(() => buildDemoMarketPlayers(2400), []);
  const [activeTab,setActiveTab] = useState('radar');
  const [view,setView] = useState('cards');
  const [search,setSearch] = useState('');
  const [filters,setFilters] = useState({club:'all',competition:'all',position:'all',age:'all',contract:'all',minutes:'all',foot:'all'});
  const [advanced,setAdvanced] = useState(false);
  const [clubRows,setClubRows] = useState([]);
  const [scoutingTargets,setScoutingTargets] = useState([]);
  const [profile,setProfile] = useState(null);
  const [selected,setSelected] = useState([]);
  const [busyId,setBusyId] = useState(null);
  const [notice,setNotice] = useState('');
  const [shortlists,setShortlists] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY))?.shortlists || { 'Prioridad enero 2027':[], 'Laterales Sub-23':[], 'Contratos próximos a vencer':[] }; }
    catch { return { 'Prioridad enero 2027':[], 'Laterales Sub-23':[], 'Contratos próximos a vencer':[] }; }
  });
  const [activeShortlist,setActiveShortlist] = useState('Prioridad enero 2027');

  useEffect(()=>{
    base44.entities.Club.list('-club_name',500).then(setClubRows).catch(()=>setClubRows([]));
    if (orgId) loadTargets();
  },[orgId]);
  useEffect(()=>{
    localStorage.setItem(LS_KEY, JSON.stringify({shortlists}));
  },[shortlists]);

  const loadTargets = async () => {
    try { setScoutingTargets(await base44.entities.ScoutingTarget.filter({organization_id:orgId},'-updated_date',500)); }
    catch { setScoutingTargets([]); }
  };
  const targetIds = useMemo(()=>new Set(scoutingTargets.map(t=>t.market_provider_player_id).filter(Boolean)),[scoutingTargets]);
  const clubLogoMap = useMemo(()=>{
    const out={}; clubRows.forEach(c=>{out[norm(c.club_name)] = c.internal_logo_url || c.official_logo_url || '';}); return out;
  },[clubRows]);

  const allClubNames = useMemo(()=>[...new Set(DEMO_CLUBS.map(c=>c.name))].sort(),[]);
  const filtered = useMemo(()=>players.filter(p=>{
    const q=search.trim().toLowerCase();
    if(q && !`${p.full_name} ${p.club} ${p.competition} ${POSITION_LABELS_MARKET[p.position]}`.toLowerCase().includes(q)) return false;
    if(filters.club!=='all' && p.club!==filters.club) return false;
    if(filters.competition!=='all' && p.competition!==filters.competition) return false;
    if(filters.position!=='all' && p.position!==filters.position) return false;
    if(filters.foot!=='all' && p.preferred_foot!==filters.foot) return false;
    if(filters.age==='u21' && p.age>21) return false;
    if(filters.age==='u23' && p.age>23) return false;
    if(filters.age==='24-28' && (p.age<24||p.age>28)) return false;
    if(filters.age==='29+' && p.age<29) return false;
    if(filters.contract==='6m' && new Date(p.contract_end)>new Date('2027-03-24')) return false;
    if(filters.contract==='12m' && new Date(p.contract_end)>new Date('2027-09-24')) return false;
    if(filters.minutes==='1000+' && p.minutes<1000) return false;
    if(filters.minutes==='1500+' && p.minutes<1500) return false;
    return true;
  }),[players,search,filters]);

  const shortlistIds = useMemo(()=>new Set(Object.values(shortlists).flat()),[shortlists]);
  const representedDemoCount = Math.round(players.length * .07);
  const contractSoon = players.filter(p=>new Date(p.contract_end)<=new Date('2027-09-24')).length;
  const u21WithMinutes = players.filter(p=>p.age<=21&&p.minutes>=1000).length;
  const rising = players.filter(p=>p.form==='rising'&&p.minutes>=800).sort((a,b)=>b.rating-a.rating).slice(0,6);
  const contractPlayers = players.filter(p=>new Date(p.contract_end)<=new Date('2027-03-24')).sort((a,b)=>String(a.contract_end).localeCompare(String(b.contract_end))).slice(0,6);

  function clearFilters(){setSearch('');setFilters({club:'all',competition:'all',position:'all',age:'all',contract:'all',minutes:'all',foot:'all'});}
  function toggleSelected(id){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):s.length<4?[...s,id]:s);}
  function addToShortlist(player,name=activeShortlist){setShortlists(prev=>({...prev,[name]:[...new Set([...(prev[name]||[]),player.id])]}));setNotice(`${player.full_name} agregado a ${name}`);setTimeout(()=>setNotice(''),2200);}
  function removeFromShortlist(id,name=activeShortlist){setShortlists(prev=>({...prev,[name]:(prev[name]||[]).filter(x=>x!==id)}));}
  async function addToCaptacion(player){
    if(!canOperate||!orgId) return;
    if(targetIds.has(player.provider_player_id)){setNotice('Ese jugador ya está en Captación');setTimeout(()=>setNotice(''),2200);return;}
    setBusyId(player.id);
    try{
      await base44.entities.ScoutingTarget.create({
        organization_id:orgId, first_name:player.first_name,last_name:player.last_name,birth_date:player.birth_date,nationality:player.nationality,
        position:player.position,secondary_position:player.secondary_position||undefined,preferred_foot:player.preferred_foot,current_club:player.club,
        competition:player.competition,category:player.category,height:player.height,scouting_status:'monitoring',priority:'medium',source:'platform',
        next_action:'Primera evaluación del jugador desde Mercado Demo',market_provider:player.provider,market_provider_player_id:player.provider_player_id,
        market_demo_source:true,market_snapshot:JSON.stringify({appearances:player.appearances,starts:player.starts,minutes:player.minutes,goals:player.goals,assists:player.assists,rating:player.rating,market_value:player.market_value,contract_end:player.contract_end})
      });
      await loadTargets(); setNotice(`${player.full_name} enviado a Captación`); setTimeout(()=>setNotice(''),2200);
    }catch(e){setNotice(e.message||'No se pudo agregar a Captación');setTimeout(()=>setNotice(''),3000);}
    setBusyId(null);
  }
  function showOpportunityMatches(opp){
    setFilters(f=>({...f,position:opp.position,age:opp.age_max<=22?'u23':'all',minutes:opp.min_minutes>=1000?'1000+':'all'}));
    setSearch(''); setActiveTab('explorer');
  }

  const selectedPlayers = selected.map(id=>players.find(p=>p.id===id)).filter(Boolean);
  const activeListPlayers=(shortlists[activeShortlist]||[]).map(id=>players.find(p=>p.id===id)).filter(Boolean);
  const hasFilters=search||Object.values(filters).some(v=>v!=='all');

  return <div className="mx-auto max-w-[1700px] p-4 lg:p-6">
    {notice&&<div className="fixed right-5 top-5 z-[80] rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-xl">{notice}</div>}
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm lg:p-8">
      <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"/>
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">Demo comercial</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-300">Datos sintéticos · arquitectura lista para API</span></div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-400">Score Fútbol · Mercado</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight lg:text-4xl">Mercado & Scouting</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Exploración, captación y comercialización en una sola experiencia. Esta demo simula una base conectada de fútbol argentino y mantiene separada la cartera real de Score.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[620px]">
          <HeroMetric value={players.length.toLocaleString('es-AR')} label="Jugadores demo"/>
          <HeroMetric value={DEMO_CLUBS.length} label="Clubes"/>
          <HeroMetric value={targetIds.size} label="En Captación"/>
          <HeroMetric value={representedDemoCount} label="Universo representable"/>
        </div>
      </div>
    </div>

    <div className="sticky top-0 z-20 mt-4 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {TABS.map(([id,label,Icon])=><button key={id} onClick={()=>setActiveTab(id)} className={`flex min-w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${activeTab===id?'bg-slate-900 text-white':'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><Icon className="h-4 w-4"/>{label}{id==='compare'&&selected.length>0?<span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] text-white">{selected.length}</span>:null}</button>)}
    </div>

    {activeTab==='radar'&&<RadarView players={players} rising={rising} contractPlayers={contractPlayers} contractSoon={contractSoon} u21WithMinutes={u21WithMinutes} targetIds={targetIds} shortlistIds={shortlistIds} onOpen={setProfile} onExplorer={()=>setActiveTab('explorer')}/>} 
    {activeTab==='explorer'&&<ExplorerView players={filtered} total={players.length} search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} advanced={advanced} setAdvanced={setAdvanced} clearFilters={clearFilters} hasFilters={hasFilters} clubs={allClubNames} view={view} setView={setView} selected={selected} toggleSelected={toggleSelected} targetIds={targetIds} shortlistIds={shortlistIds} clubLogoMap={clubLogoMap} setProfile={setProfile} addToCaptacion={addToCaptacion} addToShortlist={addToShortlist} busyId={busyId}/>} 
    {activeTab==='shortlists'&&<ShortlistsView shortlists={shortlists} setShortlists={setShortlists} activeShortlist={activeShortlist} setActiveShortlist={setActiveShortlist} players={activeListPlayers} clubLogoMap={clubLogoMap} onOpen={setProfile} onRemove={removeFromShortlist} onCompare={p=>{toggleSelected(p.id);setActiveTab('compare');}}/>}
    {activeTab==='compare'&&<CompareView players={selectedPlayers} onRemove={toggleSelected} onExplorer={()=>setActiveTab('explorer')} addToCaptacion={addToCaptacion} targetIds={targetIds}/>} 
    {activeTab==='opportunities'&&<OpportunitiesView opportunities={DEMO_OPPORTUNITIES} players={players} onMatches={showOpportunityMatches}/>} 

    {selected.length>0&&activeTab!=='compare'&&<div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white shadow-2xl"><span className="mr-2 text-sm font-semibold">{selected.length} seleccionados</span><Button size="sm" variant="secondary" onClick={()=>setActiveTab('compare')}><GitCompareArrows className="mr-1 h-4 w-4"/>Comparar</Button><Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={()=>setSelected([])}><X className="mr-1 h-4 w-4"/>Limpiar</Button></div>}

    {profile&&<MarketProfileDialog player={profile} open={!!profile} onClose={()=>setProfile(null)} clubLogo={clubLogoMap[norm(profile.club)]} inCaptacion={targetIds.has(profile.provider_player_id)} inShortlist={shortlistIds.has(profile.id)} addToCaptacion={addToCaptacion} addToShortlist={addToShortlist} busy={busyId===profile.id} toggleSelected={toggleSelected} selected={selected.includes(profile.id)}/>} 
  </div>;
}

function HeroMetric({value,label}){return <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[11px] text-slate-400">{label}</p></div>}
function RadarView({players,rising,contractPlayers,contractSoon,u21WithMinutes,targetIds,shortlistIds,onOpen,onExplorer}){
  const stats=[['Contratos < 12 meses',contractSoon,Clock3],['Sub-21 · +1.000 min',u21WithMinutes,TrendingUp],['En Captación',targetIds.size,Radar],['En shortlists',shortlistIds.size,Bookmark]];
  return <div className="mt-4 space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([l,v,I])=><button key={l} onClick={onExplorer} className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-emerald-200 hover:shadow-sm"><div className="flex items-center justify-between"><I className="h-5 w-5 text-emerald-700"/><ChevronRight className="h-4 w-4 text-slate-300"/></div><p className="mt-4 text-3xl font-black text-slate-950">{Number(v).toLocaleString('es-AR')}</p><p className="mt-1 text-sm text-slate-500">{l}</p></button>)}</div>
    <div className="grid gap-4 xl:grid-cols-2">
      <MarketSection title="Jugadores con forma ascendente" subtitle="Señales demo de crecimiento reciente" icon={Flame}>{rising.map(p=><CompactPlayer key={p.id} p={p} onOpen={onOpen}/>)}</MarketSection>
      <MarketSection title="Contratos próximos a vencer" subtitle="Ventanas comerciales para revisar" icon={Clock3}>{contractPlayers.map(p=><CompactPlayer key={p.id} p={p} onOpen={onOpen} extra={`Contrato · ${fmtDate(p.contract_end)}`}/>)}</MarketSection>
    </div>
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Modo demo:</strong> los perfiles y estadísticas de esta sección son sintéticos y sirven para mostrar la experiencia comercial. La arquitectura separa estos registros de los jugadores representados reales.</div>
  </div>
}
function MarketSection({title,subtitle,icon:Icon,children}){return <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2"><Icon className="h-5 w-5 text-slate-700"/></div><div><h2 className="font-bold text-slate-950">{title}</h2><p className="text-xs text-slate-500">{subtitle}</p></div></div><div className="space-y-2">{children}</div></section>}
function CompactPlayer({p,onOpen,extra}){return <button onClick={()=>onOpen(p)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-emerald-200 hover:bg-emerald-50/20"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{p.full_name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{p.club} · {POSITION_LABELS_MARKET[p.position]} · {p.age} años</p></div><div className="text-right"><p className="text-sm font-bold text-slate-800">{p.rating.toFixed(2)}</p><p className="text-[10px] text-slate-400">{extra||`${p.minutes} min`}</p></div></button>}

function ExplorerView({players,total,search,setSearch,filters,setFilters,advanced,setAdvanced,clearFilters,hasFilters,clubs,view,setView,selected,toggleSelected,targetIds,shortlistIds,clubLogoMap,setProfile,addToCaptacion,addToShortlist,busyId}){
  return <div className="mt-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 xl:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar jugador, club, competencia o posición…" className="h-11 pl-9"/></div>
        <div className="flex flex-wrap gap-2"><SelectNative value={filters.club} onChange={v=>setFilters(f=>({...f,club:v}))} label="Club" items={clubs}/><SelectMap value={filters.position} onChange={v=>setFilters(f=>({...f,position:v}))} label="Posición" map={POSITION_LABELS_MARKET}/><SelectMap value={filters.age} onChange={v=>setFilters(f=>({...f,age:v}))} label="Edad" map={{u21:'Sub-21',u23:'Sub-23','24-28':'24–28','29+':'29+'}}/><Button variant="outline" onClick={()=>setAdvanced(v=>!v)}><SlidersHorizontal className="mr-1 h-4 w-4"/>Más filtros</Button>{hasFilters&&<Button variant="ghost" onClick={clearFilters}><X className="mr-1 h-4 w-4"/>Limpiar</Button>}</div>
      </div>
      {advanced&&<div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3"><SelectMap value={filters.competition} onChange={v=>setFilters(f=>({...f,competition:v}))} label="Competencia" map={{'Liga Profesional':'Liga Profesional','Primera Nacional':'Primera Nacional'}}/><SelectMap value={filters.contract} onChange={v=>setFilters(f=>({...f,contract:v}))} label="Contrato" map={{'6m':'< 6 meses','12m':'< 12 meses'}}/><SelectMap value={filters.minutes} onChange={v=>setFilters(f=>({...f,minutes:v}))} label="Minutos" map={{'1000+':'+1.000','1500+':'+1.500'}}/><SelectMap value={filters.foot} onChange={v=>setFilters(f=>({...f,foot:v}))} label="Pierna" map={{right:'Derecha',left:'Izquierda'}}/></div>}
    </div>
    <div className="my-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-slate-950">{players.length.toLocaleString('es-AR')} resultados</p><p className="text-xs text-slate-500">de {total.toLocaleString('es-AR')} perfiles demo</p></div><div className="flex rounded-xl border border-slate-200 bg-white p-1"><button onClick={()=>setView('cards')} className={`rounded-lg p-2 ${view==='cards'?'bg-slate-900 text-white':'text-slate-400'}`}><LayoutGrid className="h-4 w-4"/></button><button onClick={()=>setView('table')} className={`rounded-lg p-2 ${view==='table'?'bg-slate-900 text-white':'text-slate-400'}`}><Table2 className="h-4 w-4"/></button></div></div>
    {view==='cards'?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{players.slice(0,120).map(p=><MarketCard key={p.id} p={p} selected={selected.includes(p.id)} toggleSelected={toggleSelected} inCaptacion={targetIds.has(p.provider_player_id)} inShortlist={shortlistIds.has(p.id)} logo={clubLogoMap[norm(p.club)]} onOpen={()=>setProfile(p)} addToCaptacion={()=>addToCaptacion(p)} addToShortlist={()=>addToShortlist(p)} busy={busyId===p.id}/>)}</div>:<MarketTable players={players.slice(0,250)} selected={selected} toggleSelected={toggleSelected} targetIds={targetIds} setProfile={setProfile}/>} 
    {players.length>120&&view==='cards'&&<p className="mt-5 text-center text-xs text-slate-400">Mostrando los primeros 120 resultados para mantener la demo ágil. Los filtros trabajan sobre los {total.toLocaleString('es-AR')} perfiles.</p>}
  </div>
}
function MarketCard({p,selected,toggleSelected,inCaptacion,inShortlist,logo,onOpen,addToCaptacion,addToShortlist,busy}){return <article className={`overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-lg ${selected?'border-emerald-400 ring-2 ring-emerald-100':'border-slate-200'}`}>
  <div className="relative flex h-32 items-end bg-gradient-to-br from-slate-100 to-slate-50 p-4"><button onClick={()=>toggleSelected(p.id)} className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border ${selected?'border-emerald-500 bg-emerald-500 text-white':'border-slate-200 bg-white text-slate-300'}`}>{selected?<Check className="h-4 w-4"/>:null}</button><div className="flex items-center gap-3"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white shadow-sm">{p.first_name[0]}{p.last_name[0]}</div><div><p className="text-lg font-black text-slate-950">{p.full_name}</p><div className="mt-1 flex items-center gap-2 text-xs text-slate-500">{logo?<img src={logo} alt="" className="h-5 w-5 object-contain"/>:<Building2 className="h-4 w-4"/>}<span>{p.club}</span></div></div></div></div>
  <div className="p-4"><div className="flex flex-wrap gap-1.5"><Badge className="bg-slate-100 text-slate-600 border-slate-200">{POSITION_LABELS_MARKET[p.position]}</Badge><Badge className={inCaptacion?'bg-violet-50 text-violet-700 border-violet-200':inShortlist?'bg-amber-50 text-amber-700 border-amber-200':STATUS_CLASS.untracked}>{inCaptacion?'En Captación':inShortlist?'Shortlist':'No evaluado'}</Badge>{p.form==='rising'&&<Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Forma ↑</Badge>}</div><p className="mt-2 text-xs text-slate-500">{p.age} años · {FOOT[p.preferred_foot]} · {p.height} cm</p><div className="mt-4 grid grid-cols-5 gap-1.5"><MiniStat l="PJ" v={p.appearances}/><MiniStat l="MIN" v={p.minutes}/><MiniStat l="G" v={p.goals}/><MiniStat l="A" v={p.assists}/><MiniStat l="RAT" v={p.rating.toFixed(1)}/></div><div className="mt-4 flex items-center justify-between"><div><p className="text-[10px] uppercase text-slate-400">Valor demo</p><p className="text-sm font-bold text-slate-900">{formatMarketValue(p.market_value)}</p></div><p className="text-xs text-slate-400">Contrato {fmtDate(p.contract_end)}</p></div><div className="mt-4 grid grid-cols-3 gap-2"><Button size="sm" variant="outline" onClick={onOpen}>Perfil</Button><Button size="sm" variant="outline" onClick={addToShortlist} disabled={inShortlist}><Bookmark className="h-3.5 w-3.5"/></Button><Button size="sm" className="bg-slate-900 hover:bg-slate-800" onClick={addToCaptacion} disabled={inCaptacion||busy}>{busy?'…':inCaptacion?'Captación':' + Captación'}</Button></div></div></article>}
function MiniStat({l,v}){return <div className="rounded-lg bg-slate-50 px-1 py-2 text-center"><p className="text-[9px] font-bold text-slate-400">{l}</p><p className="text-xs font-black text-slate-800">{v}</p></div>}
function MarketTable({players,selected,toggleSelected,targetIds,setProfile}){return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[980px] text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3"></th><th className="p-3 text-left">Jugador</th><th className="p-3 text-left">Club</th><th>Edad</th><th>Pos.</th><th>PJ</th><th>MIN</th><th>G</th><th>A</th><th>Rating</th><th>Contrato</th><th>Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{players.map(p=><tr key={p.id} className="hover:bg-slate-50"><td className="p-3"><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggleSelected(p.id)}/></td><td className="p-3"><button className="font-semibold text-slate-900 hover:text-emerald-700" onClick={()=>setProfile(p)}>{p.full_name}</button></td><td className="p-3 text-slate-600">{p.club}</td><td className="text-center">{p.age}</td><td className="text-center">{p.position}</td><td className="text-center">{p.appearances}</td><td className="text-center">{p.minutes}</td><td className="text-center">{p.goals}</td><td className="text-center">{p.assists}</td><td className="text-center font-bold">{p.rating.toFixed(2)}</td><td className="text-center text-xs">{fmtDate(p.contract_end)}</td><td className="text-center"><Badge className={targetIds.has(p.provider_player_id)?STATUS_CLASS.captacion:STATUS_CLASS.untracked}>{targetIds.has(p.provider_player_id)?'Captación':'Mercado'}</Badge></td></tr>)}</tbody></table></div>}

function ShortlistsView({shortlists,setShortlists,activeShortlist,setActiveShortlist,players,clubLogoMap,onOpen,onRemove,onCompare}){
  const [newName,setNewName]=useState('');
  function create(){const n=newName.trim();if(!n||shortlists[n])return;setShortlists(s=>({...s,[n]:[]}));setActiveShortlist(n);setNewName('');}
  return <div className="mt-4 grid gap-4 xl:grid-cols-[300px_1fr]"><aside className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="font-bold text-slate-950">Mis shortlists</h2><p className="mt-1 text-xs text-slate-500">Listas de trabajo demo, guardadas por navegador.</p><div className="mt-4 space-y-1">{Object.entries(shortlists).map(([name,ids])=><button key={name} onClick={()=>setActiveShortlist(name)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${activeShortlist===name?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-50'}`}><span className="truncate">{name}</span><span className="text-xs opacity-60">{ids.length}</span></button>)}</div><div className="mt-4 flex gap-2"><Input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nueva lista"/><Button size="icon" onClick={create}><Plus className="h-4 w-4"/></Button></div></aside><section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Shortlist</p><h2 className="text-xl font-black text-slate-950">{activeShortlist}</h2></div><Badge className="bg-slate-100 text-slate-600 border-slate-200">{players.length} jugadores</Badge></div>{players.length?<div className="grid gap-3 md:grid-cols-2">{players.map(p=><div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><button className="min-w-0 text-left" onClick={()=>onOpen(p)}><p className="truncate font-semibold text-slate-900">{p.full_name}</p><p className="mt-1 truncate text-xs text-slate-500">{p.club} · {POSITION_LABELS_MARKET[p.position]} · {p.age} años</p></button><div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=>onCompare(p)}><GitCompareArrows className="h-3.5 w-3.5"/></Button><Button size="sm" variant="ghost" onClick={()=>onRemove(p.id)}><X className="h-3.5 w-3.5"/></Button></div></div>)}</div>:<Empty text="Todavía no agregaste jugadores a esta shortlist."/>}</section></div>}

function CompareView({players,onRemove,onExplorer,addToCaptacion,targetIds}){if(!players.length)return <div className="mt-4"><Empty text="Seleccioná entre 2 y 4 jugadores desde el Explorador para compararlos." action={<Button onClick={onExplorer}><Search className="mr-1 h-4 w-4"/>Ir al Explorador</Button>}/></div>;const rows=[['Edad','age'],['Partidos','appearances'],['Titularidades','starts'],['Minutos','minutes'],['% titular','start_rate'],['Goles','goals'],['Asistencias','assists'],['Rating','rating'],['Min. últimos 5','minutes_last5'],['Valor demo','market_value']];return <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Comparador</p><h2 className="text-2xl font-black text-slate-950">{players.length} jugadores seleccionados</h2><p className="mt-1 text-sm text-slate-500">Demo de comparación. En la versión integrada, las métricas cambiarían según la posición.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr><th className="p-3 text-left text-slate-400">Métrica</th>{players.map(p=><th key={p.id} className="p-3"><div className="rounded-xl bg-slate-50 p-3"><div className="flex items-start justify-between"><div className="text-left"><p className="font-bold text-slate-900">{p.full_name}</p><p className="mt-1 text-xs font-normal text-slate-500">{p.club} · {p.position}</p></div><button onClick={()=>onRemove(p.id)}><X className="h-4 w-4 text-slate-400"/></button></div></div></th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(([label,key])=><tr key={key}><td className="p-3 font-medium text-slate-500">{label}</td>{players.map(p=><td key={p.id} className="p-3 text-center font-bold text-slate-900">{key==='market_value'?formatMarketValue(p[key]):key==='rating'?p[key].toFixed(2):key==='start_rate'?`${p[key]}%`:p[key]}</td>)}</tr>)}</tbody></table></div><div className="mt-5 flex flex-wrap gap-2">{players.map(p=><Button key={p.id} variant="outline" disabled={targetIds.has(p.provider_player_id)} onClick={()=>addToCaptacion(p)}>{targetIds.has(p.provider_player_id)?'Ya en Captación':`+ Captación · ${p.last_name}`}</Button>)}</div></div>}

function OpportunitiesView({opportunities,players,onMatches}){return <div className="mt-4"><div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Mesa comercial</p><h2 className="mt-1 text-2xl font-black text-slate-950">Necesidades de clubes</h2><p className="mt-2 text-sm text-slate-500">Oportunidades demo para mostrar cómo Score puede cruzar necesidades de mercado con representados, Captación y universo externo.</p></div><div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{opportunities.map(o=>{const matches=players.filter(p=>p.position===o.position&&p.age>=o.age_min&&p.age<=o.age_max&&p.minutes>=o.min_minutes&&p.market_value<=o.max_value);return <article key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{o.club}</p><h3 className="mt-1 text-lg font-black text-slate-950">{o.title}</h3></div><Badge className={o.priority==='high'?'bg-red-50 text-red-700 border-red-200':'bg-amber-50 text-amber-700 border-amber-200'}>{o.priority==='high'?'Alta':'Media'}</Badge></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><OpportunityMeta l="Edad" v={`${o.age_min}–${o.age_max}`}/><OpportunityMeta l="Mercado" v={o.market}/><OpportunityMeta l="Min. mínimos" v={o.min_minutes.toLocaleString('es-AR')}/><OpportunityMeta l="Presupuesto" v={formatMarketValue(o.max_value)}/></div><div className="mt-4 rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Coincidencias en base demo</p><p className="mt-1 text-2xl font-black text-emerald-900">{matches.length}</p></div><p className="mt-4 text-xs text-slate-500"><strong>Próxima acción:</strong> {o.next_action}</p><Button className="mt-4 w-full bg-slate-900 hover:bg-slate-800" onClick={()=>onMatches(o)}>Ver coincidencias <ArrowUpRight className="ml-1 h-4 w-4"/></Button></article>})}</div></div>}
function OpportunityMeta({l,v}){return <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-400">{l}</p><p className="mt-1 font-semibold text-slate-700">{v}</p></div>}

function MarketProfileDialog({player,open,onClose,clubLogo,inCaptacion,inShortlist,addToCaptacion,addToShortlist,busy,toggleSelected,selected}){return <Dialog open={open} onOpenChange={v=>!v&&onClose()}><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto p-0"><div className="bg-slate-950 p-6 text-white"><div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div className="flex items-center gap-4"><div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 text-2xl font-black">{player.first_name[0]}{player.last_name[0]}</div><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-black uppercase text-amber-200">Jugador de mercado · DEMO</span>{inCaptacion&&<span className="rounded-full bg-violet-400/15 px-2 py-1 text-[10px] font-black uppercase text-violet-200">En Captación</span>}</div><DialogHeader><DialogTitle className="mt-2 text-3xl font-black text-white">{player.full_name}</DialogTitle></DialogHeader><p className="mt-2 text-sm text-slate-300">{POSITION_LABELS_MARKET[player.position]} · {player.age} años · {FOOT[player.preferred_foot]}</p><div className="mt-2 flex items-center gap-2 text-sm text-slate-300">{clubLogo?<img src={clubLogo} className="h-7 w-7 object-contain" alt=""/>:<Building2 className="h-5 w-5"/>}{player.club} · {player.competition}</div></div></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={()=>toggleSelected(player.id)}><GitCompareArrows className="mr-1 h-4 w-4"/>{selected?'Quitar comparación':'Comparar'}</Button><Button variant="secondary" disabled={inShortlist} onClick={()=>addToShortlist(player)}><Bookmark className="mr-1 h-4 w-4"/>{inShortlist?'En shortlist':'Shortlist'}</Button><Button onClick={()=>addToCaptacion(player)} disabled={inCaptacion||busy} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">{busy?'Agregando…':inCaptacion?'Ya en Captación':'+ Pasar a Captación'}</Button></div></div></div><div className="grid gap-5 p-6 lg:grid-cols-[1fr_320px]"><div className="space-y-5"><section><h3 className="font-bold text-slate-950">Rendimiento de temporada</h3><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6"><BigStat l="PJ" v={player.appearances}/><BigStat l="Tit." v={player.starts}/><BigStat l="MIN" v={player.minutes}/><BigStat l="G" v={player.goals}/><BigStat l="A" v={player.assists}/><BigStat l="Rating" v={player.rating.toFixed(2)}/></div></section><section><h3 className="font-bold text-slate-950">Forma reciente</h3><div className="mt-3 grid grid-cols-5 gap-2">{player.recent_ratings.map((r,i)=><div key={i} className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-[10px] text-slate-400">P{i+1}</p><p className="mt-1 text-lg font-black text-slate-900">{r.toFixed(1)}</p><p className="text-[10px] text-slate-400">{player.recent_minutes[i]} min</p></div>)}</div></section><section className="rounded-2xl border border-slate-200 p-4"><h3 className="font-bold text-slate-950">Lectura de mercado</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><OpportunityMeta l="Valor estimado demo" v={formatMarketValue(player.market_value)}/><OpportunityMeta l="Fin de contrato" v={fmtDate(player.contract_end)}/><OpportunityMeta l="Titularidad" v={`${player.start_rate}%`}/><OpportunityMeta l="Últimos 5 partidos" v={`${player.minutes_last5} min`}/></div></section></div><aside className="space-y-3"><div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado interno Score</p><div className="mt-4 space-y-3 text-sm"><InfoRow l="Seguimiento" v={inCaptacion?'Captación activa':'No evaluado'}/><InfoRow l="Shortlist" v={inShortlist?'Sí':'No'}/><InfoRow l="Fuente" v="Integración Demo"/><InfoRow l="Provider ID" v={player.provider_player_id}/></div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><strong>Demo:</strong> este perfil no representa datos reales de un futbolista específico. Está diseñado para validar la experiencia antes de conectar el proveedor definitivo.</div></aside></div></DialogContent></Dialog>}
function BigStat({l,v}){return <div className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-[10px] font-bold uppercase text-slate-400">{l}</p><p className="mt-1 text-xl font-black text-slate-950">{v}</p></div>}
function InfoRow({l,v}){return <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-0"><span className="text-slate-400">{l}</span><span className="max-w-[170px] break-all text-right font-semibold text-slate-800">{v}</span></div>}
function Empty({text,action}){return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Database className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 text-sm text-slate-500">{text}</p>{action&&<div className="mt-4">{action}</div>}</div>}
function SelectNative({value,onChange,label,items}){return <select value={value} onChange={e=>onChange(e.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="all">{label}: Todos</option>{items.map(i=><option key={i} value={i}>{i}</option>)}</select>}
function SelectMap({value,onChange,label,map}){return <select value={value} onChange={e=>onChange(e.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="all">{label}: Todos</option>{Object.entries(map).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function fmtDate(v){if(!v)return'—';return new Date(v+'T12:00:00').toLocaleDateString('es-AR',{month:'short',year:'2-digit'})}
