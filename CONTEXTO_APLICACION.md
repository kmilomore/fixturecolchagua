# Contexto General de la Aplicación

## Objetivo

La aplicación gestiona y publica el fixture del **Campeonato Deportivo SLEP Colchagua 2026**. Su foco actual es mostrar de forma pública partidos, calendario, grupos y tablas para la disciplina **VOLEIBOL**, usando Google Sheets como fuente de datos y Google Apps Script como API.

El objetivo del MVP es:

- Publicar un calendario deportivo claro para establecimientos.
- Importar fixture desde una hoja simple (`import_temp`).
- Mostrar partidos por campeonato, disciplina, género, categoría y fase.
- Administrar resultados desde un panel básico.
- Mantener el sistema extensible para más disciplinas y campeonatos.
- Mantener el sitio como espacio público: solo usuarios admin pueden crear campeonatos.

## Arquitectura

```txt
FIXTURE 2.0/
├── frontend/              Aplicación React + Vite + TypeScript
│   ├── src/
│   │   ├── api/           Cliente HTTP hacia Google Apps Script
│   │   ├── components/    Componentes visuales reutilizables
│   │   ├── pages/         Vistas del router
│   │   ├── stores/        Estado global con Zustand
│   │   ├── types/         Tipos TypeScript
│   │   ├── utils/         Utilidades de fechas y agrupación
│   │   └── lib/           Helpers generales
│   ├── .env.local         Variables reales del frontend
│   ├── .env.example       Plantilla de variables
│   ├── public/
│   │   └── SLEPCOLCHAGUA.webp Logo usado en header y favicon
│   └── vercel.json        Configuración de Vercel
│
└── gas/                   Código Google Apps Script
    ├── Code.gs            Router principal doGet / doPost
    ├── Utils.gs           Helpers de Sheets, JSON y filas
    ├── Championships.gs   Campeonatos
    ├── Disciplines.gs     Disciplinas
    ├── Teams.gs           Equipos
    ├── Matches.gs         Partidos
    ├── Groups.gs          Grupos y tablas
    ├── CSVImport.gs       Importación desde import_temp
    ├── ImportRunner.gs    Script manual para preparar/importar
    └── Phases.gs          Base para fases eliminatorias
```

## Stack

- Frontend: React + Vite + TypeScript.
- Estilos: Tailwind CSS.
- UI: componentes estilo shadcn con Radix primitives.
- Routing: React Router.
- Fetching/cache: TanStack Query.
- Estado local persistente: Zustand.
- Fechas: date-fns con locale español.
- Backend/API: Google Apps Script Web App.
- Base de datos: Google Sheets.
- Deploy frontend: Vercel.

## Identidad Visual

La aplicación usa el logo `frontend/public/SLEPCOLCHAGUA.webp` como:

- Logo principal en el header.
- Logo en la portada/home.
- Favicon y apple touch icon desde `frontend/index.html`.

Paleta institucional tomada de la referencia visual entregada:

```txt
Azul profundo: #25306B
Azul SLEP:     #006BB9
Rojo acento:   #FF1D3D
Gris fondo:    #EDF0F5
Blanco:        #FFFFFF
```

Archivos donde se aplica la paleta:

- `frontend/tailwind.config.js`
- `frontend/src/index.css`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/badge.tsx`
- `frontend/src/pages/campeonato/CampeonatoLayout.tsx`

Nota importante: se eliminó el uso visual amarillo en botones. Si aparece un botón amarillo, revisar clases `bg-secondary`, caché de Vite/Tailwind o recargar con `Ctrl + F5`.

## Variables de Entorno

Archivo real: `frontend/.env.local`.

```env
VITE_GAS_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
VITE_APP_NAME=Campeonato Deportivo SLEP Colchagua
VITE_GOOGLE_CLIENT_ID=<google_oauth_client_id>
```

La autenticación admin debe usar Google Sign-In. El frontend necesita `VITE_GOOGLE_CLIENT_ID` y el backend debe validar el `id_token` contra `GOOGLE_CLIENT_ID`. La autorización admin debe resolverse cruzando el correo en una hoja `admin_whitelist` dentro del mismo Spreadsheet.

Diferencia operativa importante:

- `VITE_GOOGLE_CLIENT_ID` y `VITE_GAS_URL` viven en Vercel y solo afectan al frontend.
- `GOOGLE_CLIENT_ID` y `SPREADSHEET_ID` viven en Script Properties del proyecto de Google Apps Script.
- Cambiar variables en Vercel no configura automáticamente Script Properties.
- El `GOOGLE_CLIENT_ID` del backend debe ser exactamente el mismo OAuth Client ID del frontend y tener formato `*.apps.googleusercontent.com`.

El cliente POST del frontend hacia Apps Script no debe forzar `Content-Type: application/json`. Para evitar preflight CORS contra la Web App de Apps Script, el request se envía con `body: JSON.stringify(...)` y sin header explícito de content type.

## Google Sheets

El Spreadsheet usado por GAS se configura en `Utils.gs` mediante `SPREADSHEET_ID` o Script Properties.

Hojas obligatorias:

### `campeonatos`

```csv
id,nombre,año,disciplinas,estado,descripcion,createdAt
```

### `disciplinas`

```csv
id,campeonatoId,nombre,categorias,estado
```

### `equipos`

```csv
id,campeonatoId,disciplinaId,nombre,establecimiento,genero,categoria,grupo
```

### `partidos`

```csv
id,campeonatoId,disciplinaId,disciplina,fecha,hora,lugar,localId,visitaId,marcadorLocal,marcadorVisita,fase,genero,categoria,grupo,estado,jornada
```

Importante:

- `fecha` debe exponerse al frontend como ISO sin hora: `YYYY-MM-DD`.
- `hora` debe exponerse como `HH:mm`.
- `grupo` se usa para calendario y agrupación visual.

### `grupos`

```csv
id,campeonatoId,disciplinaId,nombre,genero,categoria,equiposIds
```

### `tabla_posiciones`

```csv
id,grupoId,equipoId,pj,pg,pe,pp,sf,sc,diferencia,puntos
```

### `import_temp`

Hoja temporal para importar fixture plano:

```csv
DEPORTE,FECHA,LUGAR,Hora,Local,Visita,Género,Grupo
```

Ejemplo:

```csv
VOLEIBOL,05/05/2026,GIMNASIO TECHADO,09:00,Liceo Jose Gregorio Argomedo,Colegio British College,Damas,1
```

## Flujo de Importación

El flujo recomendado es ejecutar en Apps Script:

```js
importarFixtureInicialDesdeImportTemp()
```

Archivo responsable: `gas/ImportRunner.gs`.

Esta función:

- Crea hojas faltantes.
- Agrega encabezados faltantes.
- Crea campeonato base `camp-2026`.
- Crea disciplina base `disc-voleibol`.
- Lee `import_temp`.
- Crea equipos automáticamente.
- Crea o actualiza partidos.
- Convierte fechas a `YYYY-MM-DD`.
- Convierte horas a `HH:mm` al exponerlas desde la API.
- Reconstruye la hoja `grupos` usando `equipos.grupo`.
- Evita duplicar partidos al reejecutar.

Si se corrige algo en `import_temp`, se puede volver a ejecutar el importador. El sistema debe actualizar partidos existentes y saltar duplicados.

## Endpoints GAS

Base URL:

```txt
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```

### GET

```txt
?resource=campeonatos
?resource=campeonatos&id=<id>
?resource=disciplinas&campeonatoId=<id>
?resource=equipos&campeonatoId=<id>
?resource=partidos&campeonatoId=<id>&disciplinaId=<id>&genero=<Damas|Varones>&fase=<fase>
?resource=grupos&campeonatoId=<id>&disciplinaId=<id>&genero=<Damas|Varones>
?resource=tabla&grupoId=<id>
```

### POST

Formato general:

```json
{
  "resource": "partidos",
  "action": "resultado",
  "payload": {},
  "token": "<GOOGLE_ID_TOKEN>"
}
```

### Login admin

```json
{
  "resource": "auth",
  "action": "login",
  "payload": {},
  "token": "<GOOGLE_ID_TOKEN>"
}
```

Script Properties requeridas en Google Apps Script:

```txt
GOOGLE_CLIENT_ID=<google_oauth_client_id>
SPREADSHEET_ID=<google_spreadsheet_id>
```

Archivo de manifiesto requerido en Apps Script:

```json
{
  "timeZone": "America/Santiago",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

Notas de operación para Apps Script:

- El manifiesto va en `appsscript.json`, no dentro de `Code.gs`, `Utils.gs` ni `CSVImport.gs`.
- Después de agregar `script.external_request`, hay que ejecutar una función manualmente desde el editor para reautorizar `UrlFetchApp.fetch`.
- Un helper temporal útil para disparar esa autorización es `authorizeExternalRequest()` en `Utils.gs`.
- Si `authorizeExternalRequest()` devuelve `400`, eso confirma que `UrlFetchApp.fetch` ya quedó autorizado. El `400` es esperado porque usa un `id_token` falso de prueba.
- Después de cambiar Script Properties, manifiesto o código GAS, hay que redeployar la Web App como nueva versión para que `/exec` use esos cambios.
- El deployment de la Web App debe ejecutarse como `Me`.

Hoja requerida para lista blanca admin:

```csv
email,nombre,estado,rol,createdAt
admin1@dominio.cl,Administrador Principal,activo,superadmin,2026-05-04T00:00:00.000Z
admin2@dominio.cl,Coordinador Deportes,activo,admin,2026-05-04T00:00:00.000Z
```

Reglas:

- Solo entran filas con `estado=activo`.
- El cruce se hace por `email` en minúsculas.
- La hoja puede mantenerse manualmente desde Google Sheets sin redeploy.

Recursos soportados:

- `campeonatos`: `create`, `update`.
- `disciplinas`: `create`, `update`.
- `equipos`: `create`, `update`, `delete`.
- `partidos`: `create`, `update`, `resultado`.
- `grupos`: `create`, `update`.
- `import`: `migrate`.

### Importación por POST

Alternativa a ejecutar el script manual:

```json
{
  "resource": "import",
  "action": "migrate",
  "payload": {
    "campeonatoId": "camp-2026",
    "disciplinaId": "disc-voleibol",
    "disciplina": "VOLEIBOL",
    "categoria": "Sub14",
    "autoCrearEquipos": true
  }
}
```

## Rutas Frontend

### Públicas

- `/`: inicio y campeonato destacado.
- `/campeonatos`: listado de campeonatos.
- `/mis-partidos`: búsqueda pública por establecimiento para ver solo sus partidos.
- `/kiosco`: modo pantalla completa/proyector con próximo partido, partidos de hoy y próximos encuentros.
- `/campeonatos/:id`: resumen del campeonato.
- `/campeonatos/:id/calendario`: calendario mensual real.
- `/campeonatos/:id/grupos`: grupos y tablas.
- `/campeonatos/:id/fases`: bracket eliminatorio.
- `/campeonatos/:id/partidos`: listado de partidos.

### Administración

- `/admin`: acceso admin exclusivo con Google Sign-In y lista blanca de correos.
- `/admin/resultados`: ingreso de resultados.
- `/campeonatos/nuevo`: wizard simple de creación, protegido por sesión admin.

La ruta `/campeonatos/nuevo` no debe ser pública. Si el usuario no tiene sesión admin (`useAdminSession().ok`), se redirige a `/admin`.

## Archivos Clave del Frontend

- `src/api/gasClient.ts`: cliente tipado hacia GAS.
- `src/types/index.ts`: contratos de datos.
- `src/components/DisciplineFilter.tsx`: filtros horizontales por disciplina/género/categoría/fase.
- `src/components/CalendarView.tsx`: calendario mensual.
- `src/components/MatchCard.tsx`: tarjeta de partido.
- `src/components/GroupTable.tsx`: tabla de posiciones.
- `src/components/BracketView.tsx`: bracket de semifinales, final, tercer lugar y campeón.
- `src/components/CampeonatoForm.tsx`: wizard de campeonato.
- `src/components/AppShell.tsx`: layout general, header, logo y navbar móvil.
- `src/components/ui/button.tsx`: variantes globales de botones. Evitar que `secondary` vuelva a ser amarillo.
- `src/components/ui/badge.tsx`: variantes globales de badges.
- `src/pages/campeonato/*`: páginas internas del campeonato.
- `src/pages/campeonato/CampeonatoLayout.tsx`: cabecera de campeonato con gradiente institucional.
- `src/pages/MisPartidosPage.tsx`: vista pública para buscar partidos por establecimiento.
- `src/pages/KioscoPage.tsx`: modo kiosco/proyector con actualización automática cada 60 segundos.
- `src/utils/formatDate.ts`: normalización y formato de fechas/horas.
- `src/utils/matches.ts`: helpers para próximo partido, partidos de hoy, búsqueda y ordenamiento.
- `src/stores/adminSession.ts`: sesión admin persistida en sessionStorage con `id_token` y perfil Google.

## Estilo Global del Frontend

Las páginas internas de campeonato deben compartir el mismo estilo de marca que la página principal:

- Cabecera con gradiente institucional `--gradient-brand`.
- Logo oficial visible.
- Navegación interna en azul profundo.
- Filtros horizontales, no verticales.
- Botones primarios con `bg-primary`.
- Botones secundarios también en azul institucional, no amarillo.
- Badges secundarios con azul suave.
- Filas destacadas de tablas con azul suave, no dorado/amarillo.

El filtro `DisciplineFilter` debe mostrarse como una barra horizontal:

```txt
VOLEIBOL | Damas | Varones | Sub14 | Grupos | Semis | Final
```

Debe usar scroll horizontal en pantallas pequeñas, no apilar botones verticalmente.

## Hallazgos y Decisiones Importantes

- Google Sheets puede devolver celdas de fecha/hora como objetos `Date`, que al serializarse aparecen como `2026-05-15T04:00:00.000Z` o `1899-12-30T13:42:45.000Z`.
- Por eso `Matches.gs` normaliza API output:
  - `fecha`: `YYYY-MM-DD`.
  - `hora`: `HH:mm`.
- El calendario frontend agrupa por `YYYY-MM-DD`; si llega otro formato, los partidos pueden no aparecer.
- La hoja `grupos` no se llena sola con solo agregar la columna `Grupo`; debe ejecutarse `CSVImport.rebuildGrupos_()` mediante `importarFixtureInicialDesdeImportTemp()`.
- `Groups.getTabla()` muestra participantes aunque `tabla_posiciones` esté vacía, usando `grupos.equiposIds` como fallback.
- `tabla_posiciones` se actualiza al registrar resultados mediante `Matches.mutate('resultado')`.
- El bracket de fases reales se renderiza desde `BracketView`. Muestra semifinales, final, tercer lugar y campeón cuando existen partidos con fase `semifinal`, `final` y `tercer_lugar`.
- Si no hay fases cargadas, `BracketView` muestra un mensaje claro en vez de una grilla vacía.
- La creación de campeonatos es una función administrativa. No debe aparecer como acción pública en home/listados.
- El home muestra un bloque de próximo partido y partidos de hoy usando el campeonato activo.
- La vista `Mis partidos` filtra por coincidencia parcial en `localNombre` y `visitaNombre`.
- El modo kiosco consulta partidos cada 60 segundos mediante TanStack Query (`refetchInterval`).
- La integración con Google Sign-In requiere permitir `https://accounts.google.com` en CSP para scripts y estilos. En Vercel se usa además `style-src-elem` para evitar el bloqueo del stylesheet de GSI.
- El frontend publica `Cross-Origin-Opener-Policy: same-origin-allow-popups` para convivir mejor con el flujo popup de Google Identity Services.
- El warning `Cross-Origin-Opener-Policy policy would block the window.postMessage call` puede seguir apareciendo en consola incluso cuando el login funciona. Si la credencial vuelve y el acceso admin entra, se considera ruido no bloqueante.
- Si Apps Script responde `GOOGLE_CLIENT_ID no configurado en Script Properties`, el problema está en Script Properties del proyecto GAS, no en variables de entorno de Vercel.
- Si Apps Script responde `No cuentas con el permiso para llamar a UrlFetchApp.fetch`, el problema es de manifiesto o autorización del proyecto GAS, no del frontend.
- Si un cambio en Apps Script parece no surtir efecto, validar que `VITE_GAS_URL` apunte al mismo deployment `/exec` que se acaba de redeployar. Un error persistente con código local correcto suele significar que el frontend está llamando a una versión vieja o a otro proyecto.

## Cosas que Deben Evitarse

- No editar manualmente IDs generados (`id`, `localId`, `visitaId`, `equiposIds`) sin entender relaciones.
- No cambiar nombres de encabezados en Sheets; el GAS depende de nombres exactos.
- No guardar fechas con hora en `partidos.fecha`; debe quedar `YYYY-MM-DD`.
- No guardar horas en `partidos.fecha`; hora va en `partidos.hora`.
- No borrar `grupo` de `partidos` o `equipos` si se quiere calendario ordenado por grupos.
- No duplicar filas en `partidos`; usar el importador, que actualiza/salta duplicados.
- No usar contraseñas locales para admin; el acceso debe resolverse solo con Google Sign-In y validación backend.
- No volver a dejar `/campeonatos/nuevo` accesible públicamente.
- No agregar botones públicos de "Crear campeonato" en home o listado sin validar admin.
- No usar amarillo/dorado para acciones principales; la paleta actual usa azul profundo, azul SLEP, rojo y gris claro.
- No cambiar el logo por otro archivo sin actualizar `index.html`, `AppShell` y la portada.
- No envolver `/kiosco` en `AppShell`; debe conservar pantalla completa sin navbar.
- No mezclar categorías sin actualizar `disciplinas.categorias`.
- No desplegar cambios de GAS sin crear nueva versión de Web App si el despliegue lo requiere.
- No asumir que Apps Script envía CORS/errores como un backend tradicional; la API usa `status` dentro del JSON.

## Comandos Útiles

Desde `frontend/`:

```bash
npm run dev
npm run build
npm run preview
```

Después de cambiar `.env.local`, reiniciar `npm run dev`.

Después de cambiar archivos `gas/*.gs`, copiar/actualizar en Apps Script y redeployar la Web App.

## Próximos Pasos Recomendados

- Agregar botón admin para ejecutar importación desde el frontend.
- Agregar vista de detalle de partido.
- Agregar generación automática de grupos desde `import_temp`.
- Mantener lista blanca de correos admin y rotación del cliente OAuth cuando cambie el entorno.
- Separar chunk del frontend con lazy routes si crece el bundle.
- Agregar carga/edición visual de semifinales, final y tercer lugar desde admin.
