const CLUBS = [
  ['River Plate','Liga Profesional'],['Boca Juniors','Liga Profesional'],['Racing Club','Liga Profesional'],['Independiente','Liga Profesional'],['San Lorenzo','Liga Profesional'],['Vélez Sarsfield','Liga Profesional'],['Argentinos Juniors','Liga Profesional'],['Estudiantes','Liga Profesional'],['Gimnasia LP','Liga Profesional'],['Rosario Central','Liga Profesional'],['Newell’s','Liga Profesional'],['Talleres','Liga Profesional'],['Belgrano','Liga Profesional'],['Instituto','Liga Profesional'],['Defensa y Justicia','Liga Profesional'],['Lanús','Liga Profesional'],['Banfield','Liga Profesional'],['Huracán','Liga Profesional'],['Unión','Liga Profesional'],['Colón','Primera Nacional'],['Quilmes','Primera Nacional'],['Ferro','Primera Nacional'],['Atlanta','Primera Nacional'],['Chacarita','Primera Nacional'],['Nueva Chicago','Primera Nacional'],['San Martín Tucumán','Primera Nacional'],['Gimnasia Mendoza','Primera Nacional'],['Almirante Brown','Primera Nacional'],['Temperley','Primera Nacional'],['Los Andes','Primera Nacional'],['Patronato','Primera Nacional'],['Gimnasia Jujuy','Primera Nacional']
];

const FIRST_NAMES = ['Tomás','Lautaro','Mateo','Santiago','Joaquín','Franco','Agustín','Valentín','Thiago','Facundo','Nicolás','Bruno','Lucas','Matías','Ignacio','Bautista','Benjamín','Ramiro','Juan Cruz','Máximo','Felipe','Gonzalo','Alejo','Emiliano','Tobías','Leandro','Ezequiel','Federico','Alan','Kevin'];
const LAST_NAMES = ['Acosta','Benítez','Cabrera','Domínguez','Escobar','Fernández','Gómez','Herrera','Ibarra','Juárez','López','Medina','Navarro','Ojeda','Pereyra','Quiroga','Rojas','Sosa','Torres','Vázquez','Álvarez','Bustos','Correa','Díaz','Funes','Giménez','Molina','Paz','Romero','Silva'];
const POSITIONS = ['GK','RB','CB','CB','LB','CDM','CM','CM','CAM','RW','LW','ST'];
const SECONDARY = { GK:null, RB:'CB', CB:'CDM', LB:'CB', CDM:'CM', CM:'CAM', CAM:'CM', RW:'LW', LW:'RW', ST:'RW' };
const FOOT_BY_POS = { LB:'left', LW:'left', RB:'right', RW:'right' };

function rnd(seed) {
  let x = Math.sin(seed * 999.91) * 10000;
  return x - Math.floor(x);
}
function pick(arr, seed) { return arr[Math.floor(rnd(seed) * arr.length) % arr.length]; }
function n(seed, min, max) { return Math.floor(min + rnd(seed) * (max - min + 1)); }
function decimal(seed, min, max, digits = 2) { return Number((min + rnd(seed) * (max - min)).toFixed(digits)); }
function isoBirth(age, seed) {
  const year = 2026 - age;
  const month = n(seed + 3, 1, 12);
  const day = n(seed + 7, 1, 28);
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function contractDate(seed) {
  const year = pick([2026,2027,2028,2029], seed);
  const month = pick([6,12], seed + 1);
  return `${year}-${String(month).padStart(2,'0')}-30`;
}
function marketValue(age, position, minutes, seed) {
  const ageFactor = age <= 21 ? 1.45 : age <= 25 ? 1.15 : age <= 29 ? 0.9 : 0.55;
  const posFactor = ['ST','RW','LW','CAM'].includes(position) ? 1.2 : position === 'GK' ? 0.75 : 1;
  const base = Math.max(90000, (minutes / 2200) * 1400000 * ageFactor * posFactor * (0.72 + rnd(seed) * 0.7));
  return Math.round(base / 25000) * 25000;
}

export function formatMarketValue(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000000) return `USD ${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  return `USD ${Math.round(value / 1000)}K`;
}

export function buildDemoMarketPlayers(count = 2400) {
  return Array.from({ length: count }, (_, i) => {
    const seed = i + 37;
    const club = CLUBS[i % CLUBS.length];
    const position = POSITIONS[(i * 7 + n(seed,0,11)) % POSITIONS.length];
    const age = n(seed + 2, 17, 34);
    const appearances = n(seed + 10, 5, 31);
    const starts = Math.min(appearances, n(seed + 11, 2, appearances));
    const minutes = Math.min(2700, starts * n(seed + 12, 65, 88) + Math.max(0, appearances - starts) * n(seed + 13, 10, 35));
    const attacking = ['ST','RW','LW','CAM'].includes(position);
    const goals = attacking ? n(seed + 14, 0, Math.max(2, Math.round(minutes / 330))) : n(seed + 14, 0, Math.max(1, Math.round(minutes / 1100)));
    const assists = ['RW','LW','CAM','CM'].includes(position) ? n(seed + 15, 0, Math.max(2, Math.round(minutes / 420))) : n(seed + 15, 0, 3);
    const rating = decimal(seed + 16, 6.15, 7.85, 2);
    const height = position === 'GK' ? n(seed + 17, 184, 199) : position === 'CB' ? n(seed + 17, 178, 194) : n(seed + 17, 166, 190);
    const foot = FOOT_BY_POS[position] || (rnd(seed + 18) > .78 ? 'left' : 'right');
    const last5 = Array.from({length:5}, (_,j)=>decimal(seed + 40 + j, Math.max(5.8,rating-.75), Math.min(8.4,rating+.65),1));
    const recentMinutes = Array.from({length:5}, (_,j)=>n(seed + 50 + j, starts > appearances * .55 ? 55 : 15, 90));
    const value = marketValue(age, position, minutes, seed + 19);
    const isHot = last5.slice(-3).reduce((a,b)=>a+b,0)/3 > rating + .18;
    return {
      id: `demo-market-${String(i+1).padStart(4,'0')}`,
      provider:'demo_market',
      provider_player_id:`AR-DEMO-${100000+i}`,
      demo:true,
      first_name: pick(FIRST_NAMES, seed * 2 + 1),
      last_name: pick(LAST_NAMES, seed * 3 + 7),
      full_name:'',
      birth_date: isoBirth(age, seed), age,
      nationality:'Argentina',
      position,
      secondary_position: SECONDARY[position],
      preferred_foot: foot,
      height,
      club: club[0], competition: club[1],
      appearances, starts, minutes, goals, assists, rating,
      start_rate: Math.round((starts / Math.max(1, appearances))*100),
      minutes_last5: recentMinutes.reduce((a,b)=>a+b,0),
      recent_ratings:last5,
      recent_minutes:recentMinutes,
      form: isHot ? 'rising' : last5[4] < rating-.25 ? 'down' : 'stable',
      market_value:value,
      contract_end:contractDate(seed+21),
      category: age <= 20 ? 'juveniles' : club[1] === 'Primera Nacional' ? 'segunda_division' : 'primera_division',
      internal_status: i % 29 === 0 ? 'captacion' : i % 41 === 0 ? 'shortlist' : 'untracked',
      synthetic_photo_seed: (i % 70) + 1
    };
  }).map(p => ({...p, full_name:`${p.first_name} ${p.last_name}`}));
}

export const DEMO_CLUBS = CLUBS.map(([name,competition])=>({name,competition}));

export const DEMO_OPPORTUNITIES = [
  { id:'opp-1', club:'Independiente', title:'Lateral izquierdo con recorrido', position:'LB', age_min:19, age_max:24, min_minutes:900, max_value:1200000, priority:'high', stage:'searching', market:'Argentina / Uruguay', next_action:'Presentar shortlist inicial' },
  { id:'opp-2', club:'Talleres', title:'Extremo desequilibrante Sub-23', position:'RW', age_min:18, age_max:22, min_minutes:700, max_value:1800000, priority:'high', stage:'contact', market:'Argentina', next_action:'Enviar perfiles priorizados' },
  { id:'opp-3', club:'Colón', title:'Volante central con minutos', position:'CM', age_min:20, age_max:27, min_minutes:1200, max_value:900000, priority:'medium', stage:'searching', market:'Argentina', next_action:'Validar disponibilidad contractual' },
  { id:'opp-4', club:'Lanús', title:'Central joven para proyección', position:'CB', age_min:18, age_max:22, min_minutes:600, max_value:1400000, priority:'medium', stage:'interest', market:'Argentina / Paraguay', next_action:'Comparar tres candidatos' },
  { id:'opp-5', club:'Quilmes', title:'Delantero centro', position:'ST', age_min:21, age_max:29, min_minutes:800, max_value:650000, priority:'high', stage:'negotiation', market:'Primera Nacional', next_action:'Actualizar condiciones económicas' },
  { id:'opp-6', club:'Defensa y Justicia', title:'Mediapunta joven', position:'CAM', age_min:18, age_max:23, min_minutes:500, max_value:1500000, priority:'medium', stage:'searching', market:'Argentina', next_action:'Scouting de video' }
];

export const POSITION_LABELS_MARKET = { GK:'Arquero',RB:'Lateral derecho',CB:'Central',LB:'Lateral izquierdo',CDM:'Volante central',CM:'Mediocampista',CAM:'Mediapunta',RW:'Extremo derecho',LW:'Extremo izquierdo',ST:'Delantero' };
