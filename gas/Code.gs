/**
 * Code.gs
 * Router principal de la Web App.
 *
 * GET  ?resource=campeonatos
 * GET  ?resource=campeonatos&id=
 * GET  ?resource=disciplinas&campeonatoId=
 * GET  ?resource=partidos&campeonatoId=&disciplinaId=&disciplina=&genero=&fase=&fecha=&jornada=
 * GET  ?resource=grupos&campeonatoId=&disciplinaId=&genero=
 * GET  ?resource=tabla&grupoId=
 * GET  ?resource=equipos&campeonatoId=
 *
 * POST { resource, action, payload }
 */

function doGet(e) {
  try {
    const params = e.parameter;
    const resource = params.resource;

    switch (resource) {
      case 'campeonatos':
        return params.id
          ? Championships.getById(params.id)
          : Championships.getAll();

      case 'disciplinas':
        return Disciplines.getByCampeonato(params.campeonatoId);

      case 'partidos':
        return Matches.query({
          campeonatoId: params.campeonatoId,
          disciplinaId: params.disciplinaId,
          disciplina: params.disciplina,
          genero: params.genero,
          fase: params.fase,
          fecha: params.fecha,
          jornada: params.jornada
        });

      case 'grupos':
        return Groups.query({
          campeonatoId: params.campeonatoId,
          disciplinaId: params.disciplinaId,
          genero: params.genero
        });

      case 'tabla':
        return Groups.getTabla(params.grupoId);

      case 'equipos':
        return Teams.getByCampeonato(params.campeonatoId);

      default:
        return errorResponse('Recurso desconocido: "' + resource + '"', 404);
    }
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const resource = String(body.resource || '');
    const action = String(body.action || '');
    const payload = body.payload || {};
    const token = String(body.token || '');

    if (resource === 'auth' && action === 'login') {
      return loginAdmin_(token);
    }

    const actor = requireAdminAuth_(token);

    validateMutationPayload_(resource, action, payload);

    const response = dispatchPost_(resource, action, payload);
    appendAdminAuditFromResponse_(resource, action, payload, response, actor);
    return response;
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

function dispatchPost_(resource, action, payload) {
  switch (resource) {
    case 'campeonatos':
      return Championships.mutate(action, payload);
    case 'disciplinas':
      return Disciplines.mutate(action, payload);
    case 'partidos':
      return Matches.mutate(action, payload);
    case 'grupos':
      return Groups.mutate(action, payload);
    case 'equipos':
      return Teams.mutate(action, payload);
    case 'import':
      return CSVImport.migrateFromTemp(payload);
    default:
      return errorResponse('Recurso desconocido: "' + resource + '"', 404);
  }
}

function loginAdmin_(token) {
  const actor = requireAdminAuth_(token);

  const response = jsonResponse({ authenticated: true, user: actor });
  appendAdminAuditFromResponse_('auth', 'login', {}, response, actor);
  return response;
}

/**
 * Valida una sesion admin basada en Google Sign-In.
 */
function requireAdminAuth_(idToken) {
  const config = getGoogleAuthConfig_();
  const tokenInfo = verifyGoogleIdToken_(idToken, config.clientId);
  const email = String(tokenInfo.email || '').toLowerCase();

  if (!email) {
    throw new Error('La cuenta de Google no expuso un correo valido');
  }
  if (String(tokenInfo.email_verified) !== 'true') {
    throw new Error('La cuenta de Google no tiene correo verificado');
  }
  if (String(tokenInfo.aud || '') !== String(config.clientId)) {
    throw new Error('Cliente Google invalido');
  }
  const admin = getAuthorizedAdminByEmail_(email);

  return {
    email: email,
    name: String(admin && admin.nombre ? admin.nombre : tokenInfo.name || ''),
    role: String(admin && admin.rol ? admin.rol : 'admin'),
    picture: String(tokenInfo.picture || '')
  };
}
