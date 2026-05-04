/**
 * Teams.gs
 * Hoja "equipos".
 */

var Teams = {
  getByCampeonato: function (campeonatoId) {
    let rows = sheetToObjects('equipos');
    if (campeonatoId) {
      rows = rows.filter(function (e) { return e.campeonatoId === campeonatoId; });
    }
    return jsonResponse(rows);
  },

  mutate: function (action, payload) {
    switch (action) {
      case 'create':
        payload.id = generateUUID();
        appendRow('equipos', payload);
        return jsonResponse({ created: true, id: payload.id });
      case 'update':
        const u = updateRowById('equipos', payload.id, payload);
        return u ? jsonResponse({ updated: true }) : errorResponse('No encontrado', 404);
      case 'delete':
        const d = deleteRowById('equipos', payload.id);
        return d ? jsonResponse({ deleted: true }) : errorResponse('No encontrado', 404);
      default:
        return errorResponse('Acción desconocida: ' + action);
    }
  }
};
