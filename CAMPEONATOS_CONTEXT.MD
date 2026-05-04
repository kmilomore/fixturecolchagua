# Contexto del Módulo Campeonatos

## Propósito del documento

Este documento complementa `CONTEXTO_APLICACION.md` y describe en detalle el módulo **Campeonatos** de la aplicación pública.

Su objetivo es explicar:

- Qué problema resuelve el módulo dentro de la app.
- Qué rutas cubre.
- Qué datos consume y desde dónde.
- Cómo se organiza la experiencia de usuario del campeonato.
- Qué componentes y páginas intervienen.
- Qué decisiones de UX ya están implementadas.
- Qué hallazgos técnicos condicionan su evolución.
- Qué prácticas conviene evitar al seguir escalándolo.

Este documento debe leerse junto con:

- `CONTEXTO_APLICACION.md` para entender el sistema completo.
- `KIOKO_CONTEX.MD` para el modo pantalla pública tipo kiosco.
- `ADMIN_CONTEX.MD` para los flujos administrativos que alimentan resultados y estructura.

---

## Rol del módulo en la aplicación

El módulo **Campeonatos** es la columna vertebral de la navegación pública del sistema.

Dentro del ecosistema general:

- `HomePage` funciona como entrada rápida.
- `CampeonatosPage` funciona como catálogo público.
- `CampeonatoLayout` y sus páginas hijas funcionan como la experiencia completa de seguimiento de un campeonato.
- `KioscoPage` toma parte del mismo dominio de datos, pero con otra intención visual y operativa.

En términos de producto, el módulo resuelve una necesidad muy concreta:

- entrar a un campeonato,
- fijar una disciplina,
- mantener género/categoría/fase coherentes,
- y recorrer resumen, calendario, grupos, fases y partidos sin perder contexto.

No es solo una colección de pantallas. Es un flujo navegable con contexto persistente.

---

## Rutas del módulo

### Catálogo público

```txt
/campeonatos
```

Archivo principal:

```txt
src/pages/CampeonatosPage.tsx
```

### Ruta base del campeonato

```txt
/campeonatos/:id
```

Layout contenedor:

```txt
src/pages/campeonato/CampeonatoLayout.tsx
```

### Rutas hijas

```txt
/campeonatos/:id
/campeonatos/:id/calendario
/campeonatos/:id/grupos
/campeonatos/:id/fases
/campeonatos/:id/partidos
```

Páginas asociadas:

- `src/pages/campeonato/CampeonatoHome.tsx`
- `src/pages/campeonato/CalendarioPage.tsx`
- `src/pages/campeonato/GruposPage.tsx`
- `src/pages/campeonato/FasesPage.tsx`
- `src/pages/campeonato/PartidosPage.tsx`

---

## Problema que resuelve

El módulo existe para responder preguntas como:

- Qué campeonatos hay disponibles.
- Cuál está activo.
- Qué disciplinas contiene cada campeonato.
- Cómo se distribuyen los partidos por fecha, grupo o fase.
- Qué equipos lideran las tablas.
- Qué llaves eliminatorias existen.
- Qué partidos vienen a continuación para un filtro específico.

Su valor principal es mantener **coherencia de contexto** mientras el usuario navega.

Ejemplo real:

- el usuario entra a un campeonato,
- selecciona `disciplinaId`, `genero`, `categoria`, `fase`,
- y luego cambia entre resumen, calendario, grupos, fases y partidos sin reiniciar el filtro cada vez.

Ese comportamiento es central en el diseño del módulo.

---

## Datos que consume

El módulo de campeonatos consume varias capas de datos.

### 1. Listado de campeonatos

Cliente:

```txt
api.campeonatos.getAll()
```

Uso:

- poblar `CampeonatosPage`,
- identificar campeonatos activos,
- renderizar tarjetas del catálogo público.

### 2. Detalle de un campeonato

Cliente:

```txt
api.campeonatos.getById(id)
```

Uso:

- renderizar el banner principal del campeonato,
- mostrar nombre, año, estado y descripción,
- alimentar la home interna del campeonato.

### 3. Disciplinas del campeonato

Cliente:

```txt
api.disciplinas.getByCampeonato(campeonatoId)
```

Uso:

- construir el filtro horizontal,
- establecer `disciplinaId` válido,
- mantener disciplina seleccionada visible en banner y navegación.

### 4. Partidos completos

Cliente:

```txt
api.partidos.query({ campeonatoId, disciplinaId, genero, fase })
```

Uso:

- home del campeonato,
- calendario,
- listado de partidos,
- fases,
- y cualquier resumen derivado que requiera leer el fixture completo.

### 5. Grupos

Cliente:

```txt
api.grupos.query({ campeonatoId, disciplinaId, genero })
```

Uso:

- poblar la vista de grupos,
- decidir qué bloques de tabla mostrar.

### 6. Tabla de posiciones por grupo

Cliente:

```txt
api.grupos.getTabla(grupoId)
```

Uso:

- renderizar la tabla,
- construir la lectura rápida del grupo,
- detectar líder y escolta del bloque.

---

## Query Params del módulo

La experiencia del campeonato depende fuertemente de query params persistidos.

Claves actuales:

```txt
disciplinaId
genero
categoria
fase
```

### Significado

- `disciplinaId`: disciplina activa dentro del campeonato.
- `genero`: filtro de rama competitiva.
- `categoria`: categoría deportiva activa.
- `fase`: grupos, semifinal, final, etc.

### Decisión de arquitectura

Estos parámetros no son decorativos. Son la forma en que el módulo conserva contexto al navegar entre vistas.

Si se pierde esa persistencia:

- el usuario siente que la app “reinicia” el campeonato,
- la navegación interna se vuelve confusa,
- y el módulo deja de comportarse como una experiencia continua.

---

## Estructura de la experiencia

### 1. Catálogo de campeonatos

`CampeonatosPage` cumple el rol de índice público.

Hoy muestra:

- nombre,
- año,
- estado,
- y accesos rápidos a vistas clave.

### 2. Layout del campeonato

`CampeonatoLayout` cumple el rol de shell contextual.

Hoy se encarga de:

- cargar campeonato y disciplinas,
- validar query params,
- fijar defaults coherentes,
- renderizar el banner del campeonato,
- renderizar la navegación interna,
- y mantener el filtro visible.

### 3. Home interna del campeonato

`CampeonatoHome` evolucionó desde una portada básica a un dashboard más editorial.

Hoy concentra:

- KPIs rápidas,
- partido destacado,
- actividad del día,
- y accesos rápidos contextuales.

### 4. Calendario

`CalendarioPage` renderiza el calendario mensual real según filtros activos.

### 5. Grupos

`GruposPage` muestra grupos y tablas, ahora con lectura rápida antes de cada tabla.

### 6. Fases

`FasesPage` usa `BracketView` para mostrar semifinales, final, tercer lugar y campeón con narrativa visual.

### 7. Partidos

`PartidosPage` pasó de lista plana a agrupación por fecha con contadores por estado.

---

## Componentes y archivos clave

### Páginas principales

- `src/pages/CampeonatosPage.tsx`
- `src/pages/campeonato/CampeonatoLayout.tsx`
- `src/pages/campeonato/CampeonatoHome.tsx`
- `src/pages/campeonato/CalendarioPage.tsx`
- `src/pages/campeonato/GruposPage.tsx`
- `src/pages/campeonato/FasesPage.tsx`
- `src/pages/campeonato/PartidosPage.tsx`

### Componentes importantes del módulo

- `src/components/DisciplineFilter.tsx`
- `src/components/CalendarView.tsx`
- `src/components/GroupTable.tsx`
- `src/pages/campeonato/GroupTableBlock.tsx`
- `src/components/BracketView.tsx`
- `src/components/MatchCard.tsx`

### Contexto compartido

- `src/pages/campeonato/outletContext.ts`

Ese archivo define el contexto que comparten las rutas hijas del campeonato.

---

## Decisiones de UX ya implementadas

### 1. Persistencia del contexto de navegación

La navegación interna del campeonato conserva query params al moverse entre vistas.

Esto permite que:

- el usuario mantenga la disciplina actual,
- no pierda género/categoría/fase al cambiar de pestaña,
- y recorra el módulo sin reconfigurar filtros una y otra vez.

### 2. Banner más fuerte en el layout

El banner de `CampeonatoLayout` ya no es solo decorativo.

Hoy expone:

- nombre del campeonato,
- año y estado,
- disciplina activa,
- género/categoría/fase activas,
- y la vista actual del campeonato.

### 3. Navegación sticky

La barra interna de secciones del campeonato se fortaleció como elemento de orientación.

Objetivo:

- hacer más clara la sección actual,
- reforzar continuidad de contexto,
- y permitir navegación rápida entre vistas.

### 4. Home del campeonato como dashboard

La home interna ya no se limita a descripción + botones.

Hoy funciona como panel resumido del campeonato con:

- KPI cards,
- foco narrativo del próximo partido,
- actividad de hoy,
- y accesos rápidos priorizados.

### 5. Partidos agrupados por fecha

La vista de partidos ya no es una lista lineal.

Ahora:

- agrupa por fecha,
- ordena por estado y hora,
- y agrega conteos por bloque.

Esto mejora escaneabilidad y lectura operativa.

### 6. Grupos más narrativos

Cada grupo ya no muestra solo una tabla.

Ahora tiene:

- lectura rápida del liderazgo,
- escolta,
- estado competitivo general,
- y luego la tabla completa.

### 7. Fases más editoriales

`BracketView` ahora entrega más narrativa:

- lectura del cuadro final,
- estado de la final,
- campeón proyectado o confirmado,
- y mejor jerarquía para la salida del torneo.

### 8. Componentes base más cohesionados

Se reforzaron visualmente:

- `MatchCard`,
- `GroupTable`.

Objetivo:

- unificar lenguaje visual,
- mejorar legibilidad,
- y hacer que las vistas del campeonato se sientan parte del mismo sistema.

---

## Flujos principales del módulo

### Flujo 1. Entrar desde catálogo a campeonato

1. El usuario abre `/campeonatos`.
2. Ve el listado de campeonatos públicos.
3. Entra a `/campeonatos/:id`.
4. El layout resuelve el campeonato y fija filtros válidos.

### Flujo 2. Cambiar disciplina sin perder contexto

1. El usuario entra a un campeonato.
2. Cambia disciplina desde el filtro.
3. El módulo recalcula `disciplinaId`, categorías válidas y defaults necesarios.
4. La navegación interna mantiene el resto de query params coherentes.

### Flujo 3. Recorrer vistas internas

1. El usuario entra al resumen.
2. Pasa a calendario, grupos, fases o partidos.
3. La vista conserva `disciplinaId`, `genero`, `categoria`, `fase`.
4. El módulo se comporta como una sola experiencia, no como pantallas desconectadas.

### Flujo 4. Revisar grupos y tabla

1. La vista carga grupos del filtro actual.
2. Cada grupo consulta su tabla.
3. El bloque construye una lectura rápida.
4. Luego renderiza la tabla completa.

### Flujo 5. Seguir llaves eliminatorias

1. La vista carga partidos de la disciplina/género.
2. Filtra por categoría si corresponde.
3. Deriva semifinales, final y tercer lugar.
4. `BracketView` renderiza el cuadro y al campeón si ya existe definición.

---

## Hallazgos técnicos importantes

### 1. El valor del módulo no está solo en las páginas, sino en el layout

El layout controla la continuidad del campeonato.

Si se rompe:

- la navegación pierde memoria,
- los filtros se desalinean,
- y el usuario siente incoherencia entre secciones.

### 2. `categoria` debe validarse contra la disciplina activa

No basta con leer el query param. Hay que verificar que exista dentro de `disciplinas.categorias`.

### 3. La experiencia del campeonato escala mal si las vistas son planas

Con pocos partidos, una lista simple parece suficiente.

Con más carga real:

- hace falta agrupación,
- resúmenes,
- jerarquías,
- y narrativa por bloque.

### 4. `PartidosPage` necesita estructura, no solo tarjetas pequeñas

Hallazgo confirmado:

- reducir tamaño visual no resuelve por sí solo la UX,
- lo importante es ordenar por fecha/estado y resumir.

### 5. `GruposPage` y `FasesPage` ganan mucho valor con lectura editorial mínima

No hace falta inventar nuevos datos para mejorar UX.

Con el dataset actual ya se pueden construir:

- líderes,
- escoltas,
- estado competitivo,
- campeón proyectado,
- narrativa de final.

### 6. El módulo ya no es solo exploración, también es orientación

La UX actual se acerca más a un panel de seguimiento que a una simple lista pública.

Eso cambia el criterio de diseño:

- menos pantallas mudas,
- más contexto,
- más agrupación,
- y mejor jerarquía visual.

---

## Relación con el contexto general

Este módulo se conecta directamente con el contexto general descrito en `CONTEXTO_APLICACION.md`.

La relación práctica es esta:

- `CONTEXTO_APLICACION.md` explica la arquitectura completa.
- `CAMPEONATOS_CONTEXT.MD` explica cómo se vive y escala el campeonato en frontend.
- `KIOKO_CONTEX.MD` explica cómo parte de ese mismo dominio se reinterpreta para pantallas públicas fullscreen.
- `ADMIN_CONTEX.MD` explica cómo se alimentan resultados y estructura desde administración.

En otras palabras:

- el módulo de campeonatos es la experiencia pública navegable,
- el kiosco es una vista derivada de alta visibilidad,
- y admin es el sistema que mantiene vigentes los datos.

---

## Riesgos y consideraciones técnicas

### 1. Demasiadas vistas pueden fragmentar la experiencia

Si el banner, navegación y filtros pierden coherencia, el módulo deja de sentirse unitario.

### 2. Los query params son infraestructura, no detalle

Cambiar nombres o dejar de propagarlos rompe comportamiento percibido del módulo.

### 3. Las tablas pueden crecer mucho

La vista de grupos necesita mantener legibilidad aun con más equipos, más categorías o más grupos.

### 4. El bracket necesita estados vacíos claros

No siempre existirán semifinales, final o tercer lugar.

La UI debe explicar eso sin parecer rota.

### 5. El bundle sigue creciendo

La build actual ya advierte chunk grande. Si el módulo sigue ganando riqueza visual, puede convenir dividir mejor superficies y componentes.

---

## Cosas que conviene evitar

- No romper la persistencia de `disciplinaId`, `genero`, `categoria`, `fase` entre rutas internas.
- No volver a convertir `CampeonatoHome` en una portada vacía sin datos de seguimiento.
- No hacer que `PartidosPage` vuelva a una lista plana sin agrupación por fecha.
- No renderizar `GruposPage` como una secuencia muda de tablas sin lectura rápida.
- No tratar `FasesPage` solo como dibujo de llaves sin narrativa del estado competitivo.
- No esconder la disciplina activa en el banner del campeonato.
- No desalinear el estilo del módulo con la identidad institucional general.
- No asumir que el usuario recuerda el filtro activo si la UI no lo hace visible.
- No duplicar lógica de filtros en cada página hija cuando el layout ya controla ese contexto.
- No introducir nuevos filtros sin decidir primero cómo persistirlos y mostrarlos.

---

## APIs y endpoints relacionados

### GET relevantes para este módulo

```txt
?resource=campeonatos
?resource=campeonatos&id=<id>
?resource=disciplinas&campeonatoId=<id>
?resource=partidos&campeonatoId=<id>&disciplinaId=<id>&genero=<...>&fase=<...>
?resource=grupos&campeonatoId=<id>&disciplinaId=<id>&genero=<...>
?resource=tabla&grupoId=<id>
```

### Dependencias de datos

El módulo depende principalmente de estas hojas en Google Sheets:

- `campeonatos`
- `disciplinas`
- `partidos`
- `grupos`
- `tabla_posiciones`

---

## Estado actual del módulo

Actualmente el módulo de campeonatos ya cuenta con:

- catálogo público,
- layout contextual,
- filtros persistidos,
- home tipo dashboard,
- calendario,
- grupos con lectura rápida,
- fases con narrativa,
- partidos agrupados por fecha,
- y componentes base visualmente más cohesionados.

En el contexto general de la aplicación, este módulo representa la experiencia pública más completa y reusable del sistema.

No es solo un índice de partidos: es la interfaz principal para entender, seguir y recorrer un campeonato completo.

---

## Roadmap UX/UI priorizado para la próxima iteración

La próxima iteración del módulo debería concentrarse en profundizar claridad, escaneabilidad y continuidad visual sin romper la arquitectura actual basada en `CampeonatoLayout` y query params persistidos.

### Prioridad 1. Rediseñar `CampeonatosPage` como portada editorial real

Objetivo:

- hacer que la entrada al ecosistema de campeonatos tenga más jerarquía,
- diferenciar campeonatos activos de históricos,
- y ofrecer una lectura más clara antes de entrar al detalle.

Impacto esperado:

- mejora inmediata de la primera impresión del módulo,
- mejor descubrimiento de campeonatos activos,
- mejor coherencia entre catálogo y experiencia interna.

### Prioridad 2. Consolidar un sistema visual común para tarjetas del módulo

Objetivo:

- terminar de alinear `MatchCard`, KPIs, bloques narrativos y tarjetas resumen,
- unificar espaciados, títulos, badges y pies de bloque,
- y evitar que cada pantalla resuelva su propio lenguaje visual.

Impacto esperado:

- módulo más consistente,
- menor sensación de pantallas ensambladas por separado,
- base más limpia para seguir escalando vistas.

### Prioridad 3. Reforzar navegación contextual del campeonato

Objetivo:

- hacer más visible la sección activa,
- mejorar feedback de filtros actuales,
- y facilitar el cambio entre resumen, calendario, grupos, fases y partidos en mobile y desktop.

Impacto esperado:

- menor desorientación del usuario,
- navegación interna más rápida,
- mejor aprovechamiento del banner y la barra sticky.

### Prioridad 4. Crear estados vacíos y estados sin datos más expresivos

Objetivo:

- evitar que una pantalla sin partidos, grupos o fases parezca rota,
- explicar por qué un bloque no tiene contenido,
- y mantener tono institucional aun cuando falten datos.

Impacto esperado:

- menos ambigüedad operativa,
- mejor resiliencia visual,
- percepción más robusta del producto.

### Prioridad 5. Mejorar densidad y legibilidad en mobile

Objetivo:

- revisar home, partidos, grupos y fases desde pantallas chicas,
- priorizar orden de lectura,
- y evitar bloques que funcionen bien en desktop pero colapsen visualmente en teléfonos.

Impacto esperado:

- experiencia pública más usable en jornadas reales,
- menos scroll confuso,
- mejor lectura para estudiantes, apoderados y equipos desde celular.

### Prioridad 6. Incorporar resúmenes inteligentes por vista sin agregar nuevos datos fuente

Objetivo:

- seguir explotando el dataset existente para generar contexto,
- sumar microresúmenes útiles en calendario, partidos y grupos,
- y convertir cada vista en una superficie de lectura más orientada.

Impacto esperado:

- mayor valor percibido sin ampliar backend,
- mejor comprensión del estado competitivo,
- menos dependencia de lectura manual fila por fila.

### Prioridad 7. Preparar una estrategia gradual de code splitting visual

Objetivo:

- contener el crecimiento del bundle,
- separar superficies pesadas si el módulo sigue ganando complejidad,
- y mantener performance razonable al abrir campeonatos.

Impacto esperado:

- menor riesgo de degradación al seguir ampliando UX/UI,
- mejor base técnica para próximas iteraciones.

### Orden sugerido de ejecución

1. `CampeonatosPage`.
2. Sistema visual compartido del módulo.
3. Navegación contextual y visibilidad de filtros.
4. Estados vacíos y estados sin datos.
5. Ajuste fino mobile.
6. Microresúmenes editoriales por vista.
7. Optimización técnica orientada a performance.

### Criterio de implementación

La próxima iteración no debería enfocarse en sumar más pantallas. Debería enfocarse en volver más clara, fuerte y consistente la experiencia que ya existe.

La regla práctica es esta:

- primero reforzar entrada, continuidad y legibilidad,
- después sumar refinamientos editoriales,
- y recién luego ampliar complejidad técnica o funcional.
