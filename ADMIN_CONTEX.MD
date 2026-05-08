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

Esto es importante porque evita finalizar un partido por error cuando solo se quiere corregir programación.

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

### Efecto esperado del backend

- actualiza marcador local,
- actualiza marcador visita,
- cambia estado a `finalizado`,
- recalcula tabla mediante `Groups.recalcularTabla(payload.id)`.

### Efecto esperado del frontend

- cierra el modal,
- informa feedback de éxito,
- invalida queries de `partidos`,
- invalida queries de `tabla`.

---

## Lógica de ingreso de resultado por disciplina

El resultado no se registra de la misma forma para todas las disciplinas. El sistema debe adaptar el formulario y la validación según el deporte del partido.

### Básquetbol

- Se ingresa un **resultado final**: marcador local y marcador visita.
- No hay sets ni parciales.
- Se guarda directamente con `registrarResultado(id, marcadorLocal, marcadorVisita)`.

### Vóleibol

- Se registra el resultado **por set**, no por marcador acumulado.
- Lógica de sets:

  | Sets ganados local | Sets ganados visita | ¿Se juega set 3? |
  |--------------------|---------------------|------------------|
  | 2                  | 0                   | No               |
  | 0                  | 2                   | No               |
  | 1                  | 1                   | Sí (desempate)   |

- El partido se cierra cuando un equipo acumula **2 sets ganados**.
- Si queda 1-1 luego del set 2, se habilita el ingreso del **set 3 de desempate**.
- El resultado final que se persiste debe reflejar los sets ganados por cada equipo (ej.: `2-1`, `2-0`).

### Otras disciplinas

- Se ingresa un **resultado final**: marcador local y marcador visita.
- Aplica la misma lógica simple que básquetbol.

### Implicancias para el modal de resultados

- El formulario del `Dialog` debe detectar la disciplina del partido seleccionado.
- Según la disciplina:
  - **Vóleibol**: mostrar campos por set y controlar habilitación del set 3.
  - **Resto**: mostrar campos de marcador final directo.
- La lógica de validación (¿se puede guardar ya?) también depende de si se completaron los sets necesarios en vóleibol.

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