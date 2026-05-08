/**
 * CSVImport.gs
 * Migra filas desde la hoja "import_temp" hacia "partidos".
 * Soporta la estructura plana:
 * DEPORTE, FECHA, LUGAR, Hora, Local, Visita, Género, Grupo.
 * Headers flexibles: se normalizan a minúsculas y sin acentos.
 *
 * Columnas destino en "partidos":
 * id, campeonatoId, disciplinaId, disciplina, fecha, hora, lugar, localId, visitaId,
 * marcadorLocal, marcadorVisita, fase, genero, categoria, grupo, estado, jornada
 */

var CSVImport = {
  migrateFromTemp: function (payload) {
    payload = payload || {};
    if (payload.multiDisciplina || !payload.disciplinaId) {
      return CSVImport.migrateMultipleFromTemp_(payload);
    }

    const campeonatoId = payload.campeonatoId;
    const disciplinaId = payload.disciplinaId;
    const disciplinaNombre = payload.disciplina || 'VOLEIBOL';
    const categoriaDefault = payload.categoria || 'Sub14';
    const autoCrearEquipos = payload.autoCrearEquipos !== false;
    if (!campeonatoId || !disciplinaId) {
      return errorResponse('campeonatoId y disciplinaId son obligatorios', 400);
    }

    const rows = payload.sourceRows || sheetToObjects('import_temp');
    if (!rows.length) {
      return errorResponse('import_temp vacía o sin datos', 400);
    }

    const equipos = sheetToObjects('equipos');
    const equipoByNombre = {};
    equipos.forEach(function (e) {
      if (e.campeonatoId === campeonatoId && e.disciplinaId === disciplinaId) {
        const key = CSVImport.equipoKey_(e.nombre, e.genero, e.categoria, e.grupo);
        equipoByNombre[key] = e.id;
      }
    });

    rows.forEach(function (raw) {
      const norm = CSVImport.normalizeRow_(raw);
      const genero = CSVImport.normalizeGenero_(norm.genero || 'Damas');
      const categoria = norm.categoria || categoriaDefault;
      const grupo = CSVImport.normalizeGrupo_(norm.grupo || norm.numerogrupo || norm.gruponumero || '');

      [norm.local || norm.localnombre || norm.equipolocal, norm.visita || norm.visitante || norm.equipovisita]
        .forEach(function (nombreEquipo) {
          CSVImport.ensureEquipo_({
            campeonatoId: campeonatoId,
            disciplinaId: disciplinaId,
            nombre: nombreEquipo,
            genero: genero,
            categoria: categoria,
            grupo: grupo,
            equipoByNombre: equipoByNombre,
            autoCrear: autoCrearEquipos
          });
        });
    });

    const partidosExistentes = sheetToObjects('partidos');
    const partidosIndex = {};
    partidosExistentes.forEach(function (p) {
      const key = CSVImport.partidoKey_({
        campeonatoId: p.campeonatoId,
        disciplinaId: p.disciplinaId,
        fecha: p.fecha,
        hora: p.hora,
        localId: p.localId,
        visitaId: p.visitaId
      });
      if (key) {
        partidosIndex[key] = p;
      }
    });
    let created = 0;
    let teamsCreated = 0;
    let skipped = 0;
    rows.forEach(function (raw, idx) {
      const norm = CSVImport.normalizeRow_(raw);
      const localNombre = norm.local || norm.localnombre || norm.equipolocal;
      const visitaNombre = norm.visita || norm.visitante || norm.equipovisita;
      const genero = CSVImport.normalizeGenero_(norm.genero || 'Damas');
      const categoria = norm.categoria || categoriaDefault;
      const grupo = CSVImport.normalizeGrupo_(norm.grupo || norm.numerogrupo || norm.gruponumero || '');
      const localId = norm.localid || CSVImport.ensureEquipo_({
        campeonatoId: campeonatoId,
        disciplinaId: disciplinaId,
        nombre: localNombre,
        genero: genero,
        categoria: categoria,
        grupo: grupo,
        equipoByNombre: equipoByNombre,
        autoCrear: autoCrearEquipos
      });
      const visitaId = norm.visitaid || CSVImport.ensureEquipo_({
        campeonatoId: campeonatoId,
        disciplinaId: disciplinaId,
        nombre: visitaNombre,
        genero: genero,
        categoria: categoria,
        grupo: grupo,
        equipoByNombre: equipoByNombre,
        autoCrear: autoCrearEquipos
      });
      if (!localId || !visitaId) {
        skipped++;
        return;
      }

      const fecha = CSVImport.normalizeFecha_(norm.fecha || '');
      const hora = norm.hora || '';
      const partidoKey = CSVImport.partidoKey_({
        campeonatoId: campeonatoId,
        disciplinaId: disciplinaId,
        fecha: fecha,
        hora: hora,
        localId: localId,
        visitaId: visitaId
      });
      const existente = partidosIndex[partidoKey];
      const partidoYaExiste = Boolean(existente);

      if (partidoYaExiste) {
        if (existente && existente.id) {
          updateRowById('partidos', existente.id, {
            fecha: fecha,
            hora: hora,
            lugar: norm.lugar || existente.lugar || 'GIMNASIO TECHADO',
            grupo: grupo,
            disciplina: norm.disciplina || norm.deporte || disciplinaNombre,
            fase: norm.fase || existente.fase || 'grupos',
            genero: genero,
            categoria: categoria,
            estado: norm.estado || existente.estado || 'programado',
            jornada: norm.jornada !== undefined && norm.jornada !== '' ? norm.jornada : existente.jornada
          });
        }
        skipped++;
        return;
      }

      const partido = {
        id: generateUUID(),
        campeonatoId: campeonatoId,
        disciplinaId: disciplinaId,
        disciplina: norm.disciplina || norm.deporte || disciplinaNombre,
        fecha: fecha,
        hora: hora,
        lugar: norm.lugar || 'GIMNASIO TECHADO',
        localId: localId,
        visitaId: visitaId,
        marcadorLocal: norm.marcadorlocal !== undefined && norm.marcadorlocal !== '' ? norm.marcadorlocal : '',
        marcadorVisita: norm.marcadorvisita !== undefined && norm.marcadorvisita !== '' ? norm.marcadorvisita : '',
        fase: norm.fase || 'grupos',
        genero: genero,
        categoria: categoria,
        grupo: grupo,
        estado: norm.estado || 'programado',
        jornada: norm.jornada !== undefined && norm.jornada !== '' ? norm.jornada : idx + 1
      };

      if (partido.estado === 'finalizado' || (partido.marcadorLocal !== '' && partido.marcadorVisita !== '')) {
        if (partido.marcadorLocal !== '' && partido.marcadorVisita !== '') {
          partido.estado = 'finalizado';
        }
      }

      appendRow('partidos', partido);
      partidosIndex[partidoKey] = partido;
      teamsCreated = Object.keys(equipoByNombre).filter(function (k) {
        return String(k).indexOf('__created__') >= 0;
      }).length;
      created++;
    });

    CSVImport.rebuildGrupos_(campeonatoId, disciplinaId);

    return jsonResponse({
      migrated: true,
      mode: 'single',
      disciplinaId: disciplinaId,
      disciplina: disciplinaNombre,
      partidosCreated: created,
      teamsCreated: teamsCreated,
      skippedRows: skipped
    });
  },

  migrateMultipleFromTemp_: function (payload) {
    payload = payload || {};
    const campeonatoId = String(payload.campeonatoId || '').trim();
    const rows = sheetToObjects('import_temp');
    const categoriaDefault = payload.categoria || 'Sub14';
    const autoCrearEquipos = payload.autoCrearEquipos !== false;
    const groupedRows = {};
    const existingDisciplines = sheetToObjects('disciplinas').filter(function (row) {
      return String(row.campeonatoId) === campeonatoId;
    });

    if (!campeonatoId) {
      return errorResponse('campeonatoId es obligatorio', 400);
    }
    if (!rows.length) {
      return errorResponse('import_temp vacía o sin datos', 400);
    }

    rows.forEach(function (raw) {
      const norm = CSVImport.normalizeRow_(raw);
      const disciplinaNombre = CSVImport.resolveDisciplinaNombre_(norm, payload);
      if (!disciplinaNombre) return;

      const groupKey = CSVImport.normalizeKey_(disciplinaNombre);
      if (!groupedRows[groupKey]) {
        groupedRows[groupKey] = {
          nombre: disciplinaNombre,
          rows: [],
          categorias: []
        };
      }
      const categoria = String(norm.categoria || categoriaDefault).trim();
      if (categoria && groupedRows[groupKey].categorias.indexOf(categoria) < 0) {
        groupedRows[groupKey].categorias.push(categoria);
      }
      groupedRows[groupKey].rows.push(raw);
    });

    const grupos = Object.keys(groupedRows);
    if (!grupos.length) {
      return errorResponse('No se encontraron disciplinas válidas en import_temp', 400);
    }

    const disciplinasImportadas = [];
    let totalPartidos = 0;
    let totalEquipos = 0;
    let totalSkipped = 0;

    grupos.forEach(function (key) {
      const group = groupedRows[key];
      const disciplina = CSVImport.ensureDisciplinaForImport_({
        campeonatoId: campeonatoId,
        nombre: group.nombre,
        categoriaDefault: categoriaDefault,
        categorias: group.categorias,
        existingDisciplines: existingDisciplines
      });
      const response = CSVImport.migrateFromTemp({
        campeonatoId: campeonatoId,
        disciplinaId: disciplina.id,
        disciplina: disciplina.nombre,
        categoria: categoriaDefault,
        autoCrearEquipos: autoCrearEquipos,
        sourceRows: group.rows
      });
      const parsed = JSON.parse(response.getContent());
      if (Number(parsed.status) >= 400) {
        throw new Error((parsed.data && parsed.data.error) || 'Error al importar disciplina');
      }

      const data = parsed.data || {};
      totalPartidos += Number(data.partidosCreated || 0);
      totalEquipos += Number(data.teamsCreated || 0);
      totalSkipped += Number(data.skippedRows || 0);
      disciplinasImportadas.push({
        id: disciplina.id,
        nombre: disciplina.nombre,
        partidosCreated: Number(data.partidosCreated || 0),
        teamsCreated: Number(data.teamsCreated || 0),
        skippedRows: Number(data.skippedRows || 0)
      });
    });

    CSVImport.syncCampeonatoDisciplinas_(campeonatoId, existingDisciplines);

    return jsonResponse({
      migrated: true,
      mode: 'multi',
      disciplinas: disciplinasImportadas,
      disciplinasCount: disciplinasImportadas.length,
      partidosCreated: totalPartidos,
      teamsCreated: totalEquipos,
      skippedRows: totalSkipped
    });
  },

  normalizeRow_: function (raw) {
    const out = {};
    Object.keys(raw).forEach(function (k) {
      const nk = CSVImport.normalizeKey_(k);
      out[nk] = raw[k];
    });
    return out;
  },

  normalizeKey_: function (value) {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/\s+/g, '');
  },

  normalizeGenero_: function (value) {
    const raw = CSVImport.normalizeKey_(value);
    if (raw === 'varones' || raw === 'varon' || raw === 'masculino') return 'Varones';
    return 'Damas';
  },

  resolveDisciplinaNombre_: function (norm, payload) {
    const raw = String(norm.disciplina || norm.deporte || payload.disciplina || '').trim();
    if (!raw) return '';
    return raw
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  },

  normalizeGrupo_: function (value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const normalized = CSVImport.normalizeKey_(raw);
    if (normalized.indexOf('grupo') === 0) return raw;
    return 'Grupo ' + raw;
  },

  normalizeFecha_: function (value) {
    if (!value) return '';

    if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }

    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

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
  },

  equipoKey_: function (nombre, genero, categoria, grupo) {
    return [
      CSVImport.normalizeKey_(nombre || ''),
      CSVImport.normalizeKey_(genero || ''),
      CSVImport.normalizeKey_(categoria || ''),
      CSVImport.normalizeKey_(grupo || '')
    ].join('|');
  },

  partidoKey_: function (options) {
    if (!options) return '';

    return [
      String(options.campeonatoId || '').trim(),
      String(options.disciplinaId || '').trim(),
      CSVImport.normalizeFecha_(options.fecha || ''),
      String(options.hora || '').trim(),
      String(options.localId || '').trim(),
      String(options.visitaId || '').trim()
    ].join('|');
  },

  disciplinaSlug_: function (nombre) {
    return CSVImport.normalizeKey_(nombre || '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  },

  ensureDisciplinaForImport_: function (options) {
    const nombre = String(options.nombre || '').trim().toUpperCase();
    const key = CSVImport.normalizeKey_(nombre);
    const categoriaDefault = String(options.categoriaDefault || 'Sub14').trim();
    const categorias = (options.categorias || []).length ? options.categorias : [categoriaDefault];
    const existing = (options.existingDisciplines || []).find(function (row) {
      return CSVImport.normalizeKey_(row.nombre || '') === key;
    });

    if (existing) {
      categorias.forEach(function (categoria) {
        CSVImport.ensureDisciplinaCategoria_(existing, categoria);
      });
      return {
        id: existing.id,
        nombre: String(existing.nombre || nombre)
      };
    }

    const slug = CSVImport.disciplinaSlug_(nombre) || generateUUID();
    const id = 'disc-' + slug;
    const payload = {
      id: id,
      campeonatoId: options.campeonatoId,
      nombre: nombre,
      categorias: categorias.join(', '),
      estado: 'activo'
    };
    appendRow('disciplinas', payload);
    options.existingDisciplines.push(payload);
    return {
      id: id,
      nombre: nombre
    };
  },

  ensureDisciplinaCategoria_: function (disciplinaRow, categoria) {
    const nextCategory = String(categoria || '').trim();
    if (!nextCategory) return;

    const current = String(disciplinaRow.categorias || '').trim();
    if (!current) {
      updateRowById('disciplinas', disciplinaRow.id, { categorias: nextCategory });
      disciplinaRow.categorias = nextCategory;
      return;
    }

    const normalizedCurrent = current.split(',').map(function (item) {
      return String(item).trim();
    }).filter(String);

    if (normalizedCurrent.indexOf(nextCategory) >= 0) return;

    normalizedCurrent.push(nextCategory);
    const merged = normalizedCurrent.join(', ');
    updateRowById('disciplinas', disciplinaRow.id, { categorias: merged });
    disciplinaRow.categorias = merged;
  },

  syncCampeonatoDisciplinas_: function (campeonatoId, disciplinas) {
    const campeonato = sheetToObjects('campeonatos').find(function (row) {
      return String(row.id) === String(campeonatoId);
    });
    if (!campeonato || !campeonato.id) return;

    const nombres = disciplinas
      .map(function (row) { return String(row.nombre || '').trim().toUpperCase(); })
      .filter(String)
      .filter(function (value, index, arr) { return arr.indexOf(value) === index; });

    updateRowById('campeonatos', campeonato.id, { disciplinas: nombres.join(', ') });
  },

  ensureEquipo_: function (options) {
    const nombre = String(options.nombre || '').trim();
    if (!nombre) return '';

    const key = CSVImport.equipoKey_(nombre, options.genero, options.categoria, options.grupo);
    if (options.equipoByNombre[key]) {
      if (options.grupo) {
        updateRowById('equipos', options.equipoByNombre[key], { grupo: options.grupo });
      }
      return options.equipoByNombre[key];
    }
    if (!options.autoCrear) return '';

    const id = generateUUID();
    appendRow('equipos', {
      id: id,
      campeonatoId: options.campeonatoId,
      disciplinaId: options.disciplinaId,
      nombre: nombre,
      establecimiento: nombre,
      genero: options.genero,
      categoria: options.categoria,
      grupo: options.grupo || ''
    });
    options.equipoByNombre[key] = id;
    options.equipoByNombre[key + '__created__'] = id;
    return id;
  },

  rebuildGrupos_: function (campeonatoId, disciplinaId) {
    const gruposMap = {};
    const partidos = sheetToObjects('partidos').filter(function (p) {
      return String(p.campeonatoId) === String(campeonatoId) &&
        String(p.disciplinaId) === String(disciplinaId) &&
        String(p.grupo || '').trim() !== '';
    });

    partidos.forEach(function (p) {
      const nombre = CSVImport.normalizeGrupo_(p.grupo);
      const key = [
        campeonatoId,
        disciplinaId,
        CSVImport.normalizeKey_(p.genero || ''),
        CSVImport.normalizeKey_(p.categoria || ''),
        CSVImport.normalizeKey_(nombre)
      ].join('|');

      if (!gruposMap[key]) {
        gruposMap[key] = {
          campeonatoId: campeonatoId,
          disciplinaId: disciplinaId,
          nombre: nombre,
          genero: p.genero || 'Damas',
          categoria: p.categoria || 'Sub14',
          equiposIds: []
        };
      }

      [p.localId, p.visitaId].forEach(function (equipoId) {
        if (equipoId && gruposMap[key].equiposIds.indexOf(equipoId) < 0) {
          gruposMap[key].equiposIds.push(equipoId);
        }
      });
    });

    if (!Object.keys(gruposMap).length) {
      const equipos = sheetToObjects('equipos').filter(function (e) {
        return String(e.campeonatoId) === String(campeonatoId) &&
          String(e.disciplinaId) === String(disciplinaId) &&
          String(e.grupo || '').trim() !== '';
      });

      equipos.forEach(function (e) {
        const nombre = CSVImport.normalizeGrupo_(e.grupo);
        const key = [
          campeonatoId,
          disciplinaId,
          CSVImport.normalizeKey_(e.genero || ''),
          CSVImport.normalizeKey_(e.categoria || ''),
          CSVImport.normalizeKey_(nombre)
        ].join('|');

        if (!gruposMap[key]) {
          gruposMap[key] = {
            campeonatoId: campeonatoId,
            disciplinaId: disciplinaId,
            nombre: nombre,
            genero: e.genero || 'Damas',
            categoria: e.categoria || 'Sub14',
            equiposIds: []
          };
        }
        if (gruposMap[key].equiposIds.indexOf(e.id) < 0) {
          gruposMap[key].equiposIds.push(e.id);
        }
      });
    }

    const existentes = sheetToObjects('grupos');
    Object.keys(gruposMap).forEach(function (key) {
      const g = gruposMap[key];
      const existente = existentes.find(function (row) {
        return String(row.campeonatoId) === String(g.campeonatoId) &&
          String(row.disciplinaId) === String(g.disciplinaId) &&
          String(row.nombre) === String(g.nombre) &&
          String(row.genero) === String(g.genero) &&
          String(row.categoria) === String(g.categoria);
      });

      const payload = {
        campeonatoId: g.campeonatoId,
        disciplinaId: g.disciplinaId,
        nombre: g.nombre,
        genero: g.genero,
        categoria: g.categoria,
        equiposIds: g.equiposIds.join(',')
      };

      if (existente && existente.id) {
        updateRowById('grupos', existente.id, payload);
      } else {
        payload.id = generateUUID();
        appendRow('grupos', payload);
      }
    });
  }
};
