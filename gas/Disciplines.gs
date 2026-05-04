/**
 * Disciplines.gs
 * Hoja "disciplinas".
 */

var Disciplines = {
  getByCampeonato: function (campeonatoId) {
    let rows = sheetToObjects('disciplinas');
    if (campeonatoId) {
      rows = rows.filter(function (d) { return d.campeonatoId === campeonatoId; });
    }
    return jsonResponse(rows);
  },

  mutate: function (action, payload) {
    switch (action) {
      case 'create':
        payload.id = generateUUID();
        payload.estado = payload.estado || 'activo';
        appendRow('disciplinas', payload);
        return jsonResponse({ created: true, id: payload.id });
      case 'update':
        const ok = updateRowById('disciplinas', payload.id, payload);
        return ok ? jsonResponse({ updated: true }) : errorResponse('No encontrado', 404);
      default:
        return errorResponse('Acción desconocida: ' + action);
    }
  }
};
