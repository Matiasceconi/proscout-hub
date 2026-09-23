import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, POSITION_LABELS } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, ChevronLeft, MapPin, Users, Trophy, CalendarDays, Phone, Mail, BriefcaseBusiness, Plus, ArrowUpRight } from 'lucide-react';

const finished = s => ['FT','AET','PEN'].includes(s);
const dateText = value => value ? new Date(value).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'}) : '—';

export default function ClubProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = getUserOrgId(user);
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState(null);
  const [players, setPlayers] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [opportunityOpen, setOpportunityOpen] = useState(false);

  const load = async () => {
    if (!orgId || !id) return;
    setLoading(true);
    try {
      const [clubRow, playerRows, fixtureRows, contactRows, opportunityRows, eventRows] = await Promise.all([
        base44.entities.Club.get(id),
        base44.entities.Player.filter({ organization_id: orgId, status: { $ne: 'archived' } }, '-updated_date', 300),
        base44.entities.ClubFixture.filter({ organization_id: orgId, provider: { $in: ['api_football','manual'] } }, '-fixture_date', 1000),
        base44.entities.ClubContact.filter({ organization_id: orgId, club_id: id }, '-last_contact_date', 100),
        base44.entities.MarketOpportunity.filter({ organization_id: orgId, club_id: id }, '-updated_date', 100),
        base44.entities.CalendarEvent.filter({ organization_id: orgId }, '-start_date', 300),
      ]);
      setClub(clubRow);
      setPlayers(playerRows.filter(p => p.current_club_id === id));
      setFixtures(fixtureRows.filter(f => f.mapped_club_ids?.includes(id)));
      setContacts(contactRows);
      setOpportunities(opportunityRows);
      const ids = new Set(playerRows.filter(p => p.current_club_id === id).map(p => p.id));
      setEvents(eventRows.filter(e => e.player_id && ids.has(e.player_id)));
    } catch (e) { console.error(e); setClub(null); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [orgId, id]);

  const { nextFixture, recentFixtures } = useMemo(() => {
    const now = Date.now();
    const next = fixtures.filter(f => new Date(f.fixture_date).getTime() >= now && !finished(f.fixture_status)).sort((a,b)=>new Date(a.fixture_date)-new Date(b.fixture_date))[0] || null;
    const recent = fixtures.filter(f => new Date(f.fixture_date).getTime() < now || finished(f.fixture_status)).sort((a,b)=>new Date(b.fixture_date)-new Date(a.fixture_date)).slice(0,5);
    return { nextFixture: next, recentFixtures: recent };
  }, [fixtures]);

  const playerById = useMemo(() => Object.fromEntries(players.map(p => [p.id,p])), [players]);
  const activeOpportunities = opportunities.filter(o => !['closed_won','closed_lost'].includes(o.stage));
  const nextActivities = events.filter(e => ['scheduled','confirmed'].includes(e.status) && new Date(e.start_date) >= new Date()).sort((a,b)=>new Date(a.start_date)-new Date(b.start_date)).slice(0,5);

  if (loading) return <div className="p-10 text-slate-500">Cargando ficha del club…</div>;
  if (!club) return <div className="p-8"><p className="text-slate-500">Club no encontrado.</p><Button className="mt-4" onClick={()=>navigate('/agency/clubs')}>Volver</Button></div>;

  const logo = club.internal_logo_url || club.official_logo_url;

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6 space-y-5">
      <button onClick={()=>navigate('/agency/clubs')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ChevronLeft className="h-4 w-4"/>Volver a clubes</button>

      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white md:p-8">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white p-3">
              {logo ? <img src={logo} alt="" className="h-full w-full object-contain"/> : <Building2 className="h-10 w-10 text-slate-400"/>}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Ficha de relación</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{club.club_name}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-300"><MapPin className="h-4 w-4"/>{[club.city,club.country].filter(Boolean).join(', ') || 'Ubicación sin registrar'} · {club.team_type || 'primera'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 md:min-w-[360px]">
            <HeroStat value={players.length} label="Representados" />
            <HeroStat value={fixtures.length} label="Partidos" />
            <HeroStat value={activeOpportunities.length} label="Oportunidades" />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {nextFixture && <Section title="Próximo partido" icon={CalendarDays}>
            <Link to={`/agency/matches/${nextFixture.id}`} className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 transition hover:bg-emerald-50 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Team logo={nextFixture.home_team_logo} name={nextFixture.home_team_name}/><span className="text-xs font-bold text-slate-400">VS</span><Team logo={nextFixture.away_team_logo} name={nextFixture.away_team_name}/>
              </div>
              <div className="text-left sm:text-right"><p className="text-sm font-semibold text-slate-900">{dateText(nextFixture.fixture_date)}</p><p className="mt-1 text-xs text-slate-500">{nextFixture.competition_name || 'Competencia sin registrar'}</p></div>
            </Link>
          </Section>}

          <Section title="Representados en el club" icon={Users} count={players.length}>
            {players.length ? <div className="grid gap-3 sm:grid-cols-2">{players.map(p=><Link key={p.id} to={`/agency/players/${p.id}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-4 hover:border-emerald-200 hover:bg-emerald-50/30">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 font-bold text-slate-500">{p.photo_url?<img src={p.photo_url} alt="" className="h-full w-full object-cover"/>:`${p.first_name?.[0]||''}${p.last_name?.[0]||''}`}</div>
              <div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900 group-hover:text-emerald-700">{p.first_name} {p.last_name}</p><p className="mt-1 text-xs text-slate-500">{POSITION_LABELS[p.position] || p.position} · {p.representative_name || 'Representante sin asignar'}</p></div><ArrowUpRight className="h-4 w-4 text-slate-300"/>
            </Link>)}</div>:<CompactEmpty text="No hay representados vinculados actualmente."/>}
          </Section>

          {recentFixtures.length > 0 && <Section title="Últimos partidos" icon={Trophy} count={recentFixtures.length}>
            <div className="divide-y divide-slate-100">{recentFixtures.map(f=><Link key={f.id} to={`/agency/matches/${f.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50">
              <div><p className="text-sm font-semibold text-slate-800">{f.home_team_name} <span className="text-slate-400">{f.home_score ?? '—'} - {f.away_score ?? '—'}</span> {f.away_team_name}</p><p className="mt-1 text-xs text-slate-500">{f.competition_name || 'Sin competencia'} · {dateText(f.fixture_date)}</p></div><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300"/>
            </Link>)}</div>
          </Section>}
        </div>

        <div className="space-y-5">
          <Section title="Relación con el club" icon={BriefcaseBusiness} action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>setContactOpen(true)}><Plus className="mr-1 h-3.5 w-3.5"/>Contacto</Button><Button size="sm" variant="outline" onClick={()=>setOpportunityOpen(true)}><Plus className="mr-1 h-3.5 w-3.5"/>Oportunidad</Button></div>}>
            <div className="grid grid-cols-2 gap-2"><SmallStat value={contacts.length} label="Contactos"/><SmallStat value={activeOpportunities.length} label="Gestiones activas"/></div>
          </Section>

          {contacts.length > 0 && <Section title="Contactos" icon={Phone} count={contacts.length}>
            <div className="space-y-3">{contacts.slice(0,5).map(c=><div key={c.id} className="rounded-xl border border-slate-100 p-3"><p className="text-sm font-semibold text-slate-900">{c.full_name}</p><p className="text-xs text-slate-500">{c.role || 'Rol sin registrar'}</p><div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">{c.email&&<span className="flex items-center gap-1"><Mail className="h-3 w-3"/>{c.email}</span>}{c.phone&&<span className="flex items-center gap-1"><Phone className="h-3 w-3"/>{c.phone}</span>}</div></div>)}</div>
          </Section>}

          {activeOpportunities.length > 0 && <Section title="Oportunidades" icon={BriefcaseBusiness} count={activeOpportunities.length}>
            <div className="space-y-3">{activeOpportunities.slice(0,5).map(o=>{const p=playerById[o.player_id];return <div key={o.id} className="rounded-xl border border-slate-100 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-900">{o.title}</p><p className="mt-1 text-xs text-slate-500">{p?`${p.first_name} ${p.last_name}`:'Jugador'} · {o.stage}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">{o.priority}</span></div>{o.next_action&&<p className="mt-2 text-xs text-slate-600">Próxima acción: {o.next_action}</p>}</div>})}</div>
          </Section>}

          {nextActivities.length > 0 && <Section title="Próximas actividades" icon={CalendarDays} count={nextActivities.length}>
            <div className="space-y-3">{nextActivities.map(e=><div key={e.id} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-800">{e.title}</p><p className="mt-1 text-xs text-slate-500">{e.player_name || 'Actividad'} · {dateText(e.start_date)}</p></div>)}</div>
          </Section>}
        </div>
      </div>

      <ContactDialog open={contactOpen} onClose={()=>setContactOpen(false)} orgId={orgId} clubId={id} onSaved={()=>{setContactOpen(false);load();}}/>
      <OpportunityDialog open={opportunityOpen} onClose={()=>setOpportunityOpen(false)} orgId={orgId} clubId={id} players={players} onSaved={()=>{setOpportunityOpen(false);load();}}/>
    </div>
  );
}

function Section({ title, icon: Icon, count, action, children }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-emerald-700"/><h2 className="font-bold text-slate-900">{title}</h2>{count != null&&<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{count}</span>}</div>{action}</div>{children}</section>; }
function HeroStat({value,label}){return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-black text-white">{value}</p><p className="mt-1 text-[11px] text-slate-400">{label}</p></div>}
function SmallStat({value,label}){return <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-bold text-slate-900">{value}</p><p className="text-[10px] text-slate-500">{label}</p></div>}
function CompactEmpty({text}){return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{text}</p>}
function Team({logo,name}){return <div className="flex items-center gap-2">{logo?<img src={logo} alt="" className="h-9 w-9 object-contain"/>:<div className="h-9 w-9 rounded-lg bg-slate-200"/>}<span className="text-sm font-semibold text-slate-800">{name}</span></div>}

function ContactDialog({open,onClose,orgId,clubId,onSaved}){
  const [form,setForm]=useState({full_name:'',role:'',email:'',phone:'',relationship_status:'active',notes:''}); const [saving,setSaving]=useState(false);
  const submit=async e=>{e.preventDefault();setSaving(true);try{await base44.entities.ClubContact.create({organization_id:orgId,club_id:clubId,...form});onSaved();}catch(err){console.error(err);}setSaving(false)};
  return <Dialog open={open} onOpenChange={v=>!v&&onClose()}><DialogContent><DialogHeader><DialogTitle>Nuevo contacto del club</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-3"><Input required placeholder="Nombre y apellido" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/><Input placeholder="Rol / cargo" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}/><div className="grid grid-cols-2 gap-3"><Input type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><Input placeholder="Teléfono" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div><textarea className="min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm" placeholder="Notas" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><Button disabled={saving} className="w-full bg-emerald-700 hover:bg-emerald-800">{saving?'Guardando…':'Guardar contacto'}</Button></form></DialogContent></Dialog>;
}

function OpportunityDialog({open,onClose,orgId,clubId,players,onSaved}){
  const [form,setForm]=useState({player_id:'',title:'',opportunity_type:'interest',stage:'monitoring',priority:'medium',next_action:'',next_action_date:'',responsible_name:'',notes:''}); const [saving,setSaving]=useState(false);
  const submit=async e=>{e.preventDefault();setSaving(true);try{await base44.entities.MarketOpportunity.create({organization_id:orgId,club_id:clubId,...form,next_action_date:form.next_action_date||undefined});onSaved();}catch(err){console.error(err);}setSaving(false)};
  return <Dialog open={open} onOpenChange={v=>!v&&onClose()}><DialogContent><DialogHeader><DialogTitle>Nueva oportunidad de mercado</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-3"><select required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={form.player_id} onChange={e=>setForm({...form,player_id:e.target.value})}><option value="">Seleccionar representado</option>{players.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}</select><Input required placeholder="Título de la gestión" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><div className="grid grid-cols-2 gap-3"><select className="rounded-md border border-slate-200 px-3 py-2 text-sm" value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}><option value="monitoring">Monitoreo</option><option value="contacted">Contactado</option><option value="interest">Interés</option><option value="negotiation">Negociación</option><option value="offer">Oferta</option></select><select className="rounded-md border border-slate-200 px-3 py-2 text-sm" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></div><Input placeholder="Próxima acción" value={form.next_action} onChange={e=>setForm({...form,next_action:e.target.value})}/><Input type="date" value={form.next_action_date} onChange={e=>setForm({...form,next_action_date:e.target.value})}/><Button disabled={saving||!players.length} className="w-full bg-emerald-700 hover:bg-emerald-800">{saving?'Guardando…':'Guardar oportunidad'}</Button></form></DialogContent></Dialog>;
}