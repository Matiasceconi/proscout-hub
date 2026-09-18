const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function fixture(){
 let user={id:'alice'};
 const rows={
 Organization:[{id:'org',status:'active'},{id:'other',status:'active'}],
 OrganizationMember:[{id:'ma',organization_id:'org',user_id:'alice',status:'active',app_role:'representative'},{id:'mb',organization_id:'org',user_id:'bob',status:'active',app_role:'representative'}],
 Player:[{id:'p1',organization_id:'org',first_name:'Uno',status:'active',representative_id:'ma'},{id:'p2',organization_id:'org',first_name:'Dos',status:'active',representative_id:'mb'}],
 PlayerAssignment:[],PersonalDashboardPreference:[],CalendarEvent:[],ClubFixture:[],SportmonksPlayerSnapshot:[],PlayerExternalIdentity:[]
 };
 const match=(r,q)=>Object.entries(q).every(([k,v])=>v&&typeof v==='object'?Object.entries(v).every(([op,val])=>op==='$in'?val.includes(r[k]):op==='$ne'?r[k]!==val:op==='$gte'?r[k]>=val:op==='$lte'?r[k]<=val:false):r[k]===v);
 const db=Object.fromEntries(Object.keys(rows).map(name=>[name,{
 filter:async(q,sort,limit=500,skip=0)=>rows[name].filter(r=>match(r,q)).slice(skip,skip+limit),
 get:async id=>rows[name].find(r=>r.id===id),
 create:async data=>{const row={id:name+rows[name].length,...structuredClone(data)};rows[name].push(row);return row;},
 update:async(id,data)=>{const row=rows[name].find(r=>r.id===id);assert.ok(row);Object.assign(row,structuredClone(data));return row;}
 }]));
 const cache={};
 function load(file){
 const full=path.resolve(file);if(cache[full])return cache[full];
 const source=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function('require','exports','module','Deno','fetch',source)(id=>id.startsWith('npm:')?{createClientFromRequest:()=>({auth:{me:async()=>user},asServiceRole:{entities:db}})}:load(path.resolve(path.dirname(full),id)),module.exports,module,{env:{get:()=>undefined}},async()=>{throw new Error('Unexpected network call');});
 return cache[full]=module.exports;
 }
 const dashboard=load('base44/functions/personal-dashboard/entry.ts').default;
 const provider=load('base44/functions/sportmonks-player/entry.ts').default;
 const call=(fn,body)=>fn(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({organization_id:'org',...body})}));
 return {rows,load,setUser:id=>{user=id?{id}:null;},call, dashboard,provider};
}
test('each session saves only its own dashboard; supplied user and row IDs ignored',async()=>{
 const f=fixture();
 let res=await f.call(f.dashboard,{action:'save',revision:0,user_id:'bob',id:'foreign',settings:{widgets:[{id:'agenda'}],favorite_player_ids:['p1','p2'],featured_player_id:'p2'}});
 assert.equal(res.status,200);assert.equal(f.rows.PersonalDashboardPreference[0].user_id,'alice');
 assert.deepEqual(f.rows.PersonalDashboardPreference[0].settings.favorite_player_ids,['p1']);
 assert.equal(f.rows.PersonalDashboardPreference[0].settings.featured_player_id,'');
 f.setUser('bob');
 res=await f.call(f.dashboard,{action:'save',revision:0,settings:{widgets:[{id:'contracts'}]}});
 assert.equal(res.status,200);assert.equal(f.rows.PersonalDashboardPreference.length,2);
 assert.equal(f.rows.PersonalDashboardPreference[0].settings.widgets[0].id,'agenda');
 assert.equal(f.rows.PersonalDashboardPreference[1].settings.widgets[0].id,'contracts');
});
test('no membership, another organization and anonymous sessions are rejected',async()=>{
 const f=fixture();
 assert.equal((await f.call(f.dashboard,{organization_id:'other'})).status,403);
 f.setUser('intruder');assert.equal((await f.call(f.dashboard,{})).status,403);
 f.setUser(null);assert.equal((await f.call(f.dashboard,{})).status,401);
});
test('stale revisions cannot overwrite saved preferences',async()=>{
 const f=fixture(),body={action:'save',revision:0,settings:{widgets:[]}};
 assert.equal((await f.call(f.dashboard,body)).status,200);
 assert.equal((await f.call(f.dashboard,body)).status,409);
 assert.equal(f.rows.PersonalDashboardPreference[0].revision,1);
});
test('dashboard scope excludes other players, medical events and stale identity snapshots',async()=>{
 const f=fixture(),date=new Date().toISOString();
 f.rows.CalendarEvent.push({id:'private',organization_id:'org',player_id:'p2',start_date:date,status:'scheduled'}, {id:'medical',organization_id:'org',player_id:'p1',event_type:'medical',start_date:date,status:'scheduled'}, {id:'own',organization_id:'org',player_id:'p1',event_type:'follow_up',start_date:date,status:'scheduled'});
 f.rows.SportmonksPlayerSnapshot.push({id:'s',organization_id:'org',player_id:'p1',provider_player_id:'9',seasons:[]});
 f.rows.PlayerExternalIdentity.push({organization_id:'org',player_id:'p1',provider:'sportmonks',status:'verified',provider_player_id:'10'});
 const body=await(await f.call(f.dashboard,{})).json();
 assert.deepEqual(body.players.map(p=>p.id),['p1']);assert.deepEqual(body.events.map(e=>e.id),['own']);
 assert.equal(body.sportmonks.snapshots.length,0);assert.equal(body.sportmonks.configured,false);
});
test('widget settings are validated, deduplicated and bounded',()=>{
 const model=fixture().load('base44/shared/personalDashboard.ts');
 assert.throws(()=>model.normalizeSettings({}),/INVALID_SETTINGS/);
 const result=model.normalizeSettings({widgets:[{id:'agenda',limit:999},{id:'agenda'},{id:'unknown'}],accent:'invalid'});
 assert.deepEqual(result.widgets,[{id:'agenda',size:'normal',limit:5}]);assert.equal(result.accent,'emerald');
});
test('Sportmonks preserves zero, missing values and season boundaries',()=>{
 const model=fixture().load('base44/shared/personalDashboard.ts');
 const normalized=model.normalizeSportmonksPlayer({data:{id:99,statistics:[
 {season_id:1,team_id:2,details:[{type:{developer_name:'MINUTES_PLAYED'},value:{total:90}},{type:{developer_name:'GOALS'},value:{total:0}},{type:{developer_name:'ASSISTS'},value:{average:2}}]},
 {season_id:2,team_id:2,details:[{type:{developer_name:'GOALS'},value:{total:9}}]}
 ]}});
 assert.equal(normalized.seasons[0].goals,0);assert.equal(normalized.seasons[0].assists,null);
 const stats=model.aggregateSeason(normalized.seasons,'1');assert.equal(stats.goals,0);assert.equal(stats.minutes,90);
 assert.equal(model.aggregateSeason(normalized.seasons,'missing').goals,null);
});
test('partial club data does not masquerade as a complete season total',()=>{
 const model=fixture().load('base44/shared/personalDashboard.ts');
 const stats=model.aggregateSeason([{season_id:'1',minutes:90,goals:1},{season_id:'1',minutes:null,goals:2}],'1');
 assert.equal(stats.minutes,null);assert.equal(stats.goals,3);assert.equal(stats.goals_per90,null);
});
test('Sportmonks identity linking requires admin and explicit confirmation',async()=>{
 const f=fixture(),body={action:'link',player_id:'p1',provider_player_id:'99'};
 assert.equal((await f.call(f.provider,body)).status,403);
 f.rows.OrganizationMember[0].app_role='organization_admin';
 assert.equal((await f.call(f.provider,body)).status,400);
 assert.equal(f.rows.PlayerExternalIdentity.length,0);
});
test('Sportmonks missing secret fails safely without fetching or overwriting data',async()=>{
 const f=fixture();f.rows.OrganizationMember[0].app_role='organization_admin';
 const res=await f.call(f.provider,{action:'link',player_id:'p1',provider_player_id:'99',confirmed:true});
 assert.equal(res.status,503);assert.equal(f.rows.SportmonksPlayerSnapshot.length,0);assert.equal(f.rows.PlayerExternalIdentity.length,0);
});
test('client cannot read or mutate personal preferences and provider snapshots directly',()=>{
 for(const name of ['personal-dashboard-preference','sportmonks-player-snapshot']){
 const schema=JSON.parse(fs.readFileSync('base44/entities/'+name+'.jsonc','utf8'));
 assert.deepEqual(schema.rls,{read:false,create:false,update:false,delete:false});
 }
});
