# Spec: publicación automática en Instagram al dar de alta un libro

**Estado:** listo para implementación
**Agente destino:** `senior-backend`
**Repos afectados:** backend (Express/Mongoose)
**Supersede:** cualquier nota anterior sobre este tema en otros ficheros de spec.

---

## 1. Objetivo

Cuando se crea un libro nuevo en la plataforma, publicar automáticamente en la
cuenta oficial de Instagram de Reseñan Sancho una imagen de marca con los
datos del libro y un caption con la sinopsis, invitando a pedir un ejemplar.

## 2. Decisiones ya tomadas (no reabrir sin motivo)

- **Disparador:** solo en la **creación** del libro, no en cada edición. La
  portada y la sinopsis ya son obligatorias para dar de alta un libro, así que
  no hace falta comprobar "si está completo": siempre lo está en el momento
  de creación.
- **No bloqueante:** la petición de creación del libro responde al cliente
  igual que hoy; la publicación en Instagram ocurre después, de forma
  asíncrona, y cualquier fallo se registra pero nunca rompe ni retrasa la
  respuesta al usuario.
- **Sin reintentos automáticos en esta primera versión.** Si algo falla, se
  loguea con detalle y se deja constancia; no hay cola de reintentos todavía
  (se puede añadir más adelante si el fallo resulta frecuente en la práctica).
- **Sin hashtags** en el caption, por decisión explícita.
- **Generación de imagen server-side** con `@napi-rs/canvas` (no `node-canvas`)
  para evitar la compilación nativa de Cairo en Heroku. Esta dependencia ya
  está acordada; no hace falta volver a justificarla, pero sí añadirla al
  `package.json` con su versión fijada.

## 3. Variables de entorno

Ya configuradas como config vars en Heroku (backend):

| Variable | Valor / origen | Notas |
|---|---|---|
| `IG_PAGE_ACCESS_TOKEN` | Token de página de larga duración obtenido vía Graph API Explorer | No caduca por fecha, pero puede invalidarse (cambio de contraseña, revocación, revisión de seguridad de Meta). Tratarlo como secreto. |
| `IG_BUSINESS_ACCOUNT_ID` | `17841405744435526` | ID de la cuenta de Instagram (ig-user-id), no el `@usuario`. |
| `IG_DRY_RUN` | `true` en local, `false` en producción | Ver sección 7. |
| `SOCIAL_AUTOPOST_ENABLED` | `true` / `false` | Flag general de la feature. Léase en runtime vía `process.env` en el backend — **nunca** como variable `NEXT_PUBLIC_*`, que se compila en build time y no reacciona a cambios de config var sin redeploy. |

Todas se leen server-side, en el momento de intentar publicar — no en el
arranque del proceso, para poder desactivar la feature sin redeploy.

## 4. Cambios en el modelo `Book`

Añadir un campo para evitar publicaciones duplicadas y dejar constancia de lo
publicado:

```js
instagramPostedAt: {
  type: Date,
  default: null,
}
```

Antes de intentar publicar, comprobar que `instagramPostedAt` es `null`. Tras
una publicación real con éxito (no en dry-run), setear la fecha actual.

## 5. Flujo general

```
POST /books (creación)
  → guarda el libro en Mongo
  → responde al cliente (sin esperar a Instagram)
  → dispara publishToInstagram(book) sin await, envuelto en try/catch
       1. generar imagen de marca (canvas)
       2. construir el caption
       3. [modo real] subir imagen a Cloudinary
       4. [modo real] crear contenedor de medios en Graph API
       5. [modo real] esperar a que el contenedor esté FINISHED
       6. [modo real] publicar el contenedor
       7. marcar book.instagramPostedAt
  → cualquier error en cualquier paso: log detallado (bookId, paso, mensaje),
    no propagar, no lanzar excepción no controlada
```

Si `SOCIAL_AUTOPOST_ENABLED` es `false`, `publishToInstagram` no hace nada
(log de nivel debug y salida inmediata).

## 6. Generación de la imagen de marca

### 6.1 Librería y fuentes

- `@napi-rs/canvas` para todo el compositing (imagen + texto).
- Empaquetar en el repo los archivos de fuente `Fraunces` (weight 600) y
  `Source Sans 3` (weights 400 y 600) como `.ttf`/`.otf`, por ejemplo en
  `assets/fonts/`. Registrarlas con `GlobalFonts.registerFromPath()` al
  arrancar el módulo.
- **Importante:** `@napi-rs/canvas` no tiene ninguna fuente de iconos cargada.
  La fila de estrellas (sección 6.3) se dibuja como un path vectorial simple
  (polígono de 5 puntas, solo trazo, sin relleno), no como un carácter de una
  fuente de iconos.

### 6.2 Lienzo

- Dimensiones: **1080 × 1350 px** (ratio 4:5, el máximo recomendado para
  feed de Instagram).
- Formato de salida: **JPEG**, calidad ~90. Instagram rechaza PNG/WebP en
  posts de feed.

### 6.3 Composición (de arriba abajo)

Basado en el mockup aprobado:

1. **Fondo:** relleno sólido `#3D3A35` (tinta).
2. **Fila de 5 estrellas**, centrada horizontalmente cerca de la parte
   superior. Solo trazo (sin rellenar, deliberadamente — no debe leerse como
   una puntuación real dada por Reseñan Sancho), color `#F2B705` (mustaza).
3. **Portada del libro:** descargar la imagen desde la URL de Cloudinary del
   campo `cover` del libro. Dibujar recortada en un rectángulo de esquinas
   redondeadas (`border-radius` equivalente ~36px a esta resolución),
   ocupando aproximadamente el 47% del ancho del lienzo, manteniendo ratio
   3:4 (≈ 504 × 674 px).
   - **Si la descarga de la portada falla** (timeout, error de red): abortar
     la publicación de este libro por completo. No publicar una imagen sin
     la portada real — mejor no publicar que publicar algo incompleto. Log
     con el `bookId` y el error.
4. **Insignia de género**, debajo de la portada: fondo `rgba(251,241,216,0.1)`,
   borde `1px solid rgba(251,241,216,0.28)`, texto en `#FBF1D8` (crema),
   mayúsculas, `Source Sans 3` 600.
5. **Título del libro:** `Fraunces` 600, color `#FBF1D8`, centrado. Debe
   partirse en varias líneas automáticamente según el ancho disponible — medir
   el ancho del texto con el contexto de canvas y romper por palabras, no a
   mitad de palabra. No hay límite estricto de líneas, pero conviene un
   tamaño de fuente que en la práctica quepan 1–3 líneas para títulos típicos.
6. **Autor:** `Source Sans 3`, color `#F2B705` (mustaza), tamaño menor que el
   título. Formato: `por {nombre del autor}`.
7. **Chips de formato:** uno por cada formato disponible del libro, en fila,
   centrados y con salto de línea si no caben todos. Mismo estilo visual que
   la insignia de género (fondo translúcido crema, borde crema, texto crema),
   mayúsculas.

### 6.4 Subida a Cloudinary (solo en modo real, no en dry-run)

Subir el buffer JPEG a la cuenta de Cloudinary ya en uso, en una carpeta
nueva `instagram-posts/`. Guardar el `secure_url` devuelto — es la URL que se
pasa a la Graph API como `image_url`.

## 7. Modo dry-run (`IG_DRY_RUN`)

Pensado para poder probar todo el flujo en local sin publicar nada real ni
depender de una cuenta de pruebas de Instagram.

Cuando `IG_DRY_RUN=true`:

- **Sí se genera** la imagen de marca completa (se ejercita toda la lógica
  de compositing y de salto de línea del título).
- La imagen generada **se guarda en disco local** en vez de subirse a
  Cloudinary — por ejemplo en `./tmp/ig-preview-<bookId>-<timestamp>.jpg`
  (añadir `tmp/` a `.gitignore` si no lo está ya). Esto permite abrir el
  archivo y revisar visualmente el resultado sin tocar Cloudinary ni Meta.
- **Sí se construye** el caption completo.
- **No se sube nada a Cloudinary** y **no se hace ninguna llamada a la Graph
  API** (ni creación de contenedor ni publicación).
- Se loguea en consola: el caption completo, la ruta del archivo local
  generado, y el `ig-user-id` que se habría usado.
- **No se actualiza `instagramPostedAt`** — como no se ha publicado nada de
  verdad, no debe quedar marcado como publicado.

Cuando `IG_DRY_RUN=false`, se ejecuta el flujo real completo (subida a
Cloudinary + Graph API).

**Valor por defecto:** `true` en desarrollo local, `false` en Heroku
(producción). Esto debe quedar documentado en el `README` del repo backend,
explicando qué hace la variable y dónde queda guardada la imagen de
previsualización cuando está activa.

## 8. Construcción del caption

Plantilla (contenido de producto, en español — según convención del proyecto,
el copy visible para el usuario final va en español aunque el código esté en
inglés):

```
📚 Nuevo libro disponible para reseñar: {title}, de {author}.

Disponible en {formats}.

{synopsisExcerpt}…

Pide tu ejemplar gratuito desde el enlace en nuestra bio.
```

- **`{formats}`:** unir la lista de formatos de forma natural en español, no
  con comas sueltas. Un solo formato: tal cual. Dos: `"X y Y"`. Tres o más:
  `"X, Y y Z"`.
- **`{synopsisExcerpt}`:** recortar la sinopsis del libro a **~200
  caracteres**, cortando en el último espacio antes del límite (no a mitad
  de palabra), y añadir `…` al final. No incluir la sinopsis completa: el
  caption se trunca a 125 caracteres visibles en el feed antes de "ver más",
  y una sinopsis de hasta 2000 caracteres generaría un muro de texto.
- Sin hashtags por ahora — no añadir ninguno aunque quede espacio.

## 9. Llamadas a la Graph API (solo modo real)

Usar `IG_PAGE_ACCESS_TOKEN` como `access_token` en las tres llamadas.

1. **Crear el contenedor de medios:**
   `POST /v26.0/{IG_BUSINESS_ACCOUNT_ID}/media`
   body: `{ image_url: <secure_url de Cloudinary>, caption: <caption> }`
   → devuelve `{ id: containerId }`

2. **Esperar a que el contenedor esté listo:**
   `GET /v26.0/{containerId}?fields=status_code`
   Repetir con backoff corto hasta que `status_code === "FINISHED"`, con un
   límite razonable de intentos (p. ej. 10 intentos, unos segundos entre
   cada uno). Si se agota el límite sin llegar a `FINISHED`, abortar y
   loguear — no forzar la publicación de un contenedor que no ha terminado
   de procesarse.

3. **Publicar:**
   `POST /v26.0/{IG_BUSINESS_ACCOUNT_ID}/media_publish`
   body: `{ creation_id: containerId }`

Si cualquiera de las tres llamadas devuelve error, loguear la respuesta
completa de la API (código y mensaje de error de Meta) junto con el
`bookId`, y no continuar con los pasos siguientes.

## 10. Manejo de errores

Siguiendo el principio ya establecido para servicios externos (igual que con
Mailchimp o el envío de correo): un fallo en Instagram **nunca** debe tumbar
ni retrasar la petición de creación del libro. Toda la función
`publishToInstagram` va envuelta en un `try/catch` de nivel superior; los
`catch` de cada paso interno registran el contexto suficiente para depurar
(`bookId`, paso concreto, mensaje de error) sin filtrar secretos (nunca
loguear el `access_token` completo).

## 11. Fuera de alcance de este spec (para más adelante)

- Renovación automática del `IG_PAGE_ACCESS_TOKEN` antes de que se invalide.
- Reintentos automáticos ante fallos transitorios de la Graph API.
- Hashtags dinámicos por género.
- Publicación manual/bajo demanda para libros ya existentes (este spec cubre
  solo el disparador automático en creación).

## 12. Checklist de verificación antes de cerrar

- [ ] Con `IG_DRY_RUN=true`, crear un libro localmente genera un `.jpg` en
      `tmp/` visualmente correcto (portada, título con salto de línea si es
      largo, formatos, sin errores en consola) y no llama a Cloudinary ni a
      Meta.
- [ ] Con `IG_DRY_RUN=false` contra una cuenta de prueba (no la oficial),
      el flujo completo publica correctamente y `instagramPostedAt` queda
      seteado.
- [ ] Si se fuerza un fallo (por ejemplo, URL de portada rota), la creación
      del libro responde con éxito igualmente y el error queda logueado.
- [ ] `SOCIAL_AUTOPOST_ENABLED=false` desactiva la feature sin tocar código.
- [ ] El `README` documenta `IG_DRY_RUN` y dónde aparece la imagen de
      previsualización.
