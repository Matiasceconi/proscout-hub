import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrgId, isOrgAdmin } from '@/lib/roleUtils';
import { PageHeader, Badge, EmptyState } from '@/components/shared/UIBits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { getDefaultPermissions } from '@/components/agency/settings/accessPermissions';
import { UserCog, Plus, Mail, Shield } from 'lucide-react';

const ROLES = [
  { value: 'organization_admin', label: 'Administrador' },
  { value: 'representative', label: 'Representante' },
  { value: 'video_analyst', label: 'Analista de video' },
  { value: 'performance_staff', label: 'Preparador físico' },
  { value: 'medical_staff', label: 'Personal médico' }
];

export default function TeamManagement() {
  const { user } = useAuth();
  const orgId = getUserOrgId(user);
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => { loadMembers(); }, [orgId]);

  const loadMembers = async () => {
    try {
      const data = await base44.entities.OrganizationMember.filter({ organization_id: orgId }, '-created_date', 100);
      setMembers(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleInvite = async (email, role) => {
    try {
      await base44.functions.invoke('manageOrganizationMembers', {
        action: 'invite',
        organizationId: orgId,
        email,
        appRole: role,
        permissions: getDefaultPermissions(role)
      });
      try {
        await base44.users.inviteUser(email, 'user');
      } catch (e) { /* The user may already be registered. */ }
      toast({ title: 'Invitación enviada', description: `${email} podrá activar su acceso al ingresar.` });
      setShowInvite(false);
      loadMembers();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Equipo de trabajo"
        subtitle={`${members.length} miembros`}
        actions={isOrgAdmin(user) && <Button onClick={() => setShowInvite(true)} className="bg-slate-900"><Plus className="w-4 h-4 mr-1" /> Invitar</Button>}
      />

      {members.length === 0 ? (
        <EmptyState icon={UserCog} title="Sin miembros" description="Invita a tu equipo para comenzar a trabajar." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-slate-500">{(m.full_name || m.user_email || '?')[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.full_name || m.user_email}</p>
                  <p className="text-xs text-slate-400 truncate">{m.user_email}</p>
                </div>
                <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                  {ROLES.find(r => r.value === m.app_role)?.label || m.app_role}
                </Badge>
                <Badge className={m.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
                  {m.status === 'active' ? 'Activo' : 'Pendiente'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInvite && <InviteDialog onClose={() => setShowInvite(false)} onInvite={handleInvite} />}
    </div>
  );
}

function InviteDialog({ onClose, onInvite }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('representative');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onInvite(email, role);
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Invitar integrante</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="colega@agencia.com" />
            <p className="text-xs text-slate-400 mt-1">La persona recibirá una invitación para unirse a tu agencia.</p>
          </div>
          <div>
            <Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900"><Mail className="w-4 h-4 mr-1" /> {saving ? 'Enviando...' : 'Enviar invitación'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}