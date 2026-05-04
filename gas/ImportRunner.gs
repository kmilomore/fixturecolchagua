/**
 * ImportRunner.gs
 * Funciones manuales para ejecutar desde el editor de Google Apps Script.
 *
 * Uso:
 * 1. Copia este archivo al proyecto GAS.
 * 2. Asegúrate de tener la hoja import_temp con:
 *    DEPORTE, FECHA, LUGAR, Hora, Local, Visita, Género, Grupo
 * 3. Ejecuta importarFixtureInicialDesdeImportTemp().
 */

const INITIAL_CAMPEONATO_ID = 'camp-2026';
const INITIAL_DISCIPLINA_ID = 'disc-voleibol';

function importarFixtureInicialDesdeImportTemp() {
  asegurarEstructuraSheets_();
  asegurarDatosBase_();

  const response = CSVImport.migrateFromTemp({
    campeonatoId: INITIAL_CAMPEONATO_ID,
    disciplinaId: INITIAL_DISCIPLINA_ID,
    disciplina: 'VOLEIBOL',
    categoria: 'Sub14',
    autoCrearEquipos: true
  });

  const content = response.getContent();
  Logger.log(content);
  return content;
}

function asegurarEstructuraSheets_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const headersBySheet = {
    campeonatos: ['id', 'nombre', 'año', 'disciplinas', 'estado', 'descripcion', 'createdAt'],
    disciplinas: ['id', 'campeonatoId', 'nombre', 'categorias', 'estado'],
    equipos: ['id', 'campeonatoId', 'disciplinaId', 'nombre', 'establecimiento', 'genero', 'categoria', 'grupo'],
    partidos: [
      'id',
      'campeonatoId',
      'disciplinaId',
      'disciplina',
      'fecha',
      'hora',
      'lugar',
      'localId',
      'visitaId',
      'marcadorLocal',
      'marcadorVisita',
      'fase',
      'genero',
      'categoria',
      'grupo',
      'estado',
      'jornada'
    ],
    grupos: ['id', 'campeonatoId', 'disciplinaId', 'nombre', 'genero', 'categoria', 'equiposIds'],
    tabla_posiciones: ['id', 'grupoId', 'equipoId', 'pj', 'pg', 'pe', 'pp', 'sf', 'sc', 'diferencia', 'puntos'],
    import_temp: ['DEPORTE', 'FECHA', 'LUGAR', 'Hora', 'Local', 'Visita', 'Género', 'Grupo']
  };

  Object.keys(headersBySheet).forEach(function (sheetName) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    const headers = headersBySheet[sheetName];
    const lastColumn = sheet.getLastColumn();
    const hasHeaders = lastColumn > 0 && sheet.getRange(1, 1, 1, lastColumn).getValues()[0].some(String);

    if (!hasHeaders) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
      const missingHeaders = headers.filter(function (h) {
        return currentHeaders.indexOf(h) < 0;
      });

      if (missingHeaders.length) {
        sheet.getRange(1, lastColumn + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      }
    }
  });
}

function asegurarDatosBase_() {
  const campeonatos = sheetToObjects('campeonatos');
  const campeonatoExiste = campeonatos.some(function (c) {
    return c.id === INITIAL_CAMPEONATO_ID;
  });

  if (!campeonatoExiste) {
    appendRow('campeonatos', {
      id: INITIAL_CAMPEONATO_ID,
      nombre: 'Campeonato SLEP Colchagua 2026',
      año: 2026,
      disciplinas: 'VOLEIBOL',
      estado: 'activo',
      descripcion: 'Campeonato Deportivo SLEP Colchagua 2026',
      createdAt: new Date().toISOString()
    });
  }

  const disciplinas = sheetToObjects('disciplinas');
  const disciplinaExiste = disciplinas.some(function (d) {
    return d.id === INITIAL_DISCIPLINA_ID;
  });

  if (!disciplinaExiste) {
    appendRow('disciplinas', {
      id: INITIAL_DISCIPLINA_ID,
      campeonatoId: INITIAL_CAMPEONATO_ID,
      nombre: 'VOLEIBOL',
      categorias: 'Sub14',
      estado: 'activo'
    });
  }
}
