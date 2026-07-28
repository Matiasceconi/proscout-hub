import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = body.email || user.email;

    // 1. Find organizations matching Score Fútbol variants
    const allOrgs = await base44.asServiceRole.entities.Organization.list();
    const scoreVariants = ['score futbol', 'score fútbol', 'score futbol demo', 'score fútbol demo'];
    const matches = allOrgs.filter(o => {
      const name = (o.name || '').toLowerCase().trim();
      return scoreVariants.some(v => name === v || name.includes(v));
    });

    if (matches.length === 0) {
      return Response.json({ error: 'No organization found', searched: scoreVariants }, { status: 404 });
    }

    // 2. Find the user by email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => (u.email || '').toLowerCase() === targetEmail.toLowerCase());

    if (!targetUser) {
      return Response.json({ error: 'User not found', email: targetEmail }, { status: 404 });
    }

    const results = [];

    for (const org of matches) {
      // 3. Find existing memberships for this org
      const existingMembers = await base44.asServiceRole.entities.OrganizationMember.filter({ organization_id: org.id });

      // 4. Find membership by email or user_id
      const byEmail = existingMembers.find(m => (m.user_email || '').toLowerCase() === targetEmail.toLowerCase());
      const byUserId = existingMembers.find(m => m.user_id === targetUser.id);

      let membershipId;
      let action = 'none';

      if (byEmail && byUserId && byEmail.id === byUserId.id) {
        membershipId = byEmail.id;
        action = 'updated';
      } else if (byEmail && !byUserId) {
        membershipId = byEmail.id;
        action = 'repaired_user_id';
      } else if (!byEmail && byUserId) {
        membershipId = byUserId.id;
        action = 'repaired_email';
      } else if (byEmail && byUserId && byEmail.id !== byUserId.id) {
        await base44.asServiceRole.entities.OrganizationMember.delete(byUserId.id);
        membershipId = byEmail.id;
        action = 'merged_duplicates';
      } else {
        const newMember = await base44.asServiceRole.entities.OrganizationMember.create({
          organization_id: org.id,
          user_id: targetUser.id,
          user_email: targetUser.email,
          full_name: targetUser.full_name || targetUser.email,
          app_role: 'organization_owner',
          status: 'active',
          is_owner: true,
          membership_key: `${org.id}:${targetUser.id}`
        });
        membershipId = newMember.id;
        action = 'created';
      }

      // Update existing membership
      if (action !== 'created') {
        await base44.asServiceRole.entities.OrganizationMember.update(membershipId, {
          user_id: targetUser.id,
          user_email: targetUser.email,
          full_name: targetUser.full_name || targetUser.email,
          status: 'active',
          is_owner: true,
          membership_key: `${org.id}:${targetUser.id}`,
          app_role: 'organization_owner'
        });
      }

      // 5. Update user's organization_id and active_organization_id
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        organization_id: org.id,
        active_organization_id: org.id
      });

      // Count players and directors
      const players = await base44.asServiceRole.entities.Player.filter({ organization_id: org.id });
      const directors = await base44.asServiceRole.entities.TechnicalDirector.filter({ organization_id: org.id });

      results.push({
        organization_id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        players_count: players.length,
        directors_count: directors.length,
        members_count: existingMembers.length,
        owner_user_id: org.owner_user_id,
        action,
        membership: {
          id: membershipId,
          user_id: targetUser.id,
          user_email: targetUser.email,
          status: 'active',
          is_owner: true,
          membership_key: `${org.id}:${targetUser.id}`
        }
      });
    }

    return Response.json({
      success: true,
      user: { id: targetUser.id, email: targetUser.email, organization_id: results[0]?.organization_id },
      organizations: results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}