import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, UserPlus, Mail, Copy, CheckCircle2, Ban, RefreshCw, AlertCircle, Link2 } from 'lucide-react';
import { PORTAL_STATUS_LABELS, PORTAL_STATUS_COLORS } from '@/lib/roleUtils';
import InvitePlayerDialog from './InvitePlayerDialog';

const STATUS_DOT = {
  not_invited: 'bg-slate-400',
  pending: 'bg-amber-500',
  active: 'bg-green-500',
  suspended: 'bg-red-500'
};

export default function PlayerPortalAccessSection({ player, onUpdated }) {
  const [showInvite, setShowInvite] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const status = player.portal_status || 'not_invited';

  const handleAction = async (action) => {
    setLoading(action);
    setError('');
    try {
      await base44.functions.invoke('managePlayerPortalAccess', { action, player_id: player.id });
      if (onUpdated) await onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error');
    }
    setLoading(null);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-500" />
            Acceso al portal
          </h3>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${PORTAL_STATUS_COLORS[status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
            {PORTAL_STATUS_LABELS[status] || 'Sin invitar'}
          </span>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Usuario</span>
            <span className="text-slate-700 font-medium">{player.linked_user_email || '—'}</span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Actions by state */}
        <div className="flex flex-wrap gap-2 pt-1">
          {status === 'not_invited' && (
            <Button size="sm" onClick={() => setShowInvite(true)} className="bg-slate-900 hover:bg-slate-800 h-8 text-xs">
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Invitar al portal
            </Button>
          )}

          {status === 'pending' && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowInvite(true)} className="h-8 text-xs">
                <Mail className="w-3.5 h-3.5 mr-1" /> Reenviar invitación
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAction('suspend')} disabled={loading === 'suspend'} className="h-8 text-xs">
                {loading === 'suspend' ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Ban className="w-3.5 h-3.5 mr-1" />} Suspender
              </Button>
            </>
          )}

          {status === 'active' && (
            <>
              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium px-2">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Acceso activo
              </span>
              <Button size="sm" variant="outline" onClick={() => handleAction('suspend')} disabled={loading === 'suspend'} className="h-8 text-xs">
                {loading === 'suspend' ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Ban className="w-3.5 h-3.5 mr-1" />} Suspender acceso
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowChangeEmail(true)} className="h-8 text-xs">
                <Mail className="w-3.5 h-3.5 mr-1" /> Cambiar usuario de acceso
              </Button>
            </>
          )}

          {status === 'suspended' && (
            <>
              <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium px-2">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Acceso suspendido
              </span>
              <Button size="sm" variant="outline" onClick={() => handleAction('reactivate')} disabled={loading === 'reactivate'} className="h-8 text-xs">
                {loading === 'reactivate' ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />} Reactivar acceso
              </Button>
            </>
          )}
        </div>
      </div>

      {showInvite && (
        <InvitePlayerDialog
          player={player}
          onClose={() => setShowInvite(false)}
          onDone={() => { if (onUpdated) onUpdated(); }}
        />
      )}

      {showChangeEmail && (
        <ChangeAccessEmailDialog
          player={player}
          onClose={() => setShowChangeEmail(false)}
          onDone={() => { setShowChangeEmail(false); if (onUpdated) onUpdated(); }}
        />
      )}
    </>
  );
}

function ChangeAccessEmailDialog({ player, onClose, onDone }) {
  const [email, setEmail] = useState(player.linked_user_email || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await base44.functions.invoke('managePlayerPortalAccess', {
        action: 'change_access_email',
        player_id: player.id,
        email: email.toLowerCase().trim()
      });
      if (onDone) onDone();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error');
    }
    setSubmitting(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar usuario de acceso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              El acceso actual será reemplazado. El nuevo email deberá activar su portal nuevamente.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-email">Nuevo email de acceso</Label>
            <Input id="new-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={submitting} className="bg-slate-900 hover:bg-slate-800">
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Cambiar email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}