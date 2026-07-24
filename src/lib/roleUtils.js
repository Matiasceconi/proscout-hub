import { base44 } from '@/api/base44Client';

export const getUserRole = (user) => {
  if (!user) return null;
  return user.app_role || user.data?.app_role || null;
};

export const getUserOrgId = (user) => {
  if (!user) return null;
  return user.organization_id || user.data?.organization_id || null;
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
  if (!role) return '/onboarding';
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