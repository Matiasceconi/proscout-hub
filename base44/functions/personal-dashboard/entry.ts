import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAgencyMember, hasAgencyPermission } from '../../shared/agencyAccess.ts';
import { DEFAULT_SETTINGS, normalizeSettings, readAllRows, scopedPlayers } from '../../shared/personalDashboard.ts';

export default async function(req:Request):Promise<Response> {
 try {
  const b=createClientFromRequest(req), user=await b.auth.me();
  if(!user)return Response.json({error:'Inicia sesión.'},{status:401});
  const body=await req.json().catch(()=>({})), orgId=String(body.organization_id||'');
  const member=await requireAgencyMember(b,user,orgId);
  if(!member||!hasAgencyPermission(member,'players'))return Response.json({error:'Sin acceso a esta cartera.'},{status:403});
  const db=b.asServiceRole.entities;
  // user_id is always derived from the session; never accept a target user or row ID.
  const key={organization_id:orgId,user_id:user.id};
  const saved=(await db.PersonalDashboardPreference.filter(key,'-updated_date',1))[0];
  const revision=saved?.revision||0;
  if(body.action==='save') {
    if(body.revision!==revision)return Response.json({error:'El tablero cambió en otra ventana. Recargá antes de guardar.',code:'CONFLICT'},{status:409});
    const settings=normalizeSettings(body.settings);
    const players=await scopedPlayers(db,member,user.id,orgId), ids=new Set(players.map((p:any)=>p.id));
    settings.favorite_player_ids=settings.favorite_player_ids.filter((id:any)=>ids.has(id));
    if(!ids.has(settings.featured_player_id))settings.featured_player_id='';
    const payload={...key,settings,revision:revision+1};
    if(saved)await db.PersonalDashboardPreference.update(saved.id,payload);
    else await db.PersonalDashboardPreference.create(payload);
    return Response.json({success:true,settings,revision:revision+1});
  }
  if(body.action&&body.action!=='get')return Response.json({error:'Acción inválida.'},{status:400});
  const players=await scopedPlayers(db,member,user.id,orgId);
  const ids=players.map((p:any)=>p.id), idSet=new Set(ids);
  const canCalendar=hasAgencyPermission(member,'calendar'), canStats=hasAgencyPermission(member,'statistics'), canMatches=hasAgencyPermission(member,'matches');
  const now=new Date(), horizon=new Date(now.getTime()+14*86400000).toISOString();
  const [events,fixtures,snapshots,identities]=await Promise.all([
    canCalendar?readAllRows(db.CalendarEvent,{organization_id:orgId,status:{$ne:'cancelled'},start_date:{$gte:new Date(now.getTime()-90*86400000).toISOString(),$lte:horizon}},'start_date'):[],
    canMatches?readAllRows(db.ClubFixture,{organization_id:orgId,fixture_date:{$gte:new Date(now.getTime()-86400000).toISOString(),$lte:horizon}},'fixture_date'):[],
    canStats&&ids.length?readAllRows(db.SportmonksPlayerSnapshot,{organization_id:orgId,player_id:{$in:ids}}):[],
    canStats&&ids.length?readAllRows(db.PlayerExternalIdentity,{organization_id:orgId,player_id:{$in:ids},provider:'sportmonks',status:'verified'}):[]
  ]);
  const safeEvents=events.filter((e:any)=>e.player_id?idSet.has(e.player_id):(e.responsible_member_id===member.id||e.created_by_user_id===user.id));
  const safeSnapshots=[...new Map([...snapshots].reverse().map((s:any)=>[s.player_id,s])).values()];
  const currentSnapshots=safeSnapshots.filter((s:any)=>identities.some((i:any)=>i.player_id===s.player_id&&String(i.provider_player_id)===String(s.provider_player_id)));
  const settings=saved?normalizeSettings(saved.settings):DEFAULT_SETTINGS;
  const safeSettings={...settings,favorite_player_ids:settings.favorite_player_ids.filter((id:any)=>idSet.has(id)),featured_player_id:idSet.has(settings.featured_player_id)?settings.featured_player_id:''};
  const admin=['organization_owner','organization_admin'].includes(member.app_role);
  let configured=false;
  try {configured=typeof Deno!=='undefined'?!!Deno.env.get('SPORTMONKS_API_TOKEN'):!!process.env.SPORTMONKS_API_TOKEN;}catch{}
  return Response.json({
   success:true,settings:safeSettings,revision,generated_at:now.toISOString(),member_id:member.id,
   scope:admin||member.has_full_squad_access?'Cartera autorizada':'Tus jugadores asignados',
   permissions:{calendar:canCalendar,statistics:canStats,matches:canMatches,admin},
   players:players.map((p:any)=>({id:p.id,name:[p.first_name,p.last_name].filter(Boolean).join(' '),club:p.club||'',club_logo:p.club_logo_url||'',position:p.position,photo_url:p.photo_url||'',contract_end:p.contract_end||null,representative:p.representative_name||'',birth_date:p.birth_date||null})),
   events:safeEvents.map((e:any)=>({id:e.id,player_id:e.player_id,title:e.title,start_date:e.start_date,end_date:e.end_date,status:e.status,event_type:e.event_type,priority:e.priority,player_name:e.player_name})),
   fixtures:fixtures.map((f:any)=>({...f,players:players.filter((p:any)=>p.current_club_id&&f.mapped_club_ids?.includes(p.current_club_id)).map((p:any)=>({id:p.id,name:[p.first_name,p.last_name].join(' ')}))})).filter((f:any)=>f.players.length).map((f:any)=>({id:f.id,date:f.fixture_date,home:f.home_team_name,away:f.away_team_name,home_logo:f.home_team_logo,away_logo:f.away_team_logo,home_score:f.home_score,away_score:f.away_score,status:f.fixture_status,competition:f.competition_name,provider:f.provider,players:f.players,synced_at:f.last_sync_at})),
   sportmonks:{configured,synced_players:currentSnapshots.length,linked_players:new Set(identities.map((i:any)=>i.player_id)).size,snapshots:currentSnapshots.map((s:any)=>({player_id:s.player_id,provider_player_id:s.provider_player_id,synced_at:s.synced_at,seasons:s.seasons||[]}))}
  });
 }catch(e:any) {return Response.json({error:e?.message==='INVALID_SETTINGS'?'Configuración inválida.':'No se pudo cargar o guardar el tablero. Reintentá.'},{status:e?.message==='INVALID_SETTINGS'?400:500});}
}
