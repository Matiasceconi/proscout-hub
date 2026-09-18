import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAgencyMember, hasAgencyPermission } from '../../shared/agencyAccess.ts';
import { scopedPlayers, normalizeSportmonksPlayer } from '../../shared/personalDashboard.ts';

async function providerPlayer(id:string) {
  if(!/^[1-9][0-9]{0,14}$/.test(id))throw new Error('INVALID_ID');
  let token='';
  try {token=typeof Deno!=='undefined'?(Deno.env.get('SPORTMONKS_API_TOKEN')||''):(process.env.SPORTMONKS_API_TOKEN||'');}catch{}
  if(!token)throw new Error('NOT_CONFIGURED');
  const url=new URL('https://api.sportmonks.com/v3/football/players/'+id);
  url.searchParams.set('api_token',token);
  url.searchParams.set('include','statistics.details.type;statistics.season.league;statistics.team');
  const response=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error'});
  if(response.status===429)throw new Error('RATE_LIMIT');
  if(response.status===401||response.status===403)throw new Error('PROVIDER_ACCESS');
  if(!response.ok)throw new Error('PROVIDER_ERROR');
  const result=normalizeSportmonksPlayer(await response.json());
  if(result.provider_player_id!==id)throw new Error('INVALID_PROVIDER_RESPONSE');
  return result;
}
export default async function(req:Request):Promise<Response> {
 try{
  const b=createClientFromRequest(req),user=await b.auth.me();
  if(!user)return Response.json({error:'Inicia sesión.'},{status:401});
  const body=await req.json(),orgId=String(body.organization_id||'');
  const member=await requireAgencyMember(b,user,orgId);
  if(!member||!hasAgencyPermission(member,'statistics'))return Response.json({error:'No tienes permiso de estadísticas.'},{status:403});
  const db=b.asServiceRole.entities,players=await scopedPlayers(db,member,user.id,orgId);
  const player=players.find((p:any)=>p.id===body.player_id);
  if(!player)return Response.json({error:'Jugador no disponible.'},{status:403});
  const admin=['organization_owner','organization_admin'].includes(member.app_role);
  if(!['preview','link','sync'].includes(body.action))return Response.json({error:'Acción inválida.'},{status:400});
  if(body.action!=='sync'&&!admin)return Response.json({error:'Solo un administrador puede verificar identidades.'},{status:403});
  const key={organization_id:orgId,player_id:player.id,provider:'sportmonks'};
  const identity=(await db.PlayerExternalIdentity.filter(key,'-updated_date',1))[0];
  const providerId=body.action==='sync'?(identity?.status==='verified'?String(identity.provider_player_id):''):String(body.provider_player_id||'');
  if(!providerId)return Response.json({error:'Primero vinculá y verificá el jugador de Sportmonks.'},{status:400});
  if(body.action==='sync') {
    const latest=(await db.SportmonksPlayerSnapshot.filter({organization_id:orgId,player_id:player.id,provider_player_id:providerId},'-synced_at',1))[0];
    if(latest&&Date.now()-Date.parse(latest.synced_at)<60000)return Response.json({success:true,cached:true,message:'Los datos ya fueron actualizados hace menos de un minuto.'});
  }
  if(body.action==='link') {
    if(body.confirmed!==true)return Response.json({error:'Confirmá que ambos perfiles corresponden al mismo jugador.'},{status:400});
    const other=await db.PlayerExternalIdentity.filter({organization_id:orgId,provider:'sportmonks',provider_player_id:providerId,status:'verified'},'-updated_date',100);
    if(other.some((i:any)=>i.player_id!==player.id))return Response.json({error:'Este perfil ya está vinculado a otro jugador de Score.'},{status:409});
  }
  const profile=await providerPlayer(providerId);
  if(body.action==='preview')return Response.json({success:true,profile:{id:profile.provider_player_id,name:profile.provider_name,birth_date:profile.birth_date,image_url:profile.image_url,seasons:profile.seasons.length},internal:{name:[player.first_name,player.last_name].join(' '),birth_date:player.birth_date||null}});
  const now=new Date().toISOString();
  if(body.action==='link') {
    const payload={...key,provider_player_id:providerId,provider_player_name:profile.provider_name,provider_photo_url:profile.image_url||'',status:'verified',verification_method:'admin_confirmed',verified_by:user.id,verified_at:now.slice(0,10)};
    if(identity)await db.PlayerExternalIdentity.update(identity.id,payload);else await db.PlayerExternalIdentity.create(payload);
  }
  const snapshot=(await db.SportmonksPlayerSnapshot.filter({organization_id:orgId,player_id:player.id},'-updated_date',1))[0];
  const payload={organization_id:orgId,player_id:player.id,provider_player_id:providerId,provider_name:profile.provider_name,synced_at:now,seasons:profile.seasons};
  if(snapshot)await db.SportmonksPlayerSnapshot.update(snapshot.id,payload);else await db.SportmonksPlayerSnapshot.create(payload);
  return Response.json({success:true,message:profile.seasons.length?'Estadísticas de Sportmonks actualizadas.':'Perfil conectado. El proveedor no devolvió estadísticas de temporada.',seasons:profile.seasons.length,synced_at:now});
 }catch(e:any){
  const messages:Record<string,string>={NOT_CONFIGURED:'Falta configurar SPORTMONKS_API_TOKEN en los secretos de Score.',INVALID_ID:'Ingresá un ID numérico válido de Sportmonks.',RATE_LIMIT:'Sportmonks alcanzó el límite de consultas. Reintentá más tarde.',PROVIDER_ACCESS:'Sportmonks no autorizó la consulta. Revisá el token y la cobertura de tu plan.',INVALID_PROVIDER_RESPONSE:'La respuesta de Sportmonks no pudo validarse.'};
  return Response.json({error:messages[e?.message]||'No se pudo actualizar Sportmonks. Se conservan los datos anteriores.'},{status:e?.message==='NOT_CONFIGURED'?503:e?.message==='RATE_LIMIT'?429:400});
 }
}
