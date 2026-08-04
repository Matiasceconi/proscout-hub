import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { ROLES, getDefaultPermissions } from './accessPermissions';

export default function InviteRepresentativeDialog({ open, onClose, onInvite }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('representative');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    await onInvite({ email, appRole: role, permissions: getDefaultPermissions(role) });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar representante</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="colega@agencia.com" required className="mt-1" />
            <p className="text-xs text-slate-400 mt-1">Recibirá una invitación para crear su acceso a la agencia.</p>
          </div>
          <div>
            <Label>Rol inicial</Label>
            <select value={role} onChange={event => setRole(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              {ROLES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}><Mail className="w-4 h-4 mr-1" />{saving ? 'Enviando...' : 'Enviar invitación'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}