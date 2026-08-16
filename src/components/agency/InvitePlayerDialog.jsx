import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Mail, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import ProfileAvatar from '@/components/shared/ProfileAvatar';

export default function InvitePlayerDialog({ player, onClose, onDone }) {
  const [email, setEmail] = useState(player.linked_user_email || '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const res = await base44.functions.invoke('managePlayerPortalAccess', {
        action: 'invite',
        player_id: player.id,
        email: email.toLowerCase().trim()
      });
      setResult(res.data);
      if (onDone) onDone(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al enviar la invitación');
    }
    setSubmitting(false);
  };

  const handleCopyLink = () => {
    if (!result?.invite_url) return;
    navigator.clipboard.writeText(result.invite_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dar acceso al Portal del Jugador</DialogTitle>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player preview */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <ProfileAvatar
                photoUrl={player.photo_url}
                photoSourceUrl={player.photo_source_url}
                firstName={player.first_name}
                lastName={player.last_name}
                size="md"
                className="flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">{player.first_name} {player.last_name}</p>
                <p className="text-xs text-slate-400 truncate">{player.club || 'Sin club'}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email de acceso</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jugador@email.com"
                required
              />
              <p className="text-xs text-slate-400">Este email quedará vinculado exclusivamente al perfil de este jugador.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="bg-slate-900 hover:bg-slate-800">
                {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />}
                Enviar invitación
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center py-2">
              <CheckCircle2 className="w-12 h-12 text-green-600 mb-3" />
              <p className="font-medium text-slate-900">Invitación creada correctamente</p>
              <p className="text-sm text-slate-400 mt-1">
                {result.email_sent
                  ? `Se envió un email a ${result.linked_user_email}.`
                  : `No se pudo enviar el email automáticamente (plan gratuito).`}
              </p>
            </div>

            {!result.email_sent && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Compartí el enlace de abajo con el jugador por WhatsApp o email. Al abrirlo, va a poder crear su contraseña y activar su portal.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Enlace de activación del portal</Label>
              <div className="flex items-center gap-2">
                <Input value={result.invite_url} readOnly className="text-xs bg-slate-50" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopyLink} className="flex-shrink-0">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                {result.email_sent
                  ? 'Si el jugador no recibe el email, compartí también este enlace por WhatsApp.'
                  : 'El jugador abre este enlace, crea su contraseña y activa su portal.'}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" onClick={onClose} className="bg-slate-900 hover:bg-slate-800">Listo</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}