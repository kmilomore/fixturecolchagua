# Contexto del Módulo Kiosco

## Propósito del documento

Este documento complementa `CONTEXTO_APLICACION.md` y describe en detalle el módulo **Kiosco** de la aplicación pública del fixture deportivo.

Su objetivo es explicar:

- Qué problema resuelve el kiosco dentro del sistema general.
- Qué datos consume y desde dónde.
- Cómo está construido en frontend.
- Qué decisiones de UX y operación lo definen.
- Cómo se relaciona con campeonatos, disciplinas, partidos y resúmenes públicos.
- Qué puntos están listos hoy y cuáles son extensiones naturales futuras.

---

## Relación con el contexto general de la app

Según `CONTEXTO_APLICACION.md`, la aplicación completa tiene como objetivo publicar el fixture del **Campeonato Deportivo SLEP Colchagua 2026** usando:

- React + Vite + TypeScript en frontend.
- Google Apps Script como API.
- Google Sheets como base operativa.

Dentro de ese ecosistema, el módulo **Kiosco** es una vista pública especializada para **pantallas grandes, televisores, proyectores o pantallas de gimnasio**.

No reemplaza a otras vistas públicas. Cumple un rol distinto:

- `HomePage` sirve como portada general de acceso rápido.
- `CampeonatoLayout` y sus páginas hijas sirven para exploración detallada por campeonato.
- `MisPartidosPage` sirve para búsqueda individual.
- `KioscoPage` sirve para **mostrar información operativa y visual de jornada en formato de alta visibilidad**.

En otras palabras:

- `HomePage` ayuda a entrar.
- `Campeonato` ayuda a navegar.
- `Kiosco` ayuda a **proyectar y seguir la jornada en vivo**.

---

## Ruta y archivo principal

Ruta pública:

```txt
/kiosco
```

Registro de la ruta:

```txt
src/App.tsx
```

Archivo principal del módulo:

```txt
src/pages/KioscoPage.tsx
```

Este módulo está fuera de `AppShell`, lo cual es intencional:

- evita distracciones de navegación general,
- permite layout de pantalla completa,
- y facilita un diseño tipo broadcast / tablero / señalética.

---

## Objetivo funcional del kiosco

El kiosco existe para responder rápido preguntas operativas como:

- Qué partido se está jugando ahora.
- Qué viene a continuación.
- En qué recinto o cancha ocurre.
- Qué disciplina está viendo la audiencia.
- Qué resultados se registraron hace poco.
- Qué alertas logísticas o contexto de jornada conviene mostrar.

Por eso prioriza:

- lectura a distancia,
- actualización continua,
- claridad de disciplina,
- jerarquía visual fuerte,
- y adaptación a pantalla completa.

---

## Datos que consume

El kiosco mezcla tres fuentes principales de datos:

### 1. Campeonatos

Se obtiene la lista completa para detectar el campeonato activo.

Cliente:

```txt
api.campeonatos.getAll()
```

Uso:

- Seleccionar el campeonato en estado `activo`.
- Si no existe uno activo, usar el primero disponible.

### 2. Disciplinas del campeonato activo

Cliente:

```txt
api.disciplinas.getByCampeonato(campeonatoId)
```

Uso:

- Permitir filtro visual por disciplina.
- Resolver `fixedDisciplineId` de la configuración del operador.
- Mostrar el contexto de deporte visible en pantalla.

### 3. Resumen público de partidos

Cliente:

```txt
api.partidos.getResumen({ campeonatoId, disciplinaId })
```

Usa el endpoint agregado:

```txt
?resource=partidos&vista=resumen
```

Este resumen devuelve:

- `siguiente`
- `hoy`
- `proximos`
- `totalHoy`
- `updatedAt`

Uso:

- alimentar el partido principal,
- alimentar próximos encuentros,
- y mostrar la marca temporal de sincronización.

### 4. Listado completo de partidos del campeonato o disciplina filtrada

Cliente:

```txt
api.partidos.query({ campeonatoId, disciplinaId })
```

Uso:

- construir el timeline del día,
- ordenar partidos de hoy con prioridad operativa,
- calcular historial del cruce destacado,
- identificar el siguiente partido del mismo recinto,
- detectar cambios entre refresh y resaltarlos,
- derivar alertas operativas.

### 5. Meteorología gratuita externa

Proveedor actual:

```txt
Open-Meteo
```

URL configurada actualmente para:

```txt
San Fernando, Chile
```

Uso:

- condición actual,
- temperatura,
- máxima/mínima,
- probabilidad de lluvia,
- viento.

Importante:

- no depende del backend GAS,
- no requiere API key en este uso,
- se refresca con menor frecuencia que el fixture,
- y si falla, no debe bloquear la funcionalidad principal del kiosco.

---

## Frecuencia de actualización

El módulo está diseñado para verse “vivo” sin saturar APIs.

### Fixture deportivo

- `partidos resumen`: refresh cada 60 segundos.
- `partidos full`: refresh cada 60 segundos.
- `campeonatos` y `disciplinas`: cache más larga, 5 minutos.

### Meteorología

- `weather`: refresh cada 15 minutos.
- `staleTime`: 10 minutos.

### Reloj local

- el reloj del kiosco se actualiza cada 1 segundo en frontend.

---

## Decisiones de UX del módulo

El kiosco ya no es una simple lista de partidos. Se comporta como una vista operacional.

### 1. Partido destacado automático

El kiosco escoge el partido principal con esta lógica:

- si hay un partido `en_curso`, ese partido toma prioridad total;
- si no lo hay, se usa `siguiente` desde el resumen.

Esto asegura que la pantalla destaque **lo que importa ahora**, no solo lo próximo en agenda.

### 2. Claridad de disciplina

La disciplina se muestra de forma explícita en:

- hero del partido principal,
- partidos de hoy,
- timeline,
- resultados recientes,
- próximos encuentros.

Esto es crítico porque el campeonato puede contener varios deportes simultáneos.

### 3. Orden inteligente de partidos de hoy

Los partidos del día no se ordenan solo cronológicamente.

La lógica prioriza:

- `en_curso`
- `programado`
- `finalizado`
- otros estados

Y luego usa fecha/hora para desempate.

Esto convierte la tarjeta “Partidos de hoy” en una herramienta operativa, no solo histórica.

### 4. Resaltado de cambios

El kiosco compara snapshots sucesivos del listado de partidos y detecta cambios en:

- `estado`
- `marcadorLocal`
- `marcadorVisita`
- `hora`
- `lugar`

Cuando un partido cambia:

- se genera `changePulse`,
- se guarda el ID en `updatedMatchIds`,
- y se resaltan visualmente las cards afectadas durante un período corto.

Esto mejora la percepción de tiempo real sin animaciones excesivas.

### 5. Contexto del mismo recinto

Si existe `partidoDestacado.lugar`, el kiosco intenta encontrar el siguiente partido del mismo recinto.

Eso permite mostrar:

- “Después de este partido”

Es útil para operadores, árbitros, asistentes y público del mismo gimnasio o cancha.

### 6. Historial del cruce destacado

Si el partido principal enfrenta equipos que ya jugaron antes, el kiosco busca cruces anteriores finalizados en el mismo alcance filtrado.

Esto agrega contexto deportivo sin necesidad de un backend extra.

### 7. Alertas operativas derivadas

El módulo genera avisos básicos a partir de la jornada actual, por ejemplo:

- cuántos partidos están en curso,
- cuántos recintos están activos,
- cuántas disciplinas hay visibles,
- qué lugar merece atención inmediata.

No son alertas manuales del admin todavía. Son alertas **derivadas del estado real de la jornada**.

---

## Configuración del operador

El kiosco incorpora una capa de configuración pensada para uso real en recintos.

### Persistencia local

Se guarda en:

```txt
localStorage
```

Clave actual:

```txt
slep_kiosk_settings_v1
```

### Propiedades actuales

```ts
interface KioskSettings {
  fixedDisciplineId: string
  rotationSeconds: number
  autoFullscreen: boolean
}
```

### Significado

- `fixedDisciplineId`: fija una disciplina concreta o usa `all`.
- `rotationSeconds`: controla cada cuántos segundos cambia el panel rotativo.
- `autoFullscreen`: intenta abrir el módulo en pantalla completa automáticamente.

### UI del operador

Actualmente se expone mediante un modal accesible desde el botón:

```txt
Operador
```

Esto permite usar el kiosco sin tocar código ni variables de entorno.

---

## Pantalla completa y reorganización automática

Una necesidad importante del módulo era que al entrar en fullscreen no simplemente “se agrande”, sino que **se reorganice**.

Hoy el comportamiento esperado es:

- menos padding general,
- densidad visual mayor,
- grilla principal más compacta,
- menos ítems visibles por bloque,
- tarjetas distribuidas para que las áreas clave entren mejor en una sola vista.

### Ajustes que hace el módulo en fullscreen

- reduce spacing general del contenedor,
- compacta el header,
- limita `Partidos de hoy`,
- limita `Resultados recientes`,
- limita `Próximos encuentros`,
- reorganiza paneles en una grilla más estable,
- evita que listas largas empujen contenido crítico fuera de la pantalla.

Esto no garantiza matemáticamente que toda combinación de datos entre en cualquier resolución, pero sí establece una estrategia práctica y escalable para pantallas grandes.

### Limitación realista

Si la resolución es muy baja o si los nombres de equipos son excesivamente largos, puede seguir haciendo falta un modo aún más compacto.

Esa extensión futura podría llamarse, por ejemplo:

- `modo TV compacto`
- `modo 1366x768`
- `modo scoreboard`

---

## Panel rotativo

El kiosco tiene un submódulo rotativo que cambia automáticamente entre vistas analíticas.

Paneles disponibles hoy:

- `timeline`
- `recent`
- `history`
- `alerts`

### Detalle de cada panel

#### Timeline

Muestra una línea de tiempo del día usando partidos filtrados por la disciplina visible.

Sirve para:

- ordenar mentalmente la jornada,
- ver rápidamente qué sigue,
- ubicar sedes y horarios.

#### Resultados recientes

Muestra los partidos finalizados más recientes.

Sirve para:

- informar marcadores recién registrados,
- reforzar percepción de actividad en vivo,
- mantener interés entre partidos.

#### Historial

Busca cruces anteriores del partido destacado.

Sirve para:

- aportar contexto deportivo,
- enriquecer la pantalla con narrativa,
- diferenciar el kiosco de una simple tabla de horarios.

#### Avisos

Muestra alertas logísticas derivadas y el bloque explicativo del clima.

Sirve para:

- operación del recinto,
- contexto general,
- lectura rápida desde cabina o coordinación.

### Rotación automática

La rotación automática usa `setInterval` controlado por `rotationSeconds`.

Eso permite transformar el kiosco en un sistema autoexplicativo aunque nadie lo opere manualmente.

---

## Meteorología del módulo

La meteorología fue integrada específicamente para:

- agregar contexto de jornada,
- anticipar lluvia o condiciones adversas,
- enriquecer la señalética pública del evento.

### Comuna actual

```txt
San Fernando, Chile
```

### Fuente usada

```txt
Open-Meteo
```

### Razón de elección

- gratuita,
- sin API key para este uso,
- suficientemente estable,
- respuesta JSON simple,
- adecuada para consumo directo desde frontend.

### Datos visibles hoy

- estado general del cielo,
- temperatura actual,
- máxima / mínima,
- probabilidad de lluvia,
- velocidad del viento.

### Relación con el fixture

Hoy la meteorología está fijada a San Fernando porque fue el requerimiento operativo actual.

A futuro puede evolucionar a:

- clima por recinto,
- clima por sede,
- clima del partido destacado,
- alertas por lluvia o viento sobre cierto umbral.

---

## Relación con el backend y GAS

El kiosco se beneficia directamente de las decisiones de diseño del backend:

- `Matches.gs` expone partidos sanitizados,
- `vista=resumen` evita descargar todo el fixture cuando no hace falta,
- `partidos.query` permite construir análisis más ricos cuando sí hace falta.

Eso significa que el módulo no es independiente del backend. Está optimizado porque el backend ya entrega:

- `disciplina`,
- `lugar`,
- `hora`,
- `estado`,
- `marcadores`,
- `updatedAt` en resumen.

Sin esos datos limpios, el kiosco perdería claridad operativa.

---

## Componentes y dependencias internas relevantes

### Archivos directamente implicados

- `src/pages/KioscoPage.tsx`
- `src/api/gasClient.ts`
- `src/utils/formatDate.ts`
- `src/utils/matches.ts`
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`

### Dependencias conceptuales

- `TanStack Query` para fetching y cache.
- `date-fns` para fechas y normalización visual.
- `lucide-react` para iconografía.
- `localStorage` para configuración del operador.
- `Fullscreen API` del navegador para modo inmersivo.

---

## Estados importantes del módulo

El kiosco maneja varios estados simultáneos:

- carga de campeonatos,
- carga de disciplinas,
- carga de resumen,
- carga de partidos completos,
- carga de clima,
- estado visual fullscreen,
- estado del panel rotativo,
- cambios recientes detectados,
- configuración persistida del operador.

Esto lo convierte en uno de los módulos públicos con mayor densidad de comportamiento en toda la aplicación.

---

## Riesgos y consideraciones técnicas

### 1. Pantalla completa no garantizada por el navegador

Algunos navegadores restringen fullscreen automático si no viene de gesto del usuario.

Por eso:

- existe el toggle manual,
- y `autoFullscreen` debe considerarse un intento, no una garantía absoluta.

### 2. Nombre de equipos muy largos

Si los nombres crecen demasiado, pueden tensar el layout, especialmente en fullscreen con mucha información simultánea.

### 3. Meteorología externa

Open-Meteo es externa al backend de fixture.

Si falla:

- el kiosco debe seguir funcionando,
- y el clima debe considerarse complemento, no dependencia crítica.

### 4. Advertencia de chunk grande

La build actual del frontend ya reporta advertencias por tamaño de chunk. El kiosco agrega bastante UI y lógica en un solo archivo, por lo que es candidato natural para futura división si el bundle sigue creciendo.

---

## Futuras extensiones recomendadas

Extensiones que encajan naturalmente con este módulo:

- clima por sede o recinto.
- alertas meteorológicas por umbral.
- mensajes operativos manuales desde admin.
- modo ultra compacto para resoluciones menores.
- URL compartible con configuración del operador.
- ticker inferior continuo.
- integración con tablas de grupo del partido destacado.
- integración con llave eliminatoria cuando el partido sea de fases finales.

---

## Resumen ejecutivo del módulo

El kiosco es el módulo público de **alta visibilidad y lectura operativa** del sistema.

Su valor dentro de la aplicación completa es:

- transformar el fixture en una pantalla útil para recintos deportivos,
- priorizar automáticamente lo que ocurre ahora,
- mantener contexto claro entre múltiples disciplinas,
- mostrar cambios en vivo sin intervención manual,
- y ofrecer una experiencia adaptable a pantalla completa.

En relación con el contexto general de la app, este módulo representa la capa más cercana a la experiencia de jornada real del campeonato.

No es solo una vista decorativa: es una interfaz pública operativa para seguimiento en vivo.