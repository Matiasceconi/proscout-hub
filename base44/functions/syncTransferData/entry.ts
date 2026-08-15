import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { API_BASE_URL, getApiKey, sanitizeError, parseRateLimit } from '../../shared/statsUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organization_id } = body || {};
    if (!organization_id) {
      return Response.json({ error: "organization_id is required" }, { status: 400 });
    }

    const asAdmin = base44.asServiceRole;

    // Buscar todas las PlayerExternalIdentity y filtrar en código (patrón del app)
    const allIdentities = await asAdmin.entities.PlayerExternalIdentity.filter({
      organization_id
    });
    const identities = (allIdentities || []).filter(
      i => i.provider === "api_football" && i.status === "verified"
    );

    if (identities.length === 0) {
      return Response.json({
        success: true,
        total_processed: 0,
        updated: 0,
        errors: 0,
        message: "Sin jugadores vinculados verificados",
        results: []
      });
    }

    const results = [];
    let updated = 0;
    let errors = 0;
    let lastRateLimitRemaining: number | null = null;

    for (const identity of identities) {
      // Rate limit protection
      if (lastRateLimitRemaining !== null && lastRateLimitRemaining <= 5) {
        await new Promise(r => setTimeout(r, 3000));
      }

      try {
        const playerId = identity.player_id;
        const apiPlayerId = identity.provider_player_id;

        if (!apiPlayerId) {
          results.push({ player_id: playerId, status: "no_provider_id" });
          continue;
        }

        const transferResponse = await fetch(`${API_BASE_URL}/transfers?player=${apiPlayerId}`, {
          headers: { "x-apisports-key": getApiKey() }
        });
        const rateLimit = parseRateLimit(transferResponse.headers);
        lastRateLimitRemaining = rateLimit.remaining;

        if (transferResponse.status === 429) {
          await new Promise(r => setTimeout(r, 5000));
          errors++;
          results.push({ player_id: playerId, status: "rate_limited" });
          continue;
        }

        if (!transferResponse.ok) {
          errors++;
          results.push({ player_id: playerId, status: "api_error", code: transferResponse.status });
          continue;
        }

        const transferData = await transferResponse.json();

        if (!transferData.response || transferData.response.length === 0) {
          results.push({ player_id: playerId, status: "no_transfer_data" });
          continue;
        }

        const allTransfers = [];
        for (const entry of transferData.response) {
          if (entry.transfers) {
            allTransfers.push(...entry.transfers);
          }
        }
        allTransfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (allTransfers.length === 0) {
          results.push({ player_id: playerId, status: "no_transfers" });
          continue;
        }

        const latestTransfer = allTransfers[0];
        const transferType = (latestTransfer.type || "").toLowerCase();
        const isLoan = transferType.includes("loan");
        const isReturnFromLoan = transferType.includes("return");

        let updateData: any = {
          last_transfer_sync_at: new Date().toISOString()
        };

        if (isLoan) {
          updateData.is_on_loan = true;
          updateData.loan_from_club = latestTransfer.teams?.out?.name || null;
          updateData.loan_from_club_id = latestTransfer.teams?.out?.id ? String(latestTransfer.teams.out.id) : null;
          updateData.loan_start_date = latestTransfer.date || null;
          updateData.contract_type = "prestamo";
          updateData.loan_type = "loan";
          updateData.loan_end_date = null;
          // Buscar fecha de fin del préstamo en la segunda transferencia si fue un return
          if (allTransfers.length > 1) {
            const second = allTransfers[1];
            if ((second.type || "").toLowerCase().includes("return")) {
              updateData.loan_end_date = second.date || null;
            }
          }
        } else if (isReturnFromLoan) {
          updateData.is_on_loan = false;
          updateData.loan_from_club = null;
          updateData.loan_from_club_id = null;
          updateData.loan_start_date = null;
          updateData.loan_end_date = null;
          updateData.loan_type = "free_transfer";
          updateData.contract_type = "propiedad";
          updateData.club = latestTransfer.teams?.in?.name || null;
        } else {
          updateData.is_on_loan = false;
          updateData.loan_from_club = null;
          updateData.loan_from_club_id = null;
          updateData.loan_start_date = null;
          updateData.loan_end_date = null;
          updateData.loan_type = latestTransfer.type === "Free" ? "free_transfer" : "permanent";
          updateData.contract_type = latestTransfer.type === "Free" ? "libre" : "propiedad";
          updateData.club = latestTransfer.teams?.in?.name || null;
        }

        await asAdmin.entities.Player.update(playerId, updateData);
        results.push({
          player_id: playerId,
          status: "updated",
          is_on_loan: updateData.is_on_loan,
          current_club: updateData.club,
          loan_from: updateData.loan_from_club
        });
        updated++;
      } catch (err: any) {
        errors++;
        results.push({
          player_id: identity.player_id,
          status: "error",
          error: sanitizeError(err.message || String(err))
        });
      }
    }

    return Response.json({
      success: true,
      total_processed: identities.length,
      updated,
      errors,
      rate_limit_remaining: lastRateLimitRemaining,
      results
    });
  } catch (error: any) {
    return Response.json({
      error: sanitizeError(error.message || String(error)),
      success: false
    }, { status: 500 });
  }
}