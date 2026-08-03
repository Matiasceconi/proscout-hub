export const FIXTURE_STATUS_MAP = {
  'NS': { label: 'Próximo', color: 'bg-blue-100 text-blue-700 border-blue-200', group: 'upcoming' },
  '1H': { label: 'En juego', color: 'bg-green-100 text-green-700 border-green-200', group: 'live' },
  '2H': { label: 'En juego', color: 'bg-green-100 text-green-700 border-green-200', group: 'live' },
  'HT': { label: 'Entretiempo', color: 'bg-green-100 text-green-700 border-green-200', group: 'live' },
  'ET': { label: 'En juego', color: 'bg-green-100 text-green-700 border-green-200', group: 'live' },
  'P': { label: 'Penales', color: 'bg-green-100 text-green-700 border-green-200', group: 'live' },
  'FT': { label: 'Finalizado', color: 'bg-slate-100 text-slate-600 border-slate-200', group: 'finished' },
  'AET': { label: 'Finalizado', color: 'bg-slate-100 text-slate-600 border-slate-200', group: 'finished' },
  'PEN': { label: 'Finalizado', color: 'bg-slate-100 text-slate-600 border-slate-200', group: 'finished' },
  'PST': { label: 'Reprogramado', color: 'bg-amber-100 text-amber-700 border-amber-200', group: 'postponed' },
  'CANC': { label: 'Suspendido', color: 'bg-red-100 text-red-700 border-red-200', group: 'suspended' },
  'SUSP': { label: 'Suspendido', color: 'bg-red-100 text-red-700 border-red-200', group: 'suspended' },
  'INT': { label: 'Suspendido', color: 'bg-red-100 text-red-700 border-red-200', group: 'suspended' },
  'TBD': { label: 'A confirmar', color: 'bg-amber-100 text-amber-700 border-amber-200', group: 'tbd' },
  'AWD': { label: 'Finalizado', color: 'bg-slate-100 text-slate-600 border-slate-200', group: 'finished' },
  'WO': { label: 'Finalizado', color: 'bg-slate-100 text-slate-600 border-slate-200', group: 'finished' },
  'LIVE': { label: 'En juego', color: 'bg-green-100 text-green-700 border-green-200', group: 'live' },
  'BT': { label: 'En juego', color: 'bg-green-100 text-green-700 border-green-200', group: 'live' },
};

export const getFixtureStatus = (status) => {
  return FIXTURE_STATUS_MAP[status] || { label: status || '—', color: 'bg-slate-100 text-slate-600 border-slate-200', group: 'unknown' };
};

export const CALLUP_STATUS_MAP = {
  'called_up': { label: 'Convocado', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'starter': { label: 'Titular', color: 'bg-green-100 text-green-700 border-green-200' },
  'substitute': { label: 'Suplente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  'not_called': { label: 'No convocado', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  'unconfirmed': { label: 'Sin confirmar', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export const FOLLOW_UP_STATUS_MAP = {
  'pending': { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  'completed': { label: 'Completado', color: 'bg-green-100 text-green-700 border-green-200' },
  'not_required': { label: 'No requerido', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
};

export const isFuture = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d >= now;
};

export const isWithinDays = (dateStr, days) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return d >= now && d <= future;
};

export const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
};

export const formatDateLong = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const getDateKey = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const isFixtureFinished = (status) => {
  return ['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(status);
};

export const needsConfirmation = (fixture) => {
  return !fixture.stadium || fixture.fixture_status === 'TBD' || fixture.fixture_status === 'PST';
};