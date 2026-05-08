# Contexto del Módulo Admin

## Propósito del documento

Este documento complementa `CONTEXTO_APLICACION.md` y describe en detalle el módulo **Admin** de la aplicación.

Su objetivo es explicar:

- qué funciones cumple el módulo admin dentro del sistema general,
- cómo se autentica un administrador,
- qué operaciones están disponibles hoy,
- cómo se relaciona con campeonatos, partidos, tablas y seguridad,
- y cuáles son sus límites actuales y extensiones futuras.

---

## Relación con el contexto general de la app

El sistema completo publica un fixture deportivo público, pero necesita una capa de operación interna para:

- crear campeonatos,
- registrar resultados,
- corregir hora y lugar de partidos,
- mantener coherencia entre visualización pública y dato operativo.

Ese rol lo cumple el módulo **Admin**.

Mientras el resto de la app está orientado a consulta pública, el módulo admin es la superficie controlada para modificar el estado real del campeonato.

En términos funcionales:

- las vistas públicas leen y muestran,
- el admin autentica y opera,
- y el backend GAS valida y persiste.

---

## Rutas del módulo

Rutas actuales registradas en `src/App.tsx`:

```txt
/admin
/admin/resultados
```

Archivos principales:

```txt
src/pages/admin/AdminPage.tsx
src/pages/admin/AdminResultadosPage.tsx
```

Relación de navegación actual:

- `/admin` funciona como puerta de entrada y panel base.
- `/admin/resultados` funciona como vista operativa para gestión de partidos.
- `/campeonatos/nuevo` está protegido mediante `RequireAdmin`.

---

## Objetivo funcional del módulo admin

Hoy el módulo admin resuelve principalmente cuatro necesidades:

1. autenticar administradores reales del sistema,
2. mantener una sesión local válida por tiempo acotado,
3. exponer accesos rápidos a tareas administrativas,
4. permitir gestión operativa de partidos pendientes.

En la práctica, el admin es la capa que transforma los datos cargados desde Google Sheets o importaciones en un fixture vivo y mantenido.

---

## Arquitectura funcional del módulo

El módulo admin tiene tres capas principales.

### 1. Autenticación y sesión

Responsables principales:

- `src/pages/admin/AdminPage.tsx`
- `src/stores/adminSession.ts`
- `src/config.ts`
- endpoint GAS de autenticación

### 2. Protección de rutas

Responsable principal:

- `RequireAdmin` en `src/App.tsx`

### 3. Operación sobre partidos

Responsable principal:

- `src/pages/admin/AdminResultadosPage.tsx`

---

## Autenticación admin

La autenticación del módulo admin se basa en **Google Sign-In**.

### Flujo actual

1. El frontend carga el script de Google Identity Services.
2. El usuario obtiene una credencial de Google.
3. El frontend envía el `id_token` a GAS.
4. GAS valida:
   - cliente OAuth correcto,
   - integridad del token,
   - correo permitido.
5. Si la validación es correcta, se abre sesión local en el frontend.

### Archivo principal

```txt
src/pages/admin/AdminPage.tsx
```

### Variables de entorno relacionadas

Frontend:

```env
VITE_GOOGLE_CLIENT_ID=<google_oauth_client_id>
VITE_GAS_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```

Backend GAS:

```txt
GOOGLE_CLIENT_ID
SPREADSHEET_ID
```

---

## Lista blanca y permisos

La autorización admin no depende solo de iniciar sesión con Google. También depende de la lista blanca administrada en Google Sheets.

Hoja esperada:

```csv
email,nombre,estado,rol,createdAt
```

Eso significa que el admin se define por:

- identidad real del usuario,
- cliente OAuth válido,
- presencia del correo en la whitelist,
- estado permitido en backend.

El frontend no decide quién es admin. Solo conserva el resultado autorizado por el backend.

---

## Sesión local admin

La sesión se maneja con Zustand persistido en `sessionStorage`.

Archivo:

```txt
src/stores/adminSession.ts
```

Clave de persistencia actual:

```txt
slep_admin_session_v3
```

### Estado principal

```ts
export interface AdminSessionState {
  ok: boolean
  token: string
  user: AdminUser | null
  expiresAt: number
  setSession: (token: string, user: AdminUser) => void
  clearSession: () => void
}
```

### Lógica relevante

- duración máxima de sesión local: 1 hora,
- si expira, se considera inválida automáticamente,
- `merge` del persist limpia sesiones expiradas al rehidratar.

### Razón de diseño

Esto evita:

- reutilización indefinida del token,
- sesiones huérfanas en navegador compartido,
- falsa percepción de autenticación permanente.

---

## Protección de rutas

La app usa `RequireAdmin` para proteger rutas que no deben quedar públicas.

Ejemplo actual:

- `/campeonatos/nuevo`

La lógica es simple:

- si `isAdminSessionActive` devuelve `false`, se redirige a `/admin`.

Esto no sustituye la validación backend, pero sí evita exposición accidental en frontend.

---

## Vista principal de administración

Archivo:

```txt
src/pages/admin/AdminPage.tsx
```

### Comportamiento actual

Si la sesión NO está activa:

- muestra formulario visual de acceso con Google,
- informa si falta `VITE_GOOGLE_CLIENT_ID`,
- informa errores de autenticación,
- muestra estado de validación en curso.

Si la sesión SÍ está activa:

- muestra nombre y correo del administrador,
- muestra avatar o fallback visual,
- entrega accesos rápidos,
- permite cerrar sesión.

### Accesos rápidos actuales

- `Ingresar resultados`
- `Crear campeonato`
- `Ver campeonatos`
- `Cerrar sesión`

### Rol de esta vista

No es todavía un dashboard complejo. Hoy funciona como:

- entrada segura,
- verificación de identidad,
- y hub básico de operaciones.

---

## Vista operativa de resultados y partidos

Archivo:

```txt
src/pages/admin/AdminResultadosPage.tsx
```

Esta es la vista operativa más importante del módulo admin hoy.

### Objetivo

Permitir que el operador:

- seleccione un campeonato,
- vea partidos pendientes o en curso,
- registre marcadores,
- modifique hora,
- modifique lugar,
- y obtenga feedback inmediato.

---

## Flujo actual de operación sobre partidos

### 1. Selección de campeonato

El sistema consulta todos los campeonatos:

```txt
api.campeonatos.getAll()
```

Si existe un campeonato activo, se preselecciona automáticamente.

Esto reduce fricción operativa para jornadas reales.

### 2. Consulta de partidos

Luego consulta:

```txt
api.partidos.query({ campeonatoId })
```

Y los divide en:

- `programados` o `en_curso`
- `finalizados`

### 3. Selección de partido

Los partidos pendientes se muestran con `MatchCard` clickeable.

Al seleccionar uno:

- se abre un `Dialog`,
- se precargan hora y lugar,
- se precargan los marcadores si ya existían.

### 4. Acciones disponibles en el modal

Hoy el modal separa dos acciones:

- `Guardar hora y lugar`
- `Guardar resultado`

Esto evita finalizar un partido por error cuando solo se quiere corregir programación.

La sección de resultado del modal es **adaptativa según disciplina**:

- Para vóleibol: muestra filas de sets con botones toggle por equipo.
- Para el resto: muestra inputs numéricos de marcador local y visita.

En ambos casos se usa el mismo botón `Guardar resultado` y el mismo endpoint `registrarResultado`.

---

## Actualización de hora y lugar

Cliente actual:

```txt
api.partidos.update({ id, hora, lugar })
```

Acción backend:

```txt
resource=partidos
action=update
```

### Uso operativo

Sirve para:

- correcciones de horario,
- cambios de recinto,
- ajustes de jornada publicados al público.

### Efecto esperado

- invalida queries de `partidos`,
- actualiza la vista operativa,
- y hace que las vistas públicas tomen el nuevo valor en el próximo fetch.

---

## Registro de resultado

Cliente actual:

```txt
api.partidos.registrarResultado(id, marcadorLocal, marcadorVisita)
```

Acción backend:

```txt
resource=partidos
action=resultado
```

Los valores de `marcadorLocal` y `marcadorVisita` dependen de la disciplina:

- **Vóleibol**: representan sets ganados por cada equipo (ej. `2`, `1`).
- **Resto**: representan el marcador final directo (ej. `68`, `55`).

El contrato con el backend es idéntico en ambos casos: siempre recibe dos enteros.

### Efecto esperado del backend

- actualiza marcador local,
- actualiza marcador visita,
- cambia estado a `finalizado`,
- recalcula tabla mediante `Groups.recalcularTabla(payload.id)`.

### Efecto esperado del frontend

- cierra el modal,
- informa feedback de éxito con el resultado final (ej. `Local 2-1 Visita (sets)`),
- invalida queries de `partidos`,
- invalida queries de `tabla`.

---

## Lógica de ingreso de resultado por disciplina

El resultado no se registra de la misma forma para todas las disciplinas. El `Dialog` adapta su formulario y validación según el partido seleccionado.

### Básquetbol

- Se ingresan dos campos numéricos: **marcador local** y **marcador visita**.
- El botón "Guardar resultado" se habilita cuando ambos campos tienen un número válido.

### Vóleibol

- El `Dialog` muestra una fila por set con **dos inputs numéricos**: puntos del local y puntos de la visita.
- El ganador de cada set se deriva automáticamente comparando los puntajes: quien tenga más puntos gana el set. Si hay empate en puntaje el set queda incompleto.
- Cada fila muestra un indicador de color (`◀ gana` en verde para local, `gana ▶` en azul para visita).
- Los encabezados de columna muestran los nombres de ambos equipos alineados sobre sus respectivos inputs.
- Lógica de sets:

  | Set 1  | Set 2  | ¿Set 3?          |
  |--------|--------|------------------|
  | local  | local  | No · Local 2-0   |
  | visita | visita | No · Visita 2-0  |
  | local  | visita | Sí (desempate)   |
  | visita | local  | Sí (desempate)   |

- El set 3 (`Set 3 · Des.`) solo aparece cuando hay empate 1-1. El texto de estado debajo cambia entre `"Empate 1-1 — se juega set 3"` (en ámbar) y el resultado final (en verde).
- El botón "Guardar resultado" se habilita cuando todos los sets necesarios tienen ganador derivado.
- Lo que se persiste en backend son **sets ganados** (ej. `2` y `1`), no los puntajes individuales de cada set.

### Otras disciplinas

- Igual que básquetbol: dos campos numéricos de marcador final.

### Implementación actual

Archivo:

```txt
src/pages/admin/AdminResultadosPage.tsx
```

Elementos clave:

```ts
interface SetScore { local: string; visita: string }
const EMPTY_SET: SetScore = { local: '', visita: '' }

function esVoleibol(disciplina: string): boolean
// detecta por regex /vol[eé]ibol/i — acepta "Vóleibol" y "Voleibol"

function setWinner(score: SetScore): 'local' | 'visita' | null
// compara puntajes; null si incompleto, NaN o empate

function SetScoreRow({ label, score, onChange })
// fila con dos inputs numéricos + indicador de ganador derivado
// grid: [4rem label | 1fr local input | 0.75rem sep | 1fr visita input | 4rem ganador]
```

Estado del modal para vóleibol:

```ts
const [set1, setSet1] = useState<SetScore>(EMPTY_SET)
const [set2, setSet2] = useState<SetScore>(EMPTY_SET)
const [set3, setSet3] = useState<SetScore>(EMPTY_SET)

const winner1 = setWinner(set1)   // 'local' | 'visita' | null
const winner2 = setWinner(set2)
const winner3 = setWinner(set3)
const needsSet3 = winner1 !== null && winner2 !== null && winner1 !== winner2
const voleiLocal  = (winner1==='local'?1:0) + (winner2==='local'?1:0) + (needsSet3&&winner3==='local'?1:0)
const voleiVisita = (winner1==='visita'?1:0) + (winner2==='visita'?1:0) + (needsSet3&&winner3==='visita'?1:0)
const voleiCompleto = winner1!==null && winner2!==null && (!needsSet3 || winner3!==null)
```

Los sets se resetean a `EMPTY_SET` cada vez que se abre el modal de un nuevo partido.

El `DialogContent` tiene `max-h-[90dvh] overflow-y-auto` para evitar desbordamiento con 3 sets visibles.

---

## Feedback operativo

La vista de resultados usa una tarjeta de feedback para informar:

- éxito al guardar,
- error al fallar,
- mensajes transaccionales visibles.

Esto es importante en operación real porque evita dudas sobre si el cambio efectivamente se guardó.

---

## Estados vacíos y fallos previstos

El módulo considera varios escenarios:

- usuario sin sesión,
- falta de `VITE_GAS_URL`,
- falta de `VITE_GOOGLE_CLIENT_ID`,
- campeonatos inexistentes,
- campeonato no seleccionado,
- partidos aún no cargados,
- jornada ya completamente cerrada,
- errores de backend.

Eso reduce ambigüedad para el operador y mejora mantenibilidad.

---

## Relación con Google Sheets y GAS

El módulo admin no escribe directamente sobre Sheets. Toda operación pasa por GAS.

Esto centraliza reglas como:

- validación de autenticación,
- búsqueda por ID,
- actualización de filas,
- recálculo de tabla,
- y consistencia del dominio.

### Dependencias directas del backend

- `auth/login`
- `partidos/update`
- `partidos/resultado`
- `campeonatos/getAll`
- `partidos/query`

Esto significa que el módulo admin depende fuertemente del contrato API, más que cualquier vista pública simple.

---

## Seguridad y límites actuales

### Lo que sí existe hoy

- autenticación con Google,
- validación backend,
- whitelist admin,
- sesión local con expiración,
- guard de rutas en frontend.

### Lo que no existe aún como módulo separado

- auditoría de cambios,
- historial de ediciones por partido,
- roles diferenciados por permisos finos,
- gestión de administradores desde UI,
- edición masiva de partidos,
- panel avanzado de campeonatos.

---

## Dependencias internas relevantes

Archivos principales relacionados:

- `src/pages/admin/AdminPage.tsx`
- `src/pages/admin/AdminResultadosPage.tsx`
- `src/stores/adminSession.ts`
- `src/api/gasClient.ts`
- `src/App.tsx`
- `src/components/MatchCard.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`

Dependencias conceptuales:

- Google Identity Services
- TanStack Query
- Zustand persistido
- React Router
- Google Apps Script Web App

---

## Diferencia entre admin y módulos públicos

El módulo admin se diferencia del resto de la app en cuatro aspectos clave:

1. modifica datos en vez de solo leerlos,
2. requiere identidad validada,
3. usa sesión persistida con expiración,
4. impacta directamente lo que luego se publica en Home, Campeonato y Kiosco.

Eso lo convierte en un módulo sensible y con mayor responsabilidad operativa.

---

## Futuras extensiones recomendadas para admin

Extensiones naturales del módulo:

- dashboard administrativo más amplio,
- edición masiva de partidos,
- reasignación de disciplina o fase,
- publicación y despublicación de campeonatos,
- mensajes operativos para kiosco,
- gestión de whitelist desde UI,
- auditoría por usuario y timestamp,
- acciones por rol (`superadmin`, `admin`, etc.).

---

## Resumen ejecutivo del módulo

El módulo admin es la capa operativa segura del sistema.

Su función no es mostrar el fixture al público, sino mantenerlo confiable:

- autentica operadores reales,
- conserva sesión válida por tiempo acotado,
- protege rutas sensibles,
- permite corregir programación,
- permite cerrar resultados,
- y sincroniza esos cambios con toda la experiencia pública posterior.

En relación con el contexto general de la app, el módulo admin es el punto donde el dato deja de ser importado o estático y pasa a ser gestionado activamente.