import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, token } = body;

    // ---- VALIDATE (public, no auth required) ----
    if (action === 'validate') {
      if (!token) return Response.json({ status: 'invalid' });

      const tokenHash = await sha256(token);
      const links = await base44.asServiceRole.entities.PlayerUserLink.filter({ invite_token_hash: tokenHash });

      if (links.length === 0) {
        return Response.json({ status: 'invalid' });
      }

      const link = links[0];

      if (link.invite_token_expires_at && new Date(link.invite_token_expires_at) < new Date()) {
        return Response.json({ status: 'expired' });
      }

      if (link.status === 'active') {
        return Response.json({ status: 'active' });
      }

      if (link.status === 'disabled') {
        return Response.json({ status: 'suspended' });
      }

      const player = await base44.asServiceRole.entities.Player.get(link.player_id);
      const org = await base44.asServiceRole.entities.Organization.get(link.organization_id);

      return Response.json({
        status: 'pending',
        player_first_name: player?.first_name || '',
        player_last_name: player?.last_name || '',
        organization_name: org?.name || '',
        email: link.user_email
      });
    }

    // ---- ACTIVATE (requires authenticated user) ----
    if (action === 'activate') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      if (!token) return Response.json({ error: 'Token requerido' }, { status: 400 });

      const tokenHash = await sha256(token);
      const links = await base44.asServiceRole.entities.PlayerUserLink.filter({ invite_token_hash: tokenHash });

      if (links.length === 0) {
        return Response.json({ error: 'Token inválido' }, { status: 400 });
      }

      const link = links[0];

      if (link.invite_token_expires_at && new Date(link.invite_token_expires_at) < new Date()) {
        return Response.json({ error: 'La invitación venció. Pedile a tu agencia que te envíe una nueva.' }, { status: 400 });
      }

      if (link.status === 'active') {
        return Response.json({ error: 'El portal ya fue activado.' }, { status: 400 });
      }

      if (link.status === 'disabled') {
        return Response.json({ error: 'Tu acceso al portal está suspendido. Contactá a tu agencia.' }, { status: 403 });
      }

      if (link.user_email !== user.email) {
        return Response.json({ error: 'Esta invitación corresponde a otro email.' }, { status: 403 });
      }

      // Update User profile to player role
      await base44.asServiceRole.entities.User.update(user.id, {
        app_role: 'player',
        player_id: link.player_id,
        player_organization_id: link.organization_id,
        organization_id: null,
        active_organization_id: null,
        is_player: true
      });

      // Activate PlayerUserLink
      await base44.asServiceRole.entities.PlayerUserLink.update(link.id, {
        user_id: user.id,
        status: 'active',
        accepted_at: new Date().toISOString()
      });

      // Sync Player record
      await base44.asServiceRole.entities.Player.update(link.player_id, {
        linked_user_id: user.id,
        linked_user_email: user.email,
        portal_status: 'active'
      });

      return Response.json({ success: true });
    }

    // ---- CHECK PENDING (authenticated, no token — from inviteUser email) ----
    if (action === 'check_pending') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ pending: false });

      const links = await base44.asServiceRole.entities.PlayerUserLink.filter({ user_email: user.email, status: 'pending' });
      if (links.length === 0) {
        return Response.json({ pending: false });
      }

      const link = links[0];
      const expired = link.invite_token_expires_at && new Date(link.invite_token_expires_at) < new Date();
      const player = await base44.asServiceRole.entities.Player.get(link.player_id);
      const org = await base44.asServiceRole.entities.Organization.get(link.organization_id);

      return Response.json({
        pending: true,
        expired,
        player_first_name: player?.first_name || '',
        player_last_name: player?.last_name || '',
        organization_name: org?.name || '',
        email: link.user_email
      });
    }

    // ---- ACTIVATE BY EMAIL (authenticated, no token — from inviteUser email) ----
    if (action === 'activate_by_email') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const links = await base44.asServiceRole.entities.PlayerUserLink.filter({ user_email: user.email, status: 'pending' });
      if (links.length === 0) {
        return Response.json({ error: 'No hay invitaciones pendientes para tu email.' }, { status: 404 });
      }

      const link = links[0];

      if (link.invite_token_expires_at && new Date(link.invite_token_expires_at) < new Date()) {
        return Response.json({ error: 'La invitación venció. Pedile a tu agencia que te envíe una nueva.' }, { status: 400 });
      }

      // Update User profile to player role
      await base44.asServiceRole.entities.User.update(user.id, {
        app_role: 'player',
        player_id: link.player_id,
        player_organization_id: link.organization_id,
        organization_id: null,
        active_organization_id: null,
        is_player: true
      });

      await base44.asServiceRole.entities.PlayerUserLink.update(link.id, {
        user_id: user.id,
        status: 'active',
        accepted_at: new Date().toISOString()
      });

      await base44.asServiceRole.entities.Player.update(link.player_id, {
        linked_user_id: user.id,
        linked_user_email: user.email,
        portal_status: 'active'
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}