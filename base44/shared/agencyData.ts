export async function readAllRows(entity:any, query:any, sort='-updated_date') {
  const rows:any[]=[];
  for(let skip=0;skip<10000;skip+=500) {
    const page=await entity.filter(query,sort,500,skip); rows.push(...page);
    if(page.length<500)return rows;
  }
  throw new Error('DATA_LIMIT');
}

export async function scopedPlayers(db:any, member:any, userId:string, orgId:string) {
  const full=['organization_owner','organization_admin'].includes(member.app_role)||member.has_full_squad_access;
  const [players, assignments]=await Promise.all([
    readAllRows(db.Player,{organization_id:orgId,status:{$ne:'archived'}}),
    full?[]:readAllRows(db.PlayerAssignment,{organization_id:orgId,staff_user_id:userId})
  ]);
  const ids=new Set(assignments.map((a:any)=>a.player_id));
  return players.filter((p:any)=>full||ids.has(p.id)||p.representative_id===member.id||p.representative_id===userId);
}

export function numberOrNull(value:any) {
  if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
  const n=Number(value); return Number.isFinite(n)&&n>=0?n:null;
}

export function normalizeSportmonksPlayer(raw:any) {
  const player=Array.isArray(raw?.data)?raw.data[0]:raw?.data;
  if(!player?.id)throw new Error('INVALID_PROVIDER_RESPONSE');
  const aliases:Record<string,string>={'minutes-played':'minutes','goals':'goals','assists':'assists','appearances':'appearances','yellowcards':'yellow_cards','redcards':'red_cards'};
  const rows:any[]=[];
  for(const s of Array.isArray(player.statistics)?player.statistics:[]) {
    if(!s.season_id||!s.team_id)continue;
    const metrics:Record<string,number|null>={minutes:null,goals:null,assists:null,appearances:null,yellow_cards:null,red_cards:null};
    if(s.has_values!==false)for(const d of s.details||[]) {
      const code=String(d.type?.developer_name||d.type?.code||'').toLowerCase().replaceAll('_','-');
      const key=aliases[code]; if(!key)continue;
      const value=typeof d.value==='object'&&d.value!==null?d.value.total:d.value;
      metrics[key]=numberOrNull(value);
    }
    rows.push({key:String(s.season_id)+':'+String(s.team_id),season_id:String(s.season_id),season_name:s.season?.name||String(s.season_id),season_start:s.season?.starting_at||null,team_id:String(s.team_id),team_name:s.team?.name||'',league_id:String(s.season?.league_id||''),league_name:s.season?.league?.name||'',...metrics});
  }
  return {provider_player_id:String(player.id),provider_name:String(player.display_name||player.name||''),birth_date:player.date_of_birth||null,image_url:player.image_path||null,seasons:[...new Map(rows.map(s=>[s.key,s])).values()]};
}

export function aggregateSeason(rows:any[], seasonId:string) {
  const chosen=rows.filter(s=>s.season_id===seasonId);
  const result:any={records:chosen.length,teams:chosen.map(s=>s.team_name).filter(Boolean)};
  for(const key of ['minutes','goals','assists','appearances','yellow_cards','red_cards']) {
    result[key]=chosen.length&&chosen.every(s=>typeof s[key]==='number'&&Number.isFinite(s[key]))?chosen.reduce((n,s)=>n+s[key],0):null;
  }
  result.goals_per90=result.minutes>0&&result.goals!==null?Math.round(result.goals/result.minutes*9000)/100:null;
  return result;
}
