/**
 * Utils.gs
 * Utilidades globales: CORS, JSON responses, validaciones
 */

const SPREADSHEET_ID =
  PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') ||
  '1COTXGMk4hOhRDZRGzhxy8cgI3C2Pq6MxP3MwHYKpWyE';

/**
 * Construye una respuesta JSON con headers CORS correctos.
 * @param {Object} data - Datos a serializar
 * @param {number} [statusCode=200] - Código HTTP conceptual (informativo)
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(data, statusCode) {
  statusCode = statusCode === undefined ? 200 : statusCode;
  const payload = JSON.stringify({
    status: statusCode,
    data: data,
    timestamp: new Date().toISOString()
  });

  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Construye una respuesta de error estandarizada.
 * @param {string} message - Mensaje de error legible
 * @param {number} [code=400] - Código de error
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function errorResponse(message, code) {
  code = code === undefined ? 400 : code;
  return jsonResponse({ error: message, code: code }, code);
}

function getGoogleAuthConfig_() {
  const clientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID');

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID no configurado en Script Properties');
  }

  return {
    clientId: String(clientId)
  };
}

function getAdminWhitelistSheet_() {
  return getOrCreateSheet_('admin_whitelist', [
    'email',
    'nombre',
    'estado',
    'rol',
    'createdAt'
  ]);
}

function getAdminWhitelistEntries_() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'admin-whitelist:v1';
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  getAdminWhitelistSheet_();
  const rows = sheetToObjects('admin_whitelist')
    .map(function (row) {
      return {
        email: String(row.email || '').trim().toLowerCase(),
        nombre: String(row.nombre || '').trim(),
        estado: String(row.estado || '').trim().toLowerCase(),
        rol: String(row.rol || '').trim().toLowerCase(),
        createdAt: String(row.createdAt || '').trim()
      };
    })
    .filter(function (row) {
      return row.email && row.estado === 'activo';
    });

  cache.put(cacheKey, JSON.stringify(rows), 120);
  return rows;
}

function getAuthorizedAdminByEmail_(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  const rows = getAdminWhitelistEntries_();
  const admin = rows.find(function (row) {
    return row.email === normalizedEmail;
  });

  if (!admin) {
    throw new Error('Cuenta de Google no autorizada');
  }

  return admin;
}

function verifyGoogleIdToken_(idToken, clientId) {
  if (!idToken) {
    throw new Error('Sesion de Google requerida');
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = 'google-id-token:' + hashToken_(idToken);
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const response = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );

  if (response.getResponseCode() !== 200) {
    throw new Error('No se pudo validar la sesion de Google');
  }

  const tokenInfo = JSON.parse(response.getContentText());
  const issuer = String(tokenInfo.iss || '');
  const exp = Number(tokenInfo.exp || 0);
  if (issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
    throw new Error('Issuer de Google invalido');
  }
  if (String(tokenInfo.aud || '') !== String(clientId)) {
    throw new Error('Cliente Google invalido');
  }
  if (!exp || exp * 1000 <= Date.now()) {
    throw new Error('Sesion de Google expirada');
  }

  const ttlSeconds = Math.max(1, Math.min(300, exp - Math.floor(Date.now() / 1000) - 30));
  cache.put(cacheKey, JSON.stringify(tokenInfo), ttlSeconds);
  return tokenInfo;
}

function authorizeExternalRequest() {
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=test', {
    muteHttpExceptions: true
  });
  Logger.log(response.getResponseCode());
}

function hashToken_(token) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token);
  return Utilities.base64EncodeWebSafe(digest);
}

function validateMutationPayload_(resource, action, payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload invalido');
  }

  switch (resource) {
    case 'campeonatos':
      ensureActionAllowed_(action, ['create', 'update']);
      ensureStringField_(payload, 'nombre');
      if (action === 'create') ensureYearField_(payload, 'año');
      if (action === 'update') ensureStringField_(payload, 'id');
      return;

    case 'disciplinas':
      ensureActionAllowed_(action, ['create', 'update']);
      ensureStringField_(payload, 'campeonatoId');
      ensureStringField_(payload, 'nombre');
      if (action === 'update') ensureStringField_(payload, 'id');
      return;

    case 'partidos':
      ensureActionAllowed_(action, ['create', 'update', 'resultado']);
      if (action === 'resultado') {
        ensureStringField_(payload, 'id');
        ensureNonNegativeNumberField_(payload, 'marcadorLocal');
        ensureNonNegativeNumberField_(payload, 'marcadorVisita');
        return;
      }
      ensureStringField_(payload, 'campeonatoId');
      ensureStringField_(payload, 'disciplinaId');
      ensureStringField_(payload, 'localId');
      ensureStringField_(payload, 'visitaId');
      ensureStringField_(payload, 'fecha');
      ensureStringField_(payload, 'hora');
      if (action === 'update') ensureStringField_(payload, 'id');
      return;

    case 'grupos':
      ensureActionAllowed_(action, ['create', 'update']);
      ensureStringField_(payload, 'campeonatoId');
      ensureStringField_(payload, 'disciplinaId');
      ensureStringField_(payload, 'nombre');
      if (action === 'update') ensureStringField_(payload, 'id');
      return;

    case 'equipos':
      ensureActionAllowed_(action, ['create', 'update', 'delete']);
      if (action === 'delete') {
        ensureStringField_(payload, 'id');
        return;
      }
      ensureStringField_(payload, 'campeonatoId');
      ensureStringField_(payload, 'nombre');
      if (action === 'update') ensureStringField_(payload, 'id');
      return;

    case 'import':
      ensureActionAllowed_(action, ['migrate']);
      ensureStringField_(payload, 'campeonatoId');
      ensureStringField_(payload, 'disciplinaId');
      return;

    default:
      throw new Error('Recurso desconocido: "' + resource + '"');
  }
}

function ensureActionAllowed_(action, allowed) {
  if (allowed.indexOf(action) === -1) {
    throw new Error('Accion no permitida: ' + action);
  }
}

function ensureStringField_(payload, field) {
  const value = payload[field];
  if (typeof value !== 'string' || String(value).trim() === '') {
    throw new Error('Campo requerido: ' + field);
  }
}

function ensureYearField_(payload, field) {
  const value = Number(payload[field]);
  if (!isFinite(value) || value < 2024 || value > 2035) {
    throw new Error('Ano invalido: ' + field);
  }
}

function ensureNonNegativeNumberField_(payload, field) {
  const value = Number(payload[field]);
  if (!isFinite(value) || value < 0) {
    throw new Error('Numero invalido: ' + field);
  }
}

function appendAdminAuditFromResponse_(resource, action, payload, response, actor) {
  let parsed;
  try {
    parsed = JSON.parse(response.getContent());
  } catch (err) {
    return;
  }

  if (!parsed || Number(parsed.status) >= 400) return;

  appendAdminAudit_(resource, action, payload, actor);
}

function appendAdminAudit_(resource, action, payload, actor) {
  const sheet = getOrCreateSheet_('admin_audit', [
    'id',
    'actorEmail',
    'actorName',
    'resource',
    'action',
    'summary',
    'payload',
    'createdAt'
  ]);
  const entry = {
    id: generateUUID(),
    actorEmail: actor && actor.email ? String(actor.email) : '',
    actorName: actor && actor.name ? String(actor.name) : '',
    resource: String(resource || ''),
    action: String(action || ''),
    summary: buildAuditSummary_(resource, action, payload, actor),
    payload: JSON.stringify(maskAuditPayload_(payload)).slice(0, 1500),
    createdAt: new Date().toISOString()
  };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function (header) {
    return entry[header] !== undefined ? entry[header] : '';
  });
  sheet.appendRow(row);
}

function buildAuditSummary_(resource, action, payload, actor) {
  const actorPart = actor && actor.email ? String(actor.email) + ':' : '';
  if (payload && payload.id) {
    return actorPart + String(resource) + ':' + String(action) + ':' + String(payload.id);
  }
  if (payload && payload.nombre) {
    return actorPart + String(resource) + ':' + String(action) + ':' + String(payload.nombre);
  }
  return actorPart + String(resource) + ':' + String(action);
}

function maskAuditPayload_(payload) {
  const clone = {};
  Object.keys(payload || {}).forEach(function (key) {
    if (key === 'token' || key === 'password') return;
    clone[key] = payload[key];
  });
  return clone;
}

function getOrCreateSheet_(sheetName, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const missingHeaders = headers.filter(function (header) {
    return currentHeaders.indexOf(header) === -1;
  });
  if (missingHeaders.length) {
    const startColumn = currentHeaders.length + 1;
    sheet.getRange(1, startColumn, 1, missingHeaders.length).setValues([missingHeaders]);
  }

  return sheet;
}

/**
 * Obtiene una hoja por nombre desde el Spreadsheet configurado.
 * @param {string} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet(sheetName) {
  if (!SPREADSHEET_ID) throw new Error('SPREADSHEET_ID no configurado en Script Properties');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja "' + sheetName + '" no encontrada');
  return sheet;
}

/**
 * Convierte las filas de una hoja en array de objetos usando la primera fila como headers.
 * @param {string} sheetName
 * @returns {Object[]}
 */
function sheetToObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const range = sheet.getDataRange().getValues();
  if (!range.length) return [];
  const headers = range[0];
  const rows = range.slice(1);
  return rows
    .filter(function (row) { return row[0] !== '' && row[0] !== null; })
    .map(function (row) {
      return headers.reduce(function (obj, header, i) {
        obj[header] = row[i] === undefined || row[i] === null ? '' : row[i];
        return obj;
      }, {});
    });
}

/**
 * Genera un UUID v4 simple.
 * @returns {string}
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * Agrega una fila a una hoja dado un objeto (los headers deben coincidir).
 * @param {string} sheetName
 * @param {Object} data
 */
function appendRow(sheetName, data) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function (h) { return data[h] !== undefined && data[h] !== null ? data[h] : ''; });
  sheet.appendRow(row);
}

/**
 * Actualiza una fila por id en una hoja.
 * @param {string} sheetName
 * @param {string} id
 * @param {Object} updates
 * @returns {boolean}
 */
function updateRowById(sheetName, id, updates) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  if (idCol < 0) throw new Error('Columna id no encontrada en ' + sheetName);

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      headers.forEach(function (header, j) {
        if (updates[header] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(updates[header]);
        }
      });
      return true;
    }
  }
  return false;
}

/**
 * Elimina una fila por id.
 * @param {string} sheetName
 * @param {string} id
 * @returns {boolean}
 */
function deleteRowById(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  if (idCol < 0) return false;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}
