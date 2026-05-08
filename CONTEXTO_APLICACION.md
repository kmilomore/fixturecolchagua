# Contexto General de la Aplicación

## Objetivo

La aplicación gestiona y publica el fixture del **Campeonato Deportivo SLEP Colchagua 2026**. Su foco actual es mostrar de forma pública partidos, calendario, grupos y tablas para **múltiples disciplinas** dentro de un mismo campeonato, usando Google Sheets como fuente de datos y Google Apps Script como API.

El objetivo del MVP es:

- Publicar un calendario deportivo claro para establecimientos.
- Importar fixture desde una hoja simple (`import_temp`).
- Mostrar partidos por campeonato, disciplina, género, categoría y fase.
- Administrar resultados desde un panel básico.
- Exponer resúmenes optimizados para home y modo kiosco sin descargar todo el fixture en esas vistas.
- Mantener contexto claro de disciplina en vistas públicas cuando un campeonato agrupa varios deportes.
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

## Documentación por Módulo

Además de este contexto general, existen documentos específicos para módulos con comportamiento propio:

- `CAMPEONATOS_CONTEXT.MD`: documentación detallada del módulo campeonatos, navegación interna, layout contextual, filtros persistidos, grupos, fases y partidos.
- `KIOKO_CONTEX.MD`: documentación detallada del módulo kiosco, su consumo de datos, fullscreen, operador y meteorología.
- `KIOKO_CONTEX.MD` debe considerarse la fuente de verdad para fullscreen del kiosco, selector por escuela, compactación por resolución y fallback meteorológico.
- `ADMIN_CONTEX.MD`: documentación detallada del módulo admin, autenticación, sesión, permisos operativos y gestión de partidos.

## Funcionalidades Nuevas Documentadas

- Endpoint resumido de partidos para home y kiosco mediante `?resource=partidos&vista=resumen`.
- Sesión admin con expiración local en `sessionStorage` para no reutilizar tokens indefinidamente.
- Navegación móvil sin duplicidad entre `Campeonatos` y `Fixture`, con acceso directo al campeonato activo.
- Shell público refinado para móvil: header más compacto, navbar inferior con mejor separación táctil y sin keys duplicadas al resolver el fixture activo.
- Estados vacíos y errores más útiles en `Mis partidos` y `Admin resultados`.
- Detalle unificado de partido abierto desde query params (`partidoId`, `campeonatoId`) y disponible desde home, calendario, listados y búsqueda global.
- Deep links públicos por partido hacia el campeonato correspondiente, con enlace copiable desde tarjetas y diálogo de detalle.
- Buscador global en el header para saltar directo a partidos o derivar una búsqueda pública hacia `Mis partidos`.
- `Mis partidos` ahora incorpora autocompletado por establecimiento, favoritos persistidos en `localStorage` y sincronización del texto de búsqueda en la URL.
- `PartidosPage` suma filtros rápidos de jornada (`Hoy`, `Mañana`, `En vivo`) e índice sticky por fecha para saltar directamente a la jornada deseada.
- `DisciplineFilter` agrega hoja inferior móvil para edición de filtros sin depender solo de scroll horizontal.
- `HomePage` prioriza una CTA principal `Ver próximo partido` cuando existe un siguiente encuentro disponible.
- `CalendarView` abre el detalle unificado del partido al seleccionar un encuentro en lista o calendario mensual.
- `MatchCard` refuerza estado operativo, recinto, fecha/hora y acciones rápidas (`Ver detalle`, `Copiar link`).
- Feedback transaccional visible al guardar resultados y recálculo de tablas.
- Saneamiento básico de strings provenientes de Google Sheets antes de exponerlos al frontend.
- Persistencia del filtro de disciplina, género, categoría y fase al navegar entre Resumen, Calendario, Grupos, Fases y Partidos dentro de un campeonato.
- Refuerzo visual de la disciplina activa en el módulo de campeonato: tabs con mayor contraste, bloque de filtro con disciplina seleccionada y badge visible en el banner.
- Navegación interna del campeonato optimizada para responsive: barra sticky con scroll horizontal, filtros separados por franjas y calendario móvil con selector claro entre lista y mes.
- Visibilidad explícita de la disciplina en los resúmenes públicos: `Próximo partido` de la home y tarjetas de `KioscoPage` para siguiente partido, partidos de hoy y próximos encuentros.
- Home y dashboard del campeonato con jerarquía visual reforzada: hero más editorial, métricas rápidas, cards con elevación suave y mejor lectura en celular.
- Sistema visual base refinado en componentes UI: `Card`, `Button`, `Badge` e `Input` ahora comparten sombras suaves, bordes más limpios, gradientes institucionales y microinteracciones consistentes.
- Proxy same-origin `/api/weather` para meteorología del kiosco, evitando dependencia directa de `connect-src` externo en el navegador.
- Kiosco con fullscreen sin scroll, compactación automática por resolución y contención estricta de bloques secundarios.
- Modo kiosco filtrable por escuela usando `equipos.establecimiento`, con persistencia local de la selección.

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
- `frontend/src/components/ui/card.tsx`
- `frontend/src/components/ui/input.tsx`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/pages/campeonato/CampeonatoLayout.tsx`

Dirección visual actual implementada:

- Fondo general con capas suaves de gradiente y textura tenue, evitando una superficie plana.
- Header principal con gradiente institucional y profundidad más marcada, manteniendo lectura clara del logo y navegación.
- Cards como superficies elevadas, con borde claro, sombreado suave y un brillo sutil en hover.
- Botones primarios con gradiente azul institucional; botones secundarios y outline conservan contraste alto sin caer en tonos amarillos.
- Badges con tracking alto y tono más editorial para reforzar estados, género, fase y disciplina.
- Inputs con tratamiento visual consistente al resto del sistema, usando borde suave, sombra ligera y fondo más pulido.
- La home y el resumen del campeonato deben sentirse como piezas de portada, no solo como una grilla funcional de tarjetas.

Nota importante: se eliminó el uso visual amarillo en botones. Si aparece un botón amarillo, revisar clases `bg-secondary`, caché de Vite/Tailwind o recargar con `Ctrl + F5`.

## Variables de Entorno

Archivo real: `frontend/.env.local`.

```env
VITE_GAS_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
VITE_APP_NAME=Campeonato Deportivo SLEP Colchagua
VITE_GOOGLE_CLIENT_ID=<google_oauth_client_id>
```

La autenticación admin debe usar Google Sign-In. El frontend necesita `VITE_GOOGLE_CLIENT_ID` y el backend debe validar el `id_token` contra `GOOGLE_CLIENT_ID`. La autorización admin debe resolverse cruzando el correo en una hoja `admin_whitelist` dentro del mismo Spreadsheet.

La sesión admin del frontend se persiste en `sessionStorage`, pero ahora incluye expiración local. Si la sesión expira, el guard de rutas deja de considerarla válida y el cliente deja de reenviar el token automáticamente.

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
- Crea campeonato base `camp-2026` si no existe.
- Lee `import_temp`.
- Detecta automáticamente múltiples disciplinas desde la columna `DEPORTE`.
- Crea o reutiliza filas en `disciplinas` por cada deporte encontrado.
- Crea equipos automáticamente.
- Crea o actualiza partidos por disciplina.
- Convierte fechas a `YYYY-MM-DD`.
- Convierte horas a `HH:mm` al exponerlas desde la API.
- Reconstruye la hoja `grupos` usando `equipos.grupo` para cada disciplina importada.
- Evita duplicar partidos al reejecutar.

Notas de uso:

- Si `import_temp` mezcla varias disciplinas, `importarFixtureInicialDesdeImportTemp()` es ahora la función correcta.
- Si quieres importar solo una disciplina específica, existe `importarUnaDisciplinaDesdeImportTemp(disciplinaNombre, disciplinaId, categoria)`.
- El importador multi usa la columna `DEPORTE` para separar filas por disciplina. Si esa columna viene vacía, la fila no puede clasificarse correctamente.
- Las nuevas disciplinas se crean con ID derivado del nombre, por ejemplo `disc-futsal`, `disc-basquetbol`, `disc-balonmano`.
- El campo `campeonatos.disciplinas` se sincroniza automáticamente con la lista detectada en la importación.

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
?resource=partidos&campeonatoId=<id>&vista=resumen
?resource=grupos&campeonatoId=<id>&disciplinaId=<id>&genero=<Damas|Varones>
?resource=tabla&grupoId=<id>
```

`vista=resumen` devuelve un payload agregado orientado a pantallas públicas de consulta rápida:

```json
{
  "siguiente": {},
  "hoy": [],
  "proximos": [],
  "totalHoy": 0,
  "updatedAt": "2026-05-04T12:00:00.000Z"
}
```

Uso recomendado:

- `HomePage`: próximo partido y partidos de hoy del campeonato activo.
- `KioscoPage`: siguiente partido, partidos de hoy y próximos encuentros con polling cada 60 segundos.
- No usar `vista=resumen` en vistas operativas que necesiten el fixture completo.

Consideraciones de UX ya implementadas para `vista=resumen`:

- Los bloques públicos que consumen este resumen deben mostrar la disciplina del partido cuando el campeonato tenga más de un deporte.
- `HomePage` expone la disciplina en el card de `Próximo partido`.
- `KioscoPage` expone la disciplina en `Próximo partido`, `Partidos de hoy` y `Próximos encuentros`.

Consideraciones de UX ya implementadas para navegación por campeonato:

- El filtro se persiste en query params mediante `disciplinaId`, `genero`, `categoria` y `fase`.
- La navegación interna del campeonato debe conservar esos query params para no perder el contexto al cambiar de vista.
- El banner del campeonato y el bloque del filtro deben dejar visible la disciplina actualmente seleccionada.
- El detalle de partido también puede abrirse por query params sobre la vista actual, usando `partidoId` y `campeonatoId` sin romper el contexto previo del campeonato.
- La búsqueda global del header puede derivar al usuario a un deep link de partido o a `/mis-partidos?search=...` según el tipo de coincidencia.

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

Modo multi-disciplina por POST:

```json
{
  "resource": "import",
  "action": "migrate",
  "payload": {
    "campeonatoId": "camp-2026",
    "multiDisciplina": true,
    "categoria": "Sub14",
    "autoCrearEquipos": true
  }
}
```

En ese modo, `disciplinaId` deja de ser obligatorio porque el backend lo resuelve por cada deporte encontrado en `import_temp`.

## Rutas Frontend

### Públicas

- `/`: inicio y campeonato destacado.
- `/campeonatos`: listado de campeonatos.
- `/mis-partidos`: búsqueda pública por establecimiento para ver solo sus partidos.
- `/kiosco`: modo pantalla completa/proyector con próximo partido, partidos de hoy, próximos encuentros, filtro por escuela y meteorología resiliente.
- `/campeonatos/:id`: resumen del campeonato.
- `/campeonatos/:id/calendario`: calendario mensual real.
- `/campeonatos/:id/grupos`: grupos y tablas.
- `/campeonatos/:id/fases`: bracket eliminatorio.
- `/campeonatos/:id/partidos`: listado de partidos.

Notas de navegación pública:

- No existe todavía una ruta dedicada tipo `/partidos/:id`; el detalle actual se resuelve como overlay reutilizable controlado por query params.
- Los deep links de partido apuntan hoy a `/campeonatos/:id/partidos?...&partidoId=...&campeonatoId=...` y son la forma canónica de compartir un partido.

### Administración

- `/admin`: acceso admin exclusivo con Google Sign-In y lista blanca de correos.
- `/admin/resultados`: ingreso de resultados. **Protegida por `<RequireAdmin>`.**
- `/campeonatos/nuevo`: wizard simple de creación. **Protegida por `<RequireAdmin>`.**

Las rutas `/admin/resultados` y `/campeonatos/nuevo` están envueltas en `<RequireAdmin>` a nivel de router. Si el usuario no tiene sesión admin activa, se redirigen a `/admin`. No eliminar este guard ni mover estas rutas fuera de `<RequireAdmin>`.

## Archivos Clave del Frontend

- `src/api/gasClient.ts`: cliente tipado hacia GAS. Incluye `fetchWithTimeout` con `AbortController` (15 s) aplicado a todos los GET y POST. Si GAS no responde en ese plazo, la promesa se cancela y TanStack Query recibe el error.
- `src/types/index.ts`: contratos de datos.
- `src/utils/matchLinks.ts`: construcción y limpieza de deep links de partido sobre la URL actual y en formato canónico compartible.
- `src/components/DisciplineFilter.tsx`: filtros horizontales por disciplina/género/categoría/fase.
- `src/components/CalendarView.tsx`: calendario mensual.
- `src/components/MatchCard.tsx`: tarjeta de partido.
- `src/components/MatchDetailDialog.tsx`: detalle unificado del partido con acciones rápidas y enlace copiable.
- `src/components/GlobalMatchDetailController.tsx`: controlador global que abre el detalle del partido desde query params en cualquier vista dentro de `AppShell`.
- `src/components/GlobalHeaderSearch.tsx`: buscador global del header para partidos, recintos, disciplinas y derivación a `Mis partidos`.
- `src/components/GroupTable.tsx`: tabla de posiciones.
- `src/components/BracketView.tsx`: bracket de semifinales, final, tercer lugar y campeón.
- `src/components/CampeonatoForm.tsx`: wizard de campeonato.
- `src/components/AppShell.tsx`: layout general, header, logo y navbar móvil.
- `src/components/AppShell.tsx` también concentra parte importante de la identidad pública: header, estados activos de navegación, buscador global, navbar móvil, overlay global de detalle y contenedor visual del shell.
- `src/components/ui/button.tsx`: variantes globales de botones. Evitar que `secondary` vuelva a ser amarillo.
- `src/components/ui/badge.tsx`: variantes globales de badges.
- `src/components/ui/card.tsx`: superficie visual compartida por prácticamente todas las vistas públicas y administrativas.
- `src/components/ui/input.tsx`: estilo base de campos de búsqueda y formularios.
- `src/pages/campeonato/*`: páginas internas del campeonato.
- `src/pages/campeonato/CampeonatoLayout.tsx`: cabecera de campeonato con gradiente institucional.
- `src/pages/HomePage.tsx`: hero principal, métricas rápidas y acceso editorial a vistas públicas.
- `src/pages/MisPartidosPage.tsx`: vista pública para buscar partidos por establecimiento, con sugerencias y favoritos.
- `src/pages/KioscoPage.tsx`: modo kiosco/proyector con actualización automática cada 60 segundos y reloj aislado para no rerenderizar toda la vista por segundo.
- `api/weather.ts`: proxy serverless same-origin para meteorología del kiosco en producción.
- `src/pages/admin/AdminResultadosPage.tsx`: flujo de marcadores con feedback de guardado, selección automática de campeonato activo y estados vacíos operativos.
- `src/utils/formatDate.ts`: normalización y formato de fechas/horas.
- `src/utils/matches.ts`: helpers para próximo partido, partidos de hoy, búsqueda y ordenamiento.
- `src/stores/adminSession.ts`: sesión admin persistida en sessionStorage con `id_token`, perfil Google y expiración local.

## Estilo Global del Frontend

Las páginas internas de campeonato deben compartir el mismo estilo de marca que la página principal:

- Cabecera con gradiente institucional `--gradient-brand`.
- Fondo general con capas suaves y sin planos grises puros.
- Logo oficial visible.
- Navegación interna en azul profundo.
- Filtros horizontales, no verticales, con scroll horizontal explícito en pantallas pequeñas.
- Botones primarios con presencia visual fuerte y gradiente azul institucional.
- Botones secundarios y outline también en lenguaje institucional, no amarillo.
- Badges secundarios con azul suave y tratamiento consistente de mayúsculas/tracking.
- Cards elevadas con sombra suave, bordes sutiles y microinteracción ligera al hover.
- Inputs y superficies auxiliares con el mismo lenguaje visual que las cards.
- Filas destacadas de tablas con azul suave, no dorado/amarillo.
- La jerarquía tipográfica debe ser visible: `font-display` para encabezados, `DM Sans` para lectura continua, descripciones con ancho controlado.
- En móvil, la prioridad es lectura y continuidad: CTAs apilados, tabs deslizables y bloques sin cortes laterales.

El filtro `DisciplineFilter` debe mostrarse como una barra horizontal:

```txt
VOLEIBOL | Damas | Varones | Sub14 | Grupos | Semis | Final
```

Debe usar scroll horizontal en pantallas pequeñas, no apilar botones verticalmente.

Utilidades visuales ya introducidas en `src/index.css`:

- `.no-scrollbar`: oculta scrollbar visual en contenedores horizontales manteniendo scroll funcional.
- `.surface-panel`: agrega brillo sutil de superficie al hover en cards y paneles.
- `.glass-strip`: crea franjas translúcidas suaves para métricas, overlays y bloques de apoyo.
- `text-wrap: balance` en headings y `text-wrap: pretty` en párrafos para mejorar ritmo de lectura.

## Hallazgos y Decisiones Importantes

- Google Sheets puede devolver celdas de fecha/hora como objetos `Date`, que al serializarse aparecen como `2026-05-15T04:00:00.000Z` o `1899-12-30T13:42:45.000Z`.
- Por eso `Matches.gs` normaliza API output:
  - `fecha`: `YYYY-MM-DD`.
  - `hora`: `HH:mm`.
- `Matches.gs` también sanea texto básico proveniente de Sheets para evitar caracteres de control, espacios duplicados y strings visualmente sucios en nombre de equipos, lugar, grupo, fase y estado.
- El calendario frontend agrupa por `YYYY-MM-DD`; si llega otro formato, los partidos pueden no aparecer.
- La hoja `grupos` no se llena sola con solo agregar la columna `Grupo`; debe ejecutarse `CSVImport.rebuildGrupos_()` mediante `importarFixtureInicialDesdeImportTemp()`.
- `Groups.getTabla()` muestra participantes aunque `tabla_posiciones` esté vacía, usando `grupos.equiposIds` como fallback.
- `tabla_posiciones` se actualiza al registrar resultados mediante `Matches.mutate('resultado')`.
- El bracket de fases reales se renderiza desde `BracketView`. Muestra semifinales, final, tercer lugar y campeón cuando existen partidos con fase `semifinal`, `final` y `tercer_lugar`.
- Si no hay fases cargadas, `BracketView` muestra un mensaje claro en vez de una grilla vacía.
- La creación de campeonatos es una función administrativa. No debe aparecer como acción pública en home/listados.
- El home muestra un bloque de próximo partido y partidos de hoy usando el campeonato activo, pero ahora consume un resumen agregado desde GAS en vez de pedir el fixture completo.
- El home evolucionó a una portada más editorial con hero, CTAs principales y métricas rápidas. Si se simplifica, no perder esa jerarquía visual.
- El home ahora debe priorizar una CTA explícita a `Ver próximo partido` cuando exista `siguiente` en el resumen del campeonato activo.
- La navegación móvil usa acceso directo al fixture del campeonato activo para reducir fricción de consulta.
- El `AppShell` debe conservar el navbar móvil con targets táctiles claros y estados activos visibles. Ahora también hospeda un buscador global y un controlador de detalle de partido compartido; cambios en su estructura pueden romper acceso rápido o deep links.
- La vista `Mis partidos` ya no depende solo de coincidencia parcial sobre nombres/IDs de equipos; ahora cruza además `equipos.establecimiento`, expone sugerencias reales y persiste favoritos locales.
- El detalle unificado del partido se resuelve a nivel de shell y no debe duplicarse página por página salvo que se cree una ruta dedicada futura.
- `PartidosPage` expone un query param adicional `rapida` para accesos rápidos de jornada (`hoy`, `manana`, `en_vivo`). Si se agrega otro filtro rápido, documentarlo junto a esta convención.
- `DisciplineFilter` ya no debe considerarse solo una barra horizontal: en móvil existe una hoja inferior para cambiar disciplina, género, categoría y fase sin saturar el ancho disponible.
- `CalendarView` ya no es solo lectura; cualquier partido tocable debe poder abrir detalle contextual mediante `onSelectMatch`.
- `CampeonatoLayout` y `DisciplineFilter` son las piezas más sensibles del responsive en vistas internas. Si reaparecen cortes horizontales o apilamientos forzados, revisar primero esos dos archivos.
- El modo kiosco consulta partidos cada 60 segundos mediante TanStack Query (`refetchInterval`) y usa el endpoint resumido para reducir carga de red y procesamiento.
- El modo kiosco complementa `vista=resumen` con consulta completa de partidos y equipos para construir filtros internos, historial, alertas y vista completa por escuela.
- El selector de escuela del kiosco se apoya en `equipos.establecimiento` y persiste su estado en `localStorage` junto con la configuración del operador.
- La meteorología del kiosco ya no debe consumirse directamente desde Open-Meteo en el navegador productivo; se canaliza por `/api/weather`.
- El fullscreen del kiosco está diseñado como canvas fijo sin scroll. Si un bloque secundario tensiona el viewport, se debe reducir cantidad visible de tarjetas antes que permitir desborde.
- El bloque `Próximos encuentros` es especialmente sensible a la altura disponible y puede reducirse hasta una sola tarjeta en fullscreen para conservar integridad visual.
- `AdminResultadosPage` prioriza automáticamente el campeonato activo cuando existe y muestra resumen de pendientes/finalizados.
- Al guardar un resultado desde admin, el usuario recibe confirmación visible y luego se invalidan queries de `partidos` y `tabla` para refrescar datos relacionados.
- Los guards de rutas admin ya no deben basarse solo en un booleano persistido; la sesión debe considerarse válida solo mientras no expire.
- La integración con Google Sign-In requiere permitir `https://accounts.google.com` en CSP para scripts y estilos. En Vercel se usa además `style-src-elem` para evitar el bloqueo del stylesheet de GSI.
- La CSP de `connect-src` no incluye `https://api.open-meteo.com`. El navegador no puede llamar directamente a Open-Meteo; toda la meteorología debe pasar por el proxy serverless `/api/weather`. Si se elimina ese proxy, hay que volver a agregar el origen al CSP antes de reconectar la llamada directa.
- Todas las rutas del router usan `React.lazy()` + un único `<Suspense>` en la raíz de `App.tsx`. El bundle inicial solo contiene el shell de la app; cada página se descarga al navegar por primera vez. Al agregar una nueva página, importarla con `lazy()`, no con import estático.
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
- No volver a dejar `/campeonatos/nuevo` ni `/admin/resultados` accesibles públicamente; ambas rutas deben permanecer dentro de `<RequireAdmin>` en `App.tsx`.
- No agregar botones públicos de "Crear campeonato" en home o listado sin validar admin.
- No importar páginas con import estático en `App.tsx`; usar siempre `React.lazy()` para conservar el code splitting.
- No llamar directamente a `https://api.open-meteo.com` desde el navegador en producción; canalizar por `/api/weather`. Si se necesita agregar el origen directo de vuelta al CSP, revisar primero si el proxy sigue operativo.
- No quitar el `fetchWithTimeout` de `gasClient.ts`; sin él, las llamadas a GAS pueden colgar indefinidamente ante una respuesta lenta del backend.
- No volver a duplicar en móvil accesos que lleven al mismo destino, como `Campeonatos` y `Fixture` apuntando ambos a `/campeonatos`.
- No usar el query completo de partidos en home o kiosco si el resumen agregado cubre la necesidad.
- No romper ni renombrar sin migración los query params `partidoId`, `campeonatoId` y `rapida`; hoy forman parte del flujo público compartible de consulta rápida.
- No quitar del `AppShell` el controlador global de detalle si el resto de la UI sigue generando deep links por query params.
- No devolver `Mis partidos` a un input plano sin sugerencias o favoritos; el flujo actual ya asume descubrimiento guiado por establecimiento.
- No asumir que hacer una tarjeta más pequeña resuelve por sí solo el desborde en fullscreen; en el kiosco el control real suele ser cantidad visible por bloque.
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

- Mantener sincronizados `CONTEXTO_APLICACION.md` y `KIOKO_CONTEX.MD` cuando cambie la estrategia del kiosco.
- Si el módulo kiosco gana más modos operativos por escuela o por recinto, documentarlos primero en `KIOKO_CONTEX.MD` y luego resumirlos aquí.

- Agregar botón admin para ejecutar importación desde el frontend.
- Agregar generación automática de grupos desde `import_temp`.
- Mantener lista blanca de correos admin, expiración razonable de sesión y rotación del cliente OAuth cuando cambie el entorno.
- Evaluar autorrotación real del modo kiosco por jornada/cancha si se usará en pantallas físicas.
- Agregar carga/edición visual de semifinales, final y tercer lugar desde admin.
- Evaluar pausar el polling del kiosco cuando el tab esté en segundo plano usando la Visibility API (`document.visibilitychange`) para reducir llamadas innecesarias a GAS.
- Confirmar que `Code.gs` valida el token de Google en **todas** las mutaciones admin (no solo en `auth/login`), ya que el frontend solo es la primera línea de defensa.
