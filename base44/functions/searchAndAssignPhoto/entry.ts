import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { entity_type, entity_id, force } = body;

    if (!entity_type || !entity_id) {
      return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 });
    }

    const isPlayer = entity_type === 'player';
    const isDirector = entity_type === 'director';
    if (!isPlayer && !isDirector) {
      return Response.json({ error: 'entity_type must be player or director' }, { status: 400 });
    }

    // Fetch the record
    const record = isPlayer
      ? await base44.asServiceRole.entities.Player.get(entity_id)
      : await base44.asServiceRole.entities.TechnicalDirector.get(entity_id);

    if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });

    // Skip if already has photo and not forced
    if (record.photo_url && !force) {
      return Response.json({ success: true, skipped: true, message: 'Already has photo', record_id: record.id });
    }

    const fullName = `${record.first_name} ${record.last_name}`.trim();
    const club = isPlayer ? record.club : record.current_club;
    const position = isPlayer ? record.position : record.primary_role;
    const nationality = record.nationality;

    // Build search prompt
    const searchContext = [
      fullName,
      club ? `club ${club}` : '',
      position ? `posición ${position}` : '',
      nationality ? `nacionalidad ${nationality}` : '',
      'futbolista',
      'foto perfil oficial'
    ].filter(Boolean).join(', ');

    // Use InvokeLLM with web search to find a photo URL
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Busca una foto de perfil oficial de: ${searchContext}. Necesito la URL directa de una imagen (jpg, png, webp) que sea una foto frontal clara de la persona. Responde en JSON con: photo_url (URL directa de la imagen), source_url (URL de la página donde se encontró), source_name (nombre del sitio), confidence (alta/media/baja), notes (observaciones sobre la coincidencia).`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          photo_url: { type: "string" },
          source_url: { type: "string" },
          source_name: { type: "string" },
          confidence: { type: "string" },
          notes: { type: "string" }
        }
      },
      model: "gemini_3_flash"
    });

    const photoData = llmResponse.data || llmResponse;
    const photoUrl = photoData.photo_url;
    const sourceUrl = photoData.source_url;
    const sourceName = photoData.source_name;
    const confidence = (photoData.confidence || '').toLowerCase();

    if (!photoUrl || !photoUrl.startsWith('http')) {
      return Response.json({
        success: false,
        record_id: record.id,
        name: fullName,
        message: 'No photo URL found',
        llm_notes: photoData.notes
      });
    }

    // Only auto-update if confidence is high
    if (confidence !== 'alta') {
      // Store as reference only, pending confirmation
      const updateData = {
        photo_source_url: sourceUrl,
        photo_source_name: sourceName,
        photo_source_type: 'public_reference',
        photo_rights_status: 'pending_confirmation',
        photo_verified_at: new Date().toISOString(),
        photo_status: 'pending'
      };
      if (isPlayer) {
        await base44.asServiceRole.entities.Player.update(record.id, updateData);
      } else {
        await base44.asServiceRole.entities.TechnicalDirector.update(record.id, updateData);
      }
      return Response.json({
        success: true,
        pending: true,
        record_id: record.id,
        name: fullName,
        confidence,
        source_url: sourceUrl,
        source_name: sourceName,
        message: 'Photo found but confidence is not high - stored as reference pending confirmation',
        notes: photoData.notes
      });
    }

    // Download the image with browser-like headers
    let uploadedUrl = null;
    let downloadError = null;
    try {
      const imgResponse = await fetch(photoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*,*/*;q=0.8'
        }
      });
      if (imgResponse.ok) {
        const blob = await imgResponse.blob();
        if (blob.size > 1000) { // at least 1KB
          const contentType = blob.type || 'image/jpeg';
          const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
          const fileName = `${fullName.replace(/\s+/g, '_').toLowerCase()}.${ext}`;
          const file = new File([blob], fileName, { type: contentType });
          const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
          uploadedUrl = uploadResult.file_url;
        } else {
          downloadError = 'Downloaded image too small';
        }
      } else {
        downloadError = `Download failed: ${imgResponse.status}`;
      }
    } catch (e) {
      downloadError = e.message;
    }

    // If download/upload succeeded, store as definitive photo
    if (uploadedUrl) {
      const updateData = {
        photo_url: uploadedUrl,
        photo_source_url: sourceUrl,
        photo_source_name: sourceName,
        photo_source_type: 'public_reference',
        photo_rights_status: 'pending_confirmation',
        photo_verified_at: new Date().toISOString(),
        photo_status: 'ok'
      };
      if (isPlayer) {
        await base44.asServiceRole.entities.Player.update(record.id, updateData);
      } else {
        await base44.asServiceRole.entities.TechnicalDirector.update(record.id, updateData);
      }
      return Response.json({
        success: true,
        updated: true,
        record_id: record.id,
        name: fullName,
        photo_url: uploadedUrl,
        source_url: sourceUrl,
        source_name: sourceName,
        confidence,
        message: 'Photo assigned successfully'
      });
    }

    // Download failed - store source URL as reference pending confirmation
    const refData = {
      photo_source_url: sourceUrl,
      photo_source_name: sourceName,
      photo_source_type: 'public_reference',
      photo_rights_status: 'pending_confirmation',
      photo_verified_at: new Date().toISOString(),
      photo_status: 'pending'
    };
    if (isPlayer) {
      await base44.asServiceRole.entities.Player.update(record.id, refData);
    } else {
      await base44.asServiceRole.entities.TechnicalDirector.update(record.id, refData);
    }
    return Response.json({
      success: true,
      pending: true,
      record_id: record.id,
      name: fullName,
      confidence,
      source_url: sourceUrl,
      source_name: sourceName,
      download_error: downloadError,
      message: 'Photo URL found but download failed - stored as reference pending manual upload'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}