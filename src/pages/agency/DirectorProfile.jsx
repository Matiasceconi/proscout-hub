import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, isOrgAdmin, calculateAge, DIRECTOR_ROLE_LABELS, DIRECTOR_STATUS_LABELS, DIRECTOR_STATUS_COLORS, PORTAL_STATUS_LABELS, PORTAL_STATUS_COLORS, formatDate } from '@/lib/roleUtils';
import { Badge } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ChevronLeft, GraduationCap, BarChart3, Users, ClipboardList, Grid3x3, Video, Calendar, FileText, History, Pencil } from 'lucide-react';
import DirectorSummary from '@/components/agency/director-tabs/DirectorSummary';
import DirectorCareerTab from '@/components/agency/director-tabs/DirectorCareerTab';
import DirectorStaffTab from '@/components/agency/director-tabs/DirectorStaffTab';
import DirectorGameModel from '@/components/agency/director-tabs/DirectorGameModel';
import DirectorStatsTab from '@/components/agency/director-tabs/DirectorStatsTab';
import DirectorVideosTab from '@/components/agency/director-tabs/DirectorVideosTab';
import DirectorCalendarTab from '@/components/agency/director-tabs/DirectorCalendarTab';
import DirectorDocumentsTab from '@/components/agency/director-tabs/DirectorDocumentsTab';
import DirectorActivityTab from '@/components/agency/director-tabs/DirectorActivityTab';
import ProfileAvatar from '@/components/shared/ProfileAvatar';

const TABS = [
  { id: 'summary', label: 'Resumen', icon: GraduationCap },
  { id: 'career', label: 'Trayectoria', icon: ClipboardList },
  { id: 'staff', label: 'Cuerpo técnico', icon: Users },
  { id: 'model', label: 'Modelo de juego', icon: Grid3x3 },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'calendar', label: 'Calendario', icon: Calendar },
  { id: 'documents', label: 'Documentación', icon: FileText },
  { id: 'activity', label: 'Actividad', icon: History }
];

export default function DirectorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = getUserOrgId(user);
  const [director, setDirector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (id) loadDirector();
  }, [id]);

  const loadDirector = async () => {
    try {
      const data = await base44.entities.TechnicalDirector.get(id);
      setDirector(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  }

  if (!director) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Director no encontrado.</p>
        <Button onClick={() => navigate('/agency/directors')} className="mt-4">Volver a directores</Button>
      </div>
    );
  }

  const age = calculateAge(director.birth_date);
  const canManage = isOrgAdmin(user);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <button onClick={() => navigate('/agency/directors')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> Volver a directores
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <ProfileAvatar
            photoUrl={director.photo_url}
            photoSourceUrl={director.photo_source_url}
            firstName={director.first_name}
            lastName={director.last_name}
            size="lg"
            shape="rounded-2xl"
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{director.first_name} {director.last_name}</h1>
                <p className="text-sm text-slate-400">
                  {age ? `${age} años` : ''} {director.nationality ? `· ${director.nationality}` : ''} · {DIRECTOR_ROLE_LABELS[director.primary_role] || 'Director Técnico'}
                </p>
                <p className="text-sm text-slate-500 mt-1">{director.current_club || director.last_club || 'Sin club'} {director.competition ? `· ${director.competition}` : ''}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={DIRECTOR_STATUS_COLORS[director.professional_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
                  {DIRECTOR_STATUS_LABELS[director.professional_status] || 'Disponible'}
                </Badge>
                <Badge className={PORTAL_STATUS_COLORS[director.portal_status] || 'bg-slate-100 text-slate-500 border-slate-200'}>
                  {PORTAL_STATUS_LABELS[director.portal_status] || 'Sin invitar'}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">
              {director.coaching_license && <span>Licencia: {director.coaching_license}</span>}
              {director.preferred_tactical_system && <span>Sistema: {director.preferred_tactical_system}</span>}
              {director.representative_name && <span>Representante: {director.representative_name}</span>}
              {director.joined_date && <span>Ingreso: {formatDate(director.joined_date)}</span>}
            </div>
          </div>
          {canManage && (
            <Button variant="outline" onClick={() => setEditing(true)} className="flex-shrink-0">
              <Pencil className="w-4 h-4 mr-1" /> Editar
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-thin">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-slate-900 text-slate-900 font-medium' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 lg:p-5">
          {activeTab === 'summary' && <DirectorSummary director={director} />}
          {activeTab === 'career' && <DirectorCareerTab director={director} canManage={canManage} />}
          {activeTab === 'staff' && <DirectorStaffTab director={director} canManage={canManage} />}
          {activeTab === 'model' && <DirectorGameModel director={director} canManage={canManage} />}
          {activeTab === 'stats' && <DirectorStatsTab director={director} />}
          {activeTab === 'videos' && <DirectorVideosTab director={director} canManage={canManage} />}
          {activeTab === 'calendar' && <DirectorCalendarTab director={director} canManage={canManage} />}
          {activeTab === 'documents' && <DirectorDocumentsTab director={director} canManage={canManage} />}
          {activeTab === 'activity' && <DirectorActivityTab director={director} />}
        </div>
      </div>

      {editing && <EditDirectorDialog director={director} orgId={orgId} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); loadDirector(); }} />}
    </div>
  );
}

function EditDirectorDialog({ director, orgId, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: director.first_name || '', last_name: director.last_name || '',
    birth_date: director.birth_date || '', nationality: director.nationality || '',
    country_of_residence: director.country_of_residence || '', email: director.email || '',
    phone: director.phone || '', coaching_license: director.coaching_license || '',
    primary_role: director.primary_role || 'director_tecnico', current_club: director.current_club || '',
    last_club: director.last_club || '', competition: director.competition || '',
    professional_status: director.professional_status || 'available', representative_name: director.representative_name || '',
    joined_date: director.joined_date || '', biography: director.biography || '',
    game_model: director.game_model || '', preferred_tactical_system: director.preferred_tactical_system || '',
    languages: director.languages || '', main_achievements: director.main_achievements || '',
    presentation_url: director.presentation_url || '', photo_url: director.photo_url || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await base44.entities.TechnicalDirector.update(director.id, { ...form, organization_id: orgId });
      onSaved();
    } catch (err) { setError(err.message || 'Error al guardar'); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar director</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Nombre *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Apellido *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha de nacimiento</Label><Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Nacionalidad</Label><Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>País de residencia</Label><Input value={form.country_of_residence} onChange={e => setForm(f => ({ ...f, country_of_residence: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Licencia</Label><Input value={form.coaching_license} onChange={e => setForm(f => ({ ...f, coaching_license: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rol principal</Label>
              <Select value={form.primary_role} onValueChange={v => setForm(f => ({ ...f, primary_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(DIRECTOR_ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado profesional</Label>
              <Select value={form.professional_status} onValueChange={v => setForm(f => ({ ...f, professional_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(DIRECTOR_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Club actual</Label><Input value={form.current_club} onChange={e => setForm(f => ({ ...f, current_club: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Último club</Label><Input value={form.last_club} onChange={e => setForm(f => ({ ...f, last_club: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Competencia</Label><Input value={form.competition} onChange={e => setForm(f => ({ ...f, competition: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Fecha de incorporación</Label><Input type="date" value={form.joined_date} onChange={e => setForm(f => ({ ...f, joined_date: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Representante</Label><Input value={form.representative_name} onChange={e => setForm(f => ({ ...f, representative_name: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Modelo de juego</Label><Textarea value={form.game_model} onChange={e => setForm(f => ({ ...f, game_model: e.target.value }))} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Sistema táctico</Label><Input value={form.preferred_tactical_system} onChange={e => setForm(f => ({ ...f, preferred_tactical_system: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Idiomas</Label><Input value={form.languages} onChange={e => setForm(f => ({ ...f, languages: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Logros principales</Label><Textarea value={form.main_achievements} onChange={e => setForm(f => ({ ...f, main_achievements: e.target.value }))} rows={2} /></div>
          <div className="space-y-1.5"><Label>Biografía</Label><Textarea value={form.biography} onChange={e => setForm(f => ({ ...f, biography: e.target.value }))} rows={3} /></div>
          <div className="space-y-1.5"><Label>URL de presentación</Label><Input value={form.presentation_url} onChange={e => setForm(f => ({ ...f, presentation_url: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>URL de foto</Label><Input value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}