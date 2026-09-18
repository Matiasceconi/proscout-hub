export const WIDGET_CATALOG = [
 {id:'agenda',title:'Mi agenda',description:'Tu jornada y las próximas actividades.',icon:'CalendarDays',permission:'calendar'},
 {id:'fixtures',title:'Partidos de mi cartera',description:'Quién juega, cuándo y para qué club.',icon:'Trophy',permission:'matches'},
 {id:'tasks',title:'Próximas acciones',description:'Seguimientos pendientes y atrasados.',icon:'CheckCheck',permission:'calendar'},
 {id:'contracts',title:'Radar contractual',description:'Fechas por verificar y vencimientos próximos.',icon:'FileClock'},
 {id:'favorites',title:'Mis jugadores prioritarios',description:'La selección personal que querés seguir de cerca.',icon:'Star'},
 {id:'ranking',title:'Rendimiento de temporada',description:'Minutos, goles, asistencias y apariciones de Sportmonks.',icon:'BarChart3',permission:'statistics'},
 {id:'contributions',title:'Aporte ofensivo',description:'Goles y asistencias en la misma temporada.',icon:'TrendingUp',permission:'statistics'},
 {id:'spotlight',title:'Jugador en foco',description:'Una ficha deportiva para tu seguimiento diario.',icon:'UserRound'},
 {id:'coverage',title:'Estado de los datos',description:'Cobertura de Sportmonks y fecha de actualización.',icon:'Database',permission:'statistics'},
 {id:'assistant',title:'Preparar mi próxima reunión',description:'Convertí información en preguntas y acciones.',icon:'Sparkles'}
];
export const METRICS={minutes:'Minutos',goals:'Goles',assists:'Asistencias',appearances:'Apariciones'};
export function seasonStats(seasons=[],id) {
 const rows=[...new Map(seasons.filter(s=>s.season_id===id).map(s=>[s.key||s.season_id+':'+s.team_id,s])).values()];
 const out={records:rows.length};
 for(const key of Object.keys(METRICS))out[key]=rows.length&&rows.every(s=>typeof s[key]==='number'&&Number.isFinite(s[key]))?rows.reduce((n,s)=>n+s[key],0):null;
 out.goals_per90=out.minutes>0&&out.goals!==null?Math.round(out.goals/out.minutes*9000)/100:null;
 return out;
}
export function argentinaDay(value=new Date()) {
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function contractDays(value,now=new Date()) {
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const result=Math.round((Date.parse(value)-Date.parse(argentinaDay(now)))/86400000);
 return Number.isFinite(result)?result:null;
}
export function dateLabel(value,withTime=true) {
 if(!value||!Number.isFinite(Date.parse(value)))return 'Sin fecha';
 return new Date(value.length===10?value+'T12:00:00-03:00':value).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'short',...(withTime?{hour:'2-digit',minute:'2-digit'}:{})});
}
export function moveWidget(widgets,source,target) {
 const next=[...widgets],from=next.findIndex(w=>w.id===source),to=next.findIndex(w=>w.id===target);
 if(from<0||to<0||from===to)return widgets;
 const [widget]=next.splice(from,1); next.splice(to,0,widget); return next;
}
