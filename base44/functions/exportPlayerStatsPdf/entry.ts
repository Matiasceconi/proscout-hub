import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { sanitizeError } from '../../shared/statsUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { player_id, organization_id, season, league_id } = body || {};
    if (!player_id || !organization_id) return Response.json({ error: "player_id y organization_id son obligatorios" }, { status: 400 });

    const asAdmin = base44.asServiceRole;
    const player = (await asAdmin.entities.Player.filter({ id: player_id, organization_id }))[0];
    if (!player) return Response.json({ error: "Jugador no encontrado" }, { status: 404 });

    const org = (await asAdmin.entities.Organization.filter({ id: organization_id }))[0];
    const [matchStats, seasonStats] = await Promise.all([
      asAdmin.entities.PlayerMatchStatistic.filter({ organization_id, player_id, season: season || "2026" }, "-fixture_date", 100),
      asAdmin.entities.PlayerSeasonStatistic.filter({ organization_id, player_id, season: season || "2026" }),
    ]);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header with org branding
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(org?.name || "ProScout Hub", 14, y);
    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text("Informe de estadísticas", 14, y);
    y += 10;

    // Player info
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${player.first_name} ${player.last_name}`, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const posLabel: Record<string, string> = { GK: "Arquero", CB: "Defensor", LB: "Defensor", RB: "Defensor", CDM: "Mediocampista", CM: "Mediocampista", CAM: "Mediocampista", LW: "Delantero", RW: "Delantero", ST: "Delantero", CF: "Delantero" };
    doc.text(`Posición: ${posLabel[player.position] || player.position || "—"}  |  Club: ${player.club || "—"}  |  Temporada: ${season || "2026"}`, 14, y);
    y += 10;

    // Season summary
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Resumen de temporada", 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    const ss = league_id ? seasonStats.filter(s => s.league_id === String(league_id)) : seasonStats;
    const totals = ss.reduce((acc, s) => ({
      appearances: acc.appearances + (s.appearances || 0),
      lineups: acc.lineups + (s.lineups || 0),
      minutes: acc.minutes + (s.minutes || 0),
      goals: acc.goals + (s.goals_total || 0),
      assists: acc.assists + (s.goals_assists || 0),
      yellow: acc.yellow + (s.yellow_cards || 0),
      red: acc.red + (s.red_cards || 0),
    }), { appearances: 0, lineups: 0, minutes: 0, goals: 0, assists: 0, yellow: 0, red: 0 });

    const summaryLines = [
      `Partidos: ${totals.appearances}  |  Titularidades: ${totals.lineups}  |  Minutos: ${totals.minutes}`,
      `Goles: ${totals.goals}  |  Asistencias: ${totals.assists}  |  G+A: ${totals.goals + totals.assists}`,
      `Tarjetas amarillas: ${totals.yellow}  |  Rojas: ${totals.red}`,
    ];
    for (const line of summaryLines) { doc.text(line, 14, y); y += 5; }
    y += 4;

    // Recent matches table
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Partidos recientes", 14, y);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Fecha        Rival              Min  Gol  Asis  Rating", 14, y);
    y += 4;
    doc.setTextColor(30, 41, 59);
    for (const m of matchStats.slice(0, 20)) {
      if (y > 270) { doc.addPage(); y = 20; }
      const date = (m.fixture_date || "").slice(0, 10);
      doc.text(`${date}  ${String(m.opponent_team_id || "—").slice(0, 18).padEnd(18)}  ${String(m.minutes || 0).padEnd(4)} ${String(m.goals || 0).padEnd(4)} ${String(m.assists || 0).padEnd(4)} ${m.rating || "—"}`, 14, y);
      y += 5;
    }

    // Footer
    y = Math.max(y + 10, 270);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generado: ${new Date().toLocaleString("es-AR")}  |  Proveedor: API-Football v3  |  Temporada: ${season || "2026"}`, 14, y);

    const pdfBytes = doc.output("arraybuffer") as ArrayBuffer;
    const uint8 = new Uint8Array(pdfBytes);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    const pdfBase64 = btoa(binary);
    return Response.json({
      success: true,
      pdf_base64: pdfBase64,
      filename: `stats_${player.first_name}_${player.last_name}.pdf`
    });
  } catch (error: any) {
    return Response.json({ error: sanitizeError(error.message || String(error)), success: false }, { status: 500 });
  }
}