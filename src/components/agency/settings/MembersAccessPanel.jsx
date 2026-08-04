import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/shared/UIBits';
import { Plus, ShieldCheck, Settings2, UserX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PermissionDialog from './PermissionDialog';
import InviteRepresentativeDialog from './InviteRepresentativeDialog';
import { getRoleLabel } from './accessPermissions';

export default function MembersAccessPanel({ organizationId, canManage }) {
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const loadMembers = async () => {
    try {
      const data = await base44.entities.OrganizationMember.filter({ organization_id: organizationId }, '-created_date', 100);
      setMembers(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (organizationId) loadMembers();
  }, [organizationId]);

  const manage = async (payload) => {
    const response = await base44.functions.invoke('manageOrganizationMembers', payload);
    return response.data;
  };

  const handleInvite = async ({ email, appRole, permissions }) => {
    try {
      await manage({ action: 'invite', organizationId, email, appRole, permissions });
      try {
        await base44.users.inviteUser(email, 'user');
      } catch (error) {
        // A registered app user does not need a second invitation.
      }
      toast({ title: 'Invitación enviada', description: `${email} ya puede activar su acceso.` });
      setInviteOpen(false);
      loadMembers();
    } catch (error) {
      toast({ title: 'No se pudo enviar la invitación', description: error.response?.data?.error || error.message, variant: 'destructive' });
    }
  };

  const handlePermissions = async (data) => {
    try {
      await manage({ action: 'update', organizationId, membershipId: selectedMember.id, ...data });
      toast({ title: 'Permisos actualizados' });
      setSelectedMember(null);
      loadMembers();
    } catch (error) {
      toast({ title: 'No se pudieron actualizar los permisos', description: error.response?.data?.error || error.message, variant: 'destructive' });
    }
  };

  const handleDisable = async (member) => {
    try {
      await manage({ action: 'update', organizationId, membershipId: member.id, status: member.status === 'disabled' ? 'active' : 'disabled' });
      toast({ title: member.status === 'disabled' ? 'Acceso reactivado' : 'Acceso suspendido' });
      loadMembers();
    } catch (error) {
      toast({ title: 'No se pudo cambiar el acceso', description: error.response?.data?.error || error.message, variant: 'destructive' });
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Accesos y permisos</h3>
          <p className="text-xs text-slate-400 mt-1">Invitá representantes y definí qué módulos puede usar cada integrante.</p>
        </div>
        {canManage && <Button size="sm" onClick={() => setInviteOpen(true)}><Plus className="w-4 h-4 mr-1" /> Invitar</Button>}
      </div>

      {loading ? <div className="py-6 text-center text-sm text-slate-400">Cargando integrantes...</div> : (
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-500">
                {(member.full_name || member.user_email || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{member.full_name || member.user_email}</p>
                <p className="text-xs text-slate-400 truncate">{member.user_email}</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end">
                <Badge className="bg-slate-100 text-slate-600 border-slate-200">{getRoleLabel(member.app_role)}</Badge>
                <Badge className={member.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : member.status === 'disabled' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
                  {member.status === 'active' ? 'Activo' : member.status === 'disabled' ? 'Suspendido' : 'Pendiente'}
                </Badge>
              </div>
              {canManage && !member.is_owner && (
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setSelectedMember(member)} title="Editar permisos"><Settings2 className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDisable(member)} title={member.status === 'disabled' ? 'Reactivar acceso' : 'Suspender acceso'}><UserX className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <InviteRepresentativeDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onInvite={handleInvite} />
      <PermissionDialog open={!!selectedMember} onClose={() => setSelectedMember(null)} member={selectedMember} onSave={handlePermissions} />
    </section>
  );
}