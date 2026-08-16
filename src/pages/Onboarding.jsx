import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, ShieldCheck, Loader2 } from 'lucide-react';

export default function Onboarding() {
  const { user, checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'create_org' | 'player_link' | 'checking'
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [playerLink, setPlayerLink] = useState(null);

  useEffect(() => {
    checkExistingLink();
  }, []);

  const checkExistingLink = async () => {
    try {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      // Guard: si el usuario ya tiene membresías activas, redirigir a /company-access
      const members = await base44.entities.OrganizationMember.filter({
        $or: [
          { user_id: user.id },
          { user_email: user.email }
        ],
        status: 'active'
      });

      if (members.length > 0) {
        navigate('/company-access', { replace: true });
        return;
      }

      // Check for pending player links
      const links = await base44.entities.PlayerUserLink.filter({ user_email: user.email, status: 'pending' });
      if (links.length > 0) {
        setPlayerLink(links[0]);
        setMode('player_link');
      } else {
        setMode('create_org');
      }
    } catch (err) {
      setMode('create_org');
    }
    setLoading(false);
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const org = await base44.entities.Organization.create({
        name: orgName.trim(),
        slug,
        status: 'active',
        plan: 'free',
        owner_user_id: user.id,
        primary_color: '#0F172A',
        secondary_color: '#3B82F6',
        onboarding_completed: true
      });

      await base44.auth.updateMe({
        app_role: 'organization_owner',
        organization_id: org.id,
        active_organization_id: org.id,
        is_player: false
      });

      await base44.entities.OrganizationMember.create({
        organization_id: org.id,
        user_id: user.id,
        user_email: user.email,
        full_name: user.full_name || user.email,
        app_role: 'organization_owner',
        status: 'active',
        is_owner: true,
        membership_key: `${org.id}:${user.id}`
      });

      await checkUserAuth();
      navigate('/agency');
    } catch (err) {
      setError(err.message || 'Error al crear la organización');
      setSubmitting(false);
    }
  };

  const handleActivatePlayer = async () => {
    setSubmitting(true);
    setError('');
    try {
      await base44.auth.updateMe({
        app_role: 'player',
        player_id: playerLink.player_id,
        player_organization_id: playerLink.organization_id,
        organization_id: null,
        is_player: true
      });

      await base44.entities.PlayerUserLink.update(playerLink.id, {
        status: 'active',
        user_id: user.id
      });

      // Sincronizar el Player con el usuario vinculado
      await base44.entities.Player.update(playerLink.player_id, {
        linked_user_id: user.id,
        linked_user_email: user.email,
        portal_status: 'active'
      });

      await checkUserAuth();
      navigate('/portal');
    } catch (err) {
      setError(err.message || 'Error al activar la cuenta de jugador');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración inicial de la agencia</h1>
          <p className="text-slate-500 mt-2 text-sm">
            {mode === 'player_link'
              ? 'Activá tu portal de jugador para acceder a tu información.'
              : 'Configurá tu agencia para comenzar a gestionar tus futbolistas.'}
          </p>
        </div>

        {mode === 'player_link' && playerLink && (
          <Card className="border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-blue-600" />
                Portal de Jugador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Tu cuenta está vinculada a un perfil de jugador. Activá tu portal para acceder a tus estadísticas, calendario, videos y más.
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button onClick={handleActivatePlayer} disabled={submitting} className="w-full bg-slate-900 hover:bg-slate-800">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Activar mi portal
              </Button>
            </CardContent>
          </Card>
        )}

        {mode === 'create_org' && (
          <Card className="border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
                Crear empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Nombre de la agencia</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Ej. Representaciones Deportivas SA"
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={submitting} className="w-full bg-slate-900 hover:bg-slate-800">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Crear y comenzar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}