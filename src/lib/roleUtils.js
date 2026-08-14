import { base44 } from '@/api/base44Client';

export const getUserRole = (user) => {
  if (!user) return null;
  return user.app_role || user.data?.app_role || null;
};

export const getUserOrgId = (user) => {
  if (!user) return null;
  return user.organization_id || user.data?.organization_id || localStorage.getItem('active_organization_id') || null;
};

export const getPlayerId = (user) => {
  if (!user) return null;
  return user.player_id || user.data?.player_id || null;
};

export const getPlayerOrgId = (user) => {
  if (!user) return null;
  return user.player_organization_id || user.data?.player_organization_id || null;
};

export const isPlayer = (user) => {
  if (!user) return false;
  const role = getUserRole(user);
  return role === 'player';
};

export const isPlatformAdmin = (user) => {
  const role = getUserRole(user);
  return role === 'platform_superadmin';
};

export const isOrgStaff = (user) => {
  const role = getUserRole(user);
  return ['organization_owner', 'organization_admin', 'representative', 'video_analyst', 'performance_staff', 'medical_staff'].includes(role);
};

export const isOrgAdmin = (user) => {
  const role = getUserRole(user);
  return ['organization_owner', 'organization_admin'].includes(role);
};

export const canEditMedical = (user) => {
  const role = getUserRole(user);
  return ['organization_owner', 'organization_admin', 'medical_staff'].includes(role);
};

export const canEditPhysical = (user) => {
  const role = getUserRole(user);
  return ['organization_owner', 'organization_admin', 'performance_staff'].includes(role);
};

export const canEditVideos = (user) => {
  const role = getUserRole(user);
  return ['organization_owner', 'organization_admin', 'video_analyst'].includes(role);
};

export const canEditStats = (user) => {
  const role = getUserRole(user);
  return ['organization_owner', 'organization_admin', 'video_analyst', 'representative'].includes(role);
};

export const getHomeRoute = (user) => {
  const role = getUserRole(user);
  if (!role) return '/company-access';
  if (role === 'platform_superadmin') return '/superadmin';
  if (role === 'player') return '/portal';
  return '/agency';
};

export const POSITION_LABELS = {
  GK: 'Arquero',
  CB: 'Defensor Central',
  LB: 'Lateral Izq.',
  RB: 'Lateral Der.',
  CDM: 'Mediocampista Def.',
  CM: 'Mediocampista',
  CAM: 'Mediocampista Of.',
  LW: 'Extremo Izq.',
  RW: 'Extremo Der.',
  ST: 'Delantero',
  CF: 'Centrodelantero'
};

export const AVAILABILITY_LABELS = {
  available: 'Disponible',
  available_with_restrictions: 'Disponible c/restricciones',
  rehabilitation: 'Rehabilitación',
  differentiated_training: 'Entrenamiento diferenciado',
  partial_reintegration: 'Reintegración parcial',
  medical_discharge: 'Alta médica',
  sport_discharge: 'Alta deportiva',
  injured: 'Lesionado'
};

export const AVAILABILITY_COLORS = {
  available: 'bg-green-100 text-green-700 border-green-200',
  available_with_restrictions: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  rehabilitation: 'bg-orange-100 text-orange-700 border-orange-200',
  differentiated_training: 'bg-blue-100 text-blue-700 border-blue-200',
  partial_reintegration: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  medical_discharge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sport_discharge: 'bg-green-100 text-green-700 border-green-200',
  injured: 'bg-red-100 text-red-700 border-red-200'
};

export const PLAYER_CATEGORIES = {
  primera_division: 'Primera División',
  segunda_division: 'Segunda División',
  ascenso: 'Ascenso',
  reserva: 'Reserva',
  juveniles: 'Juveniles',
  futbol_femenino: 'Fútbol femenino',
  sin_club: 'Sin club'
};

export const PLAYER_CATEGORY_COLORS = {
  primera_division: 'bg-slate-800 text-white border-slate-900',
  segunda_division: 'bg-slate-600 text-white border-slate-700',
  ascenso: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  reserva: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  juveniles: 'bg-green-100 text-green-700 border-green-200',
  futbol_femenino: 'bg-pink-100 text-pink-700 border-pink-200',
  sin_club: 'bg-slate-100 text-slate-500 border-slate-200'
};

export const SPORTING_STATUS_LABELS = {
  available: 'Disponible',
  injured: 'Lesionado',
  rehabilitation: 'En recuperación',
  on_loan: 'Cedido',
  transferred: 'Transferido',
  no_club: 'Sin club',
  inactive: 'Inactivo',
  available_with_restrictions: 'Disponible c/restricciones',
  differentiated_training: 'Entrenamiento diferenciado',
  partial_reintegration: 'Reintegración parcial',
  medical_discharge: 'Alta médica',
  sport_discharge: 'Alta deportiva'
};

export const SPORTING_STATUS_COLORS = {
  available: 'bg-green-100 text-green-700 border-green-200',
  injured: 'bg-red-100 text-red-700 border-red-200',
  rehabilitation: 'bg-orange-100 text-orange-700 border-orange-200',
  on_loan: 'bg-blue-100 text-blue-700 border-blue-200',
  transferred: 'bg-purple-100 text-purple-700 border-purple-200',
  no_club: 'bg-slate-100 text-slate-500 border-slate-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  available_with_restrictions: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  differentiated_training: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  partial_reintegration: 'bg-teal-100 text-teal-700 border-teal-200',
  medical_discharge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sport_discharge: 'bg-green-100 text-green-700 border-green-200'
};

export const PORTAL_STATUS_LABELS = {
  not_invited: 'Sin invitar',
  pending: 'Invitación pendiente',
  active: 'Acceso activo',
  suspended: 'Acceso suspendido'
};

export const PORTAL_STATUS_COLORS = {
  not_invited: 'bg-slate-100 text-slate-500 border-slate-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  active: 'bg-green-100 text-green-700 border-green-200',
  suspended: 'bg-red-100 text-red-700 border-red-200'
};

export const DIRECTOR_ROLE_LABELS = {
  director_tecnico: 'Director Técnico',
  ayudante_campo: 'Ayudante de campo',
  preparador_fisico: 'Preparador físico',
  entrenador_arqueros: 'Entrenador de arqueros',
  analista_video: 'Analista de video',
  coordinador_deportivo: 'Coordinador deportivo'
};

export const DIRECTOR_STATUS_LABELS = {
  with_club: 'Con club',
  available: 'Disponible',
  in_negotiation: 'En negociación',
  active_project: 'Proyecto activo',
  inactive: 'Inactivo'
};

export const DIRECTOR_STATUS_COLORS = {
  with_club: 'bg-green-100 text-green-700 border-green-200',
  available: 'bg-blue-100 text-blue-700 border-blue-200',
  in_negotiation: 'bg-amber-100 text-amber-700 border-amber-200',
  active_project: 'bg-purple-100 text-purple-700 border-purple-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200'
};

export const STAFF_ROLE_LABELS = {
  ayudante_campo: 'Ayudante de campo',
  preparador_fisico: 'Preparador físico',
  entrenador_arqueros: 'Entrenador de arqueros',
  analista_video: 'Analista de video',
  medico: 'Médico',
  kinesiologo: 'Kinesiólogo',
  nutricionista: 'Nutricionista',
  psicologo_deportivo: 'Psicólogo deportivo',
  coordinador: 'Coordinador',
  otro: 'Otro'
};

export const STAFF_STATUS_LABELS = {
  active: 'Activo',
  inactive: 'Inactivo',
  historical: 'Histórico'
};

export const STAFF_STATUS_COLORS = {
  active: 'bg-green-100 text-green-700 border-green-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
  historical: 'bg-amber-100 text-amber-700 border-amber-200'
};

export const CAREER_OPERATION_LABELS = {
  formacion: 'Formación',
  libre: 'Libre',
  prestamo: 'Préstamo',
  transferencia: 'Transferencia'
};

export const CAREER_OPERATION_COLORS = {
  formacion: 'bg-blue-100 text-blue-700 border-blue-200',
  libre: 'bg-green-100 text-green-700 border-green-200',
  prestamo: 'bg-amber-100 text-amber-700 border-amber-200',
  transferencia: 'bg-purple-100 text-purple-700 border-purple-200'
};

export const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
};