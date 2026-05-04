/**
 * Matches.gs
 * Gestión de partidos: consultas filtradas y actualización de resultados.
 */

var Matches = {
  query: function (filters) {
    let partidos = hydrateMatches_();
    partidos = filterMatches_(partidos, filters);
    partidos.sort(comparePartidos_);

    if (String(filters.vista || '').toLowerCase() === 'resumen') {
      return jsonResponse(buildMatchesSummary_(partidos));
    }

    return jsonResponse(partidos);
  },

  mutate: function (action, payload) {
    switch (action) {
      case 'create':
        payload.id = generateUUID();
        payload.estado = payload.estado || 'programado';
        if (payload.marcadorLocal === undefined) payload.marcadorLocal = '';
        if (payload.marcadorVisita === undefined) payload.marcadorVisita = '';
        appendRow('partidos', payload);
        return jsonResponse({ created: true, id: payload.id });

      case 'update':
        const okU = updateRowById('partidos', payload.id, payload);
        return okU ? jsonResponse({ updated: true }) : errorResponse('Partido no encontrado', 404);

      case 'resultado':
        const ok = updateRowById('partidos', payload.id, {
          marcadorLocal: payload.marcadorLocal,
          marcadorVisita: payload.marcadorVisita,
          estado: 'finalizado'
        });
        if (ok) Groups.recalcularTabla(payload.id);
        return ok ? jsonResponse({ updated: true }) : errorResponse('Partido no encontrado', 404);

      default:
        return errorResponse('Acción desconocida: ' + action);
    }
  }
};

function hydrateMatches_() {
  const partidos = sheetToObjects('partidos');
  const equipos = sheetToObjects('equipos');

  return partidos.map(function (p) {
    const local = equipos.find(function (e) { return e.id === p.localId; });
    const visita = equipos.find(function (e) { return e.id === p.visitaId; });
    return Object.assign({}, p, {
      fecha: normalizeFechaForApi_(p.fecha),
      hora: normalizeHoraForApi_(p.hora),
      disciplina: sanitizeMatchText_(p.disciplina),
      lugar: sanitizeMatchText_(p.lugar),
      fase: sanitizeMatchText_(p.fase),
      categoria: sanitizeMatchText_(p.categoria),
      grupo: sanitizeMatchText_(p.grupo),
      estado: sanitizeMatchText_(p.estado),
      localNombre: sanitizeMatchText_(local ? local.nombre : p.localId),
      visitaNombre: sanitizeMatchText_(visita ? visita.nombre : p.visitaId)
    });
  });
}

function filterMatches_(partidos, filters) {
  let rows = partidos;

  if (filters.campeonatoId) {
    rows = rows.filter(function (p) { return p.campeonatoId === filters.campeonatoId; });
  }
  if (filters.disciplinaId) {
    rows = rows.filter(function (p) { return p.disciplinaId === filters.disciplinaId; });
  }
  if (filters.disciplina) {
    rows = rows.filter(function (p) {
      return String(p.disciplina).toLowerCase() === String(filters.disciplina).toLowerCase();
    });
  }
  if (filters.genero) {
    rows = rows.filter(function (p) {
      return String(p.genero || '').toLowerCase() === String(filters.genero || '').toLowerCase();
    });
  }
  if (filters.fase) {
    rows = rows.filter(function (p) { return p.fase === filters.fase; });
  }
  if (filters.fecha) {
    rows = rows.filter(function (p) { return normalizeFechaForApi_(p.fecha) === normalizeFechaForApi_(filters.fecha); });
  }
  if (filters.jornada !== undefined && filters.jornada !== '') {
    rows = rows.filter(function (p) {
      return String(p.jornada) === String(filters.jornada);
    });
  }

  return rows;
}

function comparePartidos_(a, b) {
  const da = String(a.fecha) + ' ' + String(a.hora);
  const db = String(b.fecha) + ' ' + String(b.hora);
  return da.localeCompare(db);
}

function buildMatchesSummary_(partidos) {
  const now = new Date();
  const todayKey = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const activos = partidos.filter(function (p) {
    return p.estado !== 'finalizado' && p.estado !== 'postergado';
  });
  const hoy = partidos.filter(function (p) {
    return String(p.fecha) === todayKey;
  }).slice(0, 6);
  const proximos = activos.slice(0, 8);
  let siguiente = null;

  for (let i = 0; i < activos.length; i += 1) {
    const partido = activos[i];
    const date = parsePartidoDateTime_(partido.fecha, partido.hora);
    if (!date) continue;
    if (date.getTime() >= now.getTime()) {
      siguiente = partido;
      break;
    }
  }

  return {
    siguiente: siguiente,
    hoy: hoy,
    proximos: proximos,
    totalHoy: hoy.length,
    updatedAt: now.toISOString()
  };
}

function parsePartidoDateTime_(fecha, hora) {
  const normalizedFecha = normalizeFechaForApi_(fecha);
  const normalizedHora = normalizeHoraForApi_(hora) || '00:00';
  if (!normalizedFecha) return null;

  const parts = normalizedHora.split(':');
  const hour = Number(parts[0] || 0);
  const minute = Number(parts[1] || 0);
  const date = new Date(normalizedFecha + 'T00:00:00');

  if (isNaN(date.getTime())) return null;

  date.setHours(hour, minute, 0, 0);
  return date;
}

function sanitizeMatchText_(value) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeFechaForApi_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const isoDateTime = raw.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoDateTime) return isoDateTime[1];

  const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const day = ('0' + ddmmyyyy[1]).slice(-2);
    const month = ('0' + ddmmyyyy[2]).slice(-2);
    return ddmmyyyy[3] + '-' + month + '-' + day;
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return raw;
}

function normalizeHoraForApi_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }

  const raw = String(value).trim();
  const hhmm = raw.match(/^(\d{1,2}):(\d{2})/);
  if (hhmm) return ('0' + hhmm[1]).slice(-2) + ':' + hhmm[2];

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'HH:mm');
  }

  return raw;
}
