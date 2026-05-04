/**
 * Phases.gs
 * Reservado para lógica de fases eliminatorias (semifinal / final).
 * El frontend puede filtrar partidos por fase != grupos vía resource=partidos.
 */

var Phases = {
  listEliminatorias: function (campeonatoId, disciplinaId) {
    return Matches.query({
      campeonatoId: campeonatoId,
      disciplinaId: disciplinaId,
      fase: 'semifinal'
    });
  }
};
