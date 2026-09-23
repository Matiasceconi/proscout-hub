import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, POSITION_LABELS } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Target, ArrowUpRight, Plus, Check, RefreshCw, Search, Loader2, CalendarDays, ShieldCheck } from 'lucide-react';

const services = [
  ['01', 'Seguimiento de carrera', 'Una revisión mensual por jugador, objetivos trimestrales, responsable, próximos pasos y registro de reuniones.', 'Primera implementación: prioridades y tareas conectadas al calendario.'],
  ['02', 'Mesa de mercado', 'Necesidades de clubes, contactos, jugadores ofrecidos, respuesta, negociación y próxima acción. Historial de cada oportunidad.', 'Propuesta de próxima etapa: CRM de clubes y oportunidades.'],
  ['03', 'Dossier comercial', 'Ficha deportiva con estadísticas verificadas, videos seleccionados y argumento de presentación adaptado al club destinatario.', 'Propuesta de próxima etapa: dossier exportable con estadísticas verificadas, videos y enlaces privados.'],
  ['04', 'Análisis individual', 'Informe pospartido, selección de clips por posición, revisión de decisiones y reunión con el jugador.', 'Base existente: partidos, estadísticas y videos. Propuesta: servicio periódico de análisis.'],
  ['05', 'Plan de desarrollo', 'Objetivos técnicos y físicos, seguimiento de hábitos y coordinación con los profesionales y el club del jugador.', 'Base existente: portal y rendimiento. Propuesta: objetivos medibles y revisión trimestral.'],
  ['06', 'Contratos y documentación', 'Vencimientos, responsables, versiones y documentación necesaria para cada gestión; acceso restringido por función.', 'Primera implementación: alertas sobre la fecha registrada en la ficha. Expediente contractual propuesto.'],
  ['07', 'Oportunidades de mercado', 'Cruzar necesidades reales de clubes con posición, edad, disponibilidad y perfil deportivo. Mostrar motivos y datos faltantes de cada coincidencia.', 'Propuesta: matching explicable, sujeto a datos de mercado autorizados.'],
  ['08', 'Servicio de agencia', 'Informe ejecutivo semanal, comité mensual de cartera, soporte, capacitación y acompañamiento tecnológico de Matías Ceconi y Santiago Quattrochi.', 'Propuesta de servicio: definir volumen de jugadores, frecuencia y entregables.'],
];
const tabs = [['priorities','Cartera priorizada'],['tasks','Seguimientos'],['services','Servicios y evolución']];
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm';
const showDate = value => value ? new Date(value.length === 10 ? value + 'T12:00:00-03:00' : value).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'short',year:'numeric',...(value.length===10?{}:{hour:'2-digit',minute:'2-digit'})}) : 'Sin registro';
const badge = priority => priority === 'high' ? 'bg-rose-50 text-rose-700 border-rose-100' : priority === 'medium' ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-200';
async function invoke(payload) {
  const response = await base44.functions.invoke('agency-intelligence', payload);
  if (!response.data?.success) throw new Error(response.data?.error || 'No se pudo completar la operación.');
  return response.data;
}

export default function AgencyIntelligence() {
  const { user } = useAuth();
  const orgId = getUserOrgId(user);
  const cache = useQueryClient();
  const [tab,setTab] = useState('priorities');
  const [search,setSearch] = useState('');
  const [filter,setFilter] = useState('all');
  const [taskFilter,setTaskFilter] = useState('pending');
  const [form,setForm] = useState(null);
  const [busy,setBusy] = useState(false);
  const [feedback,setFeedback] = useState('');
  useEffect(() => { setForm(null); setFeedback(''); }, [orgId, user?.id]);
  const query = useQuery({
    queryKey:['agency-intelligence',orgId,user?.id], enabled:!!orgId,
    queryFn:()=>invoke({organization_id:orgId}), staleTime:60000, retry:1
  });
  const data = query.data;
  const players = data?.players || [];
  const filtered = players.filter(p=>(p.name+' '+p.club+' '+(POSITION_LABELS[p.position]||p.position)).toLowerCase().includes(search.toLowerCase()) && (filter==='all'||p.alerts.some(a=>a.kind===filter)));
  const pending = (data?.tasks||[]).filter(t=>['scheduled','confirmed'].includes(t.status));
  const overdue = pending.filter(t=>Date.parse(t.start_date)<Date.now());
  const tasks = (data?.tasks||[]).filter(t=>taskFilter==='all'||(taskFilter==='completed'?t.status==='completed':['scheduled','confirmed'].includes(t.status))).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
  const errorMessage = err => err.response?.data?.error || err.message || 'No se pudo completar la operación.';
  const refresh = () => cache.invalidateQueries({queryKey:['agency-intelligence',orgId]});
  const openTask = (p) => {
    setFeedback('');
    setForm({player_id:p?.id||'',title:p?'Seguimiento de '+p.name:'',start_date:'',description:'',priority:'medium',responsible_member_id:data.current_member_id});
  };
  const saveTask = async e => {
    e.preventDefault(); setBusy(true);setFeedback('');
    try {
      await invoke({...form, start_date:new Date(form.start_date+':00-03:00').toISOString(),organization_id:orgId,action:'create_task'});
      setForm(null);setFeedback('Seguimiento guardado en el calendario.');await refresh();
    } catch(err) {setFeedback(errorMessage(err));} finally {setBusy(false);}
  };
  const complete = async id => {
    setBusy(true);setFeedback('');
    try {await invoke({organization_id:orgId,action:'complete_task',event_id:id});await refresh();setFeedback('Seguimiento completado.');}
    catch(err){setFeedback(errorMessage(err));}finally{setBusy(false);}
  };
  if (query.isPending) return <div className="p-10 flex items-center gap-3 text-slate-600"><Loader2 className="animate-spin w-5 h-5"/>Cargando la cartera y sus prioridades…</div>;
  if (query.isError) return <div className="p-8"><h1 className="text-2xl font-bold">Seguimiento de cartera</h1><p className="my-4 text-rose-700">{errorMessage(query.error)}</p><Button onClick={()=>query.refetch()}>Reintentar</Button></div>;
  return <div className="mx-auto max-w-[1440px] p-4 md:p-8 space-y-6">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 md:p-9">
      <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none"/>
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div><div className="flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-emerald-300 uppercase"><Target className="w-4 h-4"/>Score Fútbol · Gestión de carrera</div>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Seguimiento de cartera</h1>
          <p className="mt-3 text-slate-300 max-w-2xl">Detectá rápido quién necesita atención, qué falta hacer y cuál es la próxima acción.</p>
          <p className="mt-4 text-xs text-slate-400">{data.scope} · Actualizado {showDate(data.generated_at)}</p>
        </div>
        <Button variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white" onClick={()=>query.refetch()} disabled={query.isFetching}><RefreshCw className={'w-4 h-4 mr-2 '+(query.isFetching?'animate-spin':'')}/>Actualizar</Button>
      </div>
      <div className="relative mt-7 grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[[players.length,'Jugadores en tu alcance'],[players.filter(p=>p.alerts.some(a=>a.priority==='high')).length,'Con prioridad alta'],[data.permissions.calendar?overdue.length:'—','Seguimientos atrasados'],[data.permissions.statistics?data.coverage.verified+' / '+players.length:'—','Identidades API verificadas']].map(([value,label])=><div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-2xl font-bold">{value}</div><p className="mt-1 text-xs text-slate-300">{label}</p></div>)}
      </div>
    </section>
    <nav className="flex overflow-x-auto gap-1 border-b border-slate-200" aria-label="Secciones de seguimiento">{tabs.map(([id,label])=><button key={id} onClick={()=>{setTab(id);setFeedback('');}} className={'whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 '+(tab===id?'border-emerald-600 text-emerald-800':'border-transparent text-slate-500 hover:text-slate-900')}>{label}</button>)}</nav>
    {feedback&&<p role="status" className="rounded-xl bg-slate-100 p-3 text-sm text-slate-800">{feedback}</p>}

    {tab==='priorities'&&<>
      <div className="flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400"/><Input className="pl-9 rounded-xl h-10 bg-white" aria-label="Buscar jugador" placeholder="Buscar por jugador, club o posición…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className={inputClass+' md:max-w-60'} aria-label="Filtrar prioridades" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Toda la cartera</option><option value="contract">Contratos por revisar</option><option value="overdue">Seguimientos atrasados</option><option value="follow_up">Sin próxima acción</option><option value="owner">Sin representante</option><option value="data">Identidad por verificar</option><option value="coverage">Cobertura de estadísticas</option></select>
      </div>
      <p className="text-xs text-slate-500">Las alertas señalan registros a revisar. La ausencia de datos integrados no se interpreta como cero actividad.</p>
      <div className="grid grid-cols-1 gap-3">{filtered.map(p=><article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.1fr)_minmax(180px,.8fr)_minmax(220px,1fr)_auto] lg:items-center">
          <div className="flex items-center gap-3 min-w-0"><div className="h-12 w-12 shrink-0 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-500">{p.photo_url?<img src={p.photo_url} alt="" className="h-full w-full object-cover" onError={e=>{e.currentTarget.style.display='none';}}/>:p.name.slice(0,2)}</div><div className="min-w-0"><Link to={'/agency/players/'+p.id} className="font-bold text-slate-900 hover:text-emerald-700">{p.name}</Link><p className="text-xs text-slate-500 mt-1 truncate">{POSITION_LABELS[p.position]||p.position} · {p.club||'Club sin registrar'}</p></div></div>
          <div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Próxima acción</p><p className="mt-1 text-sm font-semibold text-slate-800">{p.next_action||'Sin programar'}</p></div>
          <div className="flex flex-wrap gap-1.5">{p.alerts.length?p.alerts.slice(0,3).map(a=><span key={a.kind} className={'text-[11px] rounded-lg border px-2.5 py-1.5 '+badge(a.priority)}>{a.text}</span>):<span className="text-xs text-emerald-700">Sin alertas</span>}</div>
          <div className="flex items-center gap-2 lg:justify-end">{data.permissions.calendar&&<Button size="sm" variant="outline" onClick={()=>openTask(p)}><Plus className="w-3.5 h-3.5 mr-1"/>Programar</Button>}<Link className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700" to={'/agency/players/'+p.id}>Ficha<ArrowUpRight className="w-3.5 h-3.5"/></Link></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:grid-cols-4"><span>Contrato: <strong className="text-slate-700">{showDate(p.contract_end)}</strong></span><span>Min. 90 días: <strong className="text-slate-700">{p.api_minutes_90d??'Sin datos'}</strong></span><span>Registros: <strong className="text-slate-700">{p.api_known_minutes_matches??'—'}</strong></span><span>Alertas: <strong className="text-slate-700">{p.alerts.length}</strong></span></div>
      </article>)}</div>
      {!filtered.length&&<div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">No hay jugadores que coincidan con esta vista. Si tu acceso es limitado, revisá las asignaciones con el administrador.</div>}
    </>}

    {tab==='tasks'&&<section className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Seguimientos de la cartera</h2><p className="text-sm text-slate-500">Las mismas acciones que aparecen en Calendario.</p></div>{data.permissions.calendar&&<Button onClick={()=>openTask(null)} className="bg-emerald-700 hover:bg-emerald-800"><Plus className="w-4 h-4 mr-2"/>Programar seguimiento</Button>}</div>
      {!data.permissions.calendar?<p className="text-slate-500">Tu rol necesita permiso de calendario para consultar seguimientos.</p>:<>
        <select className={inputClass+' max-w-60'} aria-label="Estado de seguimiento" value={taskFilter} onChange={e=>setTaskFilter(e.target.value)}><option value="pending">Pendientes</option><option value="completed">Completados</option><option value="all">Todos los estados</option></select>
        {tasks.map(t=><article key={t.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5"><div><p className="font-semibold">{t.title}</p><p className="text-sm text-slate-500 mt-1">{t.player_name} · {showDate(t.start_date)}</p><p className="text-xs text-slate-400 mt-1">Responsable: {t.responsible}</p></div><div className="flex items-center gap-3"><span className={'text-xs px-2 py-1 rounded-lg border '+badge(t.priority)}>{t.status==='completed'?'Completado':t.status==='cancelled'?'Cancelado':Date.parse(t.start_date)<Date.now()?'Atrasado':'Programado'}</span>{['scheduled','confirmed'].includes(t.status)&&<Button disabled={busy} variant="outline" size="sm" onClick={()=>complete(t.id)}><Check className="w-4 h-4 mr-1"/>Completar</Button>}</div></article>)}
        {!tasks.length&&<p className="p-10 text-center text-slate-500 rounded-2xl border border-dashed">No hay seguimientos en este estado.</p>}
        <Link to="/agency/calendar" className="text-sm text-emerald-700 inline-flex items-center gap-2"><CalendarDays className="w-4 h-4"/>Abrir calendario completo</Link>
      </>}
    </section>}

    {tab==='services'&&<section className="space-y-5">
      <div><h2 className="text-2xl font-bold">Una plataforma con servicio profesional</h2><p className="mt-2 text-slate-500 max-w-3xl">Propuesta de evolución a medida para Score Fútbol: seguimiento deportivo, gestión de oportunidades y acompañamiento continuo. Cada bloque indica qué se incorporó y qué está propuesto.</p></div>
      <div className="grid md:grid-cols-2 gap-4">{services.map(([n,title,description,status])=><article key={n} className="rounded-2xl bg-white border p-6"><p className="text-xs font-bold text-emerald-700 tracking-widest">SERVICIO {n}</p><h3 className="text-lg font-bold mt-3">{title}</h3><p className="text-sm text-slate-600 mt-2 leading-6">{description}</p><p className="text-xs text-slate-500 border-t mt-4 pt-3">{status}</p></article>)}</div>
      <div className="rounded-2xl bg-slate-900 text-white p-6"><h3 className="font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400"/>Integraciones con evidencia</h3><p className="text-sm text-slate-300 mt-3">API-Football: consultamos identidades verificadas y registros importados; eso no garantiza cobertura total ni una conexión activa en este momento. Wyscout, Opta y GPS requieren acceso autorizado y validación técnica. Drive, Calendar y WhatsApp forman parte de la propuesta de integración.</p>{data.permissions.admin&&<Link to="/agency/settings/integrations/api-football/clubs" className="inline-flex items-center mt-4 gap-2 text-emerald-300 text-sm">Revisar vinculación de clubes<ArrowUpRight className="w-4 h-4"/></Link>}</div>
    </section>}

    <Dialog open={!!form} onOpenChange={open=>{if(!open&&!busy)setForm(null);}}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Programar seguimiento</DialogTitle></DialogHeader>{form&&<form onSubmit={saveTask} className="space-y-4">
      <label className="block text-sm">Jugador<select required className={inputClass+' mt-1'} value={form.player_id} onChange={e=>setForm({...form,player_id:e.target.value})}><option value="">Seleccionar</option>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="block text-sm">Próxima acción<Input required maxLength={160} className="mt-1" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <label className="block text-sm">Fecha y hora de Argentina<Input required type="datetime-local" className="mt-1" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Responsable<select className={inputClass+' mt-1'} value={form.responsible_member_id} onChange={e=>setForm({...form,responsible_member_id:e.target.value})}>{data.members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="text-sm">Prioridad<select className={inputClass+' mt-1'} value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></label></div>
      <label className="block text-sm">Detalle<textarea maxLength={2000} rows={3} className={inputClass+' mt-1'} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
      {feedback&&<p role="alert" className="text-sm text-rose-700">{feedback}</p>}<Button type="submit" disabled={busy} className="w-full bg-emerald-700">{busy?'Guardando…':'Guardar en calendario'}</Button>
    </form>}</DialogContent></Dialog>
  </div>;
}
