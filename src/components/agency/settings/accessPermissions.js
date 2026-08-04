export const ROLES = [
  { value: 'organization_admin', label: 'Administrador' },
  { value: 'representative', label: 'Representante' },
  { value: 'video_analyst', label: 'Analista de video' },
  { value: 'performance_staff', label: 'Staff de rendimiento' },
  { value: 'medical_staff', label: 'Staff médico' },
];

export const PERMISSIONS = [
  { value: 'players', label: 'Jugadores', description: 'Ver y gestionar fichas de jugadores' },
  { value: 'calendar', label: 'Calendario', description: 'Consultar y crear eventos' },
  { value: 'matches', label: 'Partidos', description: 'Gestionar partidos y seguimientos' },
  { value: 'statistics', label: 'Estadísticas', description: 'Consultar estadísticas deportivas' },
  { value: 'physical', label: 'Rendimiento físico', description: 'Consultar evaluaciones físicas' },
  { value: 'medical', label: 'Área médica', description: 'Consultar información médica' },
  { value: 'analysis', label: 'Análisis de rivales', description: 'Gestionar análisis deportivos' },
  { value: 'videos', label: 'Videos', description: 'Consultar y gestionar videos' },
  { value: 'benefits', label: 'Beneficios', description: 'Gestionar beneficios' },
  { value: 'documents', label: 'Documentación', description: 'Consultar y gestionar documentos' },
];

const ALL_PERMISSIONS = PERMISSIONS.map(permission => permission.value);

export const getDefaultPermissions = (role) => {
  if (role === 'organization_admin') return ALL_PERMISSIONS;
  if (role === 'representative') return ['players', 'calendar', 'matches', 'statistics', 'analysis', 'videos', 'documents'];
  if (role === 'video_analyst') return ['players', 'matches', 'statistics', 'analysis', 'videos'];
  if (role === 'performance_staff') return ['players', 'calendar', 'matches', 'physical'];
  if (role === 'medical_staff') return ['players', 'calendar', 'matches', 'medical'];
  return [];
};

export const getRoleLabel = (role) => ROLES.find(item => item.value === role)?.label || role;