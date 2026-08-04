import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PERMISSIONS, ROLES, getDefaultPermissions } from './accessPermissions';

export default function PermissionDialog({ open, onClose, member, onSave }) {
  const [role, setRole] = useState('representative');
  const [permissions, setPermissions] = useState([]);
  const [fullSquadAccess, setFullSquadAccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRole(member?.app_role || 'representative');
    setPermissions(member?.permissions || getDefaultPermissions(member?.app_role || 'representative'));
    setFullSquadAccess(member?.has_full_squad_access || false);
  }, [open, member]);

  const togglePermission = (permission) => {
    setPermissions(current => current.includes(permission)
      ? current.filter(item => item !== permission)
      : [...current, permission]);
  };

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    setPermissions(getDefaultPermissions(nextRole));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ appRole: role, permissions, hasFullSquadAccess: fullSquadAccess });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permisos de {member?.full_name || member?.user_email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div>
            <Label className="text-xs">Rol</Label>
            <select value={role} onChange={event => handleRoleChange(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              {ROLES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-700 mb-2">Acceso a módulos</p>
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              {PERMISSIONS.map(permission => (
                <label key={permission.value} className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={permissions.includes(permission.value)} onCheckedChange={() => togglePermission(permission.value)} className="mt-0.5" />
                  <span>
                    <span className="text-sm font-medium text-slate-700 block">{permission.label}</span>
                    <span className="text-xs text-slate-400">{permission.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={fullSquadAccess} onCheckedChange={setFullSquadAccess} />
            <span>
              <span className="text-sm font-medium text-slate-700 block">Acceso a todo el plantel</span>
              <span className="text-xs text-slate-400">Puede consultar a todos los representados de la agencia.</span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar permisos'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}