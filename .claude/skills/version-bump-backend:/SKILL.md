---
name: version-bump-backend
description: >
  Mantiene actualizado el número de versión del backend en package.json
  siguiendo versionado semántico (MAJOR.MINOR.PATCH). Úsala SIEMPRE que vayas a
  crear una pull request en el repositorio del backend, antes de abrirla: el
  número de versión debe subir en el mismo commit/PR según el tipo de cambio.
  Aplica también si el usuario pide "subir la versión", "bump", "preparar una
  release" o menciona la versión del package.json del backend. Infiere el tipo
  de incremento a partir del cambio y propónlo; si hay duda razonable, pregunta
  antes de decidir.
---

# Version bump — Backend

Sube el número de versión en `package.json` del backend al preparar una pull
request, siguiendo versionado semántico: `MAJOR.MINOR.PATCH`.

## Cuándo se aplica

Cada vez que vayas a crear una PR en el repo del backend. El bump va incluido
en la misma PR (no en una aparte), idealmente como último commit antes de abrirla.

## Reglas de incremento

Dado `MAJOR.MINOR.PATCH` (p. ej. `1.4.2`):

- **PATCH** (tercer dígito): fix menor. Corrección de bugs, ajustes en mensajes
  o cuerpos de email, validaciones puntuales, retoques de una query, cambios que
  no añaden funcionalidad ni rompen contratos de la API. Ej.: `1.4.2 → 1.4.3`.
- **MINOR** (segundo dígito): nueva feature. Un endpoint nuevo, un servicio o
  integración nueva, un campo nuevo en un modelo, una capacidad que antes no
  existía, sin breaking changes ni migración mayor. Al subir MINOR, el PATCH
  vuelve a `0`. Ej.: `1.4.3 → 1.5.0`.
- **MAJOR** (primer dígito): cambio grande. En el backend, esto incluye:
  - **Actualización de librerías importantes** (no menores): subir de major a
    Node, Express, Mongoose, Stripe SDK; sustituir o eliminar dependencias del
    núcleo (p. ej. `jade`→`pug`, retirar `body-parser`).
  - **Cambios estructurales o de contrato**: breaking changes en la API,
    migraciones de esquema, cambios de comportamiento por defecto que afecten a
    consumidores del servicio.

  Al subir MAJOR, MINOR y PATCH vuelven a `0`. Ej.: `1.5.0 → 2.0.0`.

> Una actualización de librería **menor** (patch/minor de una dependencia,
> bumps de seguridad rutinarios) NO es MAJOR: trátala como PATCH salvo que
> introduzca una feature visible (entonces MINOR).

## Cómo decidir (híbrido: inferir + confirmar si dudas)

1. Mira el conjunto de cambios de la PR (diff, archivos tocados, descripción).
2. Clasifícalo en PATCH / MINOR / MAJOR según las reglas de arriba.
3. **Si el tipo es claro**, propón el nuevo número y aplícalo, dejándolo dicho
   en el resumen: "Subo de `1.4.2` a `2.0.0` (MAJOR: Mongoose 5 → 8)".
4. **Si hay duda razonable** (p. ej. una migración de dependencia que no sabes si
   introduce breaking changes reales, o varios cambios de distinto nivel
   mezclados), **pregunta antes de decidir**, ofreciendo la opción que crees
   correcta y la alternativa. Cuando se mezclan varios cambios, manda el de
   mayor nivel.

## Cómo aplicar el bump

1. Lee la versión actual en `package.json` (campo `version`).
2. Calcula la nueva según la regla, reseteando a `0` los dígitos inferiores.
3. Edita **solo** el campo `version` de `package.json`. No toques otros campos
   ni reordenes el archivo.
4. Si el proyecto tiene `package-lock.json`, actualiza también ahí el campo
   `version` de nivel raíz para que coincida (no regeneres todo el lockfile).
5. Haz un commit dedicado y descriptivo, p. ej.:
   `chore(release): bump version to 2.0.0`.

## Lo que NO haces

- No subes la versión sin saber el tipo de cambio: si dudas, pregunta.
- No tratas un bump de seguridad rutinario de una dependencia como MAJOR.
- No confundes el campo `engines.node` con el campo `version`: subir Node de
  major sí justifica un MAJOR en `version`, pero el bump se aplica a `version`.
- No editas el changelog ni etiquetas releases salvo que te lo pidan.
- No tocas la versión directamente en `master`: el bump va en la rama de la PR
  (Heroku auto-despliega desde `master`).
