import React,{useState} from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { Loader2,Link2,ShieldCheck } from 'lucide-react';

export default function SportmonksSetup({open,onOpenChange,orgId,data,onUpdated}) {
 const [playerId,setPlayerId]=useState(''),[providerId,setProviderId]=useState(''),[candidate,setCandidate]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const request=async action=>{
  setBusy(true);setMessage('');
  try {
   const r=await base44.functions.invoke('sportmonks-player',{organization_id:orgId,player_id:playerId,provider_player_id:providerId,action,confirmed:action==='link'});
   if(!r.data?.success)throw new Error(r.data?.error||'No se pudo completar.');
   if(action==='preview')setCandidate(r.data);else{setCandidate(null);setMessage(r.data.message);await onUpdated();}
  }catch(e){setMessage(e.response?.data?.error||e.message);if(action==='preview')setCandidate(null);}
  finally{setBusy(false);}
 };
 return <Dialog open={open} onOpenChange={value=>{if(!busy)onOpenChange(value);}}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Sportmonks · Estadísticas de la cartera</DialogTitle><DialogDescription>Vinculación verificada por jugador. Las estadísticas conservan su temporada y su fecha de consulta.</DialogDescription></DialogHeader>
 <div className={'rounded-xl p-4 text-sm '+(data.sportmonks.configured?'bg-emerald-50 text-emerald-900':'bg-amber-50 text-amber-900')}>{data.sportmonks.configured?'Credencial configurada. La disponibilidad depende del acceso y la cobertura de tu plan.':'Pendiente de conexión. El administrador debe cargar SPORTMONKS_API_TOKEN en los secretos de esta aplicación de Score.'}</div>
 {data.permissions.admin?<div className="space-y-4"><label className="block text-sm font-medium">Jugador de Score<select disabled={busy} className="w-full border rounded-lg p-2 mt-1" value={playerId} onChange={e=>{setPlayerId(e.target.value);setCandidate(null);setMessage('');}}><option value="">Seleccionar jugador</option>{data.players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <label className="block text-sm font-medium">ID del jugador en Sportmonks<Input disabled={busy} className="mt-1" inputMode="numeric" value={providerId} onChange={e=>{setProviderId(e.target.value.trim());setCandidate(null);}} placeholder="ID numérico del proveedor"/></label>
 <Button disabled={busy||!playerId||!providerId||!data.sportmonks.configured} onClick={()=>request('preview')}><Link2 className="w-4 h-4 mr-2"/>Consultar coincidencia</Button>
 {candidate&&<div className="rounded-xl border p-4 space-y-3"><p className="text-xs uppercase text-slate-500">Verificación de identidad</p><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-slate-400">Score</p><strong>{candidate.internal.name}</strong><p>{candidate.internal.birth_date||'Nacimiento sin registrar'}</p></div><div><p className="text-slate-400">Sportmonks</p><strong>{candidate.profile.name}</strong><p>{candidate.profile.birth_date||'Nacimiento sin registrar'}</p></div></div><p className="text-xs text-slate-500">Confirmá nombre y nacimiento antes de vincular. Se importarán las estadísticas que devuelva tu plan; no se modifica la ficha del jugador.</p><Button disabled={busy} onClick={()=>request('link')} className="w-full bg-emerald-700"><ShieldCheck className="w-4 h-4 mr-2"/>Confirmar que es el mismo jugador</Button></div>}
 </div>:<p className="text-sm text-slate-600">Pedí a un administrador que vincule los perfiles. Luego podrás actualizar los jugadores autorizados desde “Jugador en foco”.</p>}
 {busy&&<p className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin"/>Consultando Sportmonks…</p>}
 {message&&<p role="status" className="text-sm p-3 bg-slate-100 rounded-xl">{message}</p>}
 <p className="text-xs text-slate-500">La conexión no se considera probada por la sola presencia de una credencial. Un campo sin cobertura se muestra como “—”.</p>
 </DialogContent></Dialog>;
}
