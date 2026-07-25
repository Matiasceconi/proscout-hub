import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, isOrgAdmin, DIRECTOR_ROLE_LABELS, DIRECTOR_STATUS_LABELS, DIRECTOR_STATUS_COLORS, calculateAge } from '@/lib/roleUtils';
import { PageHeader, Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Search, LayoutGrid, Table as TableIcon, Plus, X, Loader2 } from 'lucide-react';
import DirectorCard from '@/components/agency/DirectorCard';
import NewDirectorDialog from '@/components/agency/NewDirectorDialog';

export default function Directors() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const orgId = getUserOrgId(user);
  const canManage = isOrgAdmin(user);

  const [directors, setDirectors] = useState([]);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem('directorsView') || 'cards');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    role: 'all', status: 'all', country: 'all', club: 'all', competition: 'all', representative: 'all'
  });
  const [showNew, setShowNew] = useState(searchParams.get('action') === 'new');
  const [actionLoading, setActionLoading] = useState(false);

  const primaryColor = org?.primary_color || '#0F172A';

  useEffect(() => {
    if (orgId) {
      loadDirectors();
      base44.entities.Organization.get(orgId).then(setOrg).catch(() => {});
    }
  }, [orgId]);

  const loadDirectors = async () => {
    try {
      const data = await base44.entities.TechnicalDirector.filter({ organization_id: orgId }, '-updated_date', 300);
      setDirectors(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const countries = useMemo(() => Array.from(new Set(directors.map(d => d.nationality).filter(Boolean))).sort(), [directors]);
  const clubs = useMemo(() => Array.from(new Set(directors.map(d => d.current_club || d.last_club).filter(Boolean))).sort(), [directors]);
  const competitions = useMemo(() => Array.from(new Set(directors.map(d => d.competition).filter(Boolean))).sort(), [directors]);
  const representatives = useMemo(() => Array.from(new Set(directors.map(d => d.representative_name).filter(Boolean))).sort(), [directors]);

  const filtered = useMemo(() => {
    return directors.filter(d => {
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
        if (!fullName.includes(q)) return false;
      }
      if (filters.role !== 'all' && d.primary_role !== filters.role) return false;
      if (filters.status !== 'all' && d.professional_status !== filters.status) return false;
      if (filters.country !== 'all' && d.nationality !== filters.country) return false;
      if (filters.club !== 'all' && (d.current_club || d.last_club) !== filters.club) return false;
      if (filters.competition !== 'all' && d.competition !== filters.competition) return false;
      if (filters.representative !== 'all' && d.representative_name !== filters.representative) return false;
      return true;
    });
  }, [directors, search, filters]);

  const hasActiveFilters = search || Object.values(filters).some(v => v !== 'all');

  const clearFilters = () => {
    setSearch('');
    setFilters({ role: 'all', status: 'all', country: 'all', club: 'all', competition: 'all', representative: 'all' });
  };

  const toggleView = (v) => { setView(v); localStorage.setItem('directorsView', v); };

  const handleAction = async (action, director) => {
    if (action === 'view') { navigate(`/agency/directors/${director.id}`); return; }
    setActionLoading(true);
    try {
      if (action === 'invite' || action === 'resend') {
        await base44.entities.TechnicalDirector.update(director.id, { portal_status: 'pending' });
      } else if (action === 'suspend') {
        await base44.entities.TechnicalDirector.update(director.id, { portal_status: 'suspended' });
      } else if (action === 'archive') {
        await base44.entities.TechnicalDirector.update(director.id, { professional_status: 'inactive' });
      }
      await loadDirectors();
    } catch (err) { console.error(err); }
    setActionLoading(false);
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Directores Técnicos"
        subtitle={`${filtered.length} de ${directors.length} directores encontrados`}
        actions={canManage && (
          <Button onClick={() => setShowNew(true)} style={{ backgroundColor: primaryColor }} className="hover:opacity-90">
            <Plus className="w-4 h-4 mr-1" /> Agregar Director Técnico
          </Button>
        )}
      />

      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o apellido..." className="pl-9" />
          </div>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="text-xs">
                <X className="w-3.5 h-3.5 mr-1" /> Limpiar filtros
              </Button>
            )}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => toggleView('cards')} className={`p-2.5 ${view === 'cards' ? 'text-white' : 'text-slate-400 hover:bg-slate-100'}`} style={view === 'cards' ? { backgroundColor: primaryColor } : {}}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => toggleView('table')} className={`p-2.5 ${view === 'table' ? 'text-white' : 'text-slate-400 hover:bg-slate-100'}`} style={view === 'table' ? { backgroundColor: primaryColor } : {}}>
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={filters.role} onChange={v => setFilters(f => ({ ...f, role: v }))} placeholder="Rol profesional" options={DIRECTOR_ROLE_LABELS} />
          <FilterSelect value={filters.status} onChange={v => setFilters(f => ({ ...f, status: v }))} placeholder="Estado" options={DIRECTOR_STATUS_LABELS} />
          {countries.length > 0 && <FilterSelect value={filters.country} onChange={v => setFilters(f => ({ ...f, country: v }))} placeholder="País" options={Object.fromEntries(countries.map(c => [c, c]))} />}
          {clubs.length > 0 && <FilterSelect value={filters.club} onChange={v => setFilters(f => ({ ...f, club: v }))} placeholder="Club" options={Object.fromEntries(clubs.map(c => [c, c]))} />}
          {competitions.length > 0 && <FilterSelect value={filters.competition} onChange={v => setFilters(f => ({ ...f, competition: v }))} placeholder="Competencia" options={Object.fromEntries(competitions.map(c => [c, c]))} />}
          {representatives.length > 0 && <FilterSelect value={filters.representative} onChange={v => setFilters(f => ({ ...f, representative: v }))} placeholder="Representante" options={Object.fromEntries(representatives.map(r => [r, r]))} />}
        </div>
      </div>

      {actionLoading && (
        <div className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg px-4 py-2 border border-slate-200 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> Procesando...
        </div>
      )}

      {loading ? (
        <DirectorSkeleton view={view} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={directors.length === 0 ? "Todavía no agregaste Directores Técnicos." : "Sin resultados"}
          description={directors.length === 0 ? "Comienza registrando tu primer Director Técnico representado." : "No se encontraron directores con los filtros aplicados."}
          action={canManage && directors.length === 0 && (
            <Button onClick={() => setShowNew(true)} style={{ backgroundColor: primaryColor }} className="hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" /> Agregar primer Director Técnico
            </Button>
          )}
        />
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filtered.map(director => (
            <DirectorCard key={director.id} director={director} primaryColor={primaryColor} canManage={canManage} onAction={handleAction} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Director</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Club</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden xl:table-cell">Competencia</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(director => (
                <tr key={director.id} onClick={() => navigate(`/agency/directors/${director.id}`)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                        {director.photo_url && <img src={director.photo_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{director.first_name} {director.last_name}</p>
                        <p className="text-xs text-slate-400">{calculateAge(director.birth_date)} años · {director.nationality || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">{DIRECTOR_ROLE_LABELS[director.primary_role] || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{director.current_club || director.last_club || '—'}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-slate-600">{director.competition || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={DIRECTOR_STATUS_COLORS[director.professional_status] || 'bg-slate-100 text-slate-600 border-slate-200'}>
                      {DIRECTOR_STATUS_LABELS[director.professional_status] || 'Disponible'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewDirectorDialog open={showNew} onClose={() => { setShowNew(false); setSearchParams({}); }} orgId={orgId} onCreated={(id) => { setShowNew(false); navigate(`/agency/directors/${id}`); }} />}
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        {Object.entries(options).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function DirectorSkeleton({ view }) {
  if (view === 'table') {
    return <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">{[...Array(6)].map((_, i) => <div key={i} className="h-14 border-b border-slate-100 animate-pulse bg-slate-50" />)}</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
            <div className="h-8 bg-slate-100 rounded animate-pulse mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}