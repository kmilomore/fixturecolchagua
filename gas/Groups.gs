/**
 * Groups.gs
 * Gestión de grupos y tabla de posiciones.
 */

var Groups = {
  query: function (filters) {
    let grupos = sheetToObjects('grupos');
    if (filters.campeonatoId) {
      grupos = grupos.filter(function (g) { return g.campeonatoId === filters.campeonatoId; });
    }
    if (filters.disciplinaId) {
      grupos = grupos.filter(function (g) { return g.disciplinaId === filters.disciplinaId; });
    }
    if (filters.genero) {
      grupos = grupos.filter(function (g) {
        return String(g.genero || '').toLowerCase() === String(filters.genero || '').toLowerCase();
      });
    }
    return jsonResponse(grupos);
  },

  getTabla: function (grupoId) {
    let tabla = sheetToObjects('tabla_posiciones').filter(function (t) { return t.grupoId === grupoId; });
    const grupo = sheetToObjects('grupos').find(function (g) { return g.id === grupoId; });
    const equipos = sheetToObjects('equipos');

    if (!tabla.length && grupo && grupo.equiposIds) {
      tabla = String(grupo.equiposIds)
        .split(',')
        .map(function (id) { return id.trim(); })
        .filter(Boolean)
        .map(function (equipoId) {
          return {
            id: grupoId + '-' + equipoId,
            grupoId: grupoId,
            equipoId: equipoId,
            pj: 0,
            pg: 0,
            pe: 0,
            pp: 0,
            sf: 0,
            sc: 0,
            diferencia: 0,
            puntos: 0
          };
        });
    }

    const enriched = tabla.map(function (t) {
      const eq = equipos.find(function (e) { return e.id === t.equipoId; });
      return Object.assign({}, t, {
        equipoNombre: eq ? eq.nombre : t.equipoId
      });
    });
    enriched.sort(function (a, b) {
      const pts = Number(b.puntos) - Number(a.puntos);
      if (pts !== 0) return pts;
      const dif = Number(b.diferencia) - Number(a.diferencia);
      if (dif !== 0) return dif;
      return Number(b.sf) - Number(a.sf);
    });
    return jsonResponse(enriched);
  },

  recalcularTabla: function (partidoId) {
    const partido = sheetToObjects('partidos').find(function (p) { return p.id === partidoId; });
    if (!partido || partido.fase !== 'grupos') return;

    const grupos = sheetToObjects('grupos');
    const idsPartido = [partido.localId, partido.visitaId];
    const grupo = grupos.find(function (g) {
      if (String(g.disciplinaId) !== String(partido.disciplinaId)) return false;
      if (String(g.campeonatoId) !== String(partido.campeonatoId)) return false;
      const ids = String(g.equiposIds || '')
        .split(',')
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
      return idsPartido.every(function (id) { return ids.indexOf(id) >= 0; });
    });
    if (!grupo) return;

    const equiposDelGrupo = String(grupo.equiposIds || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);

    const partidos = sheetToObjects('partidos').filter(function (p) {
      if (p.fase !== 'grupos') return false;
      if (String(p.campeonatoId) !== String(partido.campeonatoId)) return false;
      if (String(p.disciplinaId) !== String(partido.disciplinaId)) return false;
      if (p.estado !== 'finalizado') return false;
      return equiposDelGrupo.indexOf(p.localId) >= 0 && equiposDelGrupo.indexOf(p.visitaId) >= 0;
    });

    const stats = {};
    equiposDelGrupo.forEach(function (eid) {
      stats[eid] = { pj: 0, pg: 0, pe: 0, pp: 0, sf: 0, sc: 0, diferencia: 0, puntos: 0 };
    });

    partidos.forEach(function (p) {
      const ml = Number(p.marcadorLocal);
      const mv = Number(p.marcadorVisita);
      if (stats[p.localId]) {
        stats[p.localId].pj++;
        stats[p.localId].sf += ml;
        stats[p.localId].sc += mv;
        if (ml > mv) {
          stats[p.localId].pg++;
          stats[p.localId].puntos += 3;
        } else if (ml === mv) {
          stats[p.localId].pe++;
          stats[p.localId].puntos += 1;
        } else {
          stats[p.localId].pp++;
        }
      }
      if (stats[p.visitaId]) {
        stats[p.visitaId].pj++;
        stats[p.visitaId].sf += mv;
        stats[p.visitaId].sc += ml;
        if (mv > ml) {
          stats[p.visitaId].pg++;
          stats[p.visitaId].puntos += 3;
        } else if (mv === ml) {
          stats[p.visitaId].pe++;
          stats[p.visitaId].puntos += 1;
        } else {
          stats[p.visitaId].pp++;
        }
      }
    });

    Object.keys(stats).forEach(function (eid) {
      stats[eid].diferencia = stats[eid].sf - stats[eid].sc;
    });

    const tabla = sheetToObjects('tabla_posiciones');
    equiposDelGrupo.forEach(function (eid) {
      const existente = tabla.find(function (t) {
        return t.grupoId === grupo.id && t.equipoId === eid;
      });
      const s = stats[eid];
      const row = {
        grupoId: grupo.id,
        equipoId: eid,
        pj: s.pj,
        pg: s.pg,
        pe: s.pe,
        pp: s.pp,
        sf: s.sf,
        sc: s.sc,
        diferencia: s.diferencia,
        puntos: s.puntos
      };
      if (existente) {
        updateRowById('tabla_posiciones', existente.id, row);
      } else {
        row.id = generateUUID();
        appendRow('tabla_posiciones', row);
      }
    });
  },

  mutate: function (action, payload) {
    switch (action) {
      case 'create':
        payload.id = generateUUID();
        appendRow('grupos', payload);
        return jsonResponse({ created: true, id: payload.id });
      case 'update':
        const ok = updateRowById('grupos', payload.id, payload);
        return ok ? jsonResponse({ updated: true }) : errorResponse('No encontrado', 404);
      default:
        return errorResponse('Acción desconocida: ' + action);
    }
  }
};
