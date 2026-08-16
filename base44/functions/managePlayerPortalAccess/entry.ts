import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ADMIN_ROLES = ['organization_owner', 'organization_admin'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = user.app_role || user.data?.app_role;
    if (!ADMIN_ROLES.includes(userRole)) {
      return Response.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const orgId = user.organization_id || user.data?.organization_id;
    if (!orgId) {
      return Response.json({ error: 'Sin organización activa' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, player_id, email } = body;

    if (!player_id) return Response.json({ error: 'player_id requerido' }, { status: 400 });

    const player = await base44.asServiceRole.entities.Player.get(player_id);
    if (!player) return Response.json({ error: 'Jugador no encontrado' }, { status: 404 });
    if (player.organization_id !== orgId) {
      return Response.json({ error: 'El jugador no pertenece a tu organización' }, { status: 403 });
    }

    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    const inviteUrl = origin
      ? `${origin}/login?returnTo=${encodeURIComponent('/company/create')}`
      : `/login?returnTo=${encodeURIComponent('/company/create')}`;

    // ---- INVITE / RESEND ----
    if (action === 'invite' || action === 'resend') {
      const targetEmail = (email || player.linked_user_email || '').toLowerCase().trim();
      if (!targetEmail) {
        return Response.json({ error: 'Email requerido para invitar' }, { status: 400 });
      }

      // Check email not linked to another player (across all orgs)
      const playersWithEmail = await base44.asServiceRole.entities.Player.filter({ linked_user_email: targetEmail });
      const conflict = playersWithEmail.find(p => p.id !== player_id);
      if (conflict) {
        return Response.json({
          error: `El email ya está vinculado a otro jugador (${conflict.first_name} ${conflict.last_name})`
        }, { status: 409 });
      }

      // Check no other PlayerUserLink with this email for a different player
      const linksWithEmail = await base44.asServiceRole.entities.PlayerUserLink.filter({ user_email: targetEmail });
      const linkConflict = linksWithEmail.find(l => l.player_id !== player_id);
      if (linkConflict) {
        return Response.json({
          error: 'El email ya tiene un vínculo pendiente con otro jugador'
        }, { status: 409 });
      }

      // Find or create PlayerUserLink for this player
      const existingLinks = await base44.asServiceRole.entities.PlayerUserLink.filter({ player_id });
      let link;
      if (existingLinks.length > 0) {
        link = existingLinks[0];
        await base44.asServiceRole.entities.PlayerUserLink.update(link.id, {
          user_email: targetEmail,
          status: 'pending',
          user_id: link.user_id || null
        });
      } else {
        link = await base44.asServiceRole.entities.PlayerUserLink.create({
          organization_id: orgId,
          player_id,
          user_email: targetEmail,
          status: 'pending'
        });
      }

      // Update Player
      await base44.asServiceRole.entities.Player.update(player_id, {
        linked_user_email: targetEmail,
        portal_status: 'pending'
      });

      // Send platform invitation (works for non-registered emails)
      let email_sent = false;
      let send_error = '';
      try {
        await base44.users.inviteUser(targetEmail, 'user');
        email_sent = true;
      } catch (inviteErr) {
        send_error = `invite: ${inviteErr.message}`;
        // Fallback: SendEmail (only reaches registered users)
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: targetEmail,
            subject: 'Invitación al Portal del Jugador - Score Fútbol',
            body: `Hola ${player.first_name},\n\n${user.full_name || 'Tu representante'} te ha invitado a acceder a tu Portal de Jugador en Score Fútbol.\n\nPara activar tu acceso:\n1. Ingresá a: ${inviteUrl}\n2. Iniciá sesión con el email ${targetEmail}\n3. Activá tu portal desde la pantalla de configuración\n\nEste email quedará vinculado exclusivamente a tu perfil de jugador.`
          });
          email_sent = true;
        } catch (emailErr) {
          send_error += ` | email: ${emailErr.message}`;
        }
      }

      return Response.json({
        success: true,
        portal_status: 'pending',
        linked_user_email: targetEmail,
        invite_url: inviteUrl,
        email_sent,
        send_error
      });
    }

    // ---- SUSPEND ----
    if (action === 'suspend') {
      await base44.asServiceRole.entities.Player.update(player_id, {
        portal_status: 'suspended'
      });
      const links = await base44.asServiceRole.entities.PlayerUserLink.filter({ player_id });
      if (links.length > 0) {
        await base44.asServiceRole.entities.PlayerUserLink.update(links[0].id, { status: 'disabled' });
      }
      return Response.json({ success: true, portal_status: 'suspended' });
    }

    // ---- REACTIVATE ----
    if (action === 'reactivate') {
      if (!player.linked_user_id) {
        return Response.json({ error: 'No se puede reactivar: el jugador no tiene usuario vinculado' }, { status: 400 });
      }
      await base44.asServiceRole.entities.Player.update(player_id, {
        portal_status: 'active'
      });
      const links = await base44.asServiceRole.entities.PlayerUserLink.filter({ player_id });
      if (links.length > 0) {
        await base44.asServiceRole.entities.PlayerUserLink.update(links[0].id, { status: 'active' });
      }
      return Response.json({ success: true, portal_status: 'active' });
    }

    // ---- CHANGE ACCESS EMAIL ----
    if (action === 'change_access_email') {
      const targetEmail = (email || '').toLowerCase().trim();
      if (!targetEmail) {
        return Response.json({ error: 'Email requerido' }, { status: 400 });
      }

      const playersWithEmail = await base44.asServiceRole.entities.Player.filter({ linked_user_email: targetEmail });
      const conflict = playersWithEmail.find(p => p.id !== player_id);
      if (conflict) {
        return Response.json({ error: 'El email ya está vinculado a otro jugador' }, { status: 409 });
      }

      await base44.asServiceRole.entities.Player.update(player_id, {
        linked_user_email: targetEmail
      });

      const existingLinks = await base44.asServiceRole.entities.PlayerUserLink.filter({ player_id });
      if (existingLinks.length > 0) {
        await base44.asServiceRole.entities.PlayerUserLink.update(existingLinks[0].id, {
          user_email: targetEmail
        });
      } else {
        await base44.asServiceRole.entities.PlayerUserLink.create({
          organization_id: orgId,
          player_id,
          user_email: targetEmail,
          status: 'pending'
        });
        await base44.asServiceRole.entities.Player.update(player_id, { portal_status: 'pending' });
      }

      return Response.json({ success: true, linked_user_email: targetEmail, portal_status: 'pending' });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}