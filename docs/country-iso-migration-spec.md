# Migración del campo país a código ISO — Especificación v1

Sustituye la llamada a `restcountries.com` (rota por CORS) por una lista
estática local, y migra el campo `country` en BBDD de texto libre en inglés
(`"Spain"`) a código ISO 3166-1 alpha-2 (`"ES"`).

Afecta a: formulario de perfil en el área personal (`account-spec.md`,
Sección 3 — Perfil, campo **País**), modelo de usuario en Mongoose, y un script
de migración de datos ejecutado una sola vez.

---

## Decisión

Se migra a código ISO alpha-2, con backfill de los usuarios existentes.
No se mantiene el texto libre por "coherencia histórica": con el volumen actual
(~800 usuarios) la migración es de bajo riesgo y evita seguir arrastrando el
problema (mezcla de idiomas/formatos) a medida que crezca la base de usuarios.

---

## 1. Fuente de datos de países (frontend)

Eliminar la llamada a `https://restcountries.com/v3.1/all`. Sustituir por una
lista estática local generada una sola vez, con nombres en español.

**Opción recomendada:** paquete `i18n-iso-countries` (tiene locale `es`
mantenido) para generar el JSON en build/dev time, o bien un JSON ya
materializado en el repo si se prefiere cero dependencias nuevas:

```
src/data/countries.ts
```

```ts
// countries.ts — English-only code, Spanish-only values
export interface CountryOption {
  isoCode: string;   // ISO 3166-1 alpha-2, e.g. "ES"
  nameEs: string;    // e.g. "España"
}

export const COUNTRIES: CountryOption[] = [
  { isoCode: 'ES', nameEs: 'España' },
  { isoCode: 'MX', nameEs: 'México' },
  { isoCode: 'AR', nameEs: 'Argentina' },
  // ... resto de países, orden alfabético por nameEs
];
```

- Ordenar por `nameEs` con `localeCompare('es')` para que la ordenación
  alfabética respete acentos y ñ correctamente.
- Sin llamada de red, sin CORS, sin dependencia de disponibilidad de terceros.
- Si en el futuro se necesitan banderas u otros metadatos dinámicos, esa
  llamada debería hacerse **desde el backend** (Node), nunca desde el
  navegador, para evitar volver a toparse con CORS.

---

## 2. Cambio de contrato de datos (backend)

### Schema Mongoose actual (implícito)

```ts
country: { type: String }   // texto libre, ej. "Spain"
```

### Schema propuesto

```ts
country: {
  type: String,
  uppercase: true,
  match: /^[A-Z]{2}$/,   // valida formato ISO alpha-2
  // No usar enum estricto de Mongoose aquí: mantenerlo como validación de
  // formato, no de lista cerrada, para no acoplar el schema a la lista de
  // países (que puede cambiar; ISO 3166 añade/retira códigos ocasionalmente).
}
```

- El valor guardado pasa a ser siempre el código ISO alpha-2 en mayúsculas
  (`"ES"`, `"MX"`), nunca el nombre.
- La traducción código → nombre en español vive **solo en frontend**
  (`countries.ts`), no en BBDD. Si mañana se necesita el nombre en otro idioma,
  se añade sin tocar datos ya guardados.
- `senior-backend` debe evaluar si el campo debe pasar por el `git-workflow` y
  `semver-backend` habituales (probablemente MINOR: cambio de contrato de dato,
  no rompe endpoints existentes si el mapeo de entrada es tolerante — ver punto 4).

---

## 3. Script de migración (backfill)

**Regla de oro para `senior-backend`: ejecutar en modo lectura/reporte primero,
nunca escribir directamente sobre producción sin una fase de auditoría previa.**

**Regla adicional: todas las fases que impliquen escritura (Pasos 3 y 4) se
ejecutan primero contra una copia local/de test de la BBDD, nunca directamente
contra producción.** Concretamente:

- Antes de tocar producción, exportar un dump de la colección de usuarios (o
  una muestra representativa que incluya los distintos valores legacy
  detectados en el Paso 1) a la BBDD local/de test habitual.
- Correr el script completo (mapeo → dry-run → ejecución → verificación)
  contra esa copia local primero.
- Solo si el resultado en local es el esperado (verificación del Paso 5 en
  verde, sin valores sin mapear inesperados) se repite la ejecución contra
  producción.
- Esto aplica igual al backfill de Mailchimp (punto 6.1): probar el script
  contra la cuenta/lista de test de Mailchimp (o los 1-2 contactos de prueba
  ya previstos) antes de lanzar el batch sobre la lista real.

### Paso 1 — Auditoría (solo lectura)

Script que recorre la colección de usuarios y saca un `distinct` de todos los
valores actuales de `country`, con conteo de cuántos usuarios tiene cada uno:

```
Spain        →  312
Mexico       →  98
United States → 41
Argentina    →  36
...
(valores raros/erróneos aparecerán aquí también, ej. "spain", "España", "N/A", "")
```

Este listado se revisa manualmente **antes** de tocar nada — es la forma de
detectar valores que no van a mapear automáticamente (typos, vacíos, nombres
en español ya colados, etc.).

### Paso 2 — Tabla de mapeo

Diccionario `nombreLibreConocido → códigoISO`, construido a partir del listado
del Paso 1 (no de una lista genérica de países, sino de los valores que
**realmente existen** en la BBDD):

```ts
const LEGACY_COUNTRY_MAP: Record<string, string> = {
  'Spain': 'ES',
  'spain': 'ES',
  'España': 'ES',
  'Mexico': 'MX',
  'México': 'MX',
  'United States': 'US',
  // ...
};
```

### Paso 3 — Dry-run

El script recorre usuarios, aplica el mapeo, y **reporta sin escribir**:
cuántos usuarios se actualizarían correctamente, y una lista explícita de los
que quedarían sin mapeo (para decidir caso a caso: ¿se dejan `null`? ¿se
preguntan al usuario en su próximo login?).

### Paso 4 — Ejecución

Solo tras revisar el dry-run: aplicar los `updateOne` reales, en un batch
razonable (no hace falta paralelismo agresivo con 800 usuarios). Guardar un
log del antes/después por usuario (útil para rollback manual si algo falla).

### Paso 5 — Verificación posterior

Nuevo `distinct` sobre `country`: debe devolver solo códigos de 2 letras
mayúsculas. Cualquier resto es una señal de que algo no se mapeó.

> Este es exactamente el tipo de tarea para el agente `senior-backend`, dado
> que "seguridad de BBDD" es su regla de máxima prioridad: el flujo
> auditoría → mapeo → dry-run → ejecución → verificación respeta eso de forma
> explícita.

---

## 4. Compatibilidad de entrada (tolerancia temporal)

Mientras el frontend viejo y el nuevo puedan coexistir brevemente (deploy no
atómico en Heroku), el endpoint de actualización de perfil puede aceptar tanto
un código ISO de 2 letras como, transicionalmente, alguno de los valores
legacy más comunes, normalizando con el mismo `LEGACY_COUNTRY_MAP` antes de
guardar. Esto es un colchón de seguridad, no una función permanente: se puede
retirar en una versión posterior una vez confirmado que todo el tráfico viene
del frontend actualizado.

---

## 5. Cambios en frontend (formulario de perfil)

En `ProfileSection.tsx` (`account-spec.md`, Sección 3):

- El `<select>` de país renderiza `COUNTRIES` (código + nombre en español),
  ordenado alfabéticamente.
- `value` del select = `isoCode` del usuario (ya viene en ISO tras la
  migración).
- Al guardar, se envía el `isoCode` seleccionado, no el nombre.
- Mismo estilo de select ya definido (chevron custom teja, ver `books-spec.md`).
- Si un usuario tiene un valor sin mapear tras la migración (edge case del
  Paso 3), el select debe mostrar un placeholder tipo `Selecciona tu país`
  en vez de romper o mostrar un valor vacío silencioso — fuerza al usuario a
  fijarlo la próxima vez que entre a su perfil.

---

## 6. Otros consumidores del campo `country`

### 6.1 Mailchimp

Mailchimp ya recibe hoy el campo `country` como texto libre (mismo problema
que la BBDD: valores tipo `"Spain"`). Decisión: **hacer backfill también en
Mailchimp**, reutilizando el mismo mapeo construido en el punto 3 (Paso 2),
para que el dato quede consistente en nombre español en ambos sitios.

**Es una operación segura si se hace así:**

- **Solo tocar el merge field `country`**, nunca el campo `status` del
  contacto — así no hay riesgo de desuscribir a nadie por accidente al
  actualizar.
- **Confirmado: el merge field `country` en Mailchimp es de tipo texto
  libre** (no dropdown), así que no hay riesgo de que Mailchimp rechace el
  valor por no coincidir con una opción predefinida — cualquier string en
  español vale.
- **El flujo de sincronización normal (registro/actualización de usuario) no
  necesita cambios.** Hoy usa `PUT` y funciona correctamente porque en cada
  llamada ya se envían los datos completos y actuales del usuario (nombre,
  país, géneros, formatos) — nunca un objeto parcial. El riesgo de perder
  género/formato no existe en ese flujo.
- **El script de backfill debe ser una función aislada, nueva, que NO
  reutiliza la función de sincronización existente** (la que construye
  `FNAME`, `PAIS`, `genresForMailchimp`, `formatsForMailchimp` en el registro/
  actualización normal de usuario). El riesgo real de perder datos de
  género/formato no viene de un comportamiento oculto de Mailchimp, sino de
  reusar esa función completa para el backfill: si en ese momento
  `genresForMailchimp` o `formatsForMailchimp` llegan vacíos o
  desactualizados, sí se sobrescribirían con vacío. El body del backfill debe
  limitarse exactamente a:
  ```js
  { merge_fields: { PAIS: nuevoValorEnEspanol } }
  ```
  sin incluir `FNAME`, `GENERO` ni `FORMATO` en absoluto.
- **Usar el método `PATCH`** en `/lists/{list_id}/members/{subscriber_hash}`
  para el backfill, no `PUT`. El flujo normal usa `PUT` correctamente porque
  siempre envía el objeto completo; el backfill, al enviar solo `PAIS`,
  necesita `PATCH` (pensado explícitamente para actualizaciones parciales)
  para no depender de que Mailchimp interprete un objeto incompleto como se
  espera.
- **Usar el endpoint de Batch Operations de la API de Mailchimp** (no una
  llamada por contacto) para evitar rate limits con ~800 actualizaciones.
- **Probar primero con 1-2 contactos** (p.ej. una cuenta de test propia),
  verificar visualmente en el panel de Mailchimp que el valor quedó como se
  esperaba, y solo entonces lanzar el batch completo.
- El batch devuelve un código de estado por operación — guardar ese resultado
  para poder identificar y reintentar los que fallen, sin tener que revisar
  contacto a contacto.
- Reutilizar el mapeo del punto 3 (auditoría → tabla de mapeo) en vez de
  construir uno nuevo: los valores de origen son los mismos texto-libre que ya
  se auditaron para la BBDD.

A partir de aquí, toda sincronización futura de `country` hacia Mailchimp debe
traducir el código ISO guardado en BBDD al nombre en español antes de
enviarlo (usando `countries.ts` o su equivalente en backend), nunca enviar el
código ISO en crudo como merge field.

### 6.2 Otros consumidores

Cualquier informe, filtro admin, o vista interna que hoy muestre `country`
como texto tal cual — dejará de mostrar "Spain" y pasará a mostrar "ES"
salvo que también se actualice para traducir con la lista de países.

---

## 7. Testing

- **Backend**: tests del script de migración con una BBDD de prueba que
  incluya casos límite (valores ya en ISO, valores legacy conocidos, valores
  vacíos/nulos, valores no mapeables). Regla `regression-test-on-bugfix`:
  escribir el test contra el dato "sucio" real antes de escribir el mapeo.
- **Frontend**: test de que el select muestra nombres en español y envía
  `isoCode`; test de que un usuario con país sin mapear ve el placeholder en
  vez de un crash.
- Todo bajo `test-before-commit`: no se commitea sin `npm run test` en verde.

---

## 8. Orden de ejecución recomendado

1. `senior-backend`: construir y correr el script de auditoría (Paso 1) →
   compartir el listado de valores distintos contigo para revisar el mapeo.
2. Confirmar mapeo y casos sin resolver.
3. `senior-backend`: exportar copia/muestra de la colección a BBDD local →
   correr mapeo → dry-run → ejecución → verificación **contra la copia
   local**.
4. Si el resultado en local es correcto: repetir dry-run → ejecución →
   verificación contra producción.
5. `senior-backend`: actualizar schema con la validación de formato ISO.
6. `senior-backend`: probar backfill de Mailchimp contra la lista/contactos
   de test → una vez verificado, lanzar batch completo con el mismo mapeo del
   paso 1-2 sobre la lista real → verificar resultados.
7. `senior-frontend`: implementar `countries.ts` + cambios en `ProfileSection`.
8. Actualizar el código de sincronización futura con Mailchimp para que
   traduzca ISO → nombre en español antes de enviar.
9. `frontend-reviewer` sobre los cambios de frontend antes de cerrar.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Valores legacy no previstos en el mapeo | Fase de auditoría obligatoria antes de escribir nada |
| Deploy no atómico deja frontend viejo llamando con nombre en vez de ISO | Capa de compatibilidad temporal en el endpoint (punto 4) |
| El backfill reutiliza la función de sync completa y sobrescribe género/formato con datos vacíos o desactualizados | Función de backfill aislada que solo envía `{merge_fields: {PAIS: ...}}`, nunca `FNAME`/`GENERO`/`FORMATO`; usar `PATCH` en vez de `PUT` |
| Batch de Mailchimp desincroniza el estado de suscripción por error | Actualizar solo el merge field `PAIS`, nunca tocar `status` |
| Usuario con país sin resolver ve un select roto | Placeholder explícito "Selecciona tu país" en vez de valor vacío silencioso |
