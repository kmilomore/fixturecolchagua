/**
 * Matches.gs
 * Gestión de partidos: consultas filtradas y actualización de resultados.
 */

var Matches = {
  query: function (filters) {
    let partidos = sheetToObjects('partidos');
    const equipos = sheetToObjects('equipos');

    partidos = partidos.map(function (p) {
      const local = equipos.find(function (e) { return e.id === p.localId; });
      const visita = equipos.find(function (e) { return e.id === p.visitaId; });
      return Object.assign({}, p, {
        fecha: normalizeFechaForApi_(p.fecha),
        hora: normalizeHoraForApi_(p.hora),
        localNombre: local ? local.nombre : p.localId,
        visitaNombre: visita ? visita.nombre : p.visitaId
      });
    });

    if (filters.campeonatoId) {
      partidos = partidos.filter(function (p) { return p.campeonatoId === filters.campeonatoId; });
    }
    if (filters.disciplinaId) {
      partidos = partidos.filter(function (p) { return p.disciplinaId === filters.disciplinaId; });
    }
    if (filters.disciplina) {
      partidos = partidos.filter(function (p) {
        return String(p.disciplina).toLowerCase() === String(filters.disciplina).toLowerCase();
      });
    }
    if (filters.genero) {
      partidos = partidos.filter(function (p) {
        return String(p.genero || '').toLowerCase() === String(filters.genero || '').toLowerCase();
      });
    }
    if (filters.fase) {
      partidos = partidos.filter(function (p) { return p.fase === filters.fase; });
    }
    if (filters.fecha) {
      partidos = partidos.filter(function (p) { return normalizeFechaForApi_(p.fecha) === normalizeFechaForApi_(filters.fecha); });
    }
    if (filters.jornada !== undefined && filters.jornada !== '') {
      partidos = partidos.filter(function (p) {
        return String(p.jornada) === String(filters.jornada);
      });
    }

    partidos.sort(function (a, b) {
      const da = String(a.fecha) + ' ' + String(a.hora);
      const db = String(b.fecha) + ' ' + String(b.hora);
      return da.localeCompare(db);
    });

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
