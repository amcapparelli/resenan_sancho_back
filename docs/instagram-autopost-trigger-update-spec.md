# Spec: cambio de disparador — publicar al añadir ejemplares, no al crear el libro

**Estado:** listo para implementación
**Agente destino:** `senior-backend`
**Relación con specs anteriores:** este documento actualiza únicamente las
secciones 2 y 5 de `instagram-autopost-spec.md` (ya implementado y en
producción, funcionando correctamente). **Todo lo demás de aquel spec queda
igual y no se toca:** generación de la imagen de marca (sección 6), modo
`IG_DRY_RUN` (sección 7), construcción del caption (sección 8), llamadas a
la Graph API (sección 9) y manejo de errores (sección 10).

---

## 1. Motivo del cambio

Un libro dado de alta no está necesariamente disponible para pedir un
ejemplar — lo está recién cuando se le añaden ejemplares. Publicar en el
momento de creación anunciaba libros que en la práctica todavía no se podían
pedir. El disparador correcto es el momento en que el libro pasa a tener al
menos un ejemplar disponible, sin importar por cuál de las vías existentes
haya ocurrido.

## 2. Nuevo disparador

- **Quitar** la llamada a `publishToInstagram(book)` (ajustar el nombre real
  si difiere en el código) del flujo de creación del libro.
- **Añadir** esa misma llamada a cada una de las vías existentes que añaden
  ejemplares a un libro. Auditar el código para localizarlas todas — por
  ejemplo: alta manual/gratuita de ejemplares por parte de la persona
  autora, acreditación de ejemplares tras un pago de Stripe, y cualquier
  otra vía que exista hoy. Ninguna debe quedar sin enganchar.
- La llamada se hace **después** de que la operación de añadir ejemplares se
  haya persistido con éxito en Mongo, nunca antes ni en paralelo.
- Igual que en el spec original, la llamada sigue sin bloquear ni retrasar
  la respuesta al cliente de esa operación concreta (fire-and-forget,
  envuelta en try/catch).

## 3. Por qué no hace falta tocar la función existente

`publishToInstagram(book)` ya contiene la guarda de idempotencia correcta:

```js
if (book.instagramPostedAt) {
  logger.debug('book already posted, skipping', {
    bookId: String(book._id),
    instagramPostedAt: book.instagramPostedAt,
  });
  return;
}
```

Esta guarda sigue siendo exactamente la que hace falta para el nuevo
disparador. Como ahora se llama a la función cada vez que se añaden
ejemplares —sea la primera vez o la enésima, venga de la vía que venga—,
solo la primera llamada que encuentra `instagramPostedAt` en `null`
continúa y publica; todas las llamadas posteriores se detienen en esta
guarda. No hace falta ninguna lógica adicional para detectar "es la primera
vez": ya la resuelve este `if`. **No modificar esta función.**

## 4. Recomendación: centralizar el punto de llamada

Como hay varias vías que añaden ejemplares, conviene extraer un pequeño
helper compartido en lugar de repetir la misma lógica en cada controlador
—y para que si en el futuro se añade una vía nueva, sea obvio que también
debe engancharse aquí:

```js
async function triggerInstagramPostIfEligible(book) {
  if (!book.hasAvailableCopies()) { // adaptar al check real ya existente
    return;
  }
  await publishToInstagram(book);
}
```

(Nombres ilustrativos — adaptar al estilo y a las funciones reales del
código.) El chequeo de "¿tiene al menos un ejemplar disponible?" es una
comprobación defensiva extra, por si alguna vía pudiera completarse sin
dejar ejemplares netos disponibles. No sustituye a la guarda de
`instagramPostedAt`, que sigue viviendo dentro de `publishToInstagram` sin
cambios.

Cada controlador que añade ejemplares llama a este helper justo después de
guardar, en vez de llamar directamente a `publishToInstagram`.

## 5. Alcance actual: gratis y de pago por igual

Por ahora, cualquier vía de añadir ejemplares —gratuita o de pago— dispara
la publicación en las mismas condiciones.

**Nota para el futuro:** en algún momento esto podría restringirse solo a
ejemplares añadidos mediante una opción de pago. Cuando llegue ese momento,
el cambio se limita a decidir, dentro del helper de la sección 4, qué vías
cuentan como elegibles — no hace falta tocar `publishToInstagram` ni la
guarda de idempotencia.

## 6. Checklist de verificación

- [ ] Crear un libro nuevo (sin ejemplares) ya no dispara ninguna
      publicación.
- [ ] Añadir el primer ejemplar, por cualquiera de las vías existentes,
      dispara la publicación — probar en modo dry-run igual que antes.
- [ ] Añadir ejemplares una segunda vez (misma vía u otra distinta) no
      vuelve a publicar, porque `instagramPostedAt` ya está seteado.
- [ ] Cada vía de añadir ejemplares sigue respondiendo a su cliente sin
      esperar a la publicación en Instagram (no bloqueante).
- [ ] Quedan documentadas, en el resumen final del agente, todas las vías
      de añadir ejemplares que se encontraron y engancharon.
