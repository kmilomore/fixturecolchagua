/**
 * Championships.gs
 * CRUD para la hoja "campeonatos".
 */

var Championships = {
  getAll: function () {
    return jsonResponse(sheetToObjects('campeonatos'));
  },

  getById: function (id) {
    const all = sheetToObjects('campeonatos');
    const found = all.find(function (c) { return c.id === id; });
    return found ? jsonResponse(found) : errorResponse('Campeonato no encontrado', 404);
  },

  mutate: function (action, payload) {
    switch (action) {
      case 'create':
        payload.id = generateUUID();
        payload.createdAt = new Date().toISOString();
        payload.estado = payload.estado || 'activo';
        appendRow('campeonatos', payload);
        return jsonResponse({ created: true, id: payload.id });

      case 'update':
        const updated = updateRowById('campeonatos', payload.id, payload);
        return updated
          ? jsonResponse({ updated: true })
          : errorResponse('No encontrado', 404);

      default:
        return errorResponse('Acción desconocida: ' + action);
    }
  }
};
