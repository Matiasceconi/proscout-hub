import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ADMIN_ROLES = ['organization_owner', 'organization_admin'];

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

function buildInviteUrl(origin: string, token: string): string {
  const base = origin || '';
  return `${base}/portal/activate?token=${token}`;
}

export default async function(req: Request) {
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

      // Generate secure one-time token (store hash only)
      const rawToken = generateToken();
      const tokenHash = await sha256(rawToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const inviteUrl = buildInviteUrl(origin, rawToken);

      // Find or create PlayerUserLink
      const existingLinks = await base44.asServiceRole.entities.PlayerUserLink.filter({ player_id });
      if (existingLinks.length > 0) {
        await base44.asServiceRole.entities.PlayerUserLink.update(existingLinks[0].id, {
          user_email: targetEmail,
          status: 'pending',
          user_id: null,
          invite_token_hash: tokenHash,
          invite_token_expires_at: expiresAt,
          invited_at: new Date().toISOString(),
          accepted_at: null
        });
      } else {
        await base44.asServiceRole.entities.PlayerUserLink.create({
          organization_id: orgId,
          player_id,
          user_email: targetEmail,
          status: 'pending',
          invite_token_hash: tokenHash,
          invite_token_expires_at: expiresAt,
          invited_at: new Date().toISOString()
        });
      }

      // Update Player
      await base44.asServiceRole.entities.Player.update(player_id, {
        linked_user_email: targetEmail,
        portal_status: 'pending'
      });

      // Send custom invitation email (reaches registered users; for non-registered
      // the admin shares the activation link manually via WhatsApp/etc.)
      let email_sent = false;
      let send_error = '';
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: targetEmail,
          subject: 'Tu acceso a Score Fútbol está listo',
          body: `Hola ${player.first_name},\n\nTu agencia te invitó a acceder a tu Portal del Jugador en Score Fútbol.\n\nDesde tu espacio vas a poder consultar tus partidos, estadísticas, rendimiento y contenido compartido por tu agencia.\n\nPara activar tu acceso, ingresá al siguiente enlace:\n${inviteUrl}\n\nSi ya tenés una cuenta de Score Fútbol, el mismo enlace te permitirá iniciar sesión y vincular tu perfil.\n\nEste acceso es personal y está asociado al email: ${targetEmail}`
        });
        email_sent = true;
      } catch (emailErr) {
        send_error = emailErr.message;
        // Fallback: platform invite delivers to non-registered emails
        try {
          await base44.users.inviteUser(targetEmail, 'user');
          email_sent = true;
        } catch (inviteErr) {
          send_error += ` | invite: ${inviteErr.message}`;
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

      // Generate new token for the new email
      const rawToken = generateToken();
      const tokenHash = await sha256(rawToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const inviteUrl = buildInviteUrl(origin, rawToken);

      await base44.asServiceRole.entities.Player.update(player_id, {
        linked_user_email: targetEmail,
        portal_status: 'pending',
        linked_user_id: null
      });

      const existingLinks = await base44.asServiceRole.entities.PlayerUserLink.filter({ player_id });
      if (existingLinks.length > 0) {
        await base44.asServiceRole.entities.PlayerUserLink.update(existingLinks[0].id, {
          user_email: targetEmail,
          user_id: null,
          status: 'pending',
          invite_token_hash: tokenHash,
          invite_token_expires_at: expiresAt,
          invited_at: new Date().toISOString(),
          accepted_at: null
        });
      } else {
        await base44.asServiceRole.entities.PlayerUserLink.create({
          organization_id: orgId,
          player_id,
          user_email: targetEmail,
          status: 'pending',
          invite_token_hash: tokenHash,
          invite_token_expires_at: expiresAt,
          invited_at: new Date().toISOString()
        });
      }

      return Response.json({ success: true, linked_user_email: targetEmail, portal_status: 'pending', invite_url: inviteUrl });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}